"""Replay the reference EdgeTAM video predictor and the exported ONNX graphs on a synthetic clip
and compare masks frame by frame. Exercises the full loop: seed click, memory encoding, memory bank
assembly with padding/masking, object pointers, propagation."""
import json
import sys
import tempfile
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "upstream"))
from sam2.build_sam import build_sam2_video_predictor  # noqa: E402

OUT = ROOT / "out"
CKPT = ROOT / "upstream" / "checkpoints" / "edgetam.pt"
C = json.loads((OUT / "constants.json").read_text())
IMG = C["image_size"]
N_FRAMES = 8
W, H = 640, 480


def make_clip(folder: Path):
    rng = np.random.default_rng(0)
    centers = []
    for i in range(N_FRAMES):
        img = Image.new("RGB", (W, H))
        px = np.linspace(40, 120, W, dtype=np.uint8)
        base = np.stack([np.tile(px, (H, 1))] * 3, axis=-1) + rng.integers(0, 12, (H, W, 3), dtype=np.uint8)
        img = Image.fromarray(base.astype(np.uint8))
        d = ImageDraw.Draw(img)
        d.rectangle([420, 300, 560, 420], fill=(200, 200, 60))  # static distractor
        cx, cy = 200 + 9 * i, 220 + 6 * i
        d.ellipse([cx - 60, cy - 60, cx + 60, cy + 60], fill=(220, 70, 90))
        centers.append((cx, cy))
        img.save(folder / f"{i:05d}.jpg", quality=95)
    return centers


def load_frame(path: Path) -> np.ndarray:
    img = Image.open(path).convert("RGB").resize((IMG, IMG))
    arr = np.asarray(img, dtype=np.float32) / 255.0
    arr = (arr - np.array(C["img_mean"], dtype=np.float32)) / np.array(C["img_std"], dtype=np.float32)
    return arr.transpose(2, 0, 1)[None]


class OnnxTracker:
    def __init__(self):
        opts = ort.SessionOptions()
        prov = ["CPUExecutionProvider"]
        self.enc = ort.InferenceSession(str(OUT / "image_encoder.onnx"), opts, providers=prov)
        self.mem = ort.InferenceSession(str(OUT / "memory_encoder.onnx"), opts, providers=prov)
        self.att = ort.InferenceSession(str(OUT / "memory_attention.onnx"), opts, providers=prov)
        self.dec = ort.InferenceSession(str(OUT / "mask_decoder.onnx"), opts, providers=prov)
        self.tpos = np.array(C["maskmem_tpos_enc"], dtype=np.float32)  # (7,64)
        self.no_mem = np.array(C["no_mem_embed"], dtype=np.float32).reshape(1, -1, 1, 1)
        self.cond = {}  # frame -> (feats, pos, ptr)
        self.noncond = {}

    def encode(self, image):
        vf, vp, h0, h1 = self.enc.run(None, {"image": image})
        return vf, vp, h0, h1

    def decode(self, pix, h0, h1, coords, labels, multimask):
        return self.dec.run(None, {
            "pix_feat_with_mem": pix, "high_res_0": h0, "high_res_1": h1,
            "point_coords": coords.astype(np.float32), "point_labels": labels.astype(np.int32),
            "multimask": np.array([1.0 if multimask else 0.0], dtype=np.float32),
        })

    def remember(self, vf, high_mask, binarize):
        feats, pos = self.mem.run(None, {
            "vision_feats": vf, "mask_logits": high_mask,
            "binarize": np.array([1.0 if binarize else 0.0], dtype=np.float32),
        })
        return feats, pos

    def build_memory(self, frame_idx):
        n_mem, per, dim = C["n_mem_tokens"], C["mem_tokens_per_frame"], C["mem_dim"]
        n_maskmem, ptr_tokens, max_ptrs = C["num_maskmem"], C["ptr_tokens"], C["max_obj_ptrs"]
        memory = np.zeros((1, n_mem, dim), np.float32)
        memory_pos = np.zeros((1, n_mem, dim), np.float32)
        mask = np.zeros((1, n_mem), np.float32)
        # block 0: conditioning frame(s); we have exactly one (frame 0)
        slots = [(0, self.cond[0])]
        for t_pos in range(1, n_maskmem):
            prev = frame_idx - (n_maskmem - t_pos)
            out = self.noncond.get(prev)
            if out is not None:
                slots.append((t_pos, out))
        for t_pos, (feats, pos, _ptr) in slots:
            a, b = t_pos * per, (t_pos + 1) * per
            memory[0, a:b] = feats[0]
            memory_pos[0, a:b] = pos[0] + self.tpos[n_maskmem - t_pos - 1]
            mask[0, a:b] = 1.0
        ptrs = [self.cond[0][2]]
        for t_diff in range(1, max_ptrs):
            t = frame_idx - t_diff
            if t < 0:
                break
            out = self.noncond.get(t)
            if out is not None:
                ptrs.append(out[2])
        base = n_maskmem * per
        for i, ptr in enumerate(ptrs[:max_ptrs]):
            a = base + i * ptr_tokens
            memory[0, a:a + ptr_tokens] = ptr.reshape(ptr_tokens, dim)
            mask[0, a:a + ptr_tokens] = 1.0
        return memory, memory_pos, mask

    def seed(self, image, coords_1024, labels):
        vf, vp, h0, h1 = self.encode(image)
        pix = vf + self.no_mem
        multimask = len(labels) <= C["multimask_max_pt_num"]
        low, high, iou, score, ptr = self.decode(pix, h0, h1, coords_1024[None], np.array(labels)[None], multimask)
        feats, pos = self.remember(vf, high, binarize=C["binarize_mask_from_pts_for_mem_enc"])
        self.cond[0] = (feats, pos, ptr)
        return high

    def track(self, frame_idx, image):
        vf, vp, h0, h1 = self.encode(image)
        memory, memory_pos, mask = self.build_memory(frame_idx)
        pix, = self.att.run(None, {
            "vision_feats": vf, "vision_pos": vp, "memory": memory,
            "memory_pos": memory_pos, "memory_mask": mask,
        })
        coords = np.zeros((1, 1, 2), np.float32)
        labels = -np.ones((1, 1), np.int32)
        low, high, iou, score, ptr = self.decode(pix, h0, h1, coords, labels, multimask=True)
        feats, pos = self.remember(vf, high, binarize=False)
        self.noncond[frame_idx] = (feats, pos, ptr)
        return high, float(score[0, 0])


