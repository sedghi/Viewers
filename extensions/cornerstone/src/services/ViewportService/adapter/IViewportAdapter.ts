import type { Enums as CoreEnums, Types as CoreTypes } from '@cornerstonejs/core';
import type { ViewportShape } from '../../../utils/viewportDataShape';

export type { ViewportShape };

export type VOIRange = { lower: number; upper: number };

export interface ViewportColormap {
  name?: string;
  opacity?: number | Array<{ value: number; opacity: number }> | number[];
  threshold?: number;
  [key: string]: unknown;
}

/**
 * Per-display-set appearance (VOI/colormap/invert/blend mode): the per-binding
 * display-set presentation keyed by dataId.
 */
export interface ViewportPresentation {
  voiRange?: VOIRange;
  colormap?: ViewportColormap;
  invert?: boolean;
  isComputedVOI?: boolean;
  blendMode?: CoreEnums.BlendModes;
  [key: string]: unknown;
}

/**
 * View-level state (rotation, flip, orientation, pan/zoom): the semantic
 * getViewState()/setViewState() surface.
 */
export type ViewportViewState = Record<string, unknown>;

/**
 * The single OHIF-facing per-viewport contract over the cornerstone viewport
 * API (view state, per-display-set presentation keyed by dataId, view
 * reference). `ViewportAdapter` is the one implementation, a thin
 * pass-through.
 *
 * Obtain an instance ONLY via `getViewportAdapter(viewport)`. UI code (hooks,
 * overlays, components, toolbar evaluators) must consume this interface
 * instead of probing the raw viewport surface.
 */
export interface IViewportAdapter {
  // ---- classification ----

  /**
   * The shape of what the viewport shows (see ViewportShape): `volume3d` for a
   * 3D viewport, `stack` or `volume` for a planar viewport with data, `other`
   * for any other viewport and for a planar viewport without data.
   */
  getShape(): ViewportShape;

  /**
   * True when the viewport renders volume content and supports volume-only
   * appearance controls (threshold, per-layer opacity): a planar viewport
   * whose active binding is a volume.
   */
  isVolumeRendering(): boolean;

  /**
   * True when the viewport can be reoriented in place via setOrientation()
   * without being recreated: a viewport already rendering volume content
   * (volume slice or 3D). Differs from isVolumeRendering() on 3D viewports,
   * which reorient in place but do not support the planar volume appearance
   * controls.
   */
  canReorientInPlace(): boolean;

  /**
   * True when a volume-mode viewport is looking down the acquisition axis
   * (view-state orientation ACQUISITION, which is also the default when unset).
   */
  isInAcquisitionPlane(): boolean;

  /**
   * True when the viewport has renderable content bound, reported by its
   * content mode.
   */
  hasContent(): boolean;

  // ---- view geometry ----

  /** Read view-level state (rotation/flip/orientation/...). Empty object when unavailable. */
  getViewState(): ViewportViewState;

  /** Apply a partial view-state patch; unspecified fields are preserved. */
  setViewState(patch: ViewportViewState): void;

  /** Current view-plane normal (from the view reference). */
  getViewPlaneNormal(): CoreTypes.Point3 | undefined;

  /** World-space focal point / slice center (from the view reference). */
  getFocalPoint(): CoreTypes.Point3 | undefined;

  // ---- per-display-set appearance ----

  /**
   * Read appearance (voiRange/colormap/invert/...) for a display set binding,
   * named by its dataId or by the UID of its display set (a display set can
   * show under a data id of its own, see `getDataIdForDisplaySet`).
   * Defaults to the active source binding when no dataId is given. A VOI
   * matching the binding's computed default is stamped `isComputedVOI: true`
   * so LUT-presentation capture strips it.
   */
  getPresentation(dataId?: string): ViewportPresentation;

  /**
   * Write appearance for a display set binding, named as for getPresentation
   * (active source binding when no dataId).
   */
  setPresentation(props: ViewportPresentation, dataId?: string): void;

  /** The binding's computed default VOI, named as for getPresentation. */
  getDefaultVOIRange(dataId?: string): VOIRange | undefined;

  /**
   * The colormap currently applied to a display set's layer, or undefined when
   * none (callers supply their own fallback, e.g. Grayscale).
   */
  getColormap(displaySetInstanceUID: string): ViewportColormap | undefined;

  /**
   * Merge an opacity into the display set layer's colormap (the layer named by
   * the UID of its display set or by its dataId). When the layer has opacity
   * points by value (a fusion ramp), the opacity scales each point. Returns
   * true when applied (caller renders); false when the viewport/layer does
   * not support it.
   */
  setLayerOpacity(displaySetInstanceUID: string, opacity: number): boolean;

  /**
   * Apply a threshold to the display set layer's colormap. Returns true when
   * applied (caller renders); false when unsupported.
   */
  setLayerThreshold(displaySetInstanceUID: string, threshold: number): boolean;

  /**
   * The blend mode of the slab of a display set binding (the active source
   * binding when no dataId): MAXIMUM_INTENSITY_BLEND for a MIP. Undefined when
   * none was set, and for a 3D viewport.
   */
  getBlendMode(dataId?: string): CoreEnums.BlendModes | undefined;

  /**
   * Gamma applied between the fusion opacity slider position and the rendered
   * opacity. The blend is linear (gamma 1).
   */
  getOpacityGamma(): number;

  // ---- data addressing ----

  /**
   * Resolve the dataId to address a display set's binding on this viewport:
   * the display set UID, or the data id of its own that a display set gets
   * while another viewport shows it in the other shape (`<uid>::stack`,
   * `<uid>::volume`; see `getDataIdForShape`). The UID when the viewport
   * shows nothing yet. Undefined when the viewport shows other display sets
   * and not this one, as an SR, SEG or RTSTRUCT viewport shows the images
   * they reference: a call without a dataId then addresses the source.
   */
  getDataIdForDisplaySet(displaySetInstanceUID: string): string | undefined;

  /**
   * The ids of the volumes that the viewport shows, the source first. The
   * actors of a viewport also stand for stack images, labelmap images and
   * surfaces: only an id that the viewport takes as a volume id is kept. Empty
   * for a stack and for a viewport without actors (video, whole slide, ECG).
   */
  getVolumeIds(): string[];

  /**
   * The dataId of the binding that shows a volume, to address its presentation.
   * Undefined when the viewport does not show the volume.
   */
  getDataIdForVolumeId(volumeId: string): string | undefined;

  /** Voxel data access (getRange etc.) for a display set's volume, when available. */
  getVoxelManagerForDisplaySet(
    displaySetInstanceUID: string
  ): { getRange?: () => [number, number]; [key: string]: unknown } | undefined;

  // ---- capture ----

  /**
   * Mount this viewport's currently-displayed data onto another viewport and
   * copy its appearance + view state. Used by the download/capture form; the
   * caller renders the target afterwards.
   */
  copyDisplayedContentTo(target: CoreTypes.IViewport): Promise<void>;
}
