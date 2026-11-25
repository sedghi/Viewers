import { Enums, displaySetRegistry, utilities } from '@cornerstonejs/core';
import type { PlanarViewport } from '@cornerstonejs/core';
import { utilities as csToolsUtils } from '@cornerstonejs/tools';
import CornerstoneViewportService from './CornerstoneViewportService';
import type { IViewportBackend, StackMountContext } from './backends/IViewportBackend';
import type ViewportInfo from './Viewport';
import type { StackViewportData, VolumeViewportData } from '../../types/CornerstoneCacheService';
import type { ViewportShape } from '../../utils/viewportDataShape';
import type { LutPresentation } from '../../types/Presentation';

jest.mock('@cornerstonejs/core', () => {
  const actual = jest.requireActual('@cornerstonejs/core');

  return {
    ...actual,
    utilities: { ...actual.utilities, jumpToSlice: jest.fn() },
  };
});

const { ViewportType } = Enums;

const imageIds = ['image-0', 'image-1', 'image-2', 'image-3', 'image-4'];

function makeServicesManager() {
  return {
    services: {
      displaySetService: { getDisplaySetByUID: jest.fn().mockReturnValue({}) },
      segmentationService: { clearSegmentationRepresentations: jest.fn() },
      syncGroupService: { getSynchronizersForViewport: jest.fn().mockReturnValue([]) },
      viewportGridService: {
        getDisplaySetsUIDsForViewport: jest.fn().mockReturnValue(['display-set']),
      },
    },
  } as unknown as AppTypes.ServicesManager;
}

function makeElement() {
  return { clientWidth: 100, clientHeight: 100 } as HTMLDivElement;
}

function makeViewportData(shape: ViewportShape): StackViewportData | VolumeViewportData {
  if (shape === 'stack') {
    return {
      viewportType: ViewportType.PLANAR,
      dataShapeType: 'stack',
      data: [{ StudyInstanceUID: 'study', displaySetInstanceUID: 'display-set', imageIds }],
    };
  }

  return {
    viewportType: shape === 'volume3d' ? ViewportType.VOLUME_3D : ViewportType.PLANAR,
    dataShapeType: shape,
    data: [{ studyInstanceUID: 'study', displaySetInstanceUID: 'display-set', imageIds }],
  };
}

/** A service with one enabled viewport that has the options and the data of the shape. */
function makeServiceWithViewport(shape: ViewportShape, viewportOptions = {}) {
  const service = new CornerstoneViewportService(makeServicesManager());
  service.enableViewport('viewport-1', makeElement());

  const viewportInfo = service.getViewportInfo('viewport-1');
  const viewportData = makeViewportData(shape);
  viewportInfo.setPublicViewportOptions(viewportOptions, viewportData.viewportType);
  viewportInfo.setViewportData(viewportData);

  return { service, viewportInfo, viewportData };
}

function addViewports(service: CornerstoneViewportService, shape: ViewportShape, count: number) {
  for (let index = 0; index < count; index++) {
    const viewportId = `${shape}-${index}`;
    service.enableViewport(viewportId, makeElement());
    service.getViewportInfo(viewportId).setViewportData(makeViewportData(shape));
  }
}

