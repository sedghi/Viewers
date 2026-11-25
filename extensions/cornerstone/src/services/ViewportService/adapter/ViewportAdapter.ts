import { Enums, cache, Types as CoreTypes, utilities as csUtils } from '@cornerstonejs/core';
import type {
  IViewportAdapter,
  ViewportAppearance,
  ViewportShape,
  ViewportViewState,
} from './IViewportAdapter';

/**
 * Structural view of the viewport surface used by the adapter. These accessors
 * are on the viewport classes (not on IViewport), so we cast at this boundary
 * rather than import core-internal PlanarViewport types.
 */
type NativeViewport = CoreTypes.IViewport<ViewportViewState, ViewportAppearance> & {
  getSourceDisplaySetId?: () => string | undefined;
  getDisplaySets?: () => Array<{ displaySetId: string; options?: { mode?: string } }>;
  getDisplaySetAppearance?: (displaySetId?: string) => ViewportAppearance | undefined;
  getEffectiveDisplaySetAppearance?: (displaySetId?: string) => ViewportAppearance | undefined;
  setDisplaySetAppearance?: {
    (props: ViewportAppearance): void;
    (displaySetId: string, props: ViewportAppearance): void;
  };
  getViewState?: () => ViewportViewState | undefined;
  setViewState?: (patch: ViewportViewState) => void;
  getViewReference?: () => CoreTypes.ViewReference | undefined;
  setViewReference?: (ref: CoreTypes.ViewReference) => void;
  getCurrentMode?: () => string;
  getActors?: () => Array<{ referencedId?: string }>;
  hasVolumeId?: (volumeId: string) => boolean;
  getDisplaySetIdForVolumeId?: (volumeId: string) => string | undefined;
  setDisplaySets?: (args: {
    displaySetId: string;
    options?: Record<string, unknown>;
  }) => Promise<void>;
};

/**
 * The implementation of IViewportAdapter: a thin pass-through to the semantic
 * API of the viewport (view state, per-binding display-set presentation, view
 * reference). Instantiated only by `getViewportAdapter`.
 */
export class ViewportAdapter implements IViewportAdapter {
  constructor(private readonly viewport: NativeViewport) {}

  // ---- classification ----

  getShape(): ViewportShape {
    if (this.viewport.type === Enums.ViewportType.VOLUME_3D) {
      return 'volume3d';
    }
    const mode = this.viewport.getCurrentMode?.();
    if (mode === 'stack') {
      return 'stack';
    }
    if (mode === 'volume') {
      return 'volume';
    }
    return 'other';
  }

  isVolumeRendering(): boolean {
    return this.viewport.getCurrentMode?.() === 'volume';
  }

  canReorientInPlace(): boolean {
    const mode = this.viewport.getCurrentMode?.();
    return mode === 'volume' || mode === 'volume3d';
  }

  isInAcquisitionPlane(): boolean {
    // A named orientation (axial on an axial CT) can be the acquisition plane, so test the geometry.
    const reference = this.viewport.getViewReference?.();
    const volume = reference?.volumeId ? cache.getVolume(reference.volumeId) : undefined;

    if (volume && reference.viewPlaneNormal) {
      return csUtils.isAcquisitionPlaneNormal(
        volume,
        reference.viewPlaneNormal as CoreTypes.Point3
      );
    }

    // orientation defaults to ACQUISITION when unset on the native view state.
    const orientation = this.viewport.getViewState?.()?.orientation;
    return orientation === Enums.OrientationAxis.ACQUISITION || orientation == null;
  }

  hasContent(): boolean {
    // Planar native viewports have no getActors (it throws); content presence
    // is reported by the content mode (empty/unknown means nothing bound).
    const mode = this.viewport.getCurrentMode?.();
    return !!mode && mode !== 'empty' && mode !== 'unknown';
  }

  // ---- view geometry ----

  getViewState(): ViewportViewState {
    return this.viewport.getViewState?.() ?? {};
  }

  setViewState(patch: ViewportViewState): void {
    this.viewport.setViewState?.(patch);
  }

  getViewPlaneNormal(): CoreTypes.Point3 | undefined {
    return this.viewport.getViewReference?.()?.viewPlaneNormal as CoreTypes.Point3 | undefined;
  }

