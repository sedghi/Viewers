import { utilities } from '@cornerstonejs/core';
import type { PlanarViewport } from '@cornerstonejs/core';
import type { Synchronizer } from '@cornerstonejs/tools';
import CornerstoneViewportService from './CornerstoneViewportService';
import JumpPresets from '../../utils/JumpPresets';
import * as viewportMounts from './viewportMounts';
import * as cameraPositionGroups from './cameraPositionGroups';
import {
  getCameraPositionGroupInitialStart,
  getCameraPositionGroupStart,
  getCameraPositionSyncGroupIds,
  getMountSliceStep,
  placeInCameraPositionGroups,
} from './cameraPositionGroups';
import type { CameraPositionGroupMember } from './cameraPositionGroups';

jest.mock('@cornerstonejs/core', () => {
  const actual = jest.requireActual('@cornerstonejs/core');

  return {
    ...actual,
    utilities: { ...actual.utilities, jumpToSlice: jest.fn(), getVolumeSliceGrid: jest.fn() },
  };
});

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
    mountAt: (ref?: { cameraFocalPoint?: Point }) => {
      point = ref?.cameraFocalPoint ? ([...ref.cameraFocalPoint] as Point) : [...defaultPoint];
    },
    getNumberOfSlices: () => 512,
    getResolvedView: () =>
      point && { toICamera: () => ({ focalPoint: point, viewPlaneNormal: SAGITTAL }) },
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

/** Mounts a pane as a planar viewport mounts: on its default slice, then placed. */
function mountPane(
  pane: ReturnType<typeof makePane>,
  synchronizer: Synchronizer,
  panes: Record<string, ReturnType<typeof makePane>>
) {
  pane.mountAtDefault();
  placeInCameraPositionGroups(pane as never, contextFor(synchronizer, panes));
}

/**
 * Mounts a pane as the service mounts it: started at the position of its
 * group when it ranks after the panes placed so far (else on its default
 * slice), then placed.
 */
function mountPaneAtGroupStart(
  pane: ReturnType<typeof makePane>,
  synchronizer: Synchronizer,
  panes: Record<string, ReturnType<typeof makePane>>
) {
  const context = contextFor(synchronizer, panes);
  const start = getCameraPositionGroupStart(pane.id, pane.step, context);
  pane.mountAt(start);
  placeInCameraPositionGroups(pane as never, context);
  return start;
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

  it('moves a pane to the group position while it stays a source of its group', () => {
    const { synchronizer, panes } = setUp();
    mountPane(panes.ct, synchronizer, panes);
    const sourcesWhileMoved: boolean[] = [];
    panes.pt.setViewReference.mockImplementation(() => {
      sourcesWhileMoved.push(synchronizer.hasSourceViewport(ENGINE, 'pt'));
    });

    mountPane(panes.pt, synchronizer, panes);

    expect(sourcesWhileMoved).toEqual([true]);
    expect(
      (synchronizer as unknown as { removeSource: jest.Mock }).removeSource
    ).not.toHaveBeenCalled();
  });

  it('keeps the stored position of a pane that is restored', () => {
    const { synchronizer, panes } = setUp();
    mountPane(panes.ct, synchronizer, panes);
    panes.pt.mountAtDefault();

    placeInCameraPositionGroups(panes.pt as never, contextFor(synchronizer, panes), true);

    expect(panes.pt.setViewReference).not.toHaveBeenCalled();
    expect(panes.pt.point()).toEqual(ptPoint);
    expect(synchronizer.hasSourceViewport(ENGINE, 'pt')).toBe(true);
  });
});

