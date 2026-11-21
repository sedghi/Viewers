import { Enums, getRenderingEngine, utilities } from '@cornerstonejs/core';
import { SynchronizerManager } from '@cornerstonejs/tools';
import { createFrameViewSynchronizer } from './frameViewSynchronizer';

jest.mock('@cornerstonejs/core', () => {
  const actual = jest.requireActual('@cornerstonejs/core');

  return {
    ...actual,
    getRenderingEngine: jest.fn(),
    utilities: { ...actual.utilities, jumpToSlice: jest.fn() },
  };
});

jest.mock('@cornerstonejs/tools', () => ({
  SynchronizerManager: { createSynchronizer: jest.fn() },
}));

const createSynchronizer = SynchronizerManager.createSynchronizer as jest.Mock;

/** A source at one slice, a target at another, and the place of each in the grid. */
function makeViewports(sourceSliceIndex: number, targetSliceIndex: number) {
  const source = { getSliceIndex: () => sourceSliceIndex };
  const target = { element: {}, getSliceIndex: () => targetSliceIndex };

  (getRenderingEngine as jest.Mock).mockReturnValue({
    getViewport: (viewportId: string) => (viewportId === 'source' ? source : target),
  });

  const synchronizerInstance = {
    getOptions: (viewportId: string) => ({ viewportIndex: viewportId === 'source' ? 0 : 2 }),
  };

  return { target, synchronizerInstance };
}

describe('createFrameViewSynchronizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listens to the events that a scroll fires in Cornerstone3D 6.0', () => {
    createFrameViewSynchronizer('frameViewSync');

    const [name, eventName, , options] = createSynchronizer.mock.calls[0];

    expect(name).toBe('frameViewSync');
    expect(eventName).toBeDefined();
    expect(eventName).toBe(Enums.Events.CAMERA_MODIFIED);
    expect(options.auxiliaryEvents).toEqual([{ name: Enums.Events.NEW_IMAGE, source: 'element' }]);
    expect(options.auxiliaryEvents[0].name).toBeDefined();
  });

  it('puts the target as many slices from the source as its place in the grid says', () => {
    createFrameViewSynchronizer('frameViewSync');
    const callback = createSynchronizer.mock.calls[0][2];
    const { target, synchronizerInstance } = makeViewports(5, 0);

    callback(
      synchronizerInstance,
      { renderingEngineId: 'engine', viewportId: 'source' },
      { renderingEngineId: 'engine', viewportId: 'target' }
    );

    expect(utilities.jumpToSlice).toHaveBeenCalledWith(target.element, { imageIndex: 7 });
  });

  it('leaves a target that is on its slice already', () => {
    createFrameViewSynchronizer('frameViewSync');
    const callback = createSynchronizer.mock.calls[0][2];
    const { synchronizerInstance } = makeViewports(5, 7);

    callback(
      synchronizerInstance,
      { renderingEngineId: 'engine', viewportId: 'source' },
      { renderingEngineId: 'engine', viewportId: 'target' }
    );

    expect(utilities.jumpToSlice).not.toHaveBeenCalled();
  });
});
