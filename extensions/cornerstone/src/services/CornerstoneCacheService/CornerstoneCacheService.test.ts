import { cache, Enums, volumeLoader } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
import CornerstoneCacheService from './CornerstoneCacheService';
import ViewportInfo from '../ViewportService/Viewport';
import CornerstoneViewportService from '../ViewportService/CornerstoneViewportService';

const { ViewportType } = Enums;

const imageIds = ['imageId-1', 'imageId-2', 'imageId-3'];

const dataSource = {
  getImageIdsForDisplaySet: jest.fn().mockReturnValue(imageIds),
};

function makeDisplaySets() {
  return [
    {
      displaySetInstanceUID: 'display-set-1',
      StudyInstanceUID: 'study-1',
      Modality: 'CT',
    },
  ];
}

/** An image display set that can be shown as a volume. */
function makeImageDisplaySet(displaySetInstanceUID: string, Modality: string) {
  return { displaySetInstanceUID, StudyInstanceUID: 'study-1', Modality, isReconstructable: true };
}

/**
 * A segmentation display set over an image display set. As the SEG and the RTSTRUCT
 * display sets of the viewer, it takes `isReconstructable` from the display set it
 * references.
 */
function makeOverlayDisplaySet(Modality: string) {
  return {
    displaySetInstanceUID: 'overlay-1',
    StudyInstanceUID: 'study-1',
    Modality,
    isOverlayDisplaySet: true,
    isReconstructable: true,
  };
}

/** A viewport service whose mount of each family is stubbed, to see which one a mount takes. */
function makeViewportService() {
  const service = new CornerstoneViewportService({} as AppTypes.ServicesManager);
  jest.spyOn(service, '_setStackViewport').mockResolvedValue(undefined);
  jest.spyOn(service, '_setVolumeViewport').mockResolvedValue(undefined);
  jest.spyOn(service, '_setEcgViewport').mockResolvedValue(undefined);
  jest.spyOn(service, '_setOtherViewport').mockResolvedValue(undefined);
  return service;
}

/**
 * What the viewer does with the `viewportOptions` of a hanging protocol
 * viewport: the cache service builds the viewport data, the viewport info
 * takes the options and the data, and the viewport service picks the mount.
 */
async function hangViewport(viewportType: string, displaySets = makeDisplaySets()) {
  const cacheService = new CornerstoneCacheService({} as AppTypes.ServicesManager);
  const viewportOptions = { viewportType } as AppTypes.ViewportGrid.GridViewportOptions;
  const viewportData = await cacheService.createViewportData(
    displaySets as never,
    viewportOptions,
    dataSource
  );

  const viewportInfo = new ViewportInfo('viewport-1');
  viewportInfo.setPublicViewportOptions({ viewportType }, viewportData.viewportType);
  viewportInfo.setViewportData(viewportData);

  const service = makeViewportService();
  const viewport = { id: 'viewport-1', type: viewportInfo.getViewportType() };
  await service._setDisplaySets(viewport as unknown as Types.IViewport, viewportData, viewportInfo);

  return { viewportData, viewportInfo, service };
}

