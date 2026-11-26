import type { PlanarViewport } from '@cornerstonejs/core';
import type { Synchronizer } from '@cornerstonejs/tools';
import CornerstoneViewportService from './CornerstoneViewportService';
import * as viewportMounts from './viewportMounts';
import * as cameraPositionGroups from './cameraPositionGroups';
import { getCameraPositionSyncGroupIds, placeInCameraPositionGroups } from './cameraPositionGroups';

type Point = [number, number, number];

const SAGITTAL: Point = [1, 0, 0];
const ENGINE = 'engine';

/** A camera position synchronizer with the membership calls of Cornerstone3D. */
function makeSynchronizer(id = 'sagittalSync') {
  const sources: { renderingEngineId: string; viewportId: string }[] = [];
  const targets: { renderingEngineId: string; viewportId: string }[] = [];
  const has = (list, viewportId) => list.some(entry => entry.viewportId === viewportId);

  return {
    id,
    getSourceViewports: () => sources,
    getTargetViewports: () => targets,
    hasSourceViewport: (_engine: string, viewportId: string) => has(sources, viewportId),
    hasTargetViewport: (_engine: string, viewportId: string) => has(targets, viewportId),
    add: entry => {
      if (!has(sources, entry.viewportId)) {
        sources.push(entry);
      }
      if (!has(targets, entry.viewportId)) {
        targets.push(entry);
      }
    },
    addSource: jest.fn(entry => {
      if (!has(sources, entry.viewportId)) {
        sources.push(entry);
      }
    }),
    removeSource: jest.fn(entry => {
      const index = sources.findIndex(source => source.viewportId === entry.viewportId);
      if (index >= 0) {
        sources.splice(index, 1);
      }
    }),
  } as unknown as Synchronizer & { addSource: jest.Mock; removeSource: jest.Mock };
}

/**
 * A planar volume pane on a slice grid: its mount puts it on its own
 * default slice, a view reference of a point puts it on that point.
 */
function makePane(id: string, step: number, defaultPoint: Point) {
  let point: Point | undefined;
  const pane = {
    id,
    renderingEngineId: ENGINE,
    element: {},
    step,
    mountAtDefault: () => {
      point = [...defaultPoint] as Point;
    },
    getCurrentMode: () => (point ? 'volume' : 'empty'),
    getViewReference: () =>
      point && {
        FrameOfReferenceUID: 'frame-of-reference',
        viewPlaneNormal: SAGITTAL,
        cameraFocalPoint: point,
        sliceIndex: 99,
        volumeId: `volume-${id}`,
      },
    setViewReference: jest.fn(ref => {
      point = [...ref.cameraFocalPoint] as Point;
    }),
    getNumberOfSlices: () => 512,
    isReferenceViewable: () => false,
    render: jest.fn(),
    point: () => point,
  };

  return pane;
}

const LAYOUT = ['ct', 'pt', 'fusion'];

function contextFor(
  synchronizer: Synchronizer,
  panes: Record<string, ReturnType<typeof makePane>>
) {
  return {
    synchronizers: [synchronizer],
    getViewport: id => panes[id] as never,
    getLayoutIndex: id => LAYOUT.indexOf(id),
    getSliceStep: pane => (pane as unknown as { step: number }).step,
  };
}

/** Mounts a pane as a planar viewport mounts: held, on its default slice, then placed. */
function mountPane(
  pane: ReturnType<typeof makePane>,
  synchronizer: Synchronizer,
  panes: Record<string, ReturnType<typeof makePane>>
) {
  const held = cameraPositionGroups.holdCameraPositionSync(pane as never, [synchronizer]);
  pane.mountAtDefault();
  placeInCameraPositionGroups(pane as never, held, contextFor(synchronizer, panes));
}

