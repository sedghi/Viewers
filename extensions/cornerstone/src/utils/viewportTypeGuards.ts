import { Enums } from '@cornerstonejs/core';
import type {
  ECGViewport,
  PlanarViewport,
  Types,
  VideoViewport,
  VolumeViewport3D,
} from '@cornerstonejs/core';

type MaybeViewport = Types.IViewport | null | undefined;

/** True for a planar viewport: a stack, a slice of a volume, a fusion, an MPR pane. */
export function isPlanarViewport(viewport: MaybeViewport): viewport is PlanarViewport {
  return viewport?.type === Enums.ViewportType.PLANAR;
}

/** True for a 3D viewport. */
export function isVolumeViewport3D(viewport: MaybeViewport): viewport is VolumeViewport3D {
  return viewport?.type === Enums.ViewportType.VOLUME_3D;
}

/** True for a video viewport. */
export function isVideoViewport(viewport: MaybeViewport): viewport is VideoViewport {
  return viewport?.type === Enums.ViewportType.VIDEO;
}

/** True for an ECG viewport. */
export function isECGViewport(viewport: MaybeViewport): viewport is ECGViewport {
  return viewport?.type === Enums.ViewportType.ECG;
}

/**
 * The viewport as a planar or a 3D viewport, the two families that show
 * volumes and answer for them: `getVolumeIds`, `getDisplaySetIdForVolumeId`
 * and `getScalarRange`. Undefined for a video, a whole slide or an ECG
 * viewport, and for no viewport.
 */
export function getPlanarOr3DViewport(
  viewport: MaybeViewport
): PlanarViewport | VolumeViewport3D | undefined {
  if (isPlanarViewport(viewport) || isVolumeViewport3D(viewport)) {
    return viewport;
  }

  return undefined;
}
