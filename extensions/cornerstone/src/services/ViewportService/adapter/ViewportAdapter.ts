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
  getCurrentMode?: () => string;
  getActors?: () => Array<{ referencedId?: string }>;
  hasVolumeId?: (volumeId: string) => boolean;
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
}
