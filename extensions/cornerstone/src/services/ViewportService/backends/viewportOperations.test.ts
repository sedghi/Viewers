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
 * focal point in the centre of the canvas.
 */
function makeViewport({
  focalPoint = [0, 0, 0],
  parallelScale = 50,
  zoom = 4,
  pan = [10, -20],
  type = Enums.ViewportType.PLANAR,
  hasView = true,
}: {
  focalPoint?: number[];
  parallelScale?: number;
  zoom?: number;
  pan?: number[];
  type?: string;
  hasView?: boolean;
} = {}) {
  getPresentation.mockReturnValue(hasView ? { zoom, pan } : undefined);
  withPresentation.mockReturnValue(hasView ? NEXT_VIEW_STATE : undefined);

  return {
    type,
    canvas: { clientWidth: CANVAS_WIDTH, clientHeight: CANVAS_HEIGHT },
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