describe('a pane of a camera position sync group starts at the position of its group', () => {
  const ctPoint: Point = [0, -0.488, -141.09];
  const ptPoint: Point = [2.344, 0, -141.09];
  const ctStart = {
    FrameOfReferenceUID: 'frame-of-reference',
    viewPlaneNormal: SAGITTAL,
    cameraFocalPoint: ctPoint,
  };

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

  it('starts a pane of a coarser grid at the point and the plane of the slice of the CT', () => {
    const { synchronizer, panes } = setUp();
    mountPane(panes.ct, synchronizer, panes);

    expect(getCameraPositionGroupStart('pt', 4.6875, contextFor(synchronizer, panes))).toEqual(
      ctStart
    );
  });

  it('starts a pane of the grid of the CT that comes later in the layout at the slice of the CT', () => {
    const { synchronizer, panes } = setUp();
    mountPane(panes.ct, synchronizer, panes);

    expect(getCameraPositionGroupStart('fusion', 0.977, contextFor(synchronizer, panes))).toEqual(
      ctStart
    );
  });

  it('starts the first pane of a group, and a pane of a finer grid than the placed ones, on its own slice', () => {
    const { synchronizer, panes } = setUp();

    expect(
      getCameraPositionGroupStart('ct', 0.977, contextFor(synchronizer, panes))
    ).toBeUndefined();

    mountPane(panes.pt, synchronizer, panes);

    expect(
      getCameraPositionGroupStart('ct', 0.977, contextFor(synchronizer, panes))
    ).toBeUndefined();
  });

  it.each([
    [['ct', 'fusion', 'pt'], { ct: 0, fusion: 0, pt: 0 }],
    [['ct', 'pt', 'fusion'], { ct: 0, fusion: 0, pt: 0 }],
    [['fusion', 'pt', 'ct'], { ct: 0, fusion: 0, pt: 0 }],
    [['pt', 'ct', 'fusion'], { ct: 0, fusion: 0, pt: 1 }],
  ])(
    'mounted in the order %j, every pane is on the slice of the CT, moved after its mount only when it was placed before a finer pane',
    (order, moves) => {
      const { synchronizer, panes } = setUp();

      (order as string[]).forEach(id => mountPaneAtGroupStart(panes[id], synchronizer, panes));

      expect(panes.ct.point()).toEqual(ctPoint);
      expect(panes.fusion.point()).toEqual(ctPoint);
      expect(panes.pt.point()).toEqual(ctPoint);
      Object.entries(moves).forEach(([id, count]) =>
        expect(panes[id].setViewReference).toHaveBeenCalledTimes(count)
      );
      expect(
        synchronizer
          .getSourceViewports()
          .map(({ viewportId }) => viewportId)
          .sort()
      ).toEqual(['ct', 'fusion', 'pt']);
    }
  );

  it('moves a pane after its mount when it could not start at the position of its group', () => {
    const { synchronizer, panes } = setUp();
    mountPane(panes.ct, synchronizer, panes);
    const context = contextFor(synchronizer, panes);
    panes.pt.mountAtDefault();

    placeInCameraPositionGroups(panes.pt as never, context);

    expect(panes.pt.setViewReference).toHaveBeenCalledTimes(1);
    expect(panes.pt.point()).toEqual(ctPoint);
  });
});

