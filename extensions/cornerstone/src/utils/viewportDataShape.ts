import { Enums } from '@cornerstonejs/core';

/**
 * The shape of the data that a viewport shows. A planar viewport of
 * Cornerstone3D shows a stack and a volume alike, so its type does not say
 * which one: OHIF keeps the shape as a value of its own.
 *
 * - `stack`: a stack of images.
 * - `volume`: a slice of a volume (MPR, fusion).
 * - `volume3d`: a volume in a 3D viewport.
 * - `other`: anything else (video, whole slide, ECG), or nothing.
 *
 * The shape of the data of a viewportData (from CornerstoneCacheService) is
 * `getViewportDataShape(viewportData)`. It is known before the viewport has
 * the data, so overlays and scrollbars use it. What a LIVE viewport shows is
 * `viewport.getCurrentMode()` of Cornerstone3D.
 */
export type ViewportShape = 'stack' | 'volume' | 'volume3d' | 'other';

type ViewportDatum = {
  imageIds?: string[];
  volume?: unknown;
  volumeId?: string;
  [key: string]: unknown;
};

type ViewportDataLike = {
  viewportType?: Enums.ViewportType;
  dataShapeType?: ViewportShape;
  data?: ViewportDatum | ViewportDatum[];
};

/** The primary (non-overlay) datum of a viewportData. */
export function getPrimaryViewportDatum(viewportData: ViewportDataLike): ViewportDatum | undefined {
  return Array.isArray(viewportData?.data) ? viewportData.data[0] : viewportData?.data;
}

/** True when the primary datum is volume-shaped (volume/volumeId present). */
export function isVolumeViewportData(viewportData: ViewportDataLike): boolean {
  const firstData = getPrimaryViewportDatum(viewportData);
  return !!(firstData && (firstData.volume || firstData.volumeId));
}

/**
 * The shape of the data a viewportData was built for: the `dataShapeType` that
 * CornerstoneCacheService stores. A viewportData without one (built by other
 * code) is read from its data: a 3D viewport type is a 3D volume, a volume or
 * a volumeId is a volume, image ids are a stack.
 */
export function getViewportDataShape(viewportData: ViewportDataLike): ViewportShape | undefined {
  if (!viewportData) {
    return undefined;
  }

  if (viewportData.dataShapeType) {
    return viewportData.dataShapeType;
  }

  const { viewportType } = viewportData;

  if (viewportType === Enums.ViewportType.VOLUME_3D) {
    return 'volume3d';
  }

  if (viewportType && viewportType !== Enums.ViewportType.PLANAR) {
    return 'other';
  }

  if (isVolumeViewportData(viewportData)) {
    return 'volume';
  }

  return getPrimaryViewportDatum(viewportData)?.imageIds ? 'stack' : 'other';
}

/**
 * The slice-navigation event for this viewport's content. Resolved from the
 * bound data, which is known immediately, unlike the content mode of a
 * viewport that is still binding its data.
 */
export function getSliceEventName(viewportData: ViewportDataLike): string {
  const shape = getViewportDataShape(viewportData);
  const firstData = getPrimaryViewportDatum(viewportData);
  const hasSlices =
    shape === 'stack' ||
    shape === 'volume' ||
    isVolumeViewportData(viewportData) ||
    !!firstData?.imageIds;

  return hasSlices ? Enums.Events.NEW_IMAGE : Enums.Events.IMAGE_RENDERED;
}

/**
 * The slice count for a viewport. `viewport.getNumberOfSlices()` can be
 * premature while a viewport is still binding its data (it returns 1 until
 * then). For an image stack the count is known from the bound data, so
 * prefer that and only fall back to the viewport for volume/MPR (where the
 * count depends on orientation).
 */
export function getViewportSliceCount(
  viewportData: ViewportDataLike,
  viewport: { getNumberOfSlices: () => number }
): number {
  const firstData = getPrimaryViewportDatum(viewportData);
  return (
    (!isVolumeViewportData(viewportData) && firstData?.imageIds?.length) ||
    viewport.getNumberOfSlices()
  );
}
