import { Enums } from '@cornerstonejs/core';
import type { PlanarViewport } from '@cornerstonejs/core';
import CornerstoneViewportService from './CornerstoneViewportService';
import type ViewportInfo from './Viewport';
import type { StackViewportData, VolumeViewportData } from '../../types/CornerstoneCacheService';
import type { ViewportShape } from '../../utils/viewportDataShape';

const { ViewportType } = Enums;

const imageIds = ['image-0', 'image-1', 'image-2', 'image-3', 'image-4'];

function makeServicesManager() {
  return {
    services: {
      displaySetService: { getDisplaySetByUID: jest.fn().mockReturnValue({}) },
      segmentationService: { clearSegmentationRepresentations: jest.fn() },
      syncGroupService: { getSynchronizersForViewport: jest.fn().mockReturnValue([]) },
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
});
