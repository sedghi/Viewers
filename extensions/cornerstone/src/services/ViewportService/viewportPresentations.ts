import { Enums as csEnums, Types } from '@cornerstonejs/core';
import type ViewportInfo from './Viewport';
import type { LutPresentation, PositionPresentation } from '../../types/Presentation';
import { getPlanarOr3DViewport } from '../../utils/viewportTypeGuards';

/** A view reference that a viewport can show with navigation and with an orientation change. */
export const WITH_ORIENTATION = { withNavigation: true, withOrientation: true };

/**
 * The position of a viewport: what it shows (the view reference: the image,
 * or the plane and the slice) and how it frames it (`getViewFraming()`: the
 * zoom, pan, rotation, flips and display area against the fit, with how the
 * view fits). A 3D viewport is placed by the camera of its framing and
 * stores no view reference.
 */
export function getPositionPresentation(
  viewport: Types.IViewport,
  viewportInfo: ViewportInfo,
  viewportId: string
): PositionPresentation {
  const is3D = viewport.type === csEnums.ViewportType.VOLUME_3D;

  return {
    viewportType: viewportInfo.getViewportType(),
    viewReference: is3D ? null : viewport.getViewReference(),
    viewFraming: viewport.getViewFraming(),
    viewportId,
  };
}

/**
 * Shows a stored position: the slice and the orientation by the view
 * reference when the viewport can show it, then the framing, so a view that
 * fit the width of its pane fits the width of a pane of another size, and a
 * zoom and a pan are kept against the fit.
 */
export function setPositionPresentation(
  viewport: Types.IViewport,
  positionPresentation: PositionPresentation
): void {
  const viewRef = positionPresentation?.viewReference;
  const is3D = viewport.type === csEnums.ViewportType.VOLUME_3D;
  if (!is3D && viewRef && viewport.isReferenceViewable(viewRef, WITH_ORIENTATION)) {
    viewport.setViewReference(viewRef);
  }

  const viewFraming = positionPresentation?.viewFraming;
  if (viewFraming) {
    viewport.setViewFraming(viewFraming);
  }
}

/**
 * What a user set on the appearance of each display set that the viewport
 * shows (the overrides of `getDisplaySetAppearance`), by its UID. A window
 * that comes from the data is not an override, so it is not stored and a
 * later mount takes the window of the data again. Only a planar and a 3D
 * viewport give it back on a mount.
 */
export function getLutPresentation(
  viewport: Types.IViewport,
  viewportInfo: ViewportInfo
): LutPresentation {
  const volumeViewport = getPlanarOr3DViewport(viewport);
  const appearances = Object.fromEntries(
    (volumeViewport?.getDisplaySets() ?? []).map(({ displaySetId }) => [
      displaySetId,
      volumeViewport.getDisplaySetAppearance(displaySetId) ?? {},
    ])
  );

  return {
    viewportType: viewportInfo.getViewportType(),
    appearances,
  };
}

/**
 * Gives each display set that the viewport shows what the user set on its
 * appearance, from a stored LUT presentation.
 */
export function setLutPresentation(
  viewport: Types.IViewport,
  lutPresentation: LutPresentation
): void {
  const appearances = lutPresentation?.appearances;
  if (!appearances) {
    return;
  }

  for (const { displaySetId } of viewport.getDisplaySets()) {
    const appearance = appearances[displaySetId];
    if (appearance && Object.keys(appearance).length > 0) {
      viewport.setDisplaySetAppearance(displaySetId, appearance);
    }
  }
}
