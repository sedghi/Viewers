import { cache, Types } from '@cornerstonejs/core';
import { utilities } from '@cornerstonejs/tools';
import { getViewportAdapter } from './services/ViewportService/adapter';

/**
 * The volume of a viewport that a cine plays: its dynamic (4D) volume when it
 * shows one, else its first volume. Undefined for a viewport that shows no
 * volume (a stack, a video).
 */
function _getVolumeFromViewport(viewport: Types.IViewport) {
  const volumes = getViewportAdapter(viewport)
    .getVolumeIds()
    .map(id => cache.getVolume(id))
    .filter(Boolean);
  const dynamicVolume = volumes.find(volume => volume.isDynamicVolume());

  return dynamicVolume ?? volumes[0];
}

/**
 * Return all viewports that needs to be synchronized with the source
 * viewport passed as parameter when cine is updated.
 * @param servicesManager ServiceManager
 * @param srcViewportIndex Source viewport index
 * @returns array with viewport information.
 */
function _getSyncedViewports(servicesManager: AppTypes.ServicesManager, srcViewportId) {
  const { viewportGridService, cornerstoneViewportService } = servicesManager.services;

  const { viewports: viewportsStates } = viewportGridService.getState();
  const srcViewportState = viewportsStates.get(srcViewportId);

  if (srcViewportState?.viewportOptions?.viewportType !== 'volume') {
    return [];
  }

  const srcViewport = cornerstoneViewportService.getCornerstoneViewport(srcViewportId);

  const srcVolume = srcViewport ? _getVolumeFromViewport(srcViewport) : null;

  if (!srcVolume?.isDynamicVolume()) {
    return [];
  }

  const { volumeId: srcVolumeId } = srcVolume;

  return Array.from(viewportsStates.values())
    .filter(({ viewportId }) => {
      const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

      return (
        viewportId !== srcViewportId &&
        !!viewport &&
        getViewportAdapter(viewport).getVolumeIds().includes(srcVolumeId)
      );
    })
    .map(({ viewportId }) => ({ viewportId }));
}

function initCineService(servicesManager: AppTypes.ServicesManager) {
  const { cineService } = servicesManager.services;

  const getSyncedViewports = viewportId => {
    return _getSyncedViewports(servicesManager, viewportId);
  };

  const playClip = (element, playClipOptions) => {
    return utilities.cine.playClip(element, playClipOptions);
  };

  const stopClip = (element, stopClipOptions) => {
    return utilities.cine.stopClip(element, stopClipOptions);
  };

  cineService.setServiceImplementation({
    getSyncedViewports,
    playClip,
    stopClip,
  });
}

export default initCineService;
