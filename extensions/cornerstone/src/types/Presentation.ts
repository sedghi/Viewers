import type { PlanarViewFraming, Volume3DProjectionFraming, Types } from '@cornerstonejs/core';
import { SegmentationRepresentations } from '@cornerstonejs/tools/enums';
import type { ViewportAppearance } from '../services/ViewportService/adapter/IViewportAdapter';

/**
 * Represents a position presentation in a viewport. This is basically
 * viewport specific camera position and zoom, and not the display set.
 *
 * `viewFraming` is what `viewport.getViewFraming()` gives: the zoom, pan,
 * rotation, flips and display area against the fit, with the scale mode and
 * the scale of a planar view (`scaleMode`, `fitScale`), so a viewport of
 * another size shows the same fit; for a 3D viewport the camera, with the
 * zoom and the pan against the fit for its direction.
 */
export type PositionPresentation = {
  viewportType: string;
  // The view reference has the basic information as to what image orientation/slice is shown
  viewReference: Types.ViewReference;
  viewFraming?: PlanarViewFraming | Volume3DProjectionFraming;
  /**
   * Optionals
   */
  initialImageIndex?: number;
  // viewportId helps when hydrating SR or SEG - we can use it to filter
  // presentations to get the one prior to the current viewport and reuse it
  // for viewReference and viewFraming
  viewportId?: string;
};

/**
 * Represents a LUT presentation in a viewport, and is really related
 * to displaySets and not the viewport itself: what a user set on the
 * appearance of each display set of the viewport (window, invert, colormap,
 * opacity), keyed by the UID of the display set. These are the overrides
 * (`getDisplaySetAppearance`), none of the defaults of the data, so a window
 * that the user did not set is not stored.
 */
export interface LutPresentation {
  viewportType: string;
  appearances: Record<string, ViewportAppearance>;
}

/**
 * Represents a LUT presentation in a viewport, and is really related
 * to displaySets and not the viewport itself. So that is why it can
 * be an object with volumeId keys, or a single object with the properties
 * itself
 *
 * each presentation has a segmentationId and a type and a value for
 * hydrated and config.
 *
 * The hydrated property can be a boolean or null. It's null if the segmentation
 * representation hasn't been created yet. It's true if the representation is
 * currently in the viewport. It's false if the representation was in the viewport
 * but has been removed.
 *
 * It mirrors `DisplaySet.isHydrated` for this presentation: true means show the
 * segmentation in the standard viewports matching this presentation id, false
 * means it was explicitly removed and must not be shown in them again. The
 * viewport converges on this value, so false actively removes the
 * representation rather than merely being the absence of an add - otherwise a
 * stale true would silently restore a segmentation the user dismissed.
 *
 * Config is the segmentation config, Todo: add stuff here
 */
export type SegmentationPresentationItem = {
  segmentationId: string;
  type: SegmentationRepresentations;
  hydrated: boolean | null;
  config?: unknown;
};

export type SegmentationPresentation = SegmentationPresentationItem[];

/**
 * Presentation can be a PositionPresentation or a LutPresentation.
 */
type Presentation = PositionPresentation | LutPresentation | SegmentationPresentation;

/**
 * Viewport presentations object that can contain a positionPresentation
 * and or a lutPresentation.
 */
export type Presentations = {
  positionPresentation?: PositionPresentation;
  lutPresentation?: LutPresentation;
  segmentationPresentation?: SegmentationPresentation;
};

export default Presentation;
