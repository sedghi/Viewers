import { Types } from '@ohif/core';
import { cache as cs3DCache, Enums, utilities, volumeLoader } from '@cornerstonejs/core';

import getCornerstoneViewportType, {
  getDataShapeForViewportType,
} from '../../utils/getCornerstoneViewportType';
import { getViewportDataShape } from '../../utils/viewportDataShape';
import { loadDisplaySetData } from '../../utils/loadDisplaySetData';
import { StackViewportData, VolumeViewportData } from '../../types/CornerstoneCacheService';
import { VOLUME_LOADER_SCHEME } from '../../constants';

/** A volume that the cache service made for a display set, and the image ids it made it from. */
type MadeVolume = { volumeId: string; imageIds?: string[] };

/** Whether two lists hold the same image ids, in any order. */
function isSameImageIds(imageIds: string[] = [], otherImageIds: string[] = []): boolean {
  if (imageIds.length !== otherImageIds.length) {
    return false;
  }
  const ids = new Set(imageIds);
  return otherImageIds.every(imageId => ids.has(imageId));
}

class CornerstoneCacheService {
  static REGISTRATION = {
    name: 'cornerstoneCacheService',
    altName: 'CornerstoneCacheService',
    create: ({ servicesManager }: Types.Extensions.ExtensionParams): CornerstoneCacheService => {
      return new CornerstoneCacheService(servicesManager);
    },
  };

  /** The volume made for each display set, by display set instance UID. */
  madeVolumes: Map<string, MadeVolume> = new Map();
  readonly servicesManager: AppTypes.ServicesManager;

  constructor(servicesManager: AppTypes.ServicesManager) {
    this.servicesManager = servicesManager;
  }

  public getCacheSize() {
    return cs3DCache.getCacheSize();
  }

  public getCacheFreeSpace() {
    return cs3DCache.getBytesAvailable();
  }

  public async createViewportData(
    displaySets: Types.DisplaySet[],
    viewportOptions: AppTypes.ViewportGrid.GridViewportOptions,
    dataSource: unknown,
    initialImageIndex?: number
  ): Promise<StackViewportData | VolumeViewportData> {
    const viewportType = viewportOptions.viewportType as string;

    const cs3DViewportType = getCornerstoneViewportType(viewportType, displaySets);
    let viewportData: StackViewportData | VolumeViewportData;

    // The planar viewport type is the same for a stack and for a volume, so it
    // cannot drive the stack-vs-volume data-builder decision below. The shape of
    // the data that the viewport type word asks for does.
    let dataShapeType = getDataShapeForViewportType(viewportType, displaySets);

    // A data overlay (fusion) of two or more reconstructable image display sets
    // must render as a volume viewport so the source and overlay share one
    // representation (volume slice). Without this, the viewport keeps the source
    // in stack mode while the added overlay is a volume slice, producing the
    // broken/unstable fusion. A SEG or an RTSTRUCT over one image display set is
    // not a fusion: it takes isReconstructable from the display set it references,
    // so only the image display sets are counted.
    const imageDisplaySets = displaySets.filter(ds => !ds.isOverlayDisplaySet);
    const isReconstructableFusion =
      imageDisplaySets.length > 1 && imageDisplaySets.every(ds => ds.isReconstructable);
    if (isReconstructableFusion && dataShapeType === 'stack') {
      dataShapeType = 'volume';
    }

    if (dataShapeType === 'volume' || dataShapeType === 'volume3d') {
      viewportData = await this._getVolumeViewportData(dataSource, displaySets, cs3DViewportType);
    } else if (dataShapeType === 'stack') {
      // Everything else looks like a stack
      viewportData = await this._getStackViewportData(
        dataSource,
        displaySets,
        initialImageIndex,
        cs3DViewportType
      );
    } else {
      viewportData = await this._getOtherViewportData(
        dataSource,
        displaySets,
        initialImageIndex,
        cs3DViewportType
      );
    }

    viewportData.viewportType = cs3DViewportType;
    // Persist the shape of the data so consumers can distinguish stack from
    // volume content: the planar viewportType is the same for both.
    viewportData.dataShapeType = dataShapeType;

    return viewportData;
  }

