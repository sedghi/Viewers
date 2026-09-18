import ort from 'onnxruntime-web/webgpu';

/**
 * In-browser EdgeTAM (on-device SAM 2 with Spatial Perceiver memory) driver.
 * Runs the four ONNX graphs produced by ai-models/edgetam/export_edgetam_onnx.py and
 * replays the reference video-predictor loop: seed a frame with clicks, encode it into
 * memory, then condition each following frame on a fixed-size, masked memory bank.
 */

export type EdgeTamConstants = {
  image_size: number;
  hidden_dim: number;
  mem_dim: number;
  num_maskmem: number;
  mem_tokens_per_frame: number;
  max_obj_ptrs: number;
  ptr_tokens: number;
  n_mem_tokens: number;
  no_obj_score: number;
  img_mean: number[];
  img_std: number[];
  maskmem_tpos_enc: number[][];
  no_mem_embed: number[];
  binarize_mask_from_pts_for_mem_enc: boolean;
  multimask_min_pt_num: number;
  multimask_max_pt_num: number;
};

export type EdgeTamProvider = 'webgpu' | 'wasm';

/** A prompt point in model space (0..image_size). label 1 = include, 0 = exclude. */
export type EdgeTamPoint = { x: number; y: number; label: 0 | 1 };

/** What one frame leaves behind for later frames. */
export type EdgeTamFrame = { feats: Float32Array; pos: Float32Array; ptr: Float32Array };

export type EdgeTamDecodeResult = {
  /** Mask logits at image_size x image_size. Positive means inside. */
  high: Float32Array;
  iou: number;
  /** Object score logits. Non-positive means the model thinks the object is absent. */
  score: number;
};

type Tensor = InstanceType<typeof ort.Tensor>;
type Session = Awaited<ReturnType<typeof ort.InferenceSession.create>>;

type Sessions = {
  encoder: Session;
  memoryEncoder: Session;
  memoryAttention: Session;
  decoder: Session;
};

type Encoded = { vf: Tensor; vp: Tensor; h0: Tensor; h1: Tensor };

const GRAPHS = ['image_encoder', 'memory_encoder', 'memory_attention', 'mask_decoder'] as const;

function configureOrtEnv(): void {
  if (typeof document === 'undefined') {
    return;
  }
  // Always absolute: other callers set a bare 'ort/' which newer runtimes cannot
  // resolve as a module specifier when they load their WASM glue.
  ort.env.wasm.wasmPaths = new URL('ort/', document.baseURI).href;
  // Multi-threaded WASM needs SharedArrayBuffer, which needs cross-origin isolation.
  ort.env.wasm.numThreads = self.crossOriginIsolated
    ? Math.min(4, navigator.hardwareConcurrency || 1)
    : 1;
}

export class EdgeTamTracker {
  private constructor(
    private readonly sessions: Sessions,
    public readonly constants: EdgeTamConstants,
    public readonly provider: EdgeTamProvider
  ) {}

  static async load({
    baseUrl,
    provider,
  }: {
    baseUrl: string;
    provider?: EdgeTamProvider;
  }): Promise<EdgeTamTracker> {
    const response = await fetch(new URL('constants.json', baseUrl).href);
    if (!response.ok) {
      throw new Error(`EdgeTAM constants not found at ${baseUrl}`);
    }
    const constants = (await response.json()) as EdgeTamConstants;
    configureOrtEnv();
    // WASM by default: the runtime pinned by @cornerstonejs/ai (1.17.x) miscompiles
    // this graph's rank-5 Gather on WebGPU. Opt in with `edgeTam.provider: 'webgpu'`
    // once the app ships a runtime that handles it.
    const candidates: EdgeTamProvider[] = provider ? [provider, 'wasm'] : ['wasm'];
    let lastError: unknown;
    for (const candidate of candidates) {
      try {
        const options = { executionProviders: [candidate], graphOptimizationLevel: 'all' as const };
        const [encoder, memoryEncoder, memoryAttention, decoder] = await Promise.all(
          GRAPHS.map(name =>
            ort.InferenceSession.create(new URL(`${name}.onnx`, baseUrl).href, options)
          )
        );
        return new EdgeTamTracker(
          { encoder, memoryEncoder, memoryAttention, decoder },
          constants,
          candidate
        );
      } catch (error) {
        lastError = error;
        console.warn(`EdgeTAM: ${candidate} session failed, trying next provider`, error);
      }
    }
    throw lastError instanceof Error ? lastError : new Error('EdgeTAM: no execution provider');
  }