describe('a volume mount of CornerstoneViewportService in a camera position group', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    (utilities.jumpToSlice as jest.Mock).mockClear();
  });

  /**
   * A service whose pane `pt` mounts after the pane `ct` of its sagittal
   * group is placed; `takesStart` says whether the mount honours the view
   * reference that it is given.
   */
  async function mountPtAfterCt(takesStart: boolean) {
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
        initialImageOptions: { preset: JumpPresets.First },
        syncGroups: [{ type: 'cameraPosition', id: 'sagittalSync', source: true, target: true }],
      },
      'planar'
    );
    viewportInfo.setViewportData({
      viewportType: 'planar',
      dataShapeType: 'volume',
      data: [{ displaySetInstanceUID: 'display-set', imageIds: ['image-0'] }],
    } as never);

    const mount: { drivingWhileMounted?: boolean; initialViewReference?: unknown } = {};
    jest.spyOn(viewportMounts, 'mountVolumes').mockImplementation(async (_viewport, context) => {
      mount.drivingWhileMounted = synchronizer.hasSourceViewport(ENGINE, 'pt');
      mount.initialViewReference = context.initialViewReference;
      pt.mountAt(takesStart ? (context.initialViewReference as never) : undefined);
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
    const getMountSliceStep = jest
      .spyOn(cameraPositionGroups, 'getMountSliceStep')
      .mockReturnValue(pt.step);

    await service.setVolumesForViewport(
      pt as unknown as PlanarViewport,
      [{ volumeId: 'volume-pt', displaySetInstanceUID: 'display-set', imageIds: ['image-0'] }],
      {}
    );

    return { synchronizer, ct, pt, mount, getMountSliceStep };
  }

  it('stays a source of its group while it mounts, then goes to the position of the group', async () => {
    const { synchronizer, ct, pt, mount } = await mountPtAfterCt(false);

    expect(mount.drivingWhileMounted).toBe(true);
    expect(
      (synchronizer as unknown as { removeSource: jest.Mock }).removeSource
    ).not.toHaveBeenCalled();
    expect(pt.point()).toEqual([0, 0, 0]);
    expect(ct.setViewReference).not.toHaveBeenCalled();
    expect(synchronizer.hasSourceViewport(ENGINE, 'pt')).toBe(true);
  });

  it('starts a pane at the position of its group, and neither jumps nor moves it after the mount', async () => {
    const { synchronizer, ct, pt, mount, getMountSliceStep } = await mountPtAfterCt(true);

    expect(getMountSliceStep).toHaveBeenCalledWith(
      [{ volumeId: 'volume-pt', imageIds: ['image-0'] }],
      'acquisition'
    );
    expect(mount.initialViewReference).toEqual({
      FrameOfReferenceUID: 'frame-of-reference',
      viewPlaneNormal: SAGITTAL,
      cameraFocalPoint: [0, 0, 0],
    });
    expect(pt.point()).toEqual([0, 0, 0]);
    expect(pt.setViewReference).not.toHaveBeenCalled();
    expect(utilities.jumpToSlice).not.toHaveBeenCalled();
    expect(ct.setViewReference).not.toHaveBeenCalled();
    expect(synchronizer.hasSourceViewport(ENGINE, 'pt')).toBe(true);
  });
});

/**
 * The slice grid of a sagittal view of a volume, as
 * `utilities.getVolumeSliceGrid` gives it: slice k at x = (k - N / 2) * step.
 */
function makeGrid(
  step: number,
  numberOfSlices: number,
  frameOfReferenceUID = 'frame-of-reference'
) {
  const pointOf = (sliceIndex: number): Point => [(sliceIndex - numberOfSlices / 2) * step, 0, 0];

  return {
    frameOfReferenceUID,
    step,
    numberOfSlices,
    defaultSliceIndex: Math.floor(numberOfSlices / 2),
    viewPlaneNormal: SAGITTAL,
    getSliceWorldPoint: pointOf,
    getViewReference: (sliceIndex: number) => ({
      FrameOfReferenceUID: frameOfReferenceUID,
      viewPlaneNormal: SAGITTAL,
      cameraFocalPoint: pointOf(sliceIndex),
    }),
  };
}

const GRIDS = {
  'ct-image': makeGrid(0.977, 512),
  'pt-image': makeGrid(4.6875, 128),
  'mr-image': makeGrid(0.5, 300, 'another-frame-of-reference'),
};

/** The slice grid of the first image id of a volume, or an error for an unknown one. */
function mockSliceGrids() {
  (utilities.getVolumeSliceGrid as jest.Mock).mockImplementation(({ imageIds }) => {
    const grid = GRIDS[imageIds?.[0]];
    if (!grid) {
      throw new Error('no geometry');
    }
    return grid;
  });
}