  /**
   * Builds the viewport data of a viewport again after the data of one of its
   * display sets changed (`DISPLAY_SET_SERIES_METADATA_INVALIDATED`: the display
   * set grew, or its metadata changed, as the SUV values of a PET).
   *
   * A stack reads the image ids of the data source again, and its images leave
   * the cache so that they load again with the new metadata.
   *
   * A volume is made again: the volume that this viewport shows, its images
   * (which hold the old metadata too) and the image ids it was made from leave
   * the cache, and the next volume mount makes it from the image ids that the
   * display set has now. When two viewports show the volume, each one runs this
   * for the same change; the volume goes only while the cache still holds the
   * volume that this viewport shows, so the second viewport takes the volume
   * that the first one made, not a third.
   */
  public async invalidateViewportData(
    viewportData: VolumeViewportData | StackViewportData,
    invalidatedDisplaySetInstanceUID: string,
    dataSource,
    displaySetService
  ): Promise<VolumeViewportData | StackViewportData> {
    // Decide stack-vs-volume rebuild from the persisted data shape, NOT viewportType:
    // the planar type is the same for both, so a stack would otherwise fall
    // through to the volume rebuild and re-mount as volume data.
    const dataShapeType = getViewportDataShape(viewportData);

    if (dataShapeType === 'stack') {
      const displaySet = displaySetService.getDisplaySetByUID(invalidatedDisplaySetInstanceUID);
      const imageIds = this._refreshImageIds(displaySet, dataSource);

      // remove images from the cache to be able to re-load them
      imageIds.forEach(imageId => {
        if (cs3DCache.getImageLoadObject(imageId)) {
          cs3DCache.removeImageLoadObject(imageId);
        }
      });

      return {
        // Preserve the original viewportType; the rebuilt data shape, not this
        // field, drives the re-mount dispatch.
        viewportType: viewportData.viewportType,
        dataShapeType: 'stack',
        data: {
          StudyInstanceUID: displaySet.StudyInstanceUID,
          displaySetInstanceUID: invalidatedDisplaySetInstanceUID,
          imageIds,
        },
      };
    }

    const shownVolume = (viewportData as VolumeViewportData).data.find(
      data => data.displaySetInstanceUID === invalidatedDisplaySetInstanceUID
    )?.volume;

    if (shownVolume && cs3DCache.getVolume(shownVolume.volumeId) === shownVolume) {
      shownVolume.imageIds?.forEach(imageId => {
        if (cs3DCache.getImageLoadObject(imageId)) {
          cs3DCache.removeImageLoadObject(imageId, { force: true });
        }
      });
      this._dropVolume(shownVolume.volumeId);
      this.madeVolumes.delete(invalidatedDisplaySetInstanceUID);
    }

    const displaySets = viewportData.data.map(({ displaySetInstanceUID }) =>
      displaySetService.getDisplaySetByUID(displaySetInstanceUID)
    );

    const newViewportData = await this._getVolumeViewportData(
      dataSource,
      displaySets,
      viewportData.viewportType
    );
    newViewportData.dataShapeType = dataShapeType;

    return newViewportData;
  }

  private async _getOtherViewportData(
    dataSource,
    displaySets,
    _initialImageIndex,
    viewportType: Enums.ViewportType
  ): Promise<StackViewportData> {
    // TODO - handle overlays and secondary display sets, but for now assume
    // the 1st display set is the one of interest
    const [displaySet] = displaySets;
    if (!displaySet.imageIds) {
      displaySet.imagesIds = this._getCornerstoneStackImageIds(displaySet, dataSource);
    }
    const { imageIds: data, viewportType: dsViewportType } = displaySet;
    return {
      viewportType: dsViewportType || viewportType,
      data: displaySets,
    };
  }

  private async _getStackViewportData(
    dataSource,
    displaySets,
    initialImageIndex,
    viewportType: Enums.ViewportType
  ): Promise<StackViewportData> {
    // Overlays are loaded before the loop below so that a segmentation can
    // back-fill the imageIds of the series it references.
    const overlayDisplaySets = displaySets.filter(ds => ds.isOverlayDisplaySet);
    for (const overlayDisplaySet of overlayDisplaySets) {
      await loadDisplaySetData(overlayDisplaySet, this.servicesManager);
    }

    // Ensuring the first non-overlay `displaySet` is always the primary one
    const StackViewportData = [];
    for (const displaySet of displaySets) {
      const { displaySetInstanceUID, StudyInstanceUID, isCompositeStack } = displaySet;

      await loadDisplaySetData(displaySet, this.servicesManager);

      const stackImageIds = this._getCornerstoneStackImageIds(displaySet, dataSource);
      displaySet.imageIds = stackImageIds;

      StackViewportData.push({
        StudyInstanceUID,
        displaySetInstanceUID,
        isCompositeStack,
        imageIds: stackImageIds,
        initialImageIndex,
      });
    }

    return {
      viewportType,
      data: StackViewportData,
    };
  }