  get imageSize(): number {
    return this.constants.image_size;
  }

  /** Run the image encoder on a normalized (3, S, S) float image. */
  async encode(image: Float32Array): Promise<Encoded> {
    const S = this.imageSize;
    const out = await this.sessions.encoder.run({
      image: new ort.Tensor('float32', image, [1, 3, S, S]),
    });
    return { vf: out.vision_feats, vp: out.vision_pos, h0: out.high_res_0, h1: out.high_res_1 };
  }

  private async decode(
    pix: Tensor,
    encoded: Encoded,
    points: EdgeTamPoint[],
    multimask: boolean
  ): Promise<EdgeTamDecodeResult & { ptr: Float32Array }> {
    // Tracking frames pass one padding point, exactly like the reference predictor.
    const prompts: Array<{ x: number; y: number; label: number }> = points.length
      ? points
      : [{ x: 0, y: 0, label: -1 }];
    const coords = new Float32Array(prompts.length * 2);
    const labels = new Int32Array(prompts.length);
    prompts.forEach((p, i) => {
      coords[2 * i] = p.x;
      coords[2 * i + 1] = p.y;
      labels[i] = p.label;
    });
    const out = await this.sessions.decoder.run({
      pix_feat_with_mem: pix,
      high_res_0: encoded.h0,
      high_res_1: encoded.h1,
      point_coords: new ort.Tensor('float32', coords, [1, prompts.length, 2]),
      point_labels: new ort.Tensor('int32', labels, [1, prompts.length]),
      multimask: new ort.Tensor('float32', new Float32Array([multimask ? 1 : 0]), [1]),
    });
    return {
      high: out.high_res_mask.data as Float32Array,
      iou: (out.iou.data as Float32Array)[0],
      score: (out.object_score_logits.data as Float32Array)[0],
      ptr: out.obj_ptr.data as Float32Array,
    };
  }

  private async remember(
    encoded: Encoded,
    high: Float32Array,
    binarize: boolean
  ): Promise<{ feats: Float32Array; pos: Float32Array }> {
    const S = this.imageSize;
    const out = await this.sessions.memoryEncoder.run({
      vision_feats: encoded.vf,
      mask_logits: new ort.Tensor('float32', high, [1, 1, S, S]),
      binarize: new ort.Tensor('float32', new Float32Array([binarize ? 1 : 0]), [1]),
    });
    return { feats: out.mem_feats.data as Float32Array, pos: out.mem_pos.data as Float32Array };
  }

  /** Seed-frame features skip memory attention and just add the no-memory embedding. */
  private withNoMemory(vf: Tensor): Tensor {
    const { hidden_dim, no_mem_embed } = this.constants;
    const data = new Float32Array(vf.data as Float32Array);
    const perChannel = data.length / hidden_dim;
    for (let c = 0; c < hidden_dim; c++) {
      const add = no_mem_embed[c];
      const base = c * perChannel;
      for (let i = 0; i < perChannel; i++) {
        data[base + i] += add;
      }
    }
    return new ort.Tensor('float32', data, vf.dims);
  }

