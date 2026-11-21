import { SynchronizerManager, Synchronizer } from '@cornerstonejs/tools';
import type { PlanarViewport } from '@cornerstonejs/core';
import { EVENTS, getRenderingEngine, type Types, utilities } from '@cornerstonejs/core';

const frameViewSyncCallback = (
  synchronizerInstance: Synchronizer,
  sourceViewport: Types.IViewportId,
  targetViewport: Types.IViewportId
) => {
  const renderingEngine = getRenderingEngine(targetViewport.renderingEngineId);
  if (!renderingEngine) {
    throw new Error(`No RenderingEngine for Id: ${targetViewport.renderingEngineId}`);
  }
  const sViewport = renderingEngine.getViewport<PlanarViewport>(sourceViewport.viewportId);

  const { viewportIndex: targetViewportIndex } = synchronizerInstance.getOptions(
    targetViewport.viewportId
  );

  const { viewportIndex: sourceViewportIndex } = synchronizerInstance.getOptions(
    sourceViewport.viewportId
  );

  if (targetViewportIndex === undefined || sourceViewportIndex === undefined) {
    throw new Error('No viewportIndex provided');
  }

  const tViewport = renderingEngine.getViewport<PlanarViewport>(targetViewport.viewportId);

  const sourceSliceIndex = sViewport.getSliceIndex();
  const sliceDifference = Number(targetViewportIndex) - Number(sourceViewportIndex);
  const targetSliceIndex = sourceSliceIndex + sliceDifference;

  if (targetSliceIndex === tViewport.getSliceIndex()) {
    return;
  }

  utilities.jumpToSlice(tViewport.element, {
    imageIndex: targetSliceIndex,
  });
};

/**
 * A synchronizer that keeps the slices of its viewports a fixed number of
 * slices apart. A scroll is a view state change: CAMERA_MODIFIED fires when
 * the index is asked for, and NEW_IMAGE when the image shows.
 */
const createFrameViewSynchronizer = (synchronizerName: string): Synchronizer => {
  const synchronizer = SynchronizerManager.createSynchronizer(
    synchronizerName,
    EVENTS.CAMERA_MODIFIED,
    frameViewSyncCallback,
    { auxiliaryEvents: [{ name: EVENTS.NEW_IMAGE, source: 'element' }] }
  );
  return synchronizer;
};

export { createFrameViewSynchronizer };