  getFocalPoint(): CoreTypes.Point3 | undefined {
    // The native view state carries no focalPoint; it comes from the view reference.
    return this.viewport.getViewReference?.()?.cameraFocalPoint as CoreTypes.Point3 | undefined;
  }

  // ---- per-display-set appearance ----

  getAppearance(displaySetId?: string): ViewportAppearance {
    return this.viewport.getDisplaySetAppearance?.(displaySetId) ?? {};
  }

  getEffectiveAppearance(displaySetId?: string): ViewportAppearance {
    return this.viewport.getEffectiveDisplaySetAppearance?.(displaySetId) ?? {};
  }

  setAppearance(props: ViewportAppearance, displaySetId?: string): void {
    if (displaySetId) {
      this.viewport.setDisplaySetAppearance?.(displaySetId, props);
    } else {
      this.viewport.setDisplaySetAppearance?.(props);
    }
  }

  getBlendMode(displaySetId?: string): Enums.BlendModes | undefined {
    return this.getAppearance(displaySetId).blendMode;
  }

  // ---- data addressing ----

  getShownDisplaySetId(displaySetInstanceUID: string): string | undefined {
    const shown = this.viewport.getDisplaySets?.()?.map(entry => entry.displaySetId) ?? [];
    if (!shown.length || shown.includes(displaySetInstanceUID)) {
      return displaySetInstanceUID;
    }
    return undefined;
  }

  getVolumeIds(): string[] {
    const { viewport } = this;
    if (typeof viewport.getActors !== 'function' || typeof viewport.hasVolumeId !== 'function') {
      return [];
    }

    const volumeIds = viewport
      .getActors()
      .map(entry => entry.referencedId)
      .filter(id => !!id && viewport.hasVolumeId(id));

    return [...new Set(volumeIds)];
  }

  getDataIdForVolumeId(volumeId: string): string | undefined {
    return this.viewport.getDisplaySetIdForVolumeId?.(volumeId);
  }

  getVoxelManagerForDisplaySet(
    displaySetInstanceUID: string
  ): { getRange?: () => [number, number]; [key: string]: unknown } | undefined {
    // No getAllVolumeIds/getImageData(volumeId); resolve the display set's volume
    // from the cornerstone cache instead. Anchored match: volumeIds are built as
    // `${loaderSchema}:${displaySetInstanceUID}`, and an unanchored includes()
    // could resolve a different cached volume whose id merely embeds the same
    // UID (e.g. a derived labelmap id).
    const volume = cache
      .getVolumes()
      .find(
        v =>
          v.volumeId === displaySetInstanceUID || v.volumeId?.endsWith(`:${displaySetInstanceUID}`)
      );
    return volume?.voxelManager as unknown as
      | { getRange?: () => [number, number]; [key: string]: unknown }
      | undefined;
  }

  // ---- capture ----

  async copyDisplayedContentTo(target: CoreTypes.IViewport): Promise<void> {
    const targetViewport = target as NativeViewport;
    const viewRef = this.viewport.getViewReference?.();

    // The source's display set is registered by the display set service under its
    // UID, so re-mount it on the capture viewport by id in the mode it has here, then
    // copy per-binding presentation + view state. The native classes have no
    // setStack/setVolumes/setProperties/setViewPresentation.
    const sourceDisplaySetId = this.viewport.getSourceDisplaySetId?.();
    if (sourceDisplaySetId) {
      const { orientation } = this.getViewState();
      const sourceOptions = this.viewport
        .getDisplaySets?.()
        ?.find(entry => entry.displaySetId === sourceDisplaySetId)?.options as
        | { mode?: string }
        | undefined;
      const mode = sourceOptions?.mode;
      await targetViewport.setDisplaySets?.({
        displaySetId: sourceDisplaySetId,
        options: { orientation, role: 'source', ...(mode ? { mode } : {}) },
      });

      targetViewport.setDisplaySetAppearance?.(
        sourceDisplaySetId,
        this.getAppearance(sourceDisplaySetId)
      );
    }

    // Slice/orientation via the view reference, then pan/zoom/rotate/flip via view state.
    if (viewRef && targetViewport.setViewReference) {
      targetViewport.setViewReference(viewRef);
    }
    targetViewport.setViewState?.(this.getViewState());
  }
}