describe('CornerstoneViewportService and the shape of the data', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    (utilities.jumpToSlice as jest.Mock).mockClear();
  });

  describe('the initial image of a hanging protocol', () => {
    const getInitialImageIndex = (
      service: CornerstoneViewportService,
      viewportInfo: ViewportInfo,
      ids?: string[]
    ) =>
      (
        service as unknown as {
          _getInitialImageIndexForViewport: (info: ViewportInfo, ids?: string[]) => number;
        }
      )._getInitialImageIndexForViewport(viewportInfo, ids);

    it('a stack takes the preset from the number of its images', () => {
      const { service, viewportInfo } = makeServiceWithViewport('stack', {
        initialImageOptions: { preset: 'middle' },
      });

      expect(getInitialImageIndex(service, viewportInfo, imageIds)).toBe(2);
    });

    it('a stack takes the index, clipped to its images', () => {
      const { service, viewportInfo } = makeServiceWithViewport('stack', {
        initialImageOptions: { index: 99 },
      });

      expect(getInitialImageIndex(service, viewportInfo, imageIds)).toBe(4);
    });

    it('a stack mount gets the initial image of the preset', async () => {
      const { service, viewportInfo, viewportData } = makeServiceWithViewport('stack', {
        initialImageOptions: { preset: 'last' },
      });
      const mountStack = jest.fn().mockResolvedValue(undefined);
      (service as unknown as { backend: { mountStack: jest.Mock } }).backend.mountStack =
        mountStack;
      const viewport = {
        id: 'viewport-1',
        element: { addEventListener: jest.fn() },
      } as unknown as PlanarViewport;

      await service._setStackViewport(viewport, viewportData as StackViewportData, viewportInfo);

      expect(mountStack).toHaveBeenCalledTimes(1);
      expect(mountStack.mock.calls[0][1].initialImageIndex).toBe(4);
    });

    it('a volume takes the preset from the number of slices of its viewport', () => {
      const { service, viewportInfo } = makeServiceWithViewport('volume', {
        viewportType: 'volume',
        initialImageOptions: { preset: 'last' },
      });
      jest
        .spyOn(service, 'getCornerstoneViewport')
        .mockReturnValue({ getNumberOfSlices: () => 11 } as unknown as PlanarViewport);

      expect(getInitialImageIndex(service, viewportInfo)).toBe(10);
    });

    it('a 3D volume has no initial image', () => {
      const { service, viewportInfo } = makeServiceWithViewport('volume3d', {
        viewportType: 'volume3d',
        initialImageOptions: { preset: 'last' },
      });

      expect(getInitialImageIndex(service, viewportInfo)).toBeUndefined();
    });

    /** Mounts a volume of 11 slices on the viewport of a service whose backend mounts it. */
    const mountVolume = async (viewportOptions: object, presentations: object) => {
      const { service } = makeServiceWithViewport('volume', {
        viewportType: 'volume',
        ...viewportOptions,
      });
      const viewport = {
        id: 'viewport-1',
        element: {},
        getNumberOfSlices: () => 11,
      } as unknown as PlanarViewport;
      const internals = service as unknown as {
        backend: { mountVolumes: jest.Mock };
        _processExtraDisplaySetsForViewport: () => unknown[];
      };
      internals.backend.mountVolumes = jest.fn().mockResolvedValue(true);
      jest.spyOn(internals, '_processExtraDisplaySetsForViewport').mockReturnValue([]);
      jest.spyOn(service, 'getCornerstoneViewport').mockReturnValue(viewport);

      await service.setVolumesForViewport(
        viewport,
        [{ volumeId: 'volume-1', displaySetInstanceUID: 'display-set', imageIds }],
        presentations
      );

      return { viewport, mountVolumes: internals.backend.mountVolumes };
    };

    it('a volume mount jumps to the initial image of the preset', async () => {
      const { viewport, mountVolumes } = await mountVolume(
        { initialImageOptions: { preset: 'middle' } },
        {}
      );

      expect(mountVolumes).toHaveBeenCalledTimes(1);
      expect(utilities.jumpToSlice).toHaveBeenCalledTimes(1);
      expect(utilities.jumpToSlice).toHaveBeenCalledWith(viewport.element, { imageIndex: 5 });
    });

    it('a volume mount jumps to the initial image of the index', async () => {
      const { viewport } = await mountVolume({ initialImageOptions: { index: 3 } }, {});

      expect(utilities.jumpToSlice).toHaveBeenCalledWith(viewport.element, { imageIndex: 3 });
    });

    it('a volume mount with a position presentation keeps its position', async () => {
      await mountVolume(
        { initialImageOptions: { preset: 'middle' } },
        { positionPresentation: { viewportType: 'planar', viewReference: {} } }
      );

      expect(utilities.jumpToSlice).not.toHaveBeenCalled();
    });

    it('a volume mount without initial image options does not jump', async () => {
      await mountVolume({}, {});

      expect(utilities.jumpToSlice).not.toHaveBeenCalled();
    });
  });

  describe('resize', () => {
    const spyOnResize = (service: CornerstoneViewportService) => {
      const internals = service as unknown as {
        performResize: () => void;
        enqueueViewportResizeRequest: () => void;
      };
      const performResize = jest.spyOn(internals, 'performResize').mockImplementation(() => {});
      const enqueue = jest
        .spyOn(internals, 'enqueueViewportResizeRequest')
        .mockImplementation(() => {});

      return { performResize, enqueue };
    };

    it('resizes at once with 12 stack viewports and 6 volume viewports', () => {
      const service = new CornerstoneViewportService(makeServicesManager());
      addViewports(service, 'stack', 12);
      addViewports(service, 'volume', 6);
      const { performResize, enqueue } = spyOnResize(service);

      service.resize();

      expect(performResize).toHaveBeenCalledTimes(1);
      expect(enqueue).not.toHaveBeenCalled();
      clearTimeout(service.gridResizeTimeOut);
    });

    it('queues the resize with 13 stack viewports', () => {
      const service = new CornerstoneViewportService(makeServicesManager());
      addViewports(service, 'stack', 13);
      const { performResize, enqueue } = spyOnResize(service);

      service.resize();

      expect(enqueue).toHaveBeenCalledTimes(1);
      expect(performResize).not.toHaveBeenCalled();
    });

    it('queues the resize with 7 volume viewports', () => {
      const service = new CornerstoneViewportService(makeServicesManager());
      addViewports(service, 'volume', 7);
      const { performResize, enqueue } = spyOnResize(service);

      service.resize();

      expect(enqueue).toHaveBeenCalledTimes(1);
      expect(performResize).not.toHaveBeenCalled();
    });

    it('does not count 3D viewports as volume viewports', () => {
      const service = new CornerstoneViewportService(makeServicesManager());
      addViewports(service, 'volume3d', 7);
      const { performResize, enqueue } = spyOnResize(service);

      service.resize();

      expect(performResize).toHaveBeenCalledTimes(1);
      expect(enqueue).not.toHaveBeenCalled();
      clearTimeout(service.gridResizeTimeOut);
    });
  });

  describe('the stored LUT presentation', () => {
    it('holds what a user set on each display set that the viewport shows, by its UID', () => {
      const { service } = makeServiceWithViewport('volume', { viewportType: 'volume' });
      const overrides = { ct: { voiRange: { lower: -160, upper: 240 } }, pt: { opacity: 0.4 } };
      const viewport = {
        getDisplaySets: () => [{ displaySetId: 'ct' }, { displaySetId: 'pt' }],
        getDisplaySetAppearance: jest.fn((displaySetId: string) => overrides[displaySetId]),
        getEffectiveDisplaySetAppearance: jest.fn(),
      };
      jest.spyOn(service, 'getCornerstoneViewport').mockReturnValue(viewport as never);

      const lutPresentation = (
        service as unknown as { _getLutPresentation: (id: string) => LutPresentation }
      )._getLutPresentation('viewport-1');

      expect(lutPresentation.appearances).toEqual(overrides);
      expect(viewport.getEffectiveDisplaySetAppearance).not.toHaveBeenCalled();
    });

    /** Mounts a stack with the options and the presentations given; gives the mount context. */
    const mountStack = async (displaySetOptions: object, presentations: object) => {
      const { service, viewportInfo, viewportData } = makeServiceWithViewport('stack');
      viewportInfo.setPublicDisplaySetOptions([displaySetOptions]);
      const backendMount = jest.fn().mockResolvedValue(undefined);
      const internals = service as unknown as {
        backend: { mountStack: jest.Mock };
        _processExtraDisplaySetsForViewport: () => unknown[];
      };
      internals.backend.mountStack = backendMount;
      jest.spyOn(internals, '_processExtraDisplaySetsForViewport').mockReturnValue([]);
      const viewport = {
        id: 'viewport-1',
        element: { addEventListener: jest.fn() },
      } as unknown as PlanarViewport;

      await service._setStackViewport(
        viewport,
        viewportData as StackViewportData,
        viewportInfo,
        presentations
      );

      return backendMount.mock.calls[0][1] as StackMountContext;
    };

    const protocolOptions = {
      voi: { windowWidth: 400, windowCenter: 40 },
      colormap: { name: 'hsv' },
      opacity: 0.6,
    };

    it('a stack takes the window, the colormap and the opacity of its display set options', async () => {
      const context = await mountStack(protocolOptions, {});

      expect(context.properties).toEqual({
        voiRange: utilities.windowLevel.toLowHighRange(400, 40),
        colormap: { name: 'hsv' },
        opacity: 0.6,
      });
    });

    it('a stack takes the stored appearance of its display set in place of the options', async () => {
      const stored = { voiRange: { lower: 0, upper: 10 }, invert: true };
      const context = await mountStack(protocolOptions, {
        lutPresentation: { viewportType: 'stack', appearances: { 'display-set': stored } },
      });

      expect(context.properties).toEqual(stored);
    });

    it('a stack whose stored appearance was reset keeps the window of its images', async () => {
      const context = await mountStack(protocolOptions, {
        lutPresentation: { viewportType: 'stack', appearances: { 'display-set': {} } },
      });

      expect(context.properties).toEqual({});
    });
  });

  describe('setViewportData', () => {
    it('does not enable a viewport for a stack without images', () => {
      const service = new CornerstoneViewportService(makeServicesManager());
      service.enableViewport('viewport-1', makeElement());
      const enableElement = jest.fn();
      jest
        .spyOn(service, 'getRenderingEngine')
        .mockReturnValue({ id: 'engine', enableElement } as never);

      service.setViewportData(
        'viewport-1',
        {
          viewportType: ViewportType.PLANAR,
          dataShapeType: 'stack',
          data: [{ StudyInstanceUID: 'study', displaySetInstanceUID: 'display-set', imageIds: [] }],
        },
        { viewportType: 'stack' },
        [{ voiInverted: false }]
      );

      expect(enableElement).not.toHaveBeenCalled();
    });

    it('determines the stack word for a measurement on an image that is not reconstructable', () => {
      const service = new CornerstoneViewportService(makeServicesManager());

      expect(
        service.determineTargetViewportType(
          { isReconstructable: false },
          { referencedImageId: 'image-0' }
        )
      ).toBe('stack');
      expect(
        service.determineTargetViewportType({ isReconstructable: true }, { volumeId: 'volume-1' })
      ).toBe('volume');
    });
  });

  describe('a viewport that could show a measurement as a volume', () => {
    const measurementMetadata = {
      volumeId: 'cornerstoneStreamingImageVolume:measured',
      FrameOfReferenceUID: 'frame-measured',
      referencedImageId: 'image-0',
    };

    function findWithDisplaySet(displaySet: Record<string, unknown>) {
      const servicesManager = makeServicesManager();
      (servicesManager.services.displaySetService.getDisplaySetByUID as jest.Mock).mockReturnValue(
        displaySet
      );
      const service = new CornerstoneViewportService(servicesManager);
      service.enableViewport('viewport-1', makeElement());
      const isReferenceViewable = jest.fn().mockReturnValue(true);
      jest
        .spyOn(service, 'getCornerstoneViewport')
        .mockReturnValue({ isReferenceViewable } as never);

      const found = service.findViewportConvertibleToVolume(
        measurementMetadata,
        'measured',
        'volume'
      );

      return { found, reference: isReferenceViewable.mock.calls[0][0] };
    }

    it('asks with the volume id of the display set that the viewport shows', () => {
      const { found, reference } = findWithDisplaySet({
        displaySetInstanceUID: 'display-set',
        FrameOfReferenceUID: 'frame-shown',
      });

      expect(reference.volumeId).toBe('cornerstoneStreamingImageVolume:display-set');
      expect(reference.FrameOfReferenceUID).toBe('frame-shown');
      expect(reference.referencedImageId).toBeNull();
      expect(found).toEqual({
        viewportId: 'viewport-1',
        displaySetInstanceUID: 'measured',
        viewportOptions: { viewportType: 'volume' },
      });
    });

    it('takes the volume loader of a display set that names one', () => {
      const { reference } = findWithDisplaySet({
        displaySetInstanceUID: 'display-set',
        FrameOfReferenceUID: 'frame-shown',
        volumeLoaderSchema: 'cornerstoneStreamingDynamicImageVolume',
      });

      expect(reference.volumeId).toBe('cornerstoneStreamingDynamicImageVolume:display-set');
    });
  });

  describe('the events of a mount', () => {
    it('a stack mount adds no listener to the element of its viewport, however often it mounts', async () => {
      const { service, viewportInfo, viewportData } = makeServiceWithViewport('stack');
      (service as unknown as { backend: { mountStack: jest.Mock } }).backend.mountStack = jest
        .fn()
        .mockResolvedValue(undefined);
      const addEventListener = jest.fn();
      const viewport = {
        id: 'viewport-1',
        element: { addEventListener },
      } as unknown as PlanarViewport;

      for (let mount = 0; mount < 5; mount++) {
        await service._setStackViewport(viewport, viewportData as StackViewportData, viewportInfo);
      }

      expect(addEventListener).not.toHaveBeenCalled();
    });

    it('has no event of its own for the volumes of a viewport: DISPLAY_SETS_CHANGED says it', () => {
      const service = new CornerstoneViewportService(makeServicesManager());

      expect(Object.keys(service.EVENTS)).toEqual(['VIEWPORT_DATA_CHANGED']);
    });
  });

  describe('a layout change', () => {
    it('keeps a display set in the store when the viewports that showed it are released', async () => {
      jest.spyOn(csToolsUtils.stackContextPrefetch, 'enable').mockImplementation(() => undefined);
      const displaySet = { displaySetInstanceUID: 'display-set', imageIds, Modality: 'CT' };
      displaySetRegistry.add('display-set', displaySet);
      const { service, viewportInfo } = makeServiceWithViewport('stack');
      const backend = (service as unknown as { backend: IViewportBackend }).backend;
      const viewport = {
        id: 'viewport-1',
        element: {},
        setDisplaySets: jest.fn().mockResolvedValue(undefined),
        setViewState: jest.fn(),
      };

      await backend.mountStack(
        viewport as unknown as PlanarViewport,
        {
          displaySetInstanceUIDs: ['display-set'],
          imageIds,
          initialImageIndex: 0,
          properties: {},
          presentations: {},
          viewportInfo,
        } as StackMountContext
      );
      service.disableElement('viewport-1');

      expect(displaySetRegistry.get('display-set')).toBe(displaySet);
      displaySetRegistry.remove('display-set');
    });
  });
});