describe('the panes of a camera position sync group open on one position', () => {
  const ctPoint: Point = [0, -0.488, -141.09];
  const ptPoint: Point = [2.344, 0, -141.09];

  const setUp = () => {
    const synchronizer = makeSynchronizer();
    const panes = {
      ct: makePane('ct', 0.977, ctPoint),
      pt: makePane('pt', 4.6875, ptPoint),
      fusion: makePane('fusion', 0.977, ctPoint),
    };
    Object.values(panes).forEach(pane =>
      synchronizer.add({ renderingEngineId: ENGINE, viewportId: pane.id })
    );
    return { synchronizer, panes };
  };

  it('names the camera position groups that a pane drives', () => {
    expect(
      getCameraPositionSyncGroupIds([
        { type: 'cameraPosition', id: 'axialSync' },
        { type: 'voi', id: 'ctWLSync' },
        { type: 'cameraPosition', id: 'targetOnly', source: false },
        'cameraPosition',
      ])
    ).toEqual(['axialSync', 'cameraPosition']);
  });

  it.each([
    ['ct', 'fusion', 'pt'],
    ['pt', 'ct', 'fusion'],
    ['fusion', 'pt', 'ct'],
    ['pt', 'fusion', 'ct'],
  ])('mounted in the order %s, %s, %s, every pane is on the slice of the CT', (...order) => {
    const { synchronizer, panes } = setUp();

    order.forEach(id => mountPane(panes[id], synchronizer, panes));

    expect(panes.ct.point()).toEqual(ctPoint);
    expect(panes.fusion.point()).toEqual(ctPoint);
    expect(panes.pt.point()).toEqual(ctPoint);
    expect(
      synchronizer
        .getSourceViewports()
        .map(({ viewportId }) => viewportId)
        .sort()
    ).toEqual(['ct', 'fusion', 'pt']);
  });

  it('moves a pane of a coarser grid that mounts after the CT once, as a point and a plane', () => {
    const { synchronizer, panes } = setUp();

    mountPane(panes.ct, synchronizer, panes);
    mountPane(panes.pt, synchronizer, panes);

    expect(panes.ct.setViewReference).not.toHaveBeenCalled();
    expect(panes.pt.setViewReference).toHaveBeenCalledTimes(1);
    expect(panes.pt.setViewReference).toHaveBeenCalledWith({
      FrameOfReferenceUID: 'frame-of-reference',
      viewPlaneNormal: SAGITTAL,
      cameraFocalPoint: ctPoint,
    });
  });

  it('moves the panes placed before the CT once each, and not the CT', () => {
    const { synchronizer, panes } = setUp();

    mountPane(panes.pt, synchronizer, panes);
    mountPane(panes.ct, synchronizer, panes);

    expect(panes.ct.setViewReference).not.toHaveBeenCalled();
    expect(panes.pt.setViewReference).toHaveBeenCalledTimes(1);
  });

  it('does not let a pane drive its group while it is moved to the group position', () => {
    const { synchronizer, panes } = setUp();
    mountPane(panes.ct, synchronizer, panes);
    const sourcesWhileMoved: boolean[] = [];
    panes.pt.setViewReference.mockImplementation(() => {
      sourcesWhileMoved.push(synchronizer.hasSourceViewport(ENGINE, 'pt'));
    });

    mountPane(panes.pt, synchronizer, panes);

    expect(sourcesWhileMoved).toEqual([false]);
    expect(synchronizer.hasSourceViewport(ENGINE, 'pt')).toBe(true);
  });

  it('keeps the stored position of a pane that is restored', () => {
    const { synchronizer, panes } = setUp();
    mountPane(panes.ct, synchronizer, panes);
    const held = cameraPositionGroups.holdCameraPositionSync(panes.pt as never, [synchronizer]);
    panes.pt.mountAtDefault();

    placeInCameraPositionGroups(panes.pt as never, held, contextFor(synchronizer, panes), true);

    expect(panes.pt.setViewReference).not.toHaveBeenCalled();
    expect(panes.pt.point()).toEqual(ptPoint);
    expect(synchronizer.hasSourceViewport(ENGINE, 'pt')).toBe(true);
  });
});

describe('a volume mount of CornerstoneViewportService in a camera position group', () => {
  afterEach(() => jest.restoreAllMocks());

  it('does not drive the group while it mounts, then goes to the position of the group', async () => {
    const synchronizer = makeSynchronizer();
    const ct = makePane('ct', 0.977, [0, 0, 0]);
    const pt = makePane('pt', 4.6875, [2.344, 0, 0]);
    const panes = { ct, pt };
    ct.mountAtDefault();
    synchronizer.add({ renderingEngineId: ENGINE, viewportId: 'ct' });
    synchronizer.add({ renderingEngineId: ENGINE, viewportId: 'pt' });

    const servicesManager = {
      services: {
        displaySetService: { getDisplaySetByUID: jest.fn().mockReturnValue({}) },
        segmentationService: { clearSegmentationRepresentations: jest.fn() },
        syncGroupService: {
          getSynchronizersForViewport: jest.fn().mockReturnValue([synchronizer]),
          getSynchronizer: jest.fn().mockReturnValue(synchronizer),
        },
        viewportGridService: {
          getDisplaySetsUIDsForViewport: jest.fn().mockReturnValue(['display-set']),
          getState: () => ({
            viewports: new Map([
              ['ct', {}],
              ['pt', {}],
            ]),
          }),
        },
      },
    } as unknown as AppTypes.ServicesManager;
    const service = new CornerstoneViewportService(servicesManager);
    service.enableViewport('pt', { clientWidth: 100, clientHeight: 100 } as HTMLDivElement);
    const viewportInfo = service.getViewportInfo('pt');
    viewportInfo.setPublicViewportOptions(
      {
        viewportType: 'volume',
        syncGroups: [{ type: 'cameraPosition', id: 'sagittalSync', source: true, target: true }],
      },
      'planar'
    );
    viewportInfo.setViewportData({
      viewportType: 'planar',
      dataShapeType: 'volume',
      data: [{ displaySetInstanceUID: 'display-set', imageIds: ['image-0'] }],
    } as never);

    let drivingWhileMounted: boolean | undefined;
    jest.spyOn(viewportMounts, 'mountVolumes').mockImplementation(async () => {
      drivingWhileMounted = synchronizer.hasSourceViewport(ENGINE, 'pt');
      pt.mountAtDefault();
    });
    jest
      .spyOn(
        service as unknown as { _processExtraDisplaySetsForViewport: () => unknown[] },
        '_processExtraDisplaySetsForViewport'
      )
      .mockReturnValue([]);
    jest
      .spyOn(service, 'getCornerstoneViewport')
      .mockImplementation(id => panes[id] as unknown as PlanarViewport);
    jest
      .spyOn(cameraPositionGroups, 'getViewSliceStep')
      .mockImplementation(pane => (pane as unknown as { step: number }).step);

    await service.setVolumesForViewport(
      pt as unknown as PlanarViewport,
      [{ volumeId: 'volume-pt', displaySetInstanceUID: 'display-set', imageIds: ['image-0'] }],
      {}
    );

    expect(drivingWhileMounted).toBe(false);
    expect(pt.point()).toEqual([0, 0, 0]);
    expect(ct.setViewReference).not.toHaveBeenCalled();
    expect(synchronizer.hasSourceViewport(ENGINE, 'pt')).toBe(true);
  });
});
