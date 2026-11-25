import { cache as cs3DCache } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps';
import { utilities as csUtils } from '@cornerstonejs/core';
import { getViewportVolumeHistogram } from './getViewportVolumeHistogram';
import { getViewportAdapter } from '../../services/ViewportService/adapter';

/**
 * Gets window levels data for a viewport: one row for each volume that the
 * viewport shows, the source first. A stack shows no volume and has no rows.
 * The window of the source and the opacity of each volume are those that they
 * are drawn with.
 */
export const getWindowLevelsData = async (viewport: Types.IViewport, viewportInfo: any) => {
  if (!viewport) {
    return [];
  }

  const adapter = getViewportAdapter(viewport);
  const volumeIds = adapter.getVolumeIds();
  if (!volumeIds.length) {
    return [];
  }

  const { voiRange } = adapter.getEffectiveAppearance();
  const viewportVoi = voiRange
    ? {
        windowWidth: voiRange.upper - voiRange.lower,
        windowCenter: voiRange.lower + (voiRange.upper - voiRange.lower) / 2,
      }
    : undefined;

  const windowLevels = await Promise.all(
    volumeIds.map(async (volumeId, volumeIndex) => {
      const volume = cs3DCache.getVolume(volumeId);

      if (!volume) {
        return null;
      }

      const { opacity } = adapter.getEffectiveAppearance(adapter.getDataIdForVolumeId(volumeId));
      const { metadata, scaling } = volume;
      const modality = metadata.Modality;

      const options = {
        min: modality === 'PT' ? 0.1 : -999,
        max: modality === 'PT' ? 5 : 10000,
      };

      const histogram = await getViewportVolumeHistogram(viewport, volume, options);

      if (!histogram || histogram.range.min === histogram.range.max) {
        return null;
      }

      if (!viewportInfo.displaySetOptions || !viewportInfo.displaySetOptions[volumeIndex]) {
        return null;
      }

      const { voi: displaySetVOI, colormap: displaySetColormap } =
        viewportInfo.displaySetOptions[volumeIndex];

      let colormap;
      if (displaySetColormap) {
        colormap =
          csUtils.colormap.getColormap(displaySetColormap.name) ??
          vtkColorMaps.getPresetByName(displaySetColormap.name);
      }

      const voi = !volumeIndex ? (viewportVoi ?? displaySetVOI) : displaySetVOI;

      return {
        viewportId: viewportInfo.viewportId,
        modality,
        volumeId,
        volumeIndex,
        voi,
        histogram,
        colormap,
        step: scaling?.PT ? 0.05 : 1,
        opacity,
        showOpacitySlider: volumeIndex === 1 && opacity !== undefined,
      };
    })
  );

  return windowLevels.filter(Boolean);
};