def to_video_res(high_1024: np.ndarray) -> np.ndarray:
    t = torch.from_numpy(high_1024)
    return torch.nn.functional.interpolate(t, size=(H, W), mode="bilinear", align_corners=False).numpy()[0, 0]


def main():
    tmp = Path(tempfile.mkdtemp(prefix="edgetam-clip-"))
    centers = make_clip(tmp)
    click = np.array([centers[0]], dtype=np.float32)  # video pixel coords

    predictor = build_sam2_video_predictor("edgetam.yaml", str(CKPT), device="cpu")
    state = predictor.init_state(video_path=str(tmp))
    predictor.add_new_points_or_box(state, frame_idx=0, obj_id=1, points=click, labels=np.array([1], np.int32))
    ref = {}
    for frame_idx, _obj_ids, logits in predictor.propagate_in_video(state):
        ref[frame_idx] = logits[0, 0].cpu().numpy()

    tracker = OnnxTracker()
    frames = sorted(tmp.glob("*.jpg"))
    scale = np.array([IMG / W, IMG / H], dtype=np.float32)
    onnx_masks = {0: to_video_res(tracker.seed(load_frame(frames[0]), click * scale, [1]))}
    for i in range(1, N_FRAMES):
        high, _score = tracker.track(i, load_frame(frames[i]))
        onnx_masks[i] = to_video_res(high)

    worst = 1.0
    for i in range(N_FRAMES):
        a = ref[i] > 0
        b = onnx_masks[i] > 0
        inter, union = np.logical_and(a, b).sum(), np.logical_or(a, b).sum()
        iou = inter / union if union else 1.0
        worst = min(worst, iou)
        print(f"frame {i}: ref area {a.sum():6d}  onnx area {b.sum():6d}  IoU {iou:.4f}")
    print(f"worst IoU {worst:.4f} -> {'PASS' if worst >= 0.98 else 'FAIL'}")
    sys.exit(0 if worst >= 0.98 else 1)


if __name__ == "__main__":
    main()
