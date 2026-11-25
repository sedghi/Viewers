import { CONSTANTS, Enums, viewportProjection } from '@cornerstonejs/core';
import { viewportOperations } from './viewportOperations';

jest.mock('@cornerstonejs/core', () => {
  const actual = jest.requireActual('@cornerstonejs/core');

  return {
    ...actual,
    viewportProjection: { getFraming: jest.fn(), withFraming: jest.fn() },
  };
});

const getPresentation = viewportProjection.getFraming as jest.Mock;
const withPresentation = viewportProjection.withFraming as jest.Mock;

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const NEXT_VIEW_STATE = { next: true };

/**
 * An axial planar viewport that shows one world unit as `zoom` canvas pixels, with the
 * focal point in the centre of the canvas. Drawn on the CPU, its `canvas` is the GPU
 * canvas, hidden with no size, and `getCanvas()` gives the canvas that shows.
 */
function makeViewport({
  focalPoint = [0, 0, 0],
  parallelScale = 50,
  zoom = 4,
  pan = [10, -20],
  type = Enums.ViewportType.PLANAR,
  hasView = true,
  cpu = false,
}: {
  focalPoint?: number[];
  parallelScale?: number;
  zoom?: number;
  pan?: number[];
  type?: string;
  hasView?: boolean;
  cpu?: boolean;
} = {}) {
  getPresentation.mockReturnValue(hasView ? { zoom, pan } : undefined);
  withPresentation.mockReturnValue(hasView ? NEXT_VIEW_STATE : undefined);
  const shownCanvas = { clientWidth: CANVAS_WIDTH, clientHeight: CANVAS_HEIGHT };

  return {
    type,
    canvas: cpu ? { clientWidth: 0, clientHeight: 0 } : shownCanvas,
    getCanvas: () => shownCanvas,
    getResolvedView: () =>
      hasView ? { toICamera: () => ({ focalPoint, parallelScale }) } : undefined,
    worldToCanvas: (world: number[]) => [
      CANVAS_WIDTH / 2 + (world[0] - focalPoint[0]) * zoom,
      CANVAS_HEIGHT / 2 + (world[1] - focalPoint[1]) * zoom,
    ],
    setViewState: jest.fn(),
  };
}

const center = (viewport, measurement) =>
  viewportOperations.centerOnMeasurement(viewport as never, measurement);

describe('centerOnMeasurement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('leaves the view when the measurement is within the viewport', () => {
    const viewport = makeViewport();
    const measurement = {
      points: [
        [-10, -10, 0],
        [10, 10, 0],
      ],
    };

    expect(center(viewport, measurement)).toBe(false);
    expect(viewport.setViewState).not.toHaveBeenCalled();
  });

  it('pans the centre of a measurement outside the viewport to the centre of the canvas', () => {
    const viewport = makeViewport();
    const measurement = {
      points: [
        [100, 60, 0],
        [120, 80, 0],
      ],
    };

    expect(center(viewport, measurement)).toBe(true);

    const [target, patch] = withPresentation.mock.calls[0];
    expect(target).toBe(viewport);
    expect(patch.zoom).toBe(4);
    expect(patch.pan[0]).toBeCloseTo(10 - 110);
    expect(patch.pan[1]).toBeCloseTo(-20 - 70);
    expect(viewport.setViewState).toHaveBeenCalledWith(NEXT_VIEW_STATE);
  });

  it('pans to the centre of the canvas that shows the picture when the CPU draws it', () => {
    const viewport = makeViewport({ cpu: true });
    const measurement = {
      points: [
        [100, 60, 0],
        [120, 80, 0],
      ],
    };

    expect(center(viewport, measurement)).toBe(true);

    const [, patch] = withPresentation.mock.calls[0];
    expect(patch.pan[0]).toBeCloseTo(10 - 110);
    expect(patch.pan[1]).toBeCloseTo(-20 - 70);
  });

  it('zooms out for a measurement that is larger than the viewport shows', () => {
    const viewport = makeViewport({ parallelScale: 50 });
    const measurement = {
      points: [
        [100, 0, 0],
        [300, 0, 0],
      ],
    };

    expect(center(viewport, measurement)).toBe(true);

    const [, patch] = withPresentation.mock.calls[0];
    expect(patch.zoom).toBeCloseTo(4 / (200 / 50));
    expect(patch.pan[0]).toBeCloseTo(10 - 200);
    expect(patch.pan[1]).toBeCloseTo(-20);
  });

  it('does nothing on a viewport without a view', () => {
    const viewport = makeViewport({ hasView: false });
    const measurement = { points: [[100, 60, 0]] };

    expect(center(viewport, measurement)).toBe(false);
    expect(viewport.setViewState).not.toHaveBeenCalled();
  });

  it('does nothing on a 3D viewport', () => {
    const viewport = makeViewport({ type: Enums.ViewportType.VOLUME_3D });
    const measurement = { points: [[100, 60, 0]] };

    expect(center(viewport, measurement)).toBe(false);
    expect(viewport.setViewState).not.toHaveBeenCalled();
  });
});