function member(
  viewportId: string,
  layoutIndex: number,
  images: string[],
  initialSliceIndex?: (numberOfSlices: number) => number
): CameraPositionGroupMember {
  return {
    viewportId,
    layoutIndex,
    orientation: 'sagittal' as never,
    volumes: images.map(image => ({ volumeId: `volume-${image}`, imageIds: [image] })),
    getInitialSliceIndex: initialSliceIndex ?? (() => undefined),
  };
}

describe('the panes of a camera position group that mount together start before any mount', () => {
  beforeEach(mockSliceGrids);
  afterEach(() => (utilities.getVolumeSliceGrid as jest.Mock).mockReset());

  const tmtvSagittal = (ctInitial?: (numberOfSlices: number) => number) => [
    member('ctSAGITTAL', 1, ['ct-image'], ctInitial),
    member('ptSAGITTAL', 4, ['pt-image']),
    member('fusionSAGITTAL', 7, ['ct-image', 'pt-image']),
  ];

  it('gives the step of the finest slice grid of the volumes of a pane', () => {
    expect(
      getMountSliceStep(
        [
          { volumeId: 'volume-ct', imageIds: ['ct-image'] },
          { volumeId: 'volume-pt', imageIds: ['pt-image'] },
        ],
        'sagittal' as never
      )
    ).toBe(0.977);
    expect(getMountSliceStep([{ imageIds: ['unknown'] }])).toBe(Infinity);
  });

  it.each(['ctSAGITTAL', 'ptSAGITTAL', 'fusionSAGITTAL'])(
    'starts %s at the default slice of the CT, the finest grid, as a point and a plane',
    viewportId => {
      expect(getCameraPositionGroupInitialStart(viewportId, tmtvSagittal())).toEqual(
        GRIDS['ct-image'].getViewReference(256)
      );
    }
  );

  it.each([
    ['first', () => 0, 0],
    ['last', (numberOfSlices: number) => numberOfSlices - 1, 511],
    ['an index', () => 300, 300],
  ])(
    'starts every pane at the initial slice of the hanging protocol of the CT (%s)',
    (_name, initialSliceIndex, expected) => {
      const members = tmtvSagittal(initialSliceIndex);

      members.forEach(({ viewportId }) =>
        expect(getCameraPositionGroupInitialStart(viewportId, members)).toEqual(
          GRIDS['ct-image'].getViewReference(expected as number)
        )
      );
    }
  );

  it('takes the first pane in the layout among panes of the finest step', () => {
    const members = [
      member('fusionSAGITTAL', 7, ['ct-image', 'pt-image'], () => 10),
      member('ctSAGITTAL', 1, ['ct-image'], () => 20),
    ];

    expect(getCameraPositionGroupInitialStart('fusionSAGITTAL', members)).toEqual(
      GRIDS['ct-image'].getViewReference(20)
    );
  });

  it('leaves out a pane without a slice grid and a pane of another frame of reference', () => {
    const members = [
      ...tmtvSagittal(),
      member('unknown', 0, ['unknown']),
      member('mr', 2, ['mr-image']),
    ];

    expect(getCameraPositionGroupInitialStart('ptSAGITTAL', members)).toEqual(
      GRIDS['ct-image'].getViewReference(256)
    );
    expect(getCameraPositionGroupInitialStart('unknown', members)).toBeUndefined();
  });
});

