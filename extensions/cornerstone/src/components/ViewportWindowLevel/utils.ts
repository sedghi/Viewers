import { cache as cs3DCache } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps';
import { utilities as csUtils } from '@cornerstonejs/core';
import { getViewportVolumeHistogram } from './getViewportVolumeHistogram';
import { getPlanarOr3DViewport } from '../../utils/getPlanarOr3DViewport';

/**
 * Gets window levels data for a viewport: one row for each volume that the
 * viewport shows (`getVolumeIds()`), the source first. A stack shows no volume
 * and has no rows, and the labelmap of a segmentation is not a row. Each row
 * names the display set of its volume, and reads what the viewport gives for
 * it: the range of its values (`getScalarRange`), and the window, the colormap
 * and the opacity that it is drawn with (`getEffectiveDisplaySetAppearance`).
 */
export const getWindowLevelsData = async (viewport: Types.IViewport) => {
  const volumeViewport = getPlanarOr3DViewport(viewport);
  if (!volumeViewport) {
    return [];
  }

  const windowLevels = await Promise.all(
    volumeViewport.getVolumeIds().map(async (volumeId, volumeIndex) => {
      const volume = cs3DCache.getVolume(volumeId);
      const displaySetId = volumeViewport.getDisplaySetIdForVolumeId(volumeId);
      const range = volumeViewport.getScalarRange(displaySetId);

      if (!volume || !displaySetId || !range) {
        return null;
      }

      const { metadata, scaling } = volume;
      const modality = metadata.Modality;

      const options = {
        min: modality === 'PT' ? 0.1 : -999,
        max: modality === 'PT' ? 5 : 10000,
      };

      const histogram = await getViewportVolumeHistogram(volume, range, options);

      if (!histogram || histogram.range.min === histogram.range.max) {
        return null;
      }

      const { voiRange, colormap: appearanceColormap, opacity } =
        volumeViewport.getEffectiveDisplaySetAppearance(displaySetId) ?? {};

      const voi = voiRange
        ? {
            windowWidth: voiRange.upper - voiRange.lower,
            windowCenter: voiRange.lower + (voiRange.upper - voiRange.lower) / 2,
          }
        : undefined;

      const colormap = appearanceColormap?.name
        ? (csUtils.colormap.getColormap(appearanceColormap.name) ??
          vtkColorMaps.getPresetByName(appearanceColormap.name))
        : undefined;

      return {
        viewportId: volumeViewport.id,
        modality,
        volumeId,
        displaySetId,
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

/**
 * The rows for the volumes that the viewport shows: the new row of each
 * volume, else its last row. A volume has no new row while the values on
 * display have not arrived, as a time point of a dynamic volume that is still
 * loading; it keeps its last histogram until they do.
 */
export const keepRowsWithoutRange = <T extends { volumeId: string }>(
  volumeIds: string[],
  rows: T[],
  previousRows: T[]
): T[] =>
  volumeIds
    .map(
      volumeId =>
        rows.find(row => row.volumeId === volumeId) ??
        previousRows.find(row => row.volumeId === volumeId)
    )
    .filter(Boolean);
