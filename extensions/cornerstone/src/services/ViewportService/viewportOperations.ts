import type { PlanarDisplaySetAppearance } from '@cornerstonejs/core';
import {
  utilities as csUtils,
  CONSTANTS as csConstants,
  Enums as csEnums,
  Types as CoreTypes,
  viewportHasZoom,
  viewportProjection,
} from '@cornerstonejs/core';
import { vec3 } from 'gl-matrix';
import { getCenterExtent } from '../../utils/getCenterExtent';
import { isMeasurementWithinViewport } from '../../utils/isMeasurementWithinViewport';
import {
  getPlanarOr3DViewport,
  isPlanarViewport,
  isVolumeViewport3D,
} from '../../utils/viewportTypeGuards';

type FlipValue = 'toggle' | boolean;
type RotationMode = 'apply' | 'set';

/** The keys of a view state that the flip and rotate operations read. */
type FlipAndRotation = Pick<CoreTypes.ICamera, 'rotation' | 'flipHorizontal' | 'flipVertical'>;

interface VolumeLightingOptions {
  shade?: boolean;
  ambient?: number;
  diffuse?: number;
  specular?: number;
}

interface WindowLevelParams {
  windowWidth: number;
  windowCenter: number;
  /** The binding to change (e.g. the PT overlay in a fusion). The source binding when absent. */
  displaySetInstanceUID?: string;
}

interface ColormapParams {
  colormap: Record<string, unknown>;
  /** The opacity of the display set, 0 to 1. The opacity stays as it is when absent. */
  opacity?: number;
  /** The binding to change (e.g. the PT overlay in a fusion). The source binding when absent. */
  displaySetInstanceUID?: string;
}

// Loose view of the VTK actor/mapper/property chain used by the 3D VR ops. These
// live on vtk.js objects, not cornerstone types, so they are accessed structurally.
type VtkActorChain = {
  actor: {
    getMapper: () => Record<string, (...args: unknown[]) => unknown>;
    getProperty: () => Record<string, (...args: unknown[]) => unknown>;
  };
};

/**
 * Changes the appearance of a display set of a viewport, named by its UID, or
 * of the source of the viewport when no UID is given.
 */
function setAppearanceOfDisplaySetOrSource(
  viewport: CoreTypes.IViewport,
  props: object,
  displaySetInstanceUID?: string
): void {
  if (displaySetInstanceUID) {
    viewport.setDisplaySetAppearance(displaySetInstanceUID, props);
  } else {
    viewport.setDisplaySetAppearance(props);
  }
}

/**
 * The operations on a viewport that the commands use. commandsModule (and any
 * other caller) imports this and calls e.g. `viewportOperations.flipHorizontal(viewport)`,
 * which keeps the interaction logic out of the command bodies. Stateless and
 * dependency-free (each op takes an already-resolved viewport), so it is a plain
 * object rather than a registered service. Each op calls the members of the
 * Cornerstone3D viewport.
 *
 * No method calls viewport.render(): the command renders, matching its own
 * render timing (e.g. setViewportColormap renders only when immediate). No
 * method resolves "which viewport": the command owns that.
 */
