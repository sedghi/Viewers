import { getWebWorkerManager } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';

const workerManager = getWebWorkerManager();

const WorkerOptions = {
  maxWorkerInstances: 1,
  autoTerminateOnIdle: {
    enabled: true,
    idleTimeThreshold: 1000,
  },
};

// Register the task
const workerFn = () => {
  return new Worker(new URL('./histogramWorker.js', import.meta.url), {
    name: 'histogram-worker', // name used by the browser to name the worker
  });
};

// Register worker once at module load time
workerManager.registerWorker('histogram-worker', workerFn, WorkerOptions);

/**
 * The histogram of the values of a volume in 256 bins, from the range of its
 * values that its viewport gives (`getScalarRange`), clipped to the `min` and
 * `max` of the options. A dynamic volume gives the values of its time point on
 * display, as its range does.
 */
const getViewportVolumeHistogram = async (
  volume: Types.IImageVolume,
  range: [number, number],
  options?: { min?: number; max?: number }
) => {
  const scalarData = volume.voxelManager.getCompleteScalarDataArray();

  if (!scalarData?.length) {
    return undefined;
  }

  const [min, max] = range;
  const calcHistOptions = {
    numBins: 256,
    min: Math.max(min, options?.min ?? min),
    max: Math.min(max, options?.max ?? max),
  };

  return workerManager.executeTask('histogram-worker', 'calcHistogram', {
    data: scalarData,
    options: calcHistOptions,
  });
};

export { getViewportVolumeHistogram };
