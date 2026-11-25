import type { Enums as CoreEnums, Types as CoreTypes } from '@cornerstonejs/core';
import type { ViewportShape } from '../../../utils/viewportDataShape';

export type { ViewportShape };

export type VOIRange = { lower: number; upper: number };

/**
 * The colormap of an appearance: its name, the opacities by value of the data
 * (`opacityMapping`) and the value below which nothing is drawn (`threshold`).
 */
export interface ViewportColormap {
  name?: string;
  opacityMapping?: CoreTypes.OpacityMapping[];
  threshold?: number | null;
  [key: string]: unknown;
}

/**
 * The appearance of one display set of a viewport (window, invert, colormap,
 * opacity, blend mode), keyed by the display set UID.
 */
export interface ViewportAppearance {
  voiRange?: VOIRange;
  colormap?: ViewportColormap;
  invert?: boolean;
  opacity?: number;
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
 * API (view state, per-display-set appearance keyed by display set UID, view
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
   * What a caller set on the appearance of a display set, named by its UID
   * (the source when no UID is given): the overrides, none of the defaults.
   * Store or copy this.
   */
  getAppearance(displaySetId?: string): ViewportAppearance;

  /**
   * The appearance that a display set is drawn with, named as for
   * getAppearance: the overrides over the defaults of its data (the window
   * of the image on display, the invert of a MONOCHROME1 image, opacity 1).
   * Show or compare this. Empty while the display set is not mounted.
   */
  getEffectiveAppearance(displaySetId?: string): ViewportAppearance;

  /**
   * Changes the appearance of a display set, named as for getAppearance. A
   * colormap update keeps the colormap keys it does not name; a key given as
   * undefined removes its override.
   */
  setAppearance(props: ViewportAppearance, displaySetId?: string): void;

  /**
   * The blend mode of the slab of a display set binding (the active source
   * binding when no UID): MAXIMUM_INTENSITY_BLEND for a MIP. Undefined when
   * none was set, and for a 3D viewport.
   */
  getBlendMode(displaySetId?: string): CoreEnums.BlendModes | undefined;

  // ---- data addressing ----

  /**
   * The UID of a display set when this viewport shows it, to address its
   * binding; also when the viewport shows nothing yet. Undefined when the
   * viewport shows other display sets and not this one, as an SR, SEG or
   * RTSTRUCT viewport shows the images they reference: a call without a UID
   * then addresses the source.
   */
  getShownDisplaySetId(displaySetInstanceUID: string): string | undefined;

  /**
   * The ids of the volumes that the viewport shows, the source first. The
   * actors of a viewport also stand for stack images, labelmap images and
   * surfaces: only an id that the viewport takes as a volume id is kept. Empty
   * for a stack and for a viewport without actors (video, whole slide, ECG).
   */
  getVolumeIds(): string[];

  /**
   * The display set id of the binding that shows a volume, to address its
   * presentation. Undefined when the viewport does not show the volume.
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
