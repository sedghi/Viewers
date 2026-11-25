import { Enums } from '@cornerstonejs/core';
import type { PlanarViewport, Types, VolumeViewport3D } from '@cornerstonejs/core';

/**
 * The viewport as a planar or a 3D viewport, the two families that show
 * volumes and answer for them: `getVolumeIds`, `getDisplaySetIdForVolumeId`
 * and `getScalarRange`. Undefined for a video, a whole slide or an ECG
 * viewport, and for no viewport.
 */
export function getPlanarOr3DViewport(
  viewport: Types.IViewport | null | undefined
): PlanarViewport | VolumeViewport3D | undefined {
  if (
    viewport?.type === Enums.ViewportType.PLANAR ||
    viewport?.type === Enums.ViewportType.VOLUME_3D
  ) {
    return viewport as PlanarViewport | VolumeViewport3D;
  }

  return undefined;
}
