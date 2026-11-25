import {
  Enums as csEnums,
  Types,
  isRegisteredRenderBackend,
  viewportProjection,
} from '@cornerstonejs/core';
import type {
  RenderBackendValue,
  ECGViewport,
  PlanarViewport,
  PlanarMountOptions,
  Volume3DMountOptions,
  VolumeViewport3D,
} from '@cornerstonejs/core';
import { utilities as csToolsUtils } from '@cornerstonejs/tools';
import { getViewportRenderingOverride } from '../../../utils/viewportRendering';
import { getViewportDataShape } from '../../../utils/viewportDataShape';
import type ViewportInfo from '../Viewport';
import type {
  Presentations,
  PositionPresentation,
  LutPresentation,
} from '../../../types/Presentation';
import type { StackViewportData, VolumeViewportData } from '../../../types/CornerstoneCacheService';
import type { IViewportBackend, StackMountContext, VolumeMountContext } from './IViewportBackend';
import type { IViewportServiceInternals } from './IViewportServiceInternals';

// Mirrors WITH_ORIENTATION in CornerstoneViewportService (inlined to avoid a
// value import that would create a backend -> service circular dependency).
const WITH_ORIENTATION = { withNavigation: true, withOrientation: true };

/**
 * Per-mount render backend override for a planar mount, resolved from the
 * `<viewportType>.viewportRendering` URL param / appConfig captured at init
 * (e.g. `?orthographic.viewportRendering=cpu`). Validated at mount time (not
 * init) because extension backends may call registerRenderBackend after the
 * cornerstone extension initializes; an unregistered value is dropped with a
 * warning rather than failing the mount.
 */
function getMountRenderBackend(viewportTypeKey: string): RenderBackendValue | undefined {
  const backend = getViewportRenderingOverride(viewportTypeKey);
  if (!backend) {
    return undefined;
  }
  if (backend !== 'auto' && !isRegisteredRenderBackend(backend)) {
    console.warn(
      `${viewportTypeKey}.viewportRendering: "${backend}" is not a registered render backend; ignoring.`
    );
    return undefined;
  }
  return backend as RenderBackendValue;
}

// The PlanarViewState fields that encode pan/zoom/rotation/flip. Slice and
// orientation are deliberately EXCLUDED — they are restored via the view reference,
// and a partial setViewState patch that omits them leaves them untouched (the merge
// at PlanarViewport.setViewState preserves unspecified fields).
const NATIVE_VIEW_PRESENTATION_KEYS = [
  'displayArea',
  'anchorWorld',
  'anchorCanvas',
  'scale',
  'scaleMode',
  'rotation',
  'flipHorizontal',
  'flipVertical',
] as const;

// Minimal structural view of a native PlanarViewport's semantic accessors. These
// live on the planar viewport (not IViewport), so we cast at the boundary
// rather than import core-internal PlanarViewport/PlanarViewState types.
type NativePlanarViewport = Types.IViewport<Record<string, unknown>> & {
  getViewState: () => Record<string, unknown>;
  setViewState: (patch: Record<string, unknown>) => void;
  getViewReference: () => Types.ViewReference;
  setViewReference: (ref: Types.ViewReference) => void;
  isReferenceViewable?: (ref: Types.ViewReference, opts?: unknown) => boolean;
};

/** The zoom and the pan of a 3D viewport, measured against the fit of its content. */
type View3DPresentation = { zoom?: number; pan?: [number, number] };

/**
 * The keys of a stored LUT presentation that a mount applies as the initial
 * appearance of its source.
 */
const LUT_APPEARANCE_KEYS = ['voiRange', 'invert', 'colormap'] as const;

/**
 * Copies the keys that are set in `properties` out of it: the appearance that
 * a mount gives its display set from its first draw.
 */
function pickAppearance(
  properties: Record<string, unknown> | undefined,
  keys: readonly string[]
): Record<string, unknown> {
  const appearance: Record<string, unknown> = {};
  for (const key of keys) {
    if (properties?.[key] !== undefined) {
      appearance[key] = properties[key];
    }
  }
  return appearance;
}

/** Picks the pan/zoom/rotation/flip subset out of a (deep-cloned) getViewState() result. */
function pickNativeViewPresentation(viewState: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of NATIVE_VIEW_PRESENTATION_KEYS) {
    if (viewState[key] !== undefined) {
      out[key] = viewState[key];
    }
  }
  return out;
}

