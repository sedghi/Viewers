import { cache, Enums, volumeLoader } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
import CornerstoneCacheService from './CornerstoneCacheService';
import ViewportInfo from '../ViewportService/Viewport';
import { NextViewportBackend } from '../ViewportService/backends/NextViewportBackend';
import type { IViewportServiceInternals } from '../ViewportService/backends/IViewportServiceInternals';

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

function makeServiceInternals(): jest.Mocked<IViewportServiceInternals> {
  return {
    _setStackViewport: jest.fn().mockResolvedValue(undefined),
    _setVolumeViewport: jest.fn().mockResolvedValue(undefined),
    _setEcgViewport: jest.fn().mockResolvedValue(undefined),
    _setOtherViewport: jest.fn().mockResolvedValue(undefined),
    setPresentations: jest.fn(),
    _addOverlayRepresentations: jest.fn().mockResolvedValue(undefined),
    _trackViewportDisplaySets: jest.fn(),
  };
}

/**
 * What the viewer does with the `viewportOptions` of a hanging protocol
 * viewport: the cache service builds the viewport data, the viewport info
 * takes the options and the data, and the backend picks the mount.
 */
async function hangViewport(viewportType: string) {
  const cacheService = new CornerstoneCacheService({} as AppTypes.ServicesManager);
  const viewportOptions = { viewportType } as AppTypes.ViewportGrid.GridViewportOptions;
  const viewportData = await cacheService.createViewportData(
    makeDisplaySets() as never,
    viewportOptions,
    dataSource
  );

  const viewportInfo = new ViewportInfo('viewport-1');
  viewportInfo.setPublicViewportOptions({ viewportType }, viewportData.viewportType);
  viewportInfo.setViewportData(viewportData);

  const service = makeServiceInternals();
  const viewport = { id: 'viewport-1', type: viewportInfo.getViewportType() };
  await new NextViewportBackend(service).dispatchMount(
    viewport as unknown as Types.IViewport,
    viewportData,
    viewportInfo
  );

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
});
