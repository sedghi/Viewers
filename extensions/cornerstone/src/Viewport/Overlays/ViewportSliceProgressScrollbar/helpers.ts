import type { Types } from '@cornerstonejs/core';
import { ViewportData } from './types';
import { isPlanarViewport } from '../../../utils/viewportTypeGuards';

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

export function isProgressFullMode(
  viewportData: ViewportData,
  viewport: Types.IViewport | null | undefined
): boolean {
  return !!viewportData && isPlanarViewport(viewport) && viewport.isInAcquisitionPlane();
}

export function getImageIdFromCacheEvent(event): string | undefined {
  const detail = event?.detail;
  return detail?.imageId || detail?.image?.imageId || detail?.cachedImage?.imageId;
}
