import type { PlanarViewport, VolumeViewport3D } from '@cornerstonejs/core';
import {
  utilities as csUtils,
  CONSTANTS as csConstants,
  Enums as csEnums,
  Types as CoreTypes,
  viewportProjection,
} from '@cornerstonejs/core';
import { vec3 } from 'gl-matrix';
import { getViewportAdapter } from '../adapter';
import { getCenterExtent } from '../../../utils/getCenterExtent';
import { isMeasurementWithinViewport } from '../../../utils/isMeasurementWithinViewport';
import type {
  IViewportOperations,
  FlipValue,
  RotationMode,
  VolumeLightingOptions,
  WindowLevelParams,
  ColormapParams,
} from './IViewportOperations';

/**
 * Members of a planar viewport that the viewport adapter does not cover, read
 * structurally at the boundary.
 */
type NativePlanarViewport = CoreTypes.IViewport & {
  resetViewState?: () => void;
  resetDisplaySetPresentation?: (dataId?: string) => void;
  getZoom?: () => number;
  setZoom?: (zoom: number) => void;
};

// Loose view of the VTK actor/mapper/property chain used by the 3D VR ops. These
// live on vtk.js objects, not cornerstone types, so they are accessed structurally.
type VtkActorChain = {
  actor: {
    getMapper: () => Record<string, (...args: unknown[]) => unknown>;
    getProperty: () => Record<string, (...args: unknown[]) => unknown>;
  };
};

/**
 * The operations on a viewport that the commands use. commandsModule (and any
 * other caller) imports this and calls e.g. `viewportOperations.flipHorizontal(viewport)`,
 * which keeps the interaction logic out of the command bodies. Stateless and
 * dependency-free (each op takes an already-resolved viewport), so it is a plain
 * singleton rather than a registered service.
 *
 * Appearance and camera/view-state ops go through the viewport adapter (which
 * encapsulates getViewState/setViewState and
 * getDisplaySetPresentation/setDisplaySetPresentation, including the
 * active-binding dataId default); the remaining ops call the viewport's own
 * members directly.
 *
 * No method calls viewport.render() — the command renders.
 */
