"""Export EdgeTAM (SAM 2 variant with Spatial Perceiver memory) to ONNX for onnxruntime-web.

Produces four static-shape graphs plus constants.json:
  image_encoder.onnx    image (1,3,1024,1024) -> vision_feats, vision_pos, high_res_0, high_res_1
  memory_encoder.onnx   vision_feats, mask_logits (1,1,1024,1024), binarize -> mem_feats (1,512,64), mem_pos (1,512,64)
  memory_attention.onnx vision_feats, vision_pos, memory (1,3648,64), memory_pos, memory_mask -> pix_feat_with_mem
  mask_decoder.onnx     pix_feat_with_mem, high_res_0, high_res_1, point_coords (1,P,2), point_labels (1,P), multimask
                        -> low_res_mask, high_res_mask, iou, object_score_logits, obj_ptr

Memory layout (fixed, masked): 7 spatial blocks x 512 tokens (t_pos 0..6) followed by 16 object pointers x 4 tokens.
Rotary attention is re-implemented with real arithmetic and an additive key mask.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "upstream"))

from sam2.build_sam import build_sam2  # noqa: E402
from sam2.modeling.position_encoding import compute_axial_cis  # noqa: E402
from sam2.modeling.sam.transformer import RoPEAttention, RoPEAttentionv2  # noqa: E402

OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)
CKPT = ROOT / "upstream" / "checkpoints" / "edgetam.pt"

NUM_MASKMEM = 7
MEM_TOKENS_PER_FRAME = 512
MAX_OBJ_PTRS = 16
MEM_DIM = 64
HIDDEN = 256
PTR_TOKENS = HIDDEN // MEM_DIM  # 4 tokens of 64 per pointer
N_SPATIAL = NUM_MASKMEM * MEM_TOKENS_PER_FRAME  # 3584
N_PTR = MAX_OBJ_PTRS * PTR_TOKENS  # 64
N_MEM = N_SPATIAL + N_PTR  # 3648
IMG = 1024
NO_OBJ_SCORE = -1024.0
OPSET = 17


def build_model():
    for cfg in ("edgetam.yaml", "configs/edgetam.yaml"):
        try:
            model = build_sam2(cfg, str(CKPT), device="cpu", mode="eval", apply_postprocessing=True)
            print(f"built model from {cfg}")
            return model
        except Exception as exc:  # noqa: BLE001
            last = exc
    raise last


# --------------------------------------------------------------------------- rotary helpers
def rope_real(x, cos, sin):
    """x (B,H,N,D); cos/sin (N, D/2). Complex multiply written with real ops."""
    b, h, n, d = x.shape
    x2 = x.reshape(b, h, n, d // 2, 2)
    xr, xi = x2[..., 0], x2[..., 1]
    c = cos.view(1, 1, n, d // 2)
    s = sin.view(1, 1, n, d // 2)
    out = torch.stack((xr * c - xi * s, xr * s + xi * c), dim=-1)
    return out.reshape(b, h, n, d)


def rope_v1_forward(self, q, k, v, num_k_exclude_rope=0):
    q = self.q_proj(q)
    k = self.k_proj(k)
    v = self.v_proj(v)
    q = self._separate_heads(q, self.num_heads)
    k = self._separate_heads(k, self.num_heads)
    v = self._separate_heads(v, self.num_heads)
    q = rope_real(q, self.rope_cos, self.rope_sin)
    k = rope_real(k, self.rope_cos, self.rope_sin)
    out = F.scaled_dot_product_attention(q, k, v)
    return self.out_proj(self._recombine_heads(out))


def rope_v2_forward(self, q, k, v, num_k_exclude_rope=0, rope_k_repeat=-1):
    q = self.q_proj(q)
    k = self.k_proj(k)
    v = self.v_proj(v)
    q = self._separate_heads(q, self.num_heads)
    k = self._separate_heads(k, self.num_heads)
    v = self._separate_heads(v, self.num_heads)
    q = rope_real(q, self.rope_cos_q, self.rope_sin_q)
    b, h, n, d = k.shape
    n_rope = n - num_k_exclude_rope
    frames = rope_k_repeat
    per_frame = n_rope // frames
    n_rope_tok = self.rope_cos_k.shape[0]
    k_sp = k[:, :, :n_rope].reshape(b, h, frames, per_frame, d)
    k_no = k_sp[:, :, :, : per_frame - n_rope_tok]
    k_ro = k_sp[:, :, :, per_frame - n_rope_tok :].reshape(b, h * frames, n_rope_tok, d)
    k_ro = rope_real(k_ro, self.rope_cos_k, self.rope_sin_k).reshape(b, h, frames, n_rope_tok, d)
    k_sp = torch.cat((k_no, k_ro), dim=3).reshape(b, h, n_rope, d)
    k = torch.cat((k_sp, k[:, :, n_rope:]), dim=2)
    bias = getattr(self, "_attn_bias", None)
    out = F.scaled_dot_product_attention(q, k, v, attn_mask=bias)
    return self.out_proj(self._recombine_heads(out))


def patch_rope(model):
    for m in model.modules():
        if isinstance(m, RoPEAttentionv2):
            head_dim = m.internal_dim // m.num_heads
            fq = compute_axial_cis(dim=head_dim, end_x=64, end_y=64, theta=10000.0)
            fk = compute_axial_cis(dim=head_dim, end_x=16, end_y=16, theta=10000.0)
            m.rope_cos_q, m.rope_sin_q = fq.real.contiguous(), fq.imag.contiguous()
            m.rope_cos_k, m.rope_sin_k = fk.real.contiguous(), fk.imag.contiguous()
            m.forward = rope_v2_forward.__get__(m, RoPEAttentionv2)
        elif isinstance(m, RoPEAttention):
            head_dim = m.internal_dim // m.num_heads
            f = compute_axial_cis(dim=head_dim, end_x=64, end_y=64, theta=10000.0)
            m.rope_cos, m.rope_sin = f.real.contiguous(), f.imag.contiguous()
            m.forward = rope_v1_forward.__get__(m, RoPEAttention)


# --------------------------------------------------------------------------- wrappers
class ImageEncoder(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, image):
        backbone_out = self.model.forward_image(image)
        _, feats, pos, sizes = self.model._prepare_backbone_features(backbone_out)
        def to_map(x, s):
            return x.permute(1, 2, 0).reshape(1, x.shape[2], s[0], s[1])
        return (
            to_map(feats[-1], sizes[-1]),
            to_map(pos[-1], sizes[-1]),
            to_map(feats[0], sizes[0]),
            to_map(feats[1], sizes[1]),
        )


class MemoryEncoder(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, vision_feats, mask_logits, binarize):
        prob = torch.sigmoid(mask_logits)
        hard = (mask_logits > 0).float()
        mask = torch.where(binarize.reshape(1, 1, 1, 1) > 0.5, hard, prob)
        mask = mask * self.model.sigmoid_scale_for_mem_enc + self.model.sigmoid_bias_for_mem_enc
        out = self.model.memory_encoder(vision_feats, mask, skip_mask_sigmoid=True)
        feats, pos = out["vision_features"], out["vision_pos_enc"][0]
        feats, pos = self.model.spatial_perceiver(feats, pos)
        return feats, pos


class MemoryAttention(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, vision_feats, vision_pos, memory, memory_pos, memory_mask):
        curr = vision_feats.flatten(2).permute(2, 0, 1)
        curr_pos = vision_pos.flatten(2).permute(2, 0, 1)
        mem = memory.permute(1, 0, 2)
        mem_pos = memory_pos.permute(1, 0, 2)
        bias = ((memory_mask - 1.0) * 1.0e4).reshape(1, 1, 1, -1)
        for layer in self.model.memory_attention.layers:
            layer.cross_attn_image._attn_bias = bias
        out = self.model.memory_attention(
            curr=[curr], curr_pos=[curr_pos], memory=mem, memory_pos=mem_pos,
            num_obj_ptr_tokens=N_PTR, num_spatial_mem=NUM_MASKMEM,
        )
        return out.permute(1, 2, 0).reshape(1, HIDDEN, 64, 64)


def embed_points(pe, coords, labels):
    pts = coords + 0.5
    pad_pt = torch.zeros((1, 1, 2), dtype=pts.dtype)
    pad_lb = -torch.ones((1, 1), dtype=labels.dtype)
    pts = torch.cat([pts, pad_pt], dim=1)
    labels = torch.cat([labels, pad_lb], dim=1)
    emb = pe.pe_layer.forward_with_coords(pts, pe.input_image_size)
    lab = labels.unsqueeze(-1)
    zero = torch.zeros_like(emb)
    emb = torch.where(lab == -1, pe.not_a_point_embed.weight.reshape(1, 1, -1).expand_as(emb), emb)
    for i in range(4):
        w = pe.point_embeddings[i].weight.reshape(1, 1, -1).expand_as(emb)
        emb = emb + torch.where(lab == i, w, zero)
    return emb


class MaskDecoder(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model
        dec = model.sam_mask_decoder
        self.delta = float(dec.dynamic_multimask_stability_delta)
        self.thresh = float(dec.dynamic_multimask_stability_thresh)
        self.dynamic = bool(dec.dynamic_multimask_via_stability)

    def forward(self, pix_feat, high_res_0, high_res_1, point_coords, point_labels, multimask):
        pe = self.model.sam_prompt_encoder
        dec = self.model.sam_mask_decoder
        sparse = embed_points(pe, point_coords, point_labels)
        dense = pe.no_mask_embed.weight.reshape(1, -1, 1, 1).expand(1, -1, 64, 64)
        masks, ious, tokens, obj_score = dec.predict_masks(
            image_embeddings=pix_feat, image_pe=pe.get_dense_pe(),
            sparse_prompt_embeddings=sparse, dense_prompt_embeddings=dense,
            repeat_image=False, high_res_features=[high_res_0, high_res_1],
        )
        # multimask branch: best of masks 1..3
        mm_idx = 1 + torch.argmax(ious[:, 1:], dim=-1)  # (1,)
        mm_mask = masks[:, mm_idx]
        mm_iou = ious[:, mm_idx]
        mm_token = tokens[:, mm_idx]
        # single branch, optionally swapped by stability
        single_mask = masks[:, 0:1]
        single_iou = ious[:, 0:1]
        if self.dynamic:
            flat = masks[:, 0].flatten(1)
            area_i = (flat > self.delta).sum(-1).float()
            area_u = (flat > -self.delta).sum(-1).float()
            stab = torch.where(area_u > 0, area_i / area_u.clamp(min=1.0), torch.ones_like(area_u))
            stable = (stab >= self.thresh).reshape(1, 1, 1, 1)
            single_mask = torch.where(stable, single_mask, mm_mask)
            single_iou = torch.where(stable.reshape(1, 1), single_iou, mm_iou)
        single_token = tokens[:, 0:1]
        use_mm = (multimask.reshape(1, 1, 1, 1) > 0.5)
        low = torch.where(use_mm, mm_mask, single_mask)
        iou = torch.where(use_mm.reshape(1, 1), mm_iou, single_iou)
        token = torch.where(use_mm.reshape(1, 1, 1), mm_token, single_token)
        is_obj = obj_score > 0
        low = torch.where(is_obj.reshape(1, 1, 1, 1), low, torch.full_like(low, NO_OBJ_SCORE))
        high = F.interpolate(low, size=(IMG, IMG), mode="bilinear", align_corners=False)
        obj_ptr = self.model.obj_ptr_proj(token[:, 0])
        lam = is_obj.float()
        obj_ptr = lam * obj_ptr + (1.0 - lam) * self.model.no_obj_ptr
        return low, high, iou, obj_score, obj_ptr


# --------------------------------------------------------------------------- export + check
def export(module, name, inputs, input_names, output_names, dynamic_axes=None):
    path = OUT / f"{name}.onnx"
    module.eval()
    with torch.no_grad():
        torch.onnx.export(
            module, tuple(inputs), str(path), opset_version=OPSET, dynamo=False,
            input_names=input_names, output_names=output_names,
            dynamic_axes=dynamic_axes or {}, do_constant_folding=True,
        )
    mb = path.stat().st_size / 1e6
    print(f"exported {name}: {mb:.1f} MB")
    check(module, path, inputs, input_names)
    return path


def check(module, path, inputs, input_names):
    import onnxruntime as ort
    sess = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    feed = {n: t.detach().cpu().numpy() for n, t in zip(input_names, inputs)}
    with torch.no_grad():
        ref = module(*inputs)
    ref = [r.detach().cpu().numpy() for r in (ref if isinstance(ref, (tuple, list)) else (ref,))]
    got = sess.run(None, feed)
    worst = 0.0
    for r, g in zip(ref, got):
        scale = max(1.0, float(np.abs(r).max()))
        worst = max(worst, float(np.abs(r - g).max()) / scale)
    status = "OK" if worst < 1e-3 else "MISMATCH"
    print(f"  ort vs torch max rel err {worst:.2e} -> {status}")
    if worst >= 1e-3:
        raise SystemExit(f"{path.name} mismatch")


def main():
    torch.manual_seed(0)
    model = build_model()
    model.eval()
    assert model.num_maskmem == NUM_MASKMEM and model.mem_dim == MEM_DIM and model.hidden_dim == HIDDEN
    assert model.directly_add_no_mem_embed and model.use_obj_ptrs_in_encoder
    assert not model.add_tpos_enc_to_obj_ptrs, "pointer tpos projection not handled"
    assert model.no_obj_embed_spatial is None, "spatial no-object embedding not handled"
    patch_rope(model)

    image = torch.randn(1, 3, IMG, IMG)
    enc = ImageEncoder(model)
    export(enc, "image_encoder", [image], ["image"],
           ["vision_feats", "vision_pos", "high_res_0", "high_res_1"])
    with torch.no_grad():
        vf, vp, h0, h1 = enc(image)

    mask_logits = torch.randn(1, 1, IMG, IMG) * 4
    export(MemoryEncoder(model), "memory_encoder",
           [vf, mask_logits, torch.tensor([0.0])],
           ["vision_feats", "mask_logits", "binarize"], ["mem_feats", "mem_pos"])

    memory = torch.randn(1, N_MEM, MEM_DIM)
    memory_pos = torch.randn(1, N_MEM, MEM_DIM)
    memory_mask = torch.ones(1, N_MEM)
    memory_mask[:, MEM_TOKENS_PER_FRAME * 3 :] = 0.0
    memory_mask[:, N_SPATIAL : N_SPATIAL + 2 * PTR_TOKENS] = 1.0
    export(MemoryAttention(model), "memory_attention",
           [vf, vp, memory, memory_pos, memory_mask],
           ["vision_feats", "vision_pos", "memory", "memory_pos", "memory_mask"],
           ["pix_feat_with_mem"])

    coords = torch.tensor([[[512.0, 400.0], [300.0, 700.0]]])
    labels = torch.tensor([[1, 0]], dtype=torch.int32)
    export(MaskDecoder(model), "mask_decoder",
           [vf, h0, h1, coords, labels, torch.tensor([1.0])],
           ["pix_feat_with_mem", "high_res_0", "high_res_1", "point_coords", "point_labels", "multimask"],
           ["low_res_mask", "high_res_mask", "iou", "object_score_logits", "obj_ptr"],
           dynamic_axes={"point_coords": {1: "num_points"}, "point_labels": {1: "num_points"}})

    constants = {
        "image_size": IMG,
        "hidden_dim": HIDDEN,
        "mem_dim": MEM_DIM,
        "num_maskmem": NUM_MASKMEM,
        "mem_tokens_per_frame": MEM_TOKENS_PER_FRAME,
        "max_obj_ptrs": MAX_OBJ_PTRS,
        "ptr_tokens": PTR_TOKENS,
        "n_mem_tokens": N_MEM,
        "no_obj_score": NO_OBJ_SCORE,
        "img_mean": [0.485, 0.456, 0.406],
        "img_std": [0.229, 0.224, 0.225],
        "maskmem_tpos_enc": model.maskmem_tpos_enc.detach().reshape(NUM_MASKMEM, MEM_DIM).tolist(),
        "no_mem_embed": model.no_mem_embed.detach().reshape(HIDDEN).tolist(),
        "binarize_mask_from_pts_for_mem_enc": bool(model.binarize_mask_from_pts_for_mem_enc),
        "multimask_min_pt_num": int(model.multimask_min_pt_num),
        "multimask_max_pt_num": int(model.multimask_max_pt_num),
        "memory_layout": "7 spatial blocks of 512 tokens (t_pos 0..6, block j uses maskmem_tpos_enc[6-j]) then 16 object pointers x 4 tokens (pos = 0); memory_mask 1=valid 0=pad",
    }
    (OUT / "constants.json").write_text(json.dumps(constants))
    print("wrote constants.json")
    total = sum(p.stat().st_size for p in OUT.glob("*.onnx")) / 1e6
    print(f"total onnx size: {total:.1f} MB")


if __name__ == "__main__":
    main()