  private async _getVolumeViewportData(
    dataSource,
    displaySets,
    viewportType: Enums.ViewportType
  ): Promise<VolumeViewportData> {
    // Todo: Check the cache for multiple scenarios to see if we need to
    // decache the volume data from other viewports or not

    const volumeData = [];

    for (const displaySet of displaySets) {
      const { Modality } = displaySet;
      const isParametricMap = Modality === 'PMAP';
      const isSegOrRtstruct = Modality === 'SEG' || Modality === 'RTSTRUCT';

      // Don't create volumes for the displaySets that have custom load
      // function (e.g., SEG, RT, since they rely on the reference volumes
      // and they take care of their own loading after they are created in their
      // getSOPClassHandler method

      if (displaySet.load instanceof Function) {
        await loadDisplaySetData(displaySet, this.servicesManager);

        // Parametric maps have a `load` method but it should not be loaded in the
        // same way as SEG and RTSTRUCT but like a normal volume
        if (!isParametricMap) {
          volumeData.push({
            studyInstanceUID: displaySet.StudyInstanceUID,
            displaySetInstanceUID: displaySet.displaySetInstanceUID,
          });

          // Todo: do some cache check and empty the cache if needed
          continue;
        }
      }

      const volumeLoaderSchema = displaySet.volumeLoaderSchema ?? VOLUME_LOADER_SCHEME;
      const volumeId = `${volumeLoaderSchema}:${displaySet.displaySetInstanceUID}`;
      let volumeImageIds: string[] | undefined;
      let volume;

      // Parametric maps do not have image ids but they already have volume data
      // therefore a new volume should not be created.
      if (isParametricMap || isSegOrRtstruct) {
        volume = cs3DCache.getVolume(volumeId);
      } else {
        volumeImageIds = this._getCornerstoneVolumeImageIds(displaySet, dataSource);
        volume = await this._getVolume(displaySet.displaySetInstanceUID, volumeId, volumeImageIds);
        displaySet.imageIds = volumeImageIds;
      }

      volumeData.push({
        StudyInstanceUID: displaySet.StudyInstanceUID,
        displaySetInstanceUID: displaySet.displaySetInstanceUID,
        volume,
        volumeId,
        imageIds: volumeImageIds,
        isDynamicVolume: displaySet.isDynamicVolume,
      });
    }

    return {
      viewportType,
      data: volumeData,
    };
  }

  private _getCornerstoneStackImageIds(displaySet, dataSource): string[] {
    return dataSource.getImageIdsForDisplaySet(displaySet);
  }

  /**
   * Gives a display set that changed (it grew, or its metadata changed) the image
   * ids of the data source again. A mount reads the image ids of the registered
   * display set and keeps a copy, so the next mount shows the images that the
   * display set has now. The image ids that its volume was made from stay: the
   * next volume mount compares them with the new ones.
   */
  private _refreshImageIds(displaySet, dataSource): string[] {
    const imageIds = this._getCornerstoneStackImageIds(displaySet, dataSource);
    displaySet.imageIds = imageIds;
    return imageIds;
  }

  /**
   * The image ids of a display set at a volume mount: those of the data source for
   * a display set of instances, which grows when more of its instances arrive, and
   * the display set's own for one made in the client with no instances behind it
   * (the computed volume of a dynamic volume), which does not grow.
   */
  private _getCornerstoneVolumeImageIds(displaySet, dataSource): string[] | undefined {
    const imageIds = this._getCornerstoneStackImageIds(displaySet, dataSource);

    return imageIds?.length ? imageIds : displaySet.imageIds;
  }

  /**
   * The volume of a display set, for the image ids that it has now.
   *
   * A volume is valid for the image ids it was made from. When the display set
   * has other image ids now (it grew while no viewport showed it, or a time point
   * of a dynamic volume arrived and the display set moved to the dynamic volume
   * loader), the volume made before goes (see `_dropVolume`) and a new one is
   * made. A volume of the cache that this service did not make, as the computed
   * volume of the dynamic volume panel, is taken as it is: nothing behind it can
   * grow.
   *
   * The made volume is noted before the volume loads, so that a second mount of
   * the same change finds it and takes the same volume.
   */
  private _getVolume(
    displaySetInstanceUID: string,
    volumeId: string,
    imageIds: string[] | undefined
  ) {
    const made = this.madeVolumes.get(displaySetInstanceUID);

    if (made && (made.volumeId !== volumeId || !isSameImageIds(made.imageIds, imageIds))) {
      this._dropVolume(made.volumeId);
    }

    this.madeVolumes.set(displaySetInstanceUID, { volumeId, imageIds });

    return volumeLoader.createAndCacheVolume(volumeId, { imageIds });
  }

  /**
   * Takes a volume out of the cache, so that the next mount makes it again.
   *
   * A volume that no viewport shows is removed: its loads stop and its data is
   * freed. A volume that a viewport still shows only leaves the index of the
   * cache, so that a new volume can take its id, and stays with that viewport:
   * removing it would delete the image data under the viewport's actor. Such a
   * viewport mounts its display set again on the change of the display set
   * (`DISPLAY_SET_SERIES_METADATA_INVALIDATED`), and takes the new volume then.
   */
  private _dropVolume(volumeId: string): void {
    if (!cs3DCache.getVolumeLoadObject(volumeId)) {
      return;
    }

    if (utilities.getViewportsWithVolumeId(volumeId).length) {
      cs3DCache._volumeCache.delete(volumeId);
    } else {
      cs3DCache.removeVolumeLoadObject(volumeId);
    }
  }
}

export default CornerstoneCacheService;
