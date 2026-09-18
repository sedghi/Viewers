import { cache, imageLoader, metaData, utilities as csUtils } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
import { segmentation as cstSegmentation, Enums as cstEnums } from '@cornerstonejs/tools';
import {
  EdgeTamTracker,
  type EdgeTamConstants,
  type EdgeTamFrame,
  type EdgeTamProvider,
} from './EdgeTamTracker';

const LABELMAP = cstEnums.SegmentationRepresentations.Labelmap;

let trackerPromise: Promise<EdgeTamTracker> | null = null;
let trackerBaseUrl = '';

export function getEdgeTamTracker(
  baseUrl: string,
  provider?: EdgeTamProvider
): Promise<EdgeTamTracker> {
  const key = `${baseUrl}#${provider || 'auto'}`;
  if (!trackerPromise || trackerBaseUrl !== key) {
    trackerBaseUrl = key;
    trackerPromise = EdgeTamTracker.load({ baseUrl, provider }).catch(error => {
      trackerPromise = null;
      throw error;
    });
  }
  return trackerPromise;
}

type VoiRange = { lower: number; upper: number };

function cross(a: number[], b: number[]): number[] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** Index of the acquisition image whose plane is closest to a world point. */
export function closestImageIndex(imageIds: string[], world: Types.Point3): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  imageIds.forEach((imageId, index) => {
    const plane = metaData.get('imagePlaneModule', imageId);
    if (!plane?.imagePositionPatient || !plane.rowCosines || !plane.columnCosines) {
      return;
    }
    const normal = cross(plane.rowCosines, plane.columnCosines);
    const ipp = plane.imagePositionPatient;
    const distance = Math.abs(
      (world[0] - ipp[0]) * normal[0] +
        (world[1] - ipp[1]) * normal[1] +
        (world[2] - ipp[2]) * normal[2]
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

function getVoiRange(viewport: Types.IViewport | undefined, image: Types.IImage): VoiRange {
  const fromViewport = (
    viewport as { getProperties?: () => { voiRange?: VoiRange } }
  )?.getProperties?.()?.voiRange;
  if (fromViewport && Number.isFinite(fromViewport.lower) && Number.isFinite(fromViewport.upper)) {
    return fromViewport;
  }
  const center = Array.isArray(image.windowCenter) ? image.windowCenter[0] : image.windowCenter;
  const width = Array.isArray(image.windowWidth) ? image.windowWidth[0] : image.windowWidth;
  if (Number.isFinite(center) && Number.isFinite(width) && width > 0) {
    return { lower: center - width / 2, upper: center + width / 2 };
  }
  const pixels = image.getPixelData();
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < pixels.length; i++) {
    const v = pixels[i];
    if (v < min) {
      min = v;
    }
    if (v > max) {
      max = v;
    }
  }
  const slope = image.slope ?? 1;
  const intercept = image.intercept ?? 0;
  return { lower: min * slope + intercept, upper: max * slope + intercept };
}

/** Window a slice to 8-bit gray, resample to the model size, normalize with ImageNet stats. */
export function imageToModelInput(
  image: Types.IImage,
  voi: VoiRange,
  constants: EdgeTamConstants
): Float32Array {
  const S = constants.image_size;
  const { columns, rows } = image;
  const pixels = image.getPixelData();
  const slope = image.slope ?? 1;
  const intercept = image.intercept ?? 0;
  const range = voi.upper - voi.lower || 1;
  const rgba = new ImageData(columns, rows);
  const data = rgba.data;
  const isColor = Boolean(image.color) && pixels.length >= columns * rows * 3;
  const channels = isColor ? pixels.length / (columns * rows) : 1;
  for (let i = 0; i < columns * rows; i++) {
    let gray: number;
    if (isColor) {
      const base = i * channels;
      gray = 0.299 * pixels[base] + 0.587 * pixels[base + 1] + 0.114 * pixels[base + 2];
    } else {
      const value = pixels[i] * slope + intercept;
      gray = ((value - voi.lower) / range) * 255;
    }
    const g = gray < 0 ? 0 : gray > 255 ? 255 : gray;
    data[4 * i] = g;
    data[4 * i + 1] = g;
    data[4 * i + 2] = g;
    data[4 * i + 3] = 255;
  }
  const source = new OffscreenCanvas(columns, rows);
  source.getContext('2d').putImageData(rgba, 0, 0);
  const target = new OffscreenCanvas(S, S);
  const ctx = target.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, S, S);
  const resized = ctx.getImageData(0, 0, S, S).data;
  const out = new Float32Array(3 * S * S);
  const plane = S * S;
  const [m0, m1, m2] = constants.img_mean;
  const [s0, s1, s2] = constants.img_std;
  for (let p = 0; p < plane; p++) {
    const v = resized[4 * p] / 255;
    out[p] = (v - m0) / s0;
    out[plane + p] = (v - m1) / s1;
    out[2 * plane + p] = (v - m2) / s2;
  }
  return out;
}

/** Sample the model-space mask back onto a slice and write the segment index. Returns voxels set. */
function writeMask(
  labelImageId: string,
  high: Float32Array,
  segmentIndex: number,
  modelSize: number
): number {
  const image = cache.getImage(labelImageId);
  if (!image) {
    return 0;
  }
  const { columns, rows } = image;
  const voxelManager = image.voxelManager;
  const pixels = voxelManager ? null : (image.getPixelData() as Uint8Array);
  let count = 0;
  for (let r = 0; r < rows; r++) {
    const sy = Math.min(modelSize - 1, Math.floor(((r + 0.5) * modelSize) / rows));
    for (let c = 0; c < columns; c++) {
      const sx = Math.min(modelSize - 1, Math.floor(((c + 0.5) * modelSize) / columns));
      if (high[sy * modelSize + sx] > 0) {
        const index = r * columns + c;
        if (voxelManager) {
          voxelManager.setAtIndex(index, segmentIndex);
        } else {
          pixels[index] = segmentIndex;
        }
        count++;
      }
    }
  }
  return count;
}

function sameImageIds(a?: string[], b?: string[]): boolean {
  return Boolean(a && b && a.length === b.length && a.every((id, i) => id === b[i]));
}

async function ensureLabelmap({
  segmentationService,
  viewportId,
  displaySet,
}: {
  segmentationService: AppTypes.SegmentationService;
  viewportId: string;
  displaySet: AppTypes.DisplaySet;
}): Promise<{ segmentationId: string; segmentIndex: number; labelImageIds: string[] }> {
  const imageIds: string[] = displaySet.imageIds;
  const active = segmentationService.getActiveSegmentation(viewportId);
  const activeLabelmap = active?.representationData?.[LABELMAP] as
    | { imageIds?: string[]; referencedImageIds?: string[] }
    | undefined;
  let segmentationId = active?.segmentationId;
  let labelImageIds = activeLabelmap?.imageIds;
  if (
    !segmentationId ||
    !labelImageIds ||
    !sameImageIds(activeLabelmap?.referencedImageIds, imageIds)
  ) {
    segmentationId = await segmentationService.createLabelmapForDisplaySet(displaySet, {
      label: 'EdgeTAM',
      segments: { 1: { label: 'Segment 1', active: true } },
    });
    await segmentationService.addSegmentationRepresentation(viewportId, {
      segmentationId,
      type: LABELMAP,
    });
    const created = cstSegmentation.state.getSegmentation(segmentationId);
    labelImageIds = (created?.representationData?.[LABELMAP] as { imageIds?: string[] })?.imageIds;
  }
  if (!labelImageIds || labelImageIds.length !== imageIds.length) {
    throw new Error('EdgeTAM: labelmap does not match the series images');
  }
  const segmentIndex = cstSegmentation.segmentIndex.getActiveSegmentIndex(segmentationId) || 1;
  return { segmentationId, segmentIndex, labelImageIds };
}

const yieldToBrowser = () => new Promise<void>(resolve => setTimeout(resolve, 0));

export type EdgeTamSegmentResult = {
  segmentationId: string;
  segmentIndex: number;
  seedIndex: number;
  slices: number;
  provider: string;
};

/**
 * Segment the structure under a world point through the acquisition stack of the viewport's
 * image display set. Seeds EdgeTAM on the closest slice, then propagates up and down until the
 * object disappears for two consecutive slices or the limit is reached.
 */
export async function edgeTamSegmentAtPoint({
  servicesManager,
  viewportId,
  worldPoint,
  modelBaseUrl,
  maxSlicesPerDirection = 150,
  provider,
  onProgress,
}: {
  servicesManager: AppTypes.ServicesManager;
  viewportId: string;
  worldPoint: Types.Point3;
  modelBaseUrl: string;
  maxSlicesPerDirection?: number;
  provider?: EdgeTamProvider;
  onProgress?: (info: { slices: number; index: number }) => void;
}): Promise<EdgeTamSegmentResult> {
  const {
    cornerstoneViewportService,
    viewportGridService,
    displaySetService,
    segmentationService,
  } = servicesManager.services;
  const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
  const uids: string[] = viewportGridService.getDisplaySetsUIDsForViewport(viewportId) || [];
  const displaySet = uids
    .map(uid => displaySetService.getDisplaySetByUID(uid))
    .find(ds => Array.isArray(ds?.imageIds) && ds.imageIds.length > 0);
  if (!displaySet) {
    throw new Error('EdgeTAM: the viewport has no image series to segment');
  }
  const imageIds: string[] = displaySet.imageIds;
  const seedIndex = closestImageIndex(imageIds, worldPoint);
  const seedImage = await imageLoader.loadAndCacheImage(imageIds[seedIndex]);
  const pixel = csUtils.worldToImageCoords(imageIds[seedIndex], worldPoint);
  if (!pixel) {
    throw new Error('EdgeTAM: could not map the point onto the image');
  }
  const tracker = await getEdgeTamTracker(modelBaseUrl, provider);
  const S = tracker.imageSize;
  const voi = getVoiRange(viewport, seedImage);
  const { segmentationId, segmentIndex, labelImageIds } = await ensureLabelmap({
    segmentationService,
    viewportId,
    displaySet,
  });

  const inputFor = async (index: number) => {
    const image = await imageLoader.loadAndCacheImage(imageIds[index]);
    return imageToModelInput(image, voi, tracker.constants);
  };

  const seedPoints = [
    {
      x: (pixel[0] * S) / seedImage.columns,
      y: (pixel[1] * S) / seedImage.rows,
      label: 1 as const,
    },
  ];
  const { cond, result } = await tracker.seed(await inputFor(seedIndex), seedPoints);
  let slices = writeMask(labelImageIds[seedIndex], result.high, segmentIndex, S) > 0 ? 1 : 0;
  cstSegmentation.triggerSegmentationEvents.triggerSegmentationDataModified(segmentationId);
  onProgress?.({ slices, index: seedIndex });

  for (const direction of [1, -1]) {
    const prev = new Map<number, EdgeTamFrame>();
    let misses = 0;
    for (let rel = 1; rel <= maxSlicesPerDirection; rel++) {
      const index = seedIndex + direction * rel;
      if (index < 0 || index >= imageIds.length) {
        break;
      }
      const { frame, result: tracked } = await tracker.track(
        cond,
        prev,
        rel,
        await inputFor(index)
      );
      prev.set(rel, frame);
      const area = writeMask(labelImageIds[index], tracked.high, segmentIndex, S);
      if (tracked.score <= 0 || area === 0) {
        misses++;
        if (misses >= 2) {
          break;
        }
      } else {
        misses = 0;
        slices++;
      }
      if (rel % 4 === 0) {
        cstSegmentation.triggerSegmentationEvents.triggerSegmentationDataModified(segmentationId);
        onProgress?.({ slices, index });
        await yieldToBrowser();
      }
    }
  }
  cstSegmentation.triggerSegmentationEvents.triggerSegmentationDataModified(segmentationId);
  return { segmentationId, segmentIndex, seedIndex, slices, provider: tracker.provider };
}