/**
 * The viewport backend. Routes the mount by the bound data shape (a planar
 * viewport shows a stack and a volume, so the viewport type cannot tell them
 * apart) and owns the per-family MOUNT BODIES
 * (mountStack/mountVolumes/mountEcg/mountOther/remount). A display set is
 * registered once, by the display set service, under its
 * `displaySetInstanceUID`: every mount names it by that UID and says on its
 * options what the viewport wants of it (the mode, the volume, the first image,
 * the appearance).
 */
export class ViewportBackend implements IViewportBackend {
  constructor(private readonly service: IViewportServiceInternals) {}

  dispatchMount(
    viewport: Types.IViewport,
    viewportData: StackViewportData | VolumeViewportData,
    viewportInfo: ViewportInfo,
    presentations: Presentations = {}
  ): Promise<void> {
    // Non-planar families (video / WSI / ECG) route by viewport TYPE to their
    // dedicated mounts: the bound data shape cannot distinguish them.
    const type = (viewport as { type?: string }).type;

    if (type === csEnums.ViewportType.ECG) {
      return this.service._setEcgViewport(
        viewport as unknown as ECGViewport,
        viewportData as StackViewportData
      );
    }

    if (type === csEnums.ViewportType.VIDEO || type === csEnums.ViewportType.WHOLE_SLIDE) {
      return this.service._setOtherViewport(
        viewport as unknown as PlanarViewport,
        viewportData as StackViewportData,
        viewportInfo,
        presentations
      );
    }

    // A planar viewport shows a stack and a volume, so route by the shape of the
    // data: the dataShapeType that CornerstoneCacheService stores, which is the
    // discriminator used everywhere else.
    const dataShape = getViewportDataShape(viewportData);
    const isVolumeContent = dataShape === 'volume' || dataShape === 'volume3d';

    if (isVolumeContent) {
      return this.service._setVolumeViewport(
        viewport as unknown as PlanarViewport,
        viewportData as VolumeViewportData,
        viewportInfo,
        presentations
      );
    }

    return this.service._setStackViewport(
      viewport as unknown as PlanarViewport,
      viewportData as StackViewportData,
      viewportInfo,
      presentations
    );
  }

  /**
   * Stack mount: mounts the display set by its UID as a stack, on its first
   * image and with its VOI/invert/colormap as the appearance of the first draw,
   * then applies pan/zoom/rotate/flip/displayArea via setViewState — a planar
   * viewport has no setStack, setProperties or setCamera.
   */
  async mountStack(viewport: PlanarViewport, context: StackMountContext): Promise<void> {
    const {
      displaySetInstanceUIDs,
      imageIds,
      initialImageIndex,
      properties,
      displayArea,
      rotation,
      flipHorizontal,
      presentations,
      overlayProcessingResults,
    } = context;

    if (!imageIds?.length) {
      return;
    }

    const vp = viewport as unknown as NativePlanarViewport & {
      element: HTMLDivElement;
      id: string;
    };

    const stackRenderBackend = getMountRenderBackend('stack');
    const options: PlanarMountOptions = {
      mode: 'stack',
      orientation: csEnums.OrientationAxis.ACQUISITION,
      role: 'source',
      initialImageIdIndex: initialImageIndex,
      appearance: pickAppearance(properties, LUT_APPEARANCE_KEYS),
      ...(stackRenderBackend ? { renderBackend: stackRenderBackend } : {}),
    };
    await viewport.setDisplaySets({ displaySetId: displaySetInstanceUIDs[0], options });

    const viewStatePatch: Record<string, unknown> = {};
    if (displayArea) {
      viewStatePatch.displayArea = displayArea;
    }
    if (rotation) {
      viewStatePatch.rotation = rotation;
    }
    if (flipHorizontal) {
      viewStatePatch.flipHorizontal = true;
    }
    if (Object.keys(viewStatePatch).length > 0) {
      vp.setViewState(viewStatePatch);
    }

    // Enable stack-context prefetch for the native path. setDisplaySets above has
    // already read the imageIds of the registered display set, so getStackData
    // returns a valid stack at enable() time. Scroll re-prefetch is driven by the
    // NEW_IMAGE event.
    csToolsUtils.stackContextPrefetch.enable(vp.element);

    // Restore persisted pan/zoom/rotation/flip (+ view reference) on top of the
    // HP-derived defaults applied above, so a returning display set recovers its
    // camera presentation. The LUT was already applied inline above, so restore
    // position + segmentation only. Replaying segmentationPresentation re-adds
    // hydrated representations (RTSS contour / SEG labelmap) on this native re-mount;
    // without it a hydrated overlay silently disappears (the contour-vanishes-on-
    // hydrate bug), because the overlay display set is no longer in the viewport's
    // display-set list after hydration. Native-safe: position via setViewReference/
    // setViewState, and the replayed addSegmentationRepresentation routes through the
    // native segmentation backend (no convertStackToVolumeViewport / getViewPresentation).
    if (presentations?.positionPresentation || presentations?.segmentationPresentation) {
      this.service.setPresentations(vp.id, {
        positionPresentation: presentations.positionPresentation,
        segmentationPresentation: presentations.segmentationPresentation,
      });
    }

    await this.service._addOverlayRepresentations(overlayProcessingResults);
  }

