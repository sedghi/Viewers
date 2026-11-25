import { eventTarget } from '@cornerstonejs/core';
import { Enums as csToolsEnums } from '@cornerstonejs/tools';
import { ToolbarService } from '@ohif/core';
import { PubSubService } from '@ohif/core/src/services/_shared/pubSubServiceInterface';

/*
 * The index of the extension imports every module of the extension. The modules that
 * onModeEnter and onModeExit do not use are replaced, so that the test loads the
 * lifecycle of the extension and not its panels, viewports and tools.
 */
jest.mock('@cornerstonejs/ai', () => ({ ONNXSegmentationController: class {} }));
jest.mock('@cornerstonejs/labelmap-interpolation', () => ({}));
jest.mock('./initCornerstoneTools', () => ({ toolNames: {} }));
jest.mock('./commandsModule', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('./init', () => ({ __esModule: true, default: () => undefined }));
jest.mock('./getCustomizationModule', () => ({ __esModule: true, default: () => [] }));
jest.mock('./getHangingProtocolModule', () => ({ __esModule: true, default: () => [] }));
jest.mock('./getToolbarModule', () => ({ __esModule: true, default: () => [] }));
jest.mock('./getPanelModule', () => ({ __esModule: true, default: () => [] }));
jest.mock('./getSopClassHandlerModule', () => ({ getSopClassHandlerModule: () => [] }));
jest.mock('./services/ToolGroupService', () => ({ __esModule: true, default: {} }));
jest.mock('./services/SyncGroupService', () => ({ __esModule: true, default: {} }));
jest.mock('./services/SegmentationService', () => ({ __esModule: true, default: {} }));
jest.mock('./services/CornerstoneCacheService', () => ({ __esModule: true, default: {} }));
jest.mock('./services/ViewportService/CornerstoneViewportService', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('./services/ColorbarService', () => ({ __esModule: true, default: {} }));
jest.mock('./services/ViewedDataService', () => ({ __esModule: true, default: {} }));
jest.mock('./utils/dicomLoaderService', () => ({ __esModule: true, default: {} }));
jest.mock('./utils/measurementServiceMappings', () => ({ measurementMappingUtils: {} }));
jest.mock('./utils/measurementServiceMappings/PlanarFreehandROI', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('./utils/measurementServiceMappings/RectangleROI', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('./utils/measurementServiceMappings/utils/getSOPInstanceAttributes', () => ({
  __esModule: true,
  default: () => undefined,
}));
jest.mock('./tools/ImageOverlayViewerTool', () => ({ __esModule: true, default: class {} }));
jest.mock('./synchronizers/frameViewSynchronizer', () => ({
  createFrameViewSynchronizer: () => undefined,
}));
jest.mock('./hooks/useActiveViewportSegmentationRepresentations', () => ({
  useActiveViewportSegmentationRepresentations: () => undefined,
}));
jest.mock('./hooks/useMeasurements', () => ({ useMeasurements: () => undefined }));
jest.mock('./hooks/useSegmentations', () => ({ useSegmentations: () => undefined }));
jest.mock('./hooks/useMeasurementTracking', () => ({ useMeasurementTracking: () => undefined }));
jest.mock('./panels/PanelSegmentation', () => ({ __esModule: true, default: () => null }));
jest.mock('./panels/PanelMeasurement', () => ({ __esModule: true, default: () => null }));
jest.mock('./components', () => ({}));
jest.mock('./components/StudySummaryFromMetadata', () => ({
  StudySummaryFromMetadata: () => null,
}));
jest.mock('./utils/CornerstoneViewportDownloadForm', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('./utils', () => ({ __esModule: true, default: {} }));
jest.mock('@ohif/extension-default', () => ({
  useToggleOneUpViewportGridStore: {
    getState: () => ({ clearToggleOneUpViewportGridStore: () => undefined }),
  },
}));

import cornerstoneExtension from './index';

class FakeService extends PubSubService {
  constructor(events: Record<string, string>) {
    super(events);
  }
}

function listenerCount(service: PubSubService) {
  return Object.values(service.listeners).reduce((total, list) => total + (list?.length ?? 0), 0);
}

function createServices() {
  const segmentationService = Object.assign(
    new FakeService({
      SEGMENTATION_ADDED: 'event::segmentation_added',
      SEGMENTATION_MODIFIED: 'event::segmentation_modified',
      SEGMENTATION_DATA_MODIFIED: 'event::segmentation_data_modified',
      SEGMENTATION_REMOVED: 'event::segmentation_removed',
      SEGMENTATION_REPRESENTATION_MODIFIED: 'event::segmentation_representation_modified',
      SEGMENTATION_ANNOTATION_CUT_MERGE_PROCESS_COMPLETED: 'event::cut_merge_completed',
    }),
    { removeAllSegmentations: () => undefined }
  );
  const cornerstoneViewportService = new FakeService({
    VIEWPORT_DATA_CHANGED: 'event::viewport_data_changed',
  });
  const viewportGridService = Object.assign(
    new FakeService({
      ACTIVE_VIEWPORT_ID_CHANGED: 'event::active_viewport_id_changed',
      GRID_STATE_CHANGED: 'event::grid_state_changed',
      VIEWPORTS_READY: 'event::viewports_ready',
      LAYOUT_CHANGED: 'event::layout_changed',
    }),
    { getActiveViewportId: () => 'default', getState: () => ({ viewports: new Map() }) }
  );
  const services = {
    segmentationService,
    cornerstoneViewportService,
    viewportGridService,
    customizationService: { getCustomization: () => undefined },
    displaySetService: { getDisplaySetByUID: () => undefined },
    cineService: { setIsCineEnabled: () => undefined },
    toolbarService: undefined,
  };
  services.toolbarService = new ToolbarService({} as never, {} as never, { services } as never);

  return services;
}

const toolActivatedListeners = () =>
  (eventTarget as unknown as { listeners: Record<string, unknown[]> }).listeners[
    csToolsEnums.Events.TOOL_ACTIVATED
  ]?.length ?? 0;

describe('the cornerstone extension at mode entry and exit', () => {
  it('leaves no toolbar listener behind after five mode entries and exits', () => {
    const services = createServices();
    const servicesManager = { services };
    const extensionManager = { getActiveDataSource: () => [] };
    const counts = [];

    for (let entry = 0; entry < 5; entry++) {
      cornerstoneExtension.onModeEnter({
        servicesManager,
        commandsManager: {},
        extensionManager,
      } as never);
      counts.push([
        toolActivatedListeners(),
        listenerCount(services.cornerstoneViewportService),
        listenerCount(services.segmentationService),
      ]);
      cornerstoneExtension.onModeExit({ servicesManager } as never);
    }

    expect(counts).toEqual(Array(5).fill(counts[0]));
    expect([
      toolActivatedListeners(),
      listenerCount(services.cornerstoneViewportService),
      listenerCount(services.segmentationService),
    ]).toEqual([0, 0, 0]);
  });
});
