jest.mock('@cornerstonejs/core', () => {
  const executeTask = jest.fn(async (_worker: string, _task: string, args) => ({
    range: { min: args.options.min, max: args.options.max },
  }));

  return {
    getWebWorkerManager: () => ({ registerWorker: jest.fn(), executeTask }),
    executeTask,
  };
});

import { getViewportVolumeHistogram } from './getViewportVolumeHistogram';

const mockExecuteTask = jest.requireMock('@cornerstonejs/core').executeTask as jest.Mock;

/** A volume whose voxel manager gives the values of the time point on display. */
function makeVolume(values: number[]) {
  return {
    voxelManager: { getCompleteScalarDataArray: () => Float32Array.from(values) },
  };
}

describe('getViewportVolumeHistogram', () => {
  beforeEach(() => {
    mockExecuteTask.mockClear();
  });

  it('bins the values on display between the range that the viewport gives', async () => {
    const volume = makeVolume([-1000, 0, 40, 3000]);

    await getViewportVolumeHistogram(volume as never, [-1024, 3071], { min: -999, max: 10000 });

    expect(mockExecuteTask).toHaveBeenCalledTimes(1);
    const [worker, task, args] = mockExecuteTask.mock.calls[0];
    expect([worker, task]).toEqual(['histogram-worker', 'calcHistogram']);
    expect(Array.from(args.data)).toEqual([-1000, 0, 40, 3000]);
    expect(args.options).toEqual({ numBins: 256, min: -999, max: 3071 });
  });

  it('computes no range of its own', async () => {
    await getViewportVolumeHistogram(makeVolume([0, 1]) as never, [0, 1]);

    expect(mockExecuteTask.mock.calls.map(([, task]) => task)).toEqual(['calcHistogram']);
  });

  it('gives nothing for a volume without values', async () => {
    expect(await getViewportVolumeHistogram(makeVolume([]) as never, [0, 1])).toBeUndefined();
    expect(mockExecuteTask).not.toHaveBeenCalled();
  });
});
