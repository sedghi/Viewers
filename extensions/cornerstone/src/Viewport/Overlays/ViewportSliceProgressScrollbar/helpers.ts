import type { Types } from '@cornerstonejs/core';
import { ViewportData } from './types';
import { getViewportAdapter } from '../../../services/ViewportService/adapter';

/**
 * The index of the slice that a NEW_IMAGE event shows: the index of the image
 * of a stack, the slice index of the view of a volume. Undefined for an event
 * that names no slice, such as IMAGE_RENDERED.
 */
export function getImageIndexFromEvent(event: {
  detail?: Partial<Types.EventTypes.NewImageEventDetail>;
}): number | undefined {
  return event.detail?.sliceIndex;
}

export function getViewportImageIds(viewportData: ViewportData): string[] {
  if (!viewportData?.data?.length) {
    return [];
  }

  const firstData = viewportData.data[0];
  const volumeImageIds = (firstData as any).volume?.imageIds as string[] | undefined;
  const datumImageIds = (firstData as any).imageIds as string[] | undefined;

  return volumeImageIds || datumImageIds || [];
}

export function isProgressFullMode(viewportData: ViewportData, viewport): boolean {
  if (!viewportData || !viewport) {
    return false;
  }

  // A stack renders the full progress UI; an acquisition-plane volume is the
  // volume-mode equivalent. A 3D viewport has neither shape.
  const adapter = getViewportAdapter(viewport);
  const shape = adapter.getShape();
  if (shape === 'stack') {
    return true;
  }
  if (shape === 'volume') {
    return adapter.isInAcquisitionPlane();
  }

  return false;
}

export function getImageIdFromCacheEvent(event): string | undefined {
  const detail = event?.detail;
  return detail?.imageId || detail?.image?.imageId || detail?.cachedImage?.imageId;
}
