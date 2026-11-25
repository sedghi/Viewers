import { Enums, cache, Types as CoreTypes, utilities as csUtils } from '@cornerstonejs/core';
import type {
  IViewportAdapter,
  ViewportColormap,
  ViewportPresentation,
  ViewportShape,
  ViewportViewState,
  VOIRange,
} from './IViewportAdapter';

/**
 * Structural view of the viewport surface used by the adapter. These accessors
 * are on the viewport classes (not on IViewport), so we cast at this boundary
 * rather than import core-internal PlanarViewport types.
 */
type NativeViewport = CoreTypes.IViewport<ViewportViewState, ViewportPresentation> & {
  getSourceDisplaySetId?: () => string | undefined;
  getDisplaySets?: () => Array<{ displaySetId: string; options?: { mode?: string } }>;
  getDisplaySetAppearance?: (displaySetId: string) => ViewportPresentation | undefined;
  getDefaultVOIRange?: (displaySetId?: string) => VOIRange | undefined;
  setDisplaySetAppearance?: {
    (props: ViewportPresentation): void;
    (displaySetId: string, props: ViewportPresentation): void;
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

const voiRangesClose = (a: VOIRange, b: VOIRange, eps = 0.001): boolean =>
  Math.abs(a.lower - b.lower) < eps && Math.abs(a.upper - b.upper) < eps;

/** Whether a colormap opacity is a list of opacities by value (`{ value, opacity }`). */
const isOpacityPoints = (opacity: unknown): opacity is Array<{ value: number; opacity: number }> =>
  Array.isArray(opacity) &&
  opacity.length > 0 &&
  opacity.every(point => typeof point?.value === 'number' && typeof point?.opacity === 'number');

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

  getPresentation(displaySetId?: string): ViewportPresentation {
    const id = displaySetId ?? this.viewport.getSourceDisplaySetId?.();
    const presentation = (id ? this.viewport.getDisplaySetAppearance?.(id) : undefined) ?? {};

    // A native binding's presentation normally holds only EXPLICIT VOI overrides,
    // but a computed default VOI can transiently land here during intermediate
    // mounts (e.g. while a SEG hydrates, the base image briefly mounts as a volume
    // and its min/max default is stored). Flag such a VOI as computed when it
    // matches the binding's default so the LUT-presentation capture (cleanProperties)
    // strips it instead of persisting+restoring it over the real default — matching
    // legacy StackViewport's isComputedVOI. Stamping is harmless even on a genuine
    // user VOI that happens to equal the default (stripping it falls back to the
    // same value).
    const voiRange = presentation.voiRange;
    if (voiRange && presentation.isComputedVOI === undefined) {
      const defaultVOIRange = this.viewport.getDefaultVOIRange?.(id);
      if (defaultVOIRange && voiRangesClose(voiRange, defaultVOIRange)) {
        return { ...presentation, isComputedVOI: true };
      }
    }

    return presentation;
  }

  setPresentation(props: ViewportPresentation, displaySetId?: string): void {
    const id = displaySetId ?? this.viewport.getSourceDisplaySetId?.();
    if (id) {
      this.viewport.setDisplaySetAppearance?.(id, props);
    } else {
      this.viewport.setDisplaySetAppearance?.(props);
    }
  }

  getDefaultVOIRange(displaySetId?: string): VOIRange | undefined {
    return this.viewport.getDefaultVOIRange?.(displaySetId);
  }

  getColormap(displaySetInstanceUID: string): ViewportColormap | undefined {
    return this.getPresentation(displaySetInstanceUID).colormap;
  }

  /**
   * Merges the opacity into the stored colormap, which keeps its name and
   * threshold. When the layer has opacity points by value (the ramp of the
   * PET of a fusion), the opacity scales them, as on the legacy volume
   * viewport: each point is drawn at `opacity` times its own. Points stored
   * as a list in `opacity`, as a hanging protocol gives them, become the
   * `opacityMapping` of the colormap, so that the number does not replace
   * them. A layer without points gets the opacity as it is.
   */
  setLayerOpacity(displaySetInstanceUID: string, opacity: number): boolean {
    const { opacity: storedOpacity, ...currentColormap } =
      this.getPresentation(displaySetInstanceUID).colormap ?? {};
    const opacityMapping = isOpacityPoints(storedOpacity)
      ? storedOpacity
      : currentColormap.opacityMapping;
    const colormap = opacityMapping
      ? { ...currentColormap, opacityMapping, opacity }
      : { ...currentColormap, opacity };

    this.setPresentation({ colormap }, displaySetInstanceUID);
    return true;
  }

  setLayerThreshold(displaySetInstanceUID: string, threshold: number): boolean {
    // Merge the threshold into the existing colormap so its name/opacity persist.
    // The threshold is an absolute pixel/SUV value, matching the legacy volume path.
    const currentColormap = this.getPresentation(displaySetInstanceUID).colormap ?? {};
    this.setPresentation({ colormap: { ...currentColormap, threshold } }, displaySetInstanceUID);
    return true;
  }

  getBlendMode(displaySetId?: string): Enums.BlendModes | undefined {
    return this.getPresentation(displaySetId).blendMode;
  }

  getOpacityGamma(): number {
    // Native volume viewports render the fusion as a volume slice whose blend is
    // linear in the opacity scalar, so the slider maps 1:1.
    return 1;
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
        this.getPresentation(sourceDisplaySetId)
      );
    }

    // Slice/orientation via the view reference, then pan/zoom/rotate/flip via view state.
    if (viewRef && targetViewport.setViewReference) {
      targetViewport.setViewReference(viewRef);
    }
    targetViewport.setViewState?.(this.getViewState());
  }
}