  private buildMemory(
    cond: EdgeTamFrame,
    prev: Map<number, EdgeTamFrame>,
    relIdx: number
  ): { memory: Tensor; pos: Tensor; mask: Tensor } {
    const {
      num_maskmem: NM,
      mem_tokens_per_frame: PER,
      mem_dim: D,
      ptr_tokens: PT,
      max_obj_ptrs: MP,
      n_mem_tokens: N,
      maskmem_tpos_enc: tpos,
    } = this.constants;
    const memory = new Float32Array(N * D);
    const pos = new Float32Array(N * D);
    const mask = new Float32Array(N);

    const slots: Array<[number, EdgeTamFrame]> = [[0, cond]];
    for (let tPos = 1; tPos < NM; tPos++) {
      const frame = prev.get(relIdx - (NM - tPos));
      if (frame) {
        slots.push([tPos, frame]);
      }
    }
    for (const [tPos, frame] of slots) {
      const offset = tPos * PER;
      memory.set(frame.feats, offset * D);
      const enc = tpos[NM - tPos - 1];
      for (let t = 0; t < PER; t++) {
        const row = (offset + t) * D;
        const src = t * D;
        for (let d = 0; d < D; d++) {
          pos[row + d] = frame.pos[src + d] + enc[d];
        }
      }
      mask.fill(1, offset, offset + PER);
    }

    const pointers = [cond.ptr];
    for (let tDiff = 1; tDiff < MP; tDiff++) {
      const t = relIdx - tDiff;
      if (t < 0) {
        break;
      }
      const frame = prev.get(t);
      if (frame) {
        pointers.push(frame.ptr);
      }
    }
    const base = NM * PER;
    pointers.slice(0, MP).forEach((ptr, i) => {
      const offset = base + i * PT;
      memory.set(ptr, offset * D);
      mask.fill(1, offset, offset + PT);
    });

    return {
      memory: new ort.Tensor('float32', memory, [1, N, D]),
      pos: new ort.Tensor('float32', pos, [1, N, D]),
      mask: new ort.Tensor('float32', mask, [1, N]),
    };
  }

  /** Segment the seed frame from clicks and return its memory entry. */
  async seed(
    image: Float32Array,
    points: EdgeTamPoint[]
  ): Promise<{ cond: EdgeTamFrame; result: EdgeTamDecodeResult }> {
    const encoded = await this.encode(image);
    const pix = this.withNoMemory(encoded.vf);
    const multimask =
      points.length >= this.constants.multimask_min_pt_num &&
      points.length <= this.constants.multimask_max_pt_num;
    const decoded = await this.decode(pix, encoded, points, multimask);
    const mem = await this.remember(
      encoded,
      decoded.high,
      this.constants.binarize_mask_from_pts_for_mem_enc
    );
    return {
      cond: { feats: mem.feats, pos: mem.pos, ptr: decoded.ptr },
      result: { high: decoded.high, iou: decoded.iou, score: decoded.score },
    };
  }

  /**
   * Track into one more frame. `relIdx` is the frame's distance from the seed along the
   * direction being propagated; `prev` holds earlier tracked frames in that direction.
   */
  async track(
    cond: EdgeTamFrame,
    prev: Map<number, EdgeTamFrame>,
    relIdx: number,
    image: Float32Array
  ): Promise<{ frame: EdgeTamFrame; result: EdgeTamDecodeResult }> {
    const encoded = await this.encode(image);
    const bank = this.buildMemory(cond, prev, relIdx);
    const out = await this.sessions.memoryAttention.run({
      vision_feats: encoded.vf,
      vision_pos: encoded.vp,
      memory: bank.memory,
      memory_pos: bank.pos,
      memory_mask: bank.mask,
    });
    const decoded = await this.decode(out.pix_feat_with_mem, encoded, [], true);
    const mem = await this.remember(encoded, decoded.high, false);
    return {
      frame: { feats: mem.feats, pos: mem.pos, ptr: decoded.ptr },
      result: { high: decoded.high, iou: decoded.iou, score: decoded.score },
    };
  }
}