describe('the viewport type words of a hanging protocol', () => {
  beforeEach(() => {
    jest.spyOn(cache, 'getVolume').mockReturnValue(undefined);
    jest
      .spyOn(volumeLoader, 'createAndCacheVolume')
      .mockImplementation(
        async (volumeId: string) => ({ volumeId, imageIds }) as unknown as Types.IImageVolume
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(['stack', 'STACK'])('%s gives a planar viewport that shows a stack', async word => {
    const { viewportData, viewportInfo, service } = await hangViewport(word);

    expect(viewportData.viewportType).toBe(ViewportType.PLANAR);
    expect(viewportData.dataShapeType).toBe('stack');
    expect(viewportData.data[0].imageIds).toEqual(imageIds);
    expect(viewportInfo.getViewportType()).toBe(ViewportType.PLANAR);
    expect(viewportInfo.getDataShape()).toBe('stack');
    expect(service._setStackViewport).toHaveBeenCalledTimes(1);
    expect(service._setVolumeViewport).not.toHaveBeenCalled();
  });

  it.each(['volume', 'orthographic', 'Orthographic'])(
    '%s gives a planar viewport that shows a volume',
    async word => {
      const { viewportData, viewportInfo, service } = await hangViewport(word);

      expect(viewportData.viewportType).toBe(ViewportType.PLANAR);
      expect(viewportData.dataShapeType).toBe('volume');
      expect((viewportData.data[0] as { volumeId?: string }).volumeId).toContain('display-set-1');
      expect(viewportInfo.getViewportType()).toBe(ViewportType.PLANAR);
      expect(viewportInfo.getDataShape()).toBe('volume');
      expect(service._setVolumeViewport).toHaveBeenCalledTimes(1);
      expect(service._setStackViewport).not.toHaveBeenCalled();
    }
  );

  it('volume3d gives a 3D viewport that shows a 3D volume', async () => {
    const { viewportData, viewportInfo, service } = await hangViewport('volume3d');

    expect(viewportData.viewportType).toBe(ViewportType.VOLUME_3D);
    expect(viewportData.dataShapeType).toBe('volume3d');
    expect((viewportData.data[0] as { volumeId?: string }).volumeId).toContain('display-set-1');
    expect(viewportInfo.getViewportType()).toBe(ViewportType.VOLUME_3D);
    expect(viewportInfo.getDataShape()).toBe('volume3d');
    expect(service._setVolumeViewport).toHaveBeenCalledTimes(1);
    expect(service._setStackViewport).not.toHaveBeenCalled();
  });

  it.each([
    ['video', ViewportType.VIDEO],
    ['wholeslide', ViewportType.WHOLE_SLIDE],
  ])('%s gives its own viewport type and the other shape', async (word, type) => {
    const { viewportData, viewportInfo, service } = await hangViewport(word);

    expect(viewportData.viewportType).toBe(type);
    expect(viewportData.dataShapeType).toBe('other');
    expect(viewportInfo.getViewportType()).toBe(type);
    expect(viewportInfo.getDataShape()).toBe('other');
    expect(service._setOtherViewport).toHaveBeenCalledTimes(1);
    expect(service._setStackViewport).not.toHaveBeenCalled();
    expect(service._setVolumeViewport).not.toHaveBeenCalled();
  });

  it('ecg gives an ECG viewport and the other shape', async () => {
    const { viewportData, viewportInfo, service } = await hangViewport('ecg');

    expect(viewportData.viewportType).toBe(ViewportType.ECG);
    expect(viewportData.dataShapeType).toBe('other');
    expect(viewportInfo.getViewportType()).toBe(ViewportType.ECG);
    expect(viewportInfo.getDataShape()).toBe('other');
    expect(service._setEcgViewport).toHaveBeenCalledTimes(1);
  });

  it('the viewport options alone give the Cornerstone3D type', () => {
    const viewportInfo = new ViewportInfo('viewport-1');

    expect(viewportInfo.getViewportType()).toBe(ViewportType.PLANAR);
    expect(viewportInfo.getDataShape()).toBe('stack');

    viewportInfo.setPublicViewportOptions({ viewportType: 'volume' });
    expect(viewportInfo.getViewportType()).toBe(ViewportType.PLANAR);

    viewportInfo.setPublicViewportOptions({ viewportType: 'volume3d' });
    expect(viewportInfo.getViewportType()).toBe(ViewportType.VOLUME_3D);
  });

  it('two reconstructable display sets of a stack viewport are shown as a volume', async () => {
    const cacheService = new CornerstoneCacheService({} as AppTypes.ServicesManager);
    const displaySets = [
      { ...makeDisplaySets()[0], isReconstructable: true },
      { ...makeDisplaySets()[0], displaySetInstanceUID: 'display-set-2', isReconstructable: true },
    ];

    const viewportData = await cacheService.createViewportData(
      displaySets as never,
      { viewportType: 'stack' } as AppTypes.ViewportGrid.GridViewportOptions,
      dataSource
    );

    expect(viewportData.viewportType).toBe(ViewportType.PLANAR);
    expect(viewportData.dataShapeType).toBe('volume');
  });

  it('an invalidated stack stays a stack', async () => {
    const cacheService = new CornerstoneCacheService({} as AppTypes.ServicesManager);
    const [displaySet] = makeDisplaySets();
    const viewportData = await cacheService.createViewportData(
      [displaySet] as never,
      { viewportType: 'stack' } as AppTypes.ViewportGrid.GridViewportOptions,
      dataSource
    );
    jest.spyOn(cache, 'getImageLoadObject').mockReturnValue(undefined);

    const invalidated = await cacheService.invalidateViewportData(
      viewportData,
      displaySet.displaySetInstanceUID,
      dataSource,
      { getDisplaySetByUID: () => displaySet }
    );

    expect(invalidated.viewportType).toBe(ViewportType.PLANAR);
    expect(invalidated.dataShapeType).toBe('stack');
  });

  it.each(['RTSTRUCT', 'SEG'])(
    'a stack with a reconstructable %s over it stays a stack',
    async Modality => {
      const { viewportData, service } = await hangViewport('stack', [
        makeImageDisplaySet('display-set-1', 'CT'),
        makeOverlayDisplaySet(Modality),
      ]);

      expect(viewportData.dataShapeType).toBe('stack');
      expect(service._setStackViewport).toHaveBeenCalledTimes(1);
      expect(service._setVolumeViewport).not.toHaveBeenCalled();
    }
  );

  it('two reconstructable image display sets with a segmentation over them are shown as a volume', async () => {
    const { viewportData } = await hangViewport('stack', [
      makeImageDisplaySet('display-set-1', 'CT'),
      makeImageDisplaySet('display-set-2', 'PT'),
      makeOverlayDisplaySet('SEG'),
    ]);

    expect(viewportData.dataShapeType).toBe('volume');
  });
});

describe('a display set that grows after its first mount', () => {
  const grownImageIds = [...imageIds, 'imageId-4'];

  /** A data source whose display set has the image ids of `current` when asked. */
  function makeGrowingDataSource() {
    let current = imageIds;
    return {
      getImageIdsForDisplaySet: jest.fn(() => current),
      grow: () => {
        current = grownImageIds;
      },
    };
  }

  beforeEach(() => {
    jest.spyOn(cache, 'getVolume').mockReturnValue(undefined);
    jest.spyOn(cache, 'getImageLoadObject').mockReturnValue(undefined);
    jest
      .spyOn(volumeLoader, 'createAndCacheVolume')
      .mockImplementation(
        async (volumeId: string, options) =>
          ({ volumeId, imageIds: options.imageIds }) as unknown as Types.IImageVolume
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('gives the registered display set its new images when the stack that shows it is invalidated', async () => {
    const cacheService = new CornerstoneCacheService({} as AppTypes.ServicesManager);
    const growingDataSource = makeGrowingDataSource();
    const [displaySet] = makeDisplaySets() as Array<Record<string, unknown>>;
    const viewportData = await cacheService.createViewportData(
      [displaySet] as never,
      { viewportType: 'stack' } as AppTypes.ViewportGrid.GridViewportOptions,
      growingDataSource
    );
    expect(displaySet.imageIds).toEqual(imageIds);

    growingDataSource.grow();
    const invalidated = await cacheService.invalidateViewportData(
      viewportData,
      'display-set-1',
      growingDataSource,
      { getDisplaySetByUID: () => displaySet }
    );

    expect(displaySet.imageIds).toEqual(grownImageIds);
    expect((invalidated.data as unknown as { imageIds: string[] }).imageIds).toEqual(grownImageIds);
  });

  it('gives a display set that grew while no viewport showed it its new images at its next mount', async () => {
    const cacheService = new CornerstoneCacheService({} as AppTypes.ServicesManager);
    const growingDataSource = makeGrowingDataSource();
    const [displaySet] = makeDisplaySets() as Array<Record<string, unknown>>;
    const viewportOptions = { viewportType: 'stack' } as AppTypes.ViewportGrid.GridViewportOptions;
    await cacheService.createViewportData(
      [displaySet] as never,
      viewportOptions,
      growingDataSource
    );

    growingDataSource.grow();
    const viewportData = await cacheService.createViewportData(
      [displaySet] as never,
      viewportOptions,
      growingDataSource
    );

    expect(displaySet.imageIds).toEqual(grownImageIds);
    expect(viewportData.data[0].imageIds).toEqual(grownImageIds);
  });

  it('gives a display set that was replaced by a new object its images at its next mount', async () => {
    const cacheService = new CornerstoneCacheService({} as AppTypes.ServicesManager);
    const viewportOptions = { viewportType: 'stack' } as AppTypes.ViewportGrid.GridViewportOptions;
    await cacheService.createViewportData(makeDisplaySets() as never, viewportOptions, dataSource);

    const [replaced] = makeDisplaySets() as Array<Record<string, unknown>>;
    await cacheService.createViewportData([replaced] as never, viewportOptions, dataSource);

    expect(replaced.imageIds).toEqual(imageIds);
  });

  it('makes the volume of a display set that grew from its new images when the volume viewport that shows it is invalidated', async () => {
    const cacheService = new CornerstoneCacheService({} as AppTypes.ServicesManager);
    const growingDataSource = makeGrowingDataSource();
    const displaySet = makeImageDisplaySet('display-set-1', 'CT') as Record<string, unknown>;
    const viewportData = await cacheService.createViewportData(
      [displaySet] as never,
      { viewportType: 'volume' } as AppTypes.ViewportGrid.GridViewportOptions,
      growingDataSource
    );

    growingDataSource.grow();
    await cacheService.invalidateViewportData(viewportData, 'display-set-1', growingDataSource, {
      getDisplaySetByUID: () => displaySet,
    });

    expect(displaySet.imageIds).toEqual(grownImageIds);
    expect(volumeLoader.createAndCacheVolume).toHaveBeenLastCalledWith(
      'cornerstoneStreamingImageVolume:display-set-1',
      { imageIds: grownImageIds }
    );
  });
});