export const viewportOperations = {
  /** Toggle (default) or set horizontal flip. */
  flipHorizontal(viewport: CoreTypes.IViewport, newValue: FlipValue = 'toggle'): void {
    const viewState: FlipAndRotation = viewport.getViewState();
    const flipHorizontal = newValue === 'toggle' ? !viewState.flipHorizontal : newValue;
    viewport.setViewState({ flipHorizontal });
  },

  /** Toggle (default) or set vertical flip. */
  flipVertical(viewport: CoreTypes.IViewport, newValue: FlipValue = 'toggle'): void {
    const viewState: FlipAndRotation = viewport.getViewState();
    const flipVertical = newValue === 'toggle' ? !viewState.flipVertical : newValue;
    viewport.setViewState({ flipVertical });
  },

  /** Toggles the invert of the source from the invert it is drawn with. */
  invert(viewport: CoreTypes.IViewport): void {
    const { invert }: Pick<PlanarDisplaySetAppearance, 'invert'> =
      viewport.getEffectiveDisplaySetAppearance() ?? {};
    viewport.setDisplaySetAppearance({ invert: !invert });
  },

  /** Rotate: mode 'apply' = relative, mode 'set' = absolute (with flip-parity correction). */
  rotate(viewport: CoreTypes.IViewport, rotation: number, mode: RotationMode = 'apply'): void {
    const state: FlipAndRotation = viewport.getViewState();
    const currentRotation = state.rotation ?? 0;
    const newRotation =
      mode === 'apply'
        ? (currentRotation + rotation + 360) % 360
        : (() => {
            const flipsParity = (state.flipHorizontal ? 1 : 0) + (state.flipVertical ? 1 : 0);
            const effectiveRotation = flipsParity % 2 === 1 ? -rotation : rotation;
            return (effectiveRotation + 360) % 360;
          })();
    viewport.setViewState({ rotation: newRotation });
  },

  /** Reset the appearance and the view state to defaults (the slice is preserved). */
  reset(viewport: CoreTypes.IViewport): void {
    viewport.resetDisplaySetAppearance();
    viewport.resetViewState();
  },

  /**
   * Zoom by direction: >0 in, <0 out, 0 = fit-to-window. The parallel scale
   * and the zoom are inversely related, so the zoom is divided by the scale
   * factor of the legacy direction. Fit to window keeps the orientation: the
   * legacy resetCamera() reset pan, zoom, rotation and flip but never the
   * viewing orientation, while a full resetViewState() would also snap an
   * MPR pane back to its requested axis.
   */
  scaleBy(viewport: CoreTypes.IViewport, direction: number): void {
    const scaleFactor = direction > 0 ? 0.9 : 1.1;
    if (direction) {
      if (viewportHasZoom(viewport)) {
        viewport.setZoom(viewport.getZoom() / scaleFactor);
      }
    } else {
      viewport.resetViewState({ resetOrientation: false });
    }
  },

  /**
   * Turns the view of a viewport that shows a volume to an orientation. A planar
   * viewport takes any orientation. A 3D viewport turns its camera to axial, sagittal
   * or coronal and fits what it shows; for another orientation it stays as it is.
   * Returns true when the view was turned (the caller renders).
   */
  setOrientation(viewport: CoreTypes.IViewport, orientation: csEnums.OrientationAxis): boolean {
    if (isPlanarViewport(viewport)) {
      viewport.setOrientation(orientation);

      return true;
    }

    if (!isVolumeViewport3D(viewport)) {
      return false;
    }

    const vectors = csConstants.MPR_CAMERA_VALUES[orientation];

    if (!vectors) {
      console.warn(`A 3D viewport cannot be turned to the orientation "${orientation}"`);

      return false;
    }

    const { viewPlaneNormal, viewUp } = vectors;

    viewport.setViewState({ viewPlaneNormal, viewUp });
    viewport.resetViewState();

    return true;
  },

  /**
   * Brings a measurement into view after the caller's setViewReference went to its slice:
   * pans its centre to the centre of the canvas, and zooms out when it is larger than
   * what the viewport shows. Returns true when the view changed (the caller renders),
   * false when the measurement was in view already, on a viewport without data and on
   * a viewport that is not planar.
   */
  centerOnMeasurement(
    viewport: CoreTypes.IViewport,
    measurement: Record<string, unknown>
  ): boolean {
    if (!isPlanarViewport(viewport)) {
      return false;
    }

    if (isMeasurementWithinViewport(viewport, measurement)) {
      return false;
    }

    const camera = viewport.getResolvedView()?.toICamera();
    const presentation = viewportProjection.getFraming(viewport, {
      selector: { zoom: true, pan: true },
    });

    if (!camera || !presentation) {
      return false;
    }

    const { zoom = 1, pan = [0, 0] } = presentation;
    const { center, extent } = getCenterExtent(measurement);
    const [canvasX, canvasY] = viewport.worldToCanvas(center);
    const { clientWidth, clientHeight } = viewport.getCanvas();
    const measurementSize = vec3.dist(extent.min, extent.max);
    const nextViewState = viewportProjection.withFraming(viewport, {
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

    viewport.setViewState(nextViewState);

    return true;
  },

  /**
   * Applies a window: to the display set named by params.displaySetInstanceUID
   * (so a PT/CT fusion window lands on the PT overlay), to the source without one.
   */
  setWindowLevel(viewport: CoreTypes.IViewport, params: WindowLevelParams): void {
    const { lower, upper } = csUtils.windowLevel.toLowHighRange(
      params.windowWidth,
      params.windowCenter
    );
    setAppearanceOfDisplaySetOrSource(
      viewport,
      { voiRange: { upper, lower } },
      params.displaySetInstanceUID
    );
  },

  /**
   * Applies a colormap: to the display set named by params.displaySetInstanceUID
   * (so a PT/CT fusion colormap lands on the PT overlay), to the source without one.
   */
  setColormap(viewport: CoreTypes.IViewport, params: ColormapParams): void {
    setAppearanceOfDisplaySetOrSource(
      viewport,
      {
        colormap: params.colormap,
        ...(params.opacity !== undefined ? { opacity: params.opacity } : {}),
      },
      params.displaySetInstanceUID
    );
  },

  /** The volume rendering preset of a 3D viewport, set on its appearance. */
  setPreset(viewport: CoreTypes.IViewport, preset: string): void {
    viewport.setDisplaySetAppearance({ preset });
  },

  /** VR sample distance / samples-per-ray quality. */
  setVolumeRenderingQuality(viewport: CoreTypes.IViewport, volumeQuality: number): void {
    const actorEntry = getPlanarOr3DViewport(viewport)?.getActors()[0];
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

  /** Shift scalar-opacity transfer-function points. */
  shiftVolumeOpacityPoints(viewport: CoreTypes.IViewport, shift: number): void {
    const actorEntry = getPlanarOr3DViewport(viewport)?.getActors()[0];
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

  /** VR lighting (shade/ambient/diffuse/specular). */
  setVolumeLighting(viewport: CoreTypes.IViewport, options: VolumeLightingOptions): void {
    const actorEntry = getPlanarOr3DViewport(viewport)?.getActors()[0];
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
