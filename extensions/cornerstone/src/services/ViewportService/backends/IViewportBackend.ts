import type { Types, PlanarViewport, ECGViewport } from '@cornerstonejs/core';
import type ViewportInfo from '../Viewport';
import type {
  Presentations,
  PositionPresentation,
  LutPresentation,
} from '../../../types/Presentation';
import type { StackViewportData, VolumeViewportData } from '../../../types/CornerstoneCacheService';
import type { DataIdPayload } from './dataIdRegistry';

/** A pending overlay (SEG/RTSTRUCT) add produced by the service's prelude. */
export type OverlayMountTask = {
  imageIds?: string[];
  addOverlayFn?: () => Promise<void>;
};

/**
 * Everything the service's stack-mount prelude computes: the backend receives
 * it ready-made and performs only the mount.
 */
export interface StackMountContext {
  /** All display set UIDs bound to the viewport (first = the stack source). */
  displaySetInstanceUIDs: string[];
  imageIds: string[];
  /** Resolved initial slice (position presentation / view reference / HP options). */
  initialImageIndex: number;
  /** VOI/invert/colormap seeded from the LUT presentation or display set options. */
  properties: Record<string, unknown>;
  displayArea?: unknown;
  rotation?: number;
  flipHorizontal?: boolean;
  presentations: Presentations;
  viewportInfo: ViewportInfo;
  overlayProcessingResults?: OverlayMountTask[];
}

/**
 * Everything the service's volume-mount prelude computes before the mount in
 * setVolumesForViewport.
 */
export interface VolumeMountContext {
  /** Volume inputs with their display set options, overlays already filtered out. */
  filteredVolumeInputArray: Array<{
    volumeInput: {
      imageIds?: string[];
      volumeId: string;
      displaySetInstanceUID: string;
      blendMode?: unknown;
      slabThickness?: number;
      [key: string]: unknown;
    };
    displaySetOptions: unknown;
  }>;
  /** Per-volume VOI/invert/colormap/preset derived from the display set options. */
  volumesProperties: Array<{ properties: Record<string, unknown>; volumeId: string }>;
  viewportInfo: ViewportInfo;
  overlayProcessingResults?: OverlayMountTask[];
  presentations: Presentations;
}

/**
 * How OHIF drives cornerstone viewports. NextViewportBackend is the one
 * implementation.
 *
 * The service holds exactly one backend for its lifetime and routes these
 * concerns through it: mount dispatch, the per-family MOUNT BODIES
 * (mountStack/mountVolumes/mountEcg/mountOther/remount), presentation
 * capture/restore, and the dataId lifecycle. The service keeps the preludes
 * (option/property derivation, bookkeeping, events) and the end of an
 * overlay-only volume mount.
 */
export interface IViewportBackend {
  /**
   * Routes a viewport's data to the correct per-family mount: video, whole slide
   * and ECG by the viewport type, a stack and a volume by the shape of the bound
   * data, because a planar viewport shows both.
   */
  dispatchMount(
    viewport: Types.IViewport,
    viewportData: StackViewportData | VolumeViewportData,
    viewportInfo: ViewportInfo,
    presentations?: Presentations
  ): Promise<void>;

  /**
   * Mounts an image stack: register the dataId, setDisplaySets, apply presentation +
   * view state. A window is set only when the properties give one: without it the
   * viewport shows each image of the stack with the window of its own metadata, and a
   * window set here would hold for every image.
   */
  mountStack(viewport: PlanarViewport, context: StackMountContext): Promise<void>;

  /**
   * Mounts the volumes (registered dataIds + one setDisplaySets call +
   * per-binding presentations) and returns true: the service then only
   * broadcasts. Returns false for an overlay-only mount (no base volume), which
   * the service finishes: its overlays are added via the segmentation
   * representations.
   */
  mountVolumes(viewport: Types.IViewport, context: VolumeMountContext): Promise<boolean>;

  /**
   * Mounts an ECG waveform: register the display set's dataId and mount through
   * the setDisplaySets API.
   */
  mountEcg(
    viewport: ECGViewport,
    displaySet: { displaySetInstanceUID: string; imageIds?: string[] },
    imageId: string
  ): Promise<void>;

  /**
   * Mounts video / whole-slide content (the caller applies the view reference
   * afterwards). Registers the family-specific dataId first.
   */
  mountOther(
    viewport: Types.IViewport,
    displaySet: { displaySetInstanceUID: string; imageIds: string[] }
  ): Promise<void>;

  /**
   * Re-mounts changed viewport data onto an existing viewport (updateViewport),
   * optionally restoring the camera afterwards: snapshots the view state and
   * routes through dispatchMount. May return undefined when the viewport family
   * has no re-mount path.
   */
  remount(
    viewport: Types.IViewport,
    viewportData: StackViewportData | VolumeViewportData,
    viewportInfo: ViewportInfo,
    keepCamera: boolean
  ): Promise<void> | undefined;

  /**
   * Reads the position presentation (pan/zoom of the view state + view reference)
   * to persist for restore.
   */
  getPositionPresentation(
    csViewport: Types.IViewport,
    viewportInfo: ViewportInfo,
    viewportId: string
  ): PositionPresentation;

  /**
   * Restores a position presentation: the view reference (slice/orientation),
   * then the stored pan/zoom via setViewState.
   */
  setPositionPresentation(
    viewport: Types.IViewport,
    positionPresentation: PositionPresentation
  ): void;

  /**
   * Restores a LUT presentation (VOI/colormap/invert) via
   * setDisplaySetPresentation.
   */
  setLutPresentation(viewport: Types.IViewport, lutPresentation: LutPresentation): void;

  /**
   * Registers a dataset id for a viewport against cornerstone's global display
   * set metadata provider. Ref-counted and tracked per viewport, so that it can
   * be released on unmount.
   */
  registerDataId(viewportId: string, dataId: string, payload: DataIdPayload): void;

  /**
   * Releases the dataset registrations a viewport owns (and removes from the
   * provider when the last reference is gone). Called from the service's
   * disableElement BEFORE the viewport bookkeeping is deleted.
   */
  onViewportDisabled(viewportId: string): void;

  /**
   * Flushes all remaining registrations. Called from the service's destroy().
   */
  destroy(): void;
}