export const viewportOperations: IViewportOperations = {
  flipHorizontal(viewport: CoreTypes.IViewport, newValue: FlipValue = 'toggle'): void {
    const adapter = getViewportAdapter(viewport);
    const flipHorizontal =
      newValue === 'toggle' ? !adapter.getViewState().flipHorizontal : newValue;
    adapter.setViewState({ flipHorizontal });
  },

  flipVertical(viewport: CoreTypes.IViewport, newValue: FlipValue = 'toggle'): void {
    const adapter = getViewportAdapter(viewport);
    const flipVertical = newValue === 'toggle' ? !adapter.getViewState().flipVertical : newValue;
    adapter.setViewState({ flipVertical });
  },

  invert(viewport: CoreTypes.IViewport): void {
    const adapter = getViewportAdapter(viewport);
    const { invert } = adapter.getPresentation();
    adapter.setPresentation({ invert: !invert });
  },

  rotate(viewport: CoreTypes.IViewport, rotation: number, mode: RotationMode = 'apply'): void {
    // rotation/flip live in the semantic view state; getViewPresentation is absent.
    const adapter = getViewportAdapter(viewport);
    const state = adapter.getViewState();
    const currentRotation = (state.rotation as number) ?? 0;
    const newRotation =
      mode === 'apply'
        ? (currentRotation + rotation + 360) % 360
        : (() => {
            const flipsParity = (state.flipHorizontal ? 1 : 0) + (state.flipVertical ? 1 : 0);
            const effectiveRotation = flipsParity % 2 === 1 ? -rotation : rotation;
            return (effectiveRotation + 360) % 360;
          })();
    adapter.setViewState({ rotation: newRotation });
  },

  reset(viewport: CoreTypes.IViewport): void {
    const vp = viewport as NativePlanarViewport;
    // Reset the per-display-set presentation (VOI/colormap/invert) to defaults.
    vp.resetDisplaySetPresentation?.();
    // A planar viewport has no resetCamera; resetViewState resets pan/zoom/rotation/orientation/flip.
    vp.resetViewState?.();
  },

  scaleBy(viewport: CoreTypes.IViewport, direction: number): void {
    // parallelScale and zoom are inversely related (smaller parallelScale = more
    // zoomed in = larger zoom), so divide by scaleFactor to match the legacy direction.
    const scaleFactor = direction > 0 ? 0.9 : 1.1;
    const vp = viewport as unknown as {
      getZoom?: () => number;
      setZoom?: (zoom: number) => void;
      resetViewState?: (options?: { resetOrientation?: boolean }) => void;
    };
    if (direction) {
      if (vp.getZoom && vp.setZoom) {
        vp.setZoom(vp.getZoom() / scaleFactor);
      }
    } else {
      // direction === 0 is the fitViewportToWindow command. Legacy resetCamera()
      // resets pan/zoom/rotation/flip but never the viewing orientation, while a
      // full native resetViewState() would also snap an MPR back to its requested
      // axis — so keep the orientation.
      vp.resetViewState?.({ resetOrientation: false });
    }
  },

  setOrientation(viewport: CoreTypes.IViewport, orientation: csEnums.OrientationAxis): boolean {
    if (viewport.type !== csEnums.ViewportType.VOLUME_3D) {
      (viewport as PlanarViewport).setOrientation(orientation);

      return true;
    }

    const vectors = csConstants.MPR_CAMERA_VALUES[orientation];

    if (!vectors) {
      console.warn(`A 3D viewport cannot be turned to the orientation "${orientation}"`);

      return false;
    }

    const viewport3D = viewport as VolumeViewport3D;
    const { viewPlaneNormal, viewUp } = vectors;

    viewport3D.setViewState({ viewPlaneNormal, viewUp });
    viewport3D.resetViewState();

    return true;
  },

  getViewPlaneNormal(viewport: CoreTypes.IViewport): CoreTypes.Point3 | undefined {
    return getViewportAdapter(viewport).getViewPlaneNormal();
  },

  centerOnMeasurement(
    viewport: CoreTypes.IViewport,
    measurement: Record<string, unknown>
  ): boolean {
    if (viewport.type !== csEnums.ViewportType.PLANAR) {
      return false;
    }

    if (isMeasurementWithinViewport(viewport, measurement)) {
      return false;
    }

    const planarViewport = viewport as PlanarViewport;
    const camera = planarViewport.getResolvedView()?.toICamera();
    const presentation = viewportProjection.getPresentation(planarViewport, {
      selector: { zoom: true, pan: true },
    });

    if (!camera || !presentation) {
      return false;
    }

    const { zoom = 1, pan = [0, 0] } = presentation;
    const { center, extent } = getCenterExtent(measurement);
    const [canvasX, canvasY] = planarViewport.worldToCanvas(center);
    const { clientWidth, clientHeight } = planarViewport.canvas;
    const measurementSize = vec3.dist(extent.min, extent.max);
    const nextViewState = viewportProjection.withPresentation(planarViewport, {
      zoom:
        measurementSize > camera.parallelScale
          ? zoom / (measurementSize / camera.parallelScale)
          : zoom,
      pan: [
        pan[0] + (clientWidth / 2 - canvasX) / zoom,
        pan[1] + (clientHeight / 2 - canvasY) / zoom,
      ],
    });

    if (!nextViewState) {
      return false;
    }

    planarViewport.setViewState(nextViewState);

    return true;
  },

  setWindowLevel(viewport: CoreTypes.IViewport, params: WindowLevelParams): void {
    const { lower, upper } = csUtils.windowLevel.toLowHighRange(
      params.windowWidth,
      params.windowCenter
    );
    // Target the binding for params.displaySetInstanceUID so a PT/CT *fusion* W/L lands
    // on the intended layer (e.g. the PT overlay) instead of always the source (CT) —
    // mirroring setColormap. When no id is given (single stack/volume) the adapter falls
    // back to the source binding.
    getViewportAdapter(viewport).setPresentation(
      { voiRange: { upper, lower } },
      params.displaySetInstanceUID
    );
  },

  setColormap(viewport: CoreTypes.IViewport, params: ColormapParams): void {
    // Target the binding for params.displaySetInstanceUID. OHIF's dataId scheme maps a
    // display set 1:1 onto its native dataId (bare UID), so a PT/CT *fusion* colormap lands
    // on the overlay (PT) binding instead of defaulting to the source (CT). When no id is
    // given (single-volume / plain stack colormap) the adapter falls back to the source.
    getViewportAdapter(viewport).setPresentation(
      { colormap: params.colormap },
      params.displaySetInstanceUID
    );
  },

  setPreset(viewport: CoreTypes.IViewport, preset: string): void {
    // The native VolumeViewport3D has no setProperties; apply the volume-rendering
    // preset (RGBA transfer function) to the volume actor directly.
    const presetObj = csConstants.VIEWPORT_PRESETS?.find(p => p.name === preset);
    const actor = (
      viewport as unknown as { getDefaultActor?: () => { actor?: unknown } | undefined }
    ).getDefaultActor?.()?.actor;
    if (presetObj && actor) {
      csUtils.applyPreset(actor as Parameters<typeof csUtils.applyPreset>[0], presetObj);
    }
  },

  setVolumeRenderingQuality(viewport: CoreTypes.IViewport, volumeQuality: number): void {
    const actorEntry = (viewport as unknown as PlanarViewport).getActors()[0];
    if (!actorEntry) {
      return;
    }
    const { actor } = actorEntry;
    const mapper = (actor as unknown as VtkActorChain['actor']).getMapper();
    const image = mapper.getInputData() as {
      getDimensions: () => number[];
      getSpacing: () => number[];
    };
    const dims = image.getDimensions();
    const spacing = image.getSpacing();
    const spatialDiagonal = vec3.length(
      vec3.fromValues(dims[0] * spacing[0], dims[1] * spacing[1], dims[2] * spacing[2])
    );

    let sampleDistance = spacing.reduce((a, b) => a + b) / 3.0;
    sampleDistance /= volumeQuality > 1 ? 0.5 * volumeQuality ** 2 : 1.0;
    const samplesPerRay = spatialDiagonal / sampleDistance + 1;
    mapper.setMaximumSamplesPerRay(samplesPerRay);
    mapper.setSampleDistance(sampleDistance);
  },

  shiftVolumeOpacityPoints(viewport: CoreTypes.IViewport, shift: number): void {
    const actorEntry = (viewport as unknown as PlanarViewport).getActors()[0];
    if (!actorEntry) {
      return;
    }
    const { actor } = actorEntry;
    const ofun = (actor as unknown as VtkActorChain['actor']).getProperty().getScalarOpacity(0) as {
      getSize: () => number;
      getNodeValue: (i: number, v: number[]) => void;
      removeAllPoints: () => void;
      addPoint: (...args: number[]) => void;
    };

    const opacityPointValues: number[][] = []; // Array to hold values
    // Gather Existing Values
    const size = ofun.getSize();
    for (let pointIdx = 0; pointIdx < size; pointIdx++) {
      const opacityPointValue = [0, 0, 0, 0];
      ofun.getNodeValue(pointIdx, opacityPointValue);
      // opacityPointValue now holds [xLocation, opacity, midpoint, sharpness]
      opacityPointValues.push(opacityPointValue);
    }
    // Add offset
    opacityPointValues.forEach(opacityPointValue => {
      opacityPointValue[0] += shift; // Change the location value
    });
    // Set new values
    ofun.removeAllPoints();
    opacityPointValues.forEach(opacityPointValue => {
      ofun.addPoint(...opacityPointValue);
    });
  },

  setVolumeLighting(viewport: CoreTypes.IViewport, options: VolumeLightingOptions): void {
    const actorEntry = (viewport as unknown as PlanarViewport).getActors()[0];
    if (!actorEntry) {
      return;
    }
    const { actor } = actorEntry;
    const property = (actor as unknown as VtkActorChain['actor']).getProperty() as {
      setShade: (v: boolean) => void;
      setAmbient: (v: number) => void;
      setDiffuse: (v: number) => void;
      setSpecular: (v: number) => void;
    };

    if (options.shade !== undefined) {
      property.setShade(options.shade);
    }

    if (options.ambient !== undefined) {
      property.setAmbient(options.ambient);
    }

    if (options.diffuse !== undefined) {
      property.setDiffuse(options.diffuse);
    }

    if (options.specular !== undefined) {
      property.setSpecular(options.specular);
    }
  },
};