  /**
   * Volume/MPR mount: a planar viewport renders a volume by mounting each
   * display set by its UID with mode 'volume', the requested orientation and
   * the id of its already-cached volume; a 3D viewport by mounting it with that
   * volume id. The stored LUT presentation is the appearance of the source from
   * its first draw. Returns true when it mounted; an overlay-only mount (no base
   * volumes) returns false, and the service adds its overlays.
   */
  async mountVolumes(viewport: Types.IViewport, context: VolumeMountContext): Promise<boolean> {
    const {
      filteredVolumeInputArray,
      volumesProperties,
      viewportInfo,
      overlayProcessingResults,
      presentations,
    } = context;

    if (!filteredVolumeInputArray.length) {
      return false;
    }

    await this._setNativeVolumeDisplaySets(
      viewport,
      filteredVolumeInputArray,
      volumesProperties,
      viewportInfo,
      overlayProcessingResults,
      presentations?.lutPresentation
    );

    // Restore persisted pan/zoom/rotation/flip (+ view reference) so a returning
    // MPR/volume pane recovers its camera, and replay segmentationPresentation so
    // hydrated overlays (SEG labelmap / RTSS contour) reappear on this native
    // re-mount instead of vanishing.
    if (presentations?.positionPresentation || presentations?.segmentationPresentation) {
      this.service.setPresentations(viewport.id, {
        positionPresentation: presentations.positionPresentation,
        segmentationPresentation: presentations.segmentationPresentation,
      });
    }
    return true;
  }

  /**
   * An ECG viewport has no setEcg: mount the display set by its UID through the
   * setDisplaySets API. The ECG viewport reads the image id of the waveform from
   * the registered display set (the image id of its `instance`).
   */
  async mountEcg(
    viewport: ECGViewport,
    displaySet: { displaySetInstanceUID: string }
  ): Promise<void> {
    this.service._trackViewportDisplaySets(viewport.id, [displaySet.displaySetInstanceUID]);
    await viewport.setDisplaySets({ displaySetId: displaySet.displaySetInstanceUID });
  }

  /**
   * Video and whole slide viewports: mount the display set by its UID through the
   * setDisplaySets API. The video viewport reads the image id of the registered
   * display set (the image id of its `instance`); the whole slide viewport reads
   * its imageIds and the DICOMweb client that the SOP class handler registered as
   * the WADO_WEB_CLIENT metadata of its first image.
   */
  async mountOther(
    viewport: Types.IViewport,
    displaySet: { displaySetInstanceUID: string }
  ): Promise<void> {
    this.service._trackViewportDisplaySets(viewport.id, [displaySet.displaySetInstanceUID]);
    await (
      viewport as unknown as {
        setDisplaySets: (args: { displaySetId: string }) => Promise<void>;
      }
    ).setDisplaySets({ displaySetId: displaySet.displaySetInstanceUID });
  }

  /**
   * Re-mount: no getCamera/setCamera. Snapshot/restore the camera via the
   * semantic view state, and route the mount through dispatchMount (it routes by
   * data shape, since a stack and a volume both report PLANAR).
   */
  remount(
    viewport: Types.IViewport,
    viewportData: StackViewportData | VolumeViewportData,
    viewportInfo: ViewportInfo,
    keepCamera: boolean
  ): Promise<void> {
    const vp = viewport as NativePlanarViewport;
    const viewState = keepCamera ? (vp.getViewState?.() ?? {}) : undefined;
    return this.dispatchMount(viewport, viewportData, viewportInfo).then(() => {
      if (keepCamera && viewState) {
        vp.setViewState?.(viewState);
        viewport.render();
      }
    });
  }