describe('a volume mount of CornerstoneViewportService in a camera position group that mounts together', () => {
  beforeEach(mockSliceGrids);
  afterEach(() => {
    jest.restoreAllMocks();
    (utilities.getVolumeSliceGrid as jest.Mock).mockReset();
    (utilities.jumpToSlice as jest.Mock).mockClear();
  });

  const sagittalSync = [{ type: 'cameraPosition', id: 'sagittalSync', source: true, target: true }];
  const gridViewports = new Map([
    [
      'ct',
      {
        viewportId: 'ct',
        displaySetInstanceUIDs: ['ct-ds'],
        viewportOptions: {
          orientation: 'sagittal',
          syncGroups: sagittalSync,
          initialImageOptions: { preset: JumpPresets.Last },
        },
      },
    ],
    [
      'pt',
      {
        viewportId: 'pt',
        displaySetInstanceUIDs: ['pt-ds'],
        viewportOptions: { orientation: 'sagittal', syncGroups: sagittalSync },
      },
    ],
  ]);
  const displaySets = {
    'ct-ds': { displaySetInstanceUID: 'ct-ds', images: [{ imageId: 'ct-image' }] },
    'pt-ds': { displaySetInstanceUID: 'pt-ds', images: [{ imageId: 'pt-image' }] },
  };

  /** Mounts one pane of the group while no pane of it is placed. */
  async function mountFirst(viewportId: 'ct' | 'pt', options = {}) {
    const synchronizer = makeSynchronizer();
    const panes = {
      ct: makePane('ct', 0.977, [0, 0, 0]),
      pt: makePane('pt', 4.6875, [2.344, 0, 0]),
    };
    synchronizer.add({ renderingEngineId: ENGINE, viewportId: 'ct' });
    synchronizer.add({ renderingEngineId: ENGINE, viewportId: 'pt' });

    const servicesManager = {
      services: {
        displaySetService: { getDisplaySetByUID: jest.fn(uid => displaySets[uid] ?? {}) },
        segmentationService: { clearSegmentationRepresentations: jest.fn() },
        syncGroupService: {
          getSynchronizersForViewport: jest.fn().mockReturnValue([synchronizer]),
          getSynchronizer: jest.fn().mockReturnValue(synchronizer),
        },
        viewportGridService: {
          getDisplaySetsUIDsForViewport: jest.fn().mockReturnValue([`${viewportId}-ds`]),
          getState: () => ({ viewports: gridViewports }),
        },
      },
    } as unknown as AppTypes.ServicesManager;
    const service = new CornerstoneViewportService(servicesManager);
    service.enableViewport(viewportId, { clientWidth: 100, clientHeight: 100 } as HTMLDivElement);
    const viewportInfo = service.getViewportInfo(viewportId);
    viewportInfo.setPublicViewportOptions(
      { viewportType: 'volume', ...gridViewports.get(viewportId).viewportOptions } as never,
      'planar'
    );
    viewportInfo.setViewportData({
      viewportType: 'planar',
      dataShapeType: 'volume',
      data: [{ displaySetInstanceUID: `${viewportId}-ds`, imageIds: [`${viewportId}-image`] }],
    } as never);

    const mount: { initialViewReference?: unknown } = {};
    jest.spyOn(viewportMounts, 'mountVolumes').mockImplementation(async (_viewport, context) => {
      mount.initialViewReference = context.initialViewReference;
      panes[viewportId].mountAt(context.initialViewReference as never);
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

    await service.setVolumesForViewport(
      panes[viewportId] as unknown as PlanarViewport,
      [
        {
          volumeId: `volume-${viewportId}`,
          displaySetInstanceUID: `${viewportId}-ds`,
          imageIds: [`${viewportId}-image`],
        },
      ],
      options
    );

    return { pane: panes[viewportId], mount };
  }

  it.each(['ct', 'pt'] as const)(
    'starts %s at the initial slice of the CT before any pane is placed, with no jump after the mount',
    async viewportId => {
      const { pane, mount } = await mountFirst(viewportId);

      expect(mount.initialViewReference).toEqual(GRIDS['ct-image'].getViewReference(511));
      expect(utilities.jumpToSlice).not.toHaveBeenCalled();
      expect(pane.setViewReference).not.toHaveBeenCalled();
    }
  );

  it('starts a pane with a stored position at that position, not at the group', async () => {
    const viewReference = {
      FrameOfReferenceUID: 'frame-of-reference',
      viewPlaneNormal: SAGITTAL,
      cameraFocalPoint: [12, 0, 0],
    };
    const { mount } = await mountFirst('pt', {
      positionPresentation: { viewportType: 'volume', viewReference },
    });

    expect(mount.initialViewReference).toEqual(viewReference);
  });
});