describe('setOrientation', () => {
  const { OrientationAxis, ViewportType } = Enums;

  it('turns a planar viewport with its own call', () => {
    const viewport = { type: ViewportType.PLANAR, setOrientation: jest.fn() };

    expect(viewportOperations.setOrientation(viewport as never, OrientationAxis.SAGITTAL)).toBe(
      true
    );
    expect(viewport.setOrientation).toHaveBeenCalledWith(OrientationAxis.SAGITTAL);
  });

  it.each([OrientationAxis.AXIAL, OrientationAxis.SAGITTAL, OrientationAxis.CORONAL])(
    'turns the camera of a 3D viewport to %s, then fits',
    orientation => {
      const calls: string[] = [];
      const viewport = {
        type: ViewportType.VOLUME_3D,
        setViewState: jest.fn(() => calls.push('setViewState')),
        resetViewState: jest.fn(() => calls.push('resetViewState')),
      };
      const { viewPlaneNormal, viewUp } = CONSTANTS.MPR_CAMERA_VALUES[orientation];

      expect(viewportOperations.setOrientation(viewport as never, orientation)).toBe(true);
      expect(viewport.setViewState).toHaveBeenCalledWith({ viewPlaneNormal, viewUp });
      expect(calls).toEqual(['setViewState', 'resetViewState']);
    }
  );

  it('leaves a 3D viewport for an orientation without fixed vectors', () => {
    const viewport = {
      type: ViewportType.VOLUME_3D,
      setViewState: jest.fn(),
      resetViewState: jest.fn(),
    };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(viewportOperations.setOrientation(viewport as never, OrientationAxis.ACQUISITION)).toBe(
      false
    );
    expect(viewport.setViewState).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('the appearance operations', () => {
  /** A viewport whose source is drawn with `effective` and has the overrides `overrides`. */
  function makeAppearanceViewport(effective: object, overrides: object = {}) {
    return {
      type: Enums.ViewportType.PLANAR,
      getDisplaySetAppearance: jest.fn().mockReturnValue(overrides),
      getEffectiveDisplaySetAppearance: jest.fn().mockReturnValue(effective),
      setDisplaySetAppearance: jest.fn(),
      resetDisplaySetAppearance: jest.fn(),
      resetViewState: jest.fn(),
    };
  }

  it('inverts a MONOCHROME1 image, which is drawn inverted with no override, to not inverted', () => {
    const viewport = makeAppearanceViewport({ invert: true });

    viewportOperations.invert(viewport as never);

    expect(viewport.setDisplaySetAppearance).toHaveBeenCalledWith({ invert: false });
  });

  it('inverts a MONOCHROME2 image to inverted, and back', () => {
    const viewport = makeAppearanceViewport({ invert: false });

    viewportOperations.invert(viewport as never);
    expect(viewport.setDisplaySetAppearance).toHaveBeenLastCalledWith({ invert: true });

    viewport.getEffectiveDisplaySetAppearance.mockReturnValue({ invert: true });
    viewportOperations.invert(viewport as never);
    expect(viewport.setDisplaySetAppearance).toHaveBeenLastCalledWith({ invert: false });
  });

  it('sets the preset of a 3D viewport on its appearance, so a later change keeps it', () => {
    const viewport = { ...makeAppearanceViewport({}), type: Enums.ViewportType.VOLUME_3D };

    viewportOperations.setPreset(viewport as never, 'CT-Bone');

    expect(viewport.setDisplaySetAppearance).toHaveBeenCalledWith({ preset: 'CT-Bone' });
  });

  it('sets a colormap with the opacity beside it, and keeps the opacity when none is given', () => {
    const viewport = makeAppearanceViewport({});

    viewportOperations.setColormap(viewport as never, {
      colormap: { name: 'hsv' },
      opacity: 0.5,
      displaySetInstanceUID: 'pt',
    });
    viewportOperations.setColormap(viewport as never, {
      colormap: { name: 'jet' },
      displaySetInstanceUID: 'pt',
    });

    expect(viewport.setDisplaySetAppearance).toHaveBeenNthCalledWith(1, 'pt', {
      colormap: { name: 'hsv' },
      opacity: 0.5,
    });
    expect(viewport.setDisplaySetAppearance).toHaveBeenNthCalledWith(2, 'pt', {
      colormap: { name: 'jet' },
    });
  });

  it('resets the appearance of the source and the view', () => {
    const viewport = makeAppearanceViewport({});

    viewportOperations.reset(viewport as never);

    expect(viewport.resetDisplaySetAppearance).toHaveBeenCalledWith();
    expect(viewport.resetViewState).toHaveBeenCalledWith();
  });
});