  /**
   * Mounts one or more volumes on a native viewport for volume/MPR rendering, in
   * one setDisplaySets call: a planar viewport replaces its display sets
   * (removeReplaceableData), so the first entry is the source (the CT of a
   * fusion) and the others are overlays, and a call per volume would drop the
   * source. Each display set is mounted by its UID with the id of its cached
   * volume, a planar one with mode 'volume' and the orientation of the viewport.
   * The appearance of each entry is the VOI/invert/colormap of its display set
   * options, with the blend mode and the slab of a projection (the TMTV MIP)
   * for a planar viewport and the preset for a 3D one; the stored LUT
   * presentation goes over the appearance of the source.
   */
  private async _setNativeVolumeDisplaySets(
    viewport: Types.IViewport,
    filteredVolumeInputArray: VolumeMountContext['filteredVolumeInputArray'],
    volumesProperties: VolumeMountContext['volumesProperties'],
    viewportInfo: ViewportInfo,
    overlayProcessingResults: VolumeMountContext['overlayProcessingResults'],
    lutPresentation?: LutPresentation
  ): Promise<void> {
    const orientation = viewportInfo.getOrientation();
    const is3D = (viewport as { type?: string }).type === csEnums.ViewportType.VOLUME_3D;
    const nativeViewport = viewport as unknown as {
      setDisplaySets: (
        ...entries: Array<{
          displaySetId: string;
          options: PlanarMountOptions | Volume3DMountOptions;
        }>
      ) => Promise<void>;
      render: () => void;
    };
    const volumeRenderBackend = is3D ? undefined : getMountRenderBackend('orthographic');
    const storedProperties =
      lutPresentation?.properties instanceof Map ? undefined : lutPresentation?.properties;

    const entries = filteredVolumeInputArray.map(({ volumeInput }, index) => {
      const { volumeId, displaySetInstanceUID, blendMode, slabThickness } = volumeInput;
      const properties = volumesProperties[index]?.properties;
      const role = index === 0 ? 'source' : 'overlay';
      const appearance = {
        ...pickAppearance(
          properties,
          is3D ? ['voiRange', 'invert', 'preset'] : LUT_APPEARANCE_KEYS
        ),
        ...(!is3D && properties
          ? pickAppearance({ blendMode, slabThickness }, ['blendMode', 'slabThickness'])
          : {}),
        ...(index === 0 ? pickAppearance(storedProperties, LUT_APPEARANCE_KEYS) : {}),
      };
      const options: PlanarMountOptions | Volume3DMountOptions = is3D
        ? { role, volumeId, appearance: appearance as Volume3DMountOptions['appearance'] }
        : {
            mode: 'volume',
            orientation,
            role,
            volumeId,
            appearance: appearance as PlanarMountOptions['appearance'],
            ...(volumeRenderBackend ? { renderBackend: volumeRenderBackend } : {}),
          };

      return { displaySetId: displaySetInstanceUID, options };
    });

    await nativeViewport.setDisplaySets(...entries);

    // Do NOT overwrite the service's viewport display-set bookkeeping here. The
    // caller (_setVolumeViewport) already populated it with the COMPLETE set (base
    // volumes + SEG/RT/fusion overlays) before this native mount; writing back the
    // base-volume-only ids would drop the overlay UIDs from getViewportDisplaySets()
    // and the later presentation/hydration flows.

    await this.service._addOverlayRepresentations(overlayProcessingResults);
    nativeViewport.render();
  }

