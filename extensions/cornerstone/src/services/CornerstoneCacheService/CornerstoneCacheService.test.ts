import { cache, Enums, utilities, volumeLoader } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
import { DisplaySetService } from '@ohif/core';
import CornerstoneCacheService from './CornerstoneCacheService';
import ViewportInfo from '../ViewportService/Viewport';
import CornerstoneViewportService from '../ViewportService/CornerstoneViewportService';

jest.mock('@cornerstonejs/core', () => {
  const actual = jest.requireActual('@cornerstonejs/core');
  return {
    ...actual,
    utilities: { ...actual.utilities, getViewportsWithVolumeId: jest.fn(() => []) },
  };
});

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

describe('the volume of a display set is valid for the image ids it was made from', () => {
  const STATIC_SCHEME = 'cornerstoneStreamingImageVolume';
  const DYNAMIC_SCHEME = 'cornerstoneStreamingDynamicImageVolume';

  type FakeVolume = { volumeId: string; imageIds?: string[] };
  type TestDisplaySet = Record<string, unknown> & {
    displaySetInstanceUID: string;
    images?: Array<{ imageId: string }>;
  };

  /**
   * The volume cache of Cornerstone3D, as far as the cache service uses it:
   * `createAndCacheVolume` gives the volume cached under the id, or makes one
   * of the image ids it is given. A volume whose id is in `shown` is one that a
   * viewport shows.
   */
  function useVolumeCache() {
    const volumes = new Map<string, FakeVolume>();
    const shown = new Set<string>();
    const volumeIndex = (cache as unknown as { _volumeCache: Map<string, unknown> })._volumeCache;

    jest.spyOn(cache, 'getVolume').mockImplementation(volumeId => volumes.get(volumeId) as never);
    jest
      .spyOn(cache, 'getVolumeLoadObject')
      .mockImplementation(volumeId =>
        volumes.has(volumeId)
          ? ({ promise: Promise.resolve(volumes.get(volumeId)) } as never)
          : undefined
      );
    jest.spyOn(cache, 'removeVolumeLoadObject').mockImplementation(volumeId => {
      volumes.delete(volumeId);
    });
    jest.spyOn(volumeIndex, 'delete').mockImplementation(volumeId => volumes.delete(volumeId));
    jest.spyOn(cache, 'getImageLoadObject').mockReturnValue(undefined);
    jest
      .spyOn(volumeLoader, 'createAndCacheVolume')
      .mockImplementation(async (volumeId: string, options) => {
        if (!volumes.has(volumeId)) {
          volumes.set(volumeId, { volumeId, imageIds: options?.imageIds });
        }
        return volumes.get(volumeId) as unknown as Types.IImageVolume;
      });
    jest
      .mocked(utilities.getViewportsWithVolumeId)
      .mockImplementation(volumeId => (shown.has(volumeId) ? [{}] : []) as never);

    return { volumes, shown, volumeIndex };
  }

  /** The data source of the viewer: the image ids of the instances of a display set. */
  const instanceDataSource = {
    getImageIdsForDisplaySet: (displaySet: TestDisplaySet) =>
      (displaySet.images ?? []).map(image => image.imageId),
  };

  /** The images of `count` instances of a display set, from the instance `first` on. */
  function makeImages(displaySetInstanceUID: string, count: number, first = 1) {
    return Array.from({ length: count }, (_, index) => ({
      imageId: `${displaySetInstanceUID}:${first + index}`,
    }));
  }

  /** An image display set of `count` instances that can be shown as a volume. */
  function makeSeriesDisplaySet(
    displaySetInstanceUID: string,
    count: number,
    attributes: Record<string, unknown> = {}
  ): TestDisplaySet {
    return {
      displaySetInstanceUID,
      StudyInstanceUID: 'study-1',
      Modality: 'CT',
      isReconstructable: true,
      images: makeImages(displaySetInstanceUID, count),
      ...attributes,
    };
  }

  /** Adds instances to a display set, as `extendInstances` does while a series arrives. */
  function growDisplaySet(displaySet: TestDisplaySet, count: number) {
    displaySet.images.push(
      ...makeImages(displaySet.displaySetInstanceUID, count, displaySet.images.length + 1)
    );
  }

  function makeCacheService() {
    return new CornerstoneCacheService({
      services: {
        userAuthenticationService: { getAuthorizationHeader: () => ({}) },
        uiNotificationService: { show: jest.fn() },
      },
    } as unknown as AppTypes.ServicesManager);
  }

  function mount(
    cacheService: CornerstoneCacheService,
    displaySets: TestDisplaySet[],
    viewportType = 'volume'
  ) {
    return cacheService.createViewportData(
      displaySets as never,
      { viewportType } as AppTypes.ViewportGrid.GridViewportOptions,
      instanceDataSource
    );
  }

  function volumeOf(viewportData, displaySetInstanceUID: string): FakeVolume {
    return viewportData.data.find(data => data.displaySetInstanceUID === displaySetInstanceUID)
      ?.volume;
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(['volume', 'volume3d'])(
    'a %s mount makes the volume of a display set that grew while no viewport showed it again, from its new images',
    async viewportType => {
      const { volumes } = useVolumeCache();
      const cacheService = makeCacheService();
      const ct = makeSeriesDisplaySet('ct', 3);
      const volumeId = `${STATIC_SCHEME}:ct`;
      const first = volumeOf(await mount(cacheService, [ct], viewportType), 'ct');

      growDisplaySet(ct, 2);
      const second = volumeOf(await mount(cacheService, [ct], viewportType), 'ct');

      expect(second).not.toBe(first);
      expect(second.imageIds).toEqual(instanceDataSource.getImageIdsForDisplaySet(ct));
      expect(ct.imageIds).toEqual(second.imageIds);
      expect(cache.removeVolumeLoadObject).toHaveBeenCalledWith(volumeId);
      expect(volumes.get(volumeId)).toBe(second);
    }
  );

  it('keeps the volume while the display set has the images it was made from, in any order', async () => {
    useVolumeCache();
    const cacheService = makeCacheService();
    const ct = makeSeriesDisplaySet('ct', 3);
    const first = volumeOf(await mount(cacheService, [ct]), 'ct');

    ct.images.reverse();
    const second = volumeOf(await mount(cacheService, [ct], 'volume3d'), 'ct');

    expect(second).toBe(first);
    expect(cache.removeVolumeLoadObject).not.toHaveBeenCalled();
  });

  it('makes the volume again when the display set grew while it was shown as a stack elsewhere', async () => {
    const { volumes } = useVolumeCache();
    const cacheService = makeCacheService();
    const ct = makeSeriesDisplaySet('ct', 3);
    const first = volumeOf(await mount(cacheService, [ct]), 'ct');
    const stack = await mount(cacheService, [ct], 'stack');

    growDisplaySet(ct, 1);
    await cacheService.invalidateViewportData(stack, 'ct', instanceDataSource, {
      getDisplaySetByUID: () => ct,
    });
    const second = volumeOf(await mount(cacheService, [ct]), 'ct');

    expect(second).not.toBe(first);
    expect(second.imageIds).toHaveLength(4);
    expect(volumes.get(`${STATIC_SCHEME}:ct`)).toBe(second);
  });

  it('replaces only the volume of the display set that grew in a fusion', async () => {
    useVolumeCache();
    const cacheService = makeCacheService();
    const ct = makeSeriesDisplaySet('ct', 3);
    const pt = makeSeriesDisplaySet('pt', 3, { Modality: 'PT' });
    const first = await mount(cacheService, [ct, pt]);

    growDisplaySet(pt, 2);
    const second = await mount(cacheService, [ct, pt]);

    expect(volumeOf(second, 'ct')).toBe(volumeOf(first, 'ct'));
    expect(volumeOf(second, 'pt')).not.toBe(volumeOf(first, 'pt'));
    expect(volumeOf(second, 'pt').imageIds).toHaveLength(5);
    expect(cache.removeVolumeLoadObject).toHaveBeenCalledTimes(1);
    expect(cache.removeVolumeLoadObject).toHaveBeenCalledWith(`${STATIC_SCHEME}:pt`);
  });

  it('makes a dynamic volume again from all its time points when a time point arrived', async () => {
    const { volumes } = useVolumeCache();
    const cacheService = makeCacheService();
    const pet = makeSeriesDisplaySet('pet4d', 6, {
      Modality: 'PT',
      isDynamicVolume: true,
      volumeLoaderSchema: DYNAMIC_SCHEME,
    });
    const volumeId = `${DYNAMIC_SCHEME}:pet4d`;
    const first = volumeOf(await mount(cacheService, [pet]), 'pet4d');

    growDisplaySet(pet, 3);
    const second = volumeOf(await mount(cacheService, [pet]), 'pet4d');

    expect(second).not.toBe(first);
    expect(second.volumeId).toBe(volumeId);
    expect(second.imageIds).toHaveLength(9);
    expect(volumes.get(volumeId)).toBe(second);
  });

  it('removes the static volume of a display set that became dynamic when its second time point arrived', async () => {
    const { volumes } = useVolumeCache();
    const cacheService = makeCacheService();
    const pet = makeSeriesDisplaySet('pet4d', 3, {
      Modality: 'PT',
      volumeLoaderSchema: STATIC_SCHEME,
    });
    await mount(cacheService, [pet]);

    growDisplaySet(pet, 3);
    pet.isDynamicVolume = true;
    pet.volumeLoaderSchema = DYNAMIC_SCHEME;
    const dynamic = volumeOf(await mount(cacheService, [pet]), 'pet4d');

    expect(dynamic.volumeId).toBe(`${DYNAMIC_SCHEME}:pet4d`);
    expect(dynamic.imageIds).toHaveLength(6);
    expect([...volumes.keys()].filter(volumeId => volumeId.includes('pet4d'))).toEqual([
      `${DYNAMIC_SCHEME}:pet4d`,
    ]);
  });

  it('makes the dynamic volume that a viewport shows again when its display set is invalidated', async () => {
    const { volumes, shown } = useVolumeCache();
    const cacheService = makeCacheService();
    const pet = makeSeriesDisplaySet('pet4d', 6, {
      Modality: 'PT',
      isDynamicVolume: true,
      volumeLoaderSchema: DYNAMIC_SCHEME,
    });
    const volumeId = `${DYNAMIC_SCHEME}:pet4d`;
    const viewportData = await mount(cacheService, [pet]);
    const first = volumeOf(viewportData, 'pet4d');
    shown.add(volumeId);

    const invalidated = await cacheService.invalidateViewportData(
      viewportData,
      'pet4d',
      instanceDataSource,
      { getDisplaySetByUID: () => pet }
    );

    expect(volumeOf(invalidated, 'pet4d')).not.toBe(first);
    expect(volumes.get(volumeId)).toBe(volumeOf(invalidated, 'pet4d'));
  });

  it('keeps the computed volume of a dynamic display set, made in the client, when the dynamic one grows', async () => {
    const { volumes } = useVolumeCache();
    const cacheService = makeCacheService();
    const pet = makeSeriesDisplaySet('pet4d', 6, {
      Modality: 'PT',
      isDynamicVolume: true,
      volumeLoaderSchema: DYNAMIC_SCHEME,
    });
    const computedVolumeId = `${STATIC_SCHEME}:computed`;
    const computedVolume = { volumeId: computedVolumeId, imageIds: ['derived:1', 'derived:2'] };
    volumes.set(computedVolumeId, computedVolume);
    const computed: TestDisplaySet = {
      displaySetInstanceUID: 'computed',
      volumeLoaderSchema: STATIC_SCHEME,
      Modality: 'PT',
      madeInClient: true,
      isDerived: true,
      referenceDisplaySetUID: 'pet4d',
      imageIds: computedVolume.imageIds,
    };
    await mount(cacheService, [pet]);
    const first = volumeOf(await mount(cacheService, [computed]), 'computed');

    growDisplaySet(pet, 3);
    await mount(cacheService, [pet]);
    const second = volumeOf(await mount(cacheService, [computed]), 'computed');

    expect(first).toBe(computedVolume);
    expect(second).toBe(computedVolume);
    expect(volumes.get(computedVolumeId)).toBe(computedVolume);
    expect(cache.removeVolumeLoadObject).not.toHaveBeenCalledWith(computedVolumeId);
  });

  it('keeps the volume of a parametric map, which its load makes, when the series it maps grows', async () => {
    const { volumes } = useVolumeCache();
    const cacheService = makeCacheService();
    const ct = makeSeriesDisplaySet('ct', 3);
    const pmapVolumeId = `${STATIC_SCHEME}:pmap`;
    const pmapVolume = { volumeId: pmapVolumeId, imageIds: ['derived:pmap'] };
    const pmap: TestDisplaySet = {
      displaySetInstanceUID: 'pmap',
      StudyInstanceUID: 'study-1',
      Modality: 'PMAP',
      isReconstructable: true,
      images: makeImages('pmap', 1),
      load: async () => {
        volumes.set(pmapVolumeId, pmapVolume);
      },
    };
    await mount(cacheService, [ct]);
    const first = volumeOf(await mount(cacheService, [pmap]), 'pmap');

    growDisplaySet(ct, 1);
    await mount(cacheService, [ct]);
    const second = volumeOf(await mount(cacheService, [ct, pmap]), 'pmap');

    expect(first).toBe(pmapVolume);
    expect(second).toBe(pmapVolume);
    expect(volumeLoader.createAndCacheVolume).not.toHaveBeenCalledWith(
      pmapVolumeId,
      expect.anything()
    );
    expect(cache.removeVolumeLoadObject).not.toHaveBeenCalledWith(pmapVolumeId);
  });

  it('gives the two viewports that show a volume one new volume when its display set grows', async () => {
    const { volumes, shown } = useVolumeCache();
    const cacheService = makeCacheService();
    const ct = makeSeriesDisplaySet('ct', 3);
    const volumeId = `${STATIC_SCHEME}:ct`;
    const paneA = await mount(cacheService, [ct]);
    const paneB = await mount(cacheService, [ct], 'volume3d');
    expect(volumeOf(paneB, 'ct')).toBe(volumeOf(paneA, 'ct'));
    shown.add(volumeId);

    growDisplaySet(ct, 1);
    const displaySetService = { getDisplaySetByUID: () => ct };
    const [newA, newB] = await Promise.all([
      cacheService.invalidateViewportData(paneA, 'ct', instanceDataSource, displaySetService),
      cacheService.invalidateViewportData(paneB, 'ct', instanceDataSource, displaySetService),
    ]);

    expect(volumeOf(newB, 'ct')).toBe(volumeOf(newA, 'ct'));
    expect(volumeOf(newA, 'ct').imageIds).toHaveLength(4);
    expect(volumes.get(volumeId)).toBe(volumeOf(newA, 'ct'));
  });

  it('does not destroy the old volume while a viewport shows it: it leaves the cache, and that viewport takes the new one at its remount', async () => {
    const { volumes, shown, volumeIndex } = useVolumeCache();
    const cacheService = makeCacheService();
    const ct = makeSeriesDisplaySet('ct', 3);
    const volumeId = `${STATIC_SCHEME}:ct`;
    const paneA = await mount(cacheService, [ct]);
    shown.add(volumeId);

    growDisplaySet(ct, 1);
    const paneB = await mount(cacheService, [ct]);
    const invalidatedA = await cacheService.invalidateViewportData(
      paneA,
      'ct',
      instanceDataSource,
      { getDisplaySetByUID: () => ct }
    );

    expect(cache.removeVolumeLoadObject).not.toHaveBeenCalled();
    expect(volumeIndex.delete).toHaveBeenCalledWith(volumeId);
    expect(volumeOf(paneB, 'ct')).not.toBe(volumeOf(paneA, 'ct'));
    expect(volumeOf(invalidatedA, 'ct')).toBe(volumeOf(paneB, 'ct'));
    expect(volumes.get(volumeId)).toBe(volumeOf(paneB, 'ct'));
  });

  it('makes the volume again from the images that the display set service added to a display set that no viewport showed', async () => {
    useVolumeCache();
    const MR_IMAGE_STORAGE = '1.2.840.10008.5.1.4.1.1.4';
    const instance = (index: number) => ({
      SOPInstanceUID: `sop-${index}`,
      SOPClassUID: MR_IMAGE_STORAGE,
      SeriesInstanceUID: 'series-1',
      StudyInstanceUID: 'study-1',
      Modality: 'MR',
      Rows: 128,
      Columns: 128,
      InstanceNumber: index,
      imageId: `mr:${index}`,
    });
    const createDisplaySetFromGroup = jest.fn(group => {
      const displaySet = {
        displaySetInstanceUID: 'mr',
        SeriesInstanceUID: 'series-1',
        StudyInstanceUID: 'study-1',
        Modality: 'MR',
        isReconstructable: true,
        images: [...group.instances],
        instances: [] as unknown[],
        splitKey: group.splitKey,
        extendInstances: newInstances => {
          displaySet.images.push(...newInstances);
          return displaySet;
        },
      };
      displaySet.instances = displaySet.images;
      return displaySet;
    });
    const { displaySetRules } = jest.requireActual('@cornerstonejs/metadata');
    const servicesManager = {
      services: {
        uiNotificationService: { show: jest.fn() },
        customizationService: {
          getCustomization: id =>
            id === 'useMetadataDisplaySet'
              ? {
                  enabled: true,
                  displaySetRules: { defaultImageRule: displaySetRules.defaultImageRule },
                  displaySetRuleOrder: ['defaultImageRule'],
                  createDisplaySetFromGroup,
                }
              : undefined,
        },
      },
    };
    const displaySetService = new DisplaySetService({ servicesManager } as never);
    displaySetService.init({ getModuleEntry: () => undefined } as never, []);
    const invalidated = [];
    displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SET_SERIES_METADATA_INVALIDATED,
      event => invalidated.push(event)
    );
    const cacheService = makeCacheService();
    const firstPart = [1, 2, 3].map(instance);

    const [mr] = displaySetService.makeDisplaySets(firstPart) as unknown as TestDisplaySet[];
    const first = volumeOf(await mount(cacheService, [mr]), 'mr');
    displaySetService.makeDisplaySets([...firstPart, instance(4), instance(5)]);
    const second = volumeOf(await mount(cacheService, [mr]), 'mr');

    expect(invalidated).toEqual([{ displaySetInstanceUID: 'mr', invalidateData: true }]);
    expect(first.imageIds).toEqual(['mr:1', 'mr:2', 'mr:3']);
    expect(second.imageIds).toEqual(['mr:1', 'mr:2', 'mr:3', 'mr:4', 'mr:5']);
    displaySetService.onModeExit();
  });
});