  getPositionPresentation(
    csViewport: Types.IViewport,
    viewportInfo: ViewportInfo,
    viewportId: string
  ): PositionPresentation {
    if (csViewport.type === csEnums.ViewportType.VOLUME_3D) {
      // The view state of a 3D viewport is its camera, in world units. Its zoom
      // and its pan against the fit are what holds through a resize: the same
      // zoom shows the content at the same share of a canvas of another size.
      const presentation = viewportProjection.getFraming<View3DPresentation>(csViewport, {
        selector: { zoom: true, pan: true },
      });

      return {
        viewportType: viewportInfo.getViewportType(),
        viewReference: null,
        viewPresentation: (presentation
          ? { zoom: presentation.zoom, pan: presentation.pan }
          : undefined) as unknown as Types.ViewFraming,
        viewportId,
      };
    }

    const vp = csViewport as NativePlanarViewport;

    // A planar viewport has no getViewPresentation; pan/zoom/rotation/flip
    // live in the semantic view state. getViewState() is already deep-cloned, normalized
    // and JSON-serializable, so snapshot the pan/zoom subset (slice/orientation come back
    // via the view reference).
    const viewState = typeof vp.getViewState === 'function' ? vp.getViewState() : undefined;

    return {
      viewportType: viewportInfo.getViewportType(),
      viewReference: vp.getViewReference(),
      // Opaque native pan/zoom blob; cast at the boundary (legacy stores a Types.ViewPresentation).
      viewPresentation: (viewState
        ? pickNativeViewPresentation(viewState)
        : undefined) as unknown as Types.ViewFraming,
      viewportId,
    };
  }

  setPositionPresentation(
    viewport: Types.IViewport,
    positionPresentation: PositionPresentation
  ): void {
    if (viewport.type === csEnums.ViewportType.VOLUME_3D) {
      this._set3DViewPresentation(
        viewport as unknown as VolumeViewport3D,
        positionPresentation?.viewPresentation as unknown as View3DPresentation | undefined
      );
      return;
    }

    const vp = viewport as NativePlanarViewport;

    // 1) Slice + orientation first, via the view reference.
    const viewRef = positionPresentation?.viewReference;
    if (viewRef && vp.isReferenceViewable?.(viewRef, WITH_ORIENTATION)) {
      vp.setViewReference(viewRef);
    }

    // 2) Pan/zoom/rotation/flip second, as a partial setViewState patch that omits
    //    slice/orientation so step 1 is preserved (the merge keeps unspecified fields).
    const vpres = positionPresentation?.viewPresentation as unknown as
      | Record<string, unknown>
      | undefined;
    if (vpres && typeof vp.setViewState === 'function') {
      const patch: Record<string, unknown> = {};
      for (const key of NATIVE_VIEW_PRESENTATION_KEYS) {
        if (vpres[key] !== undefined) {
          patch[key] = vpres[key];
        }
      }
      if (Object.keys(patch).length > 0) {
        // When the snapshot held live anchor/scale pan/zoom, displayArea was omitted;
        // clear any stale displayArea explicitly so anchor/scale take effect (setViewState
        // only rewrites displayArea when it is an own key of the patch).
        if (!('displayArea' in patch)) {
          patch.displayArea = undefined;
        }
        vp.setViewState(patch);
      }
    }
  }

  /**
   * Gives a 3D viewport the zoom and the pan of a stored presentation, against
   * the fit of the viewport as it is now. A viewport that shows nothing yet has
   * no fit and is left as it is.
   */
  private _set3DViewPresentation(
    viewport: VolumeViewport3D,
    viewPresentation?: View3DPresentation
  ): void {
    if (viewPresentation?.zoom === undefined && viewPresentation?.pan === undefined) {
      return;
    }

    const { zoom, pan } = viewPresentation;
    const viewState = viewportProjection.withFraming(viewport, { zoom, pan });

    if (viewState) {
      viewport.setViewState(viewState);
    }
  }

  setLutPresentation(viewport: Types.IViewport, lutPresentation: LutPresentation): void {
    if (!lutPresentation) {
      return;
    }
    const { properties } = lutPresentation;
    // The LUT presentation is the getDisplaySetAppearance shape (voiRange/
    // colormap/invert), not a per-volumeId Map; a planar viewport applies it via
    // setDisplaySetAppearance (it has no setProperties).
    if (!properties || properties instanceof Map) {
      return;
    }
    const nativeViewport = viewport as unknown as {
      setDisplaySetAppearance: (props: Record<string, unknown>) => void;
    };
    const presentationProps: Record<string, unknown> = {};
    if (properties.voiRange) {
      presentationProps.voiRange = properties.voiRange;
    }
    if (properties.invert !== undefined) {
      presentationProps.invert = properties.invert;
    }
    if (properties.colormap) {
      presentationProps.colormap = properties.colormap;
    }
    if (Object.keys(presentationProps).length > 0) {
      nativeViewport.setDisplaySetAppearance(presentationProps);
    }
  }
}
