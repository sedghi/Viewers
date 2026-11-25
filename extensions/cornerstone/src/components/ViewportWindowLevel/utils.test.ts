import { Enums, cache } from '@cornerstonejs/core';
import { getWindowLevelsData, keepRowsWithoutRange } from './utils';
import { getViewportVolumeHistogram } from './getViewportVolumeHistogram';

jest.mock('./getViewportVolumeHistogram', () => ({
  getViewportVolumeHistogram: jest.fn(async (_volume, range: [number, number], options) => ({
    numBins: 256,
    range: { min: Math.max(range[0], options.min), max: Math.min(range[1], options.max) },
    bins: new Int32Array(256),
  })),
}));

const histogramOf = getViewportVolumeHistogram as jest.Mock;

const volumes = {
  'volume-ct': { volumeId: 'volume-ct', metadata: { Modality: 'CT' } },
  'volume-pt': { volumeId: 'volume-pt', metadata: { Modality: 'PT' }, scaling: { PT: {} } },
  'volume-seg': { volumeId: 'volume-seg', metadata: { Modality: 'SEG' } },
};

const displaySetOfVolume = {
  'volume-ct': 'ct',
  'volume-pt': 'pt',
  'volume-seg': 'seg-labelmap',
};

const ranges = { ct: [-1024, 3071], pt: [0, 23.4], 'seg-labelmap': [0, 1] };

const appearances = {
  ct: { voiRange: { lower: -160, upper: 240 }, opacity: 1 },
  pt: { voiRange: { lower: 0, upper: 5 }, opacity: 0.9, colormap: { name: 'hsv' } },
  'seg-labelmap': { opacity: 1 },
};

/**
 * A viewport of the given family that shows the given volumes, and the given
 * labelmaps over them, and answers as Cornerstone does: `getVolumeIds()`
 * leaves the labelmaps out unless it is asked for them.
 */
function makeViewport(type: string, volumeIds: string[], labelmapIds: string[] = []) {
  return {
    id: 'viewport-1',
    type,
    getVolumeIds: jest.fn((options: { includeSegmentations?: boolean } = {}) =>
      options.includeSegmentations ? [...volumeIds, ...labelmapIds] : volumeIds
    ),
    getActors: () => [...volumeIds, ...labelmapIds].map(referencedId => ({ referencedId })),
    hasVolumeId: () => true,
    getDisplaySetIdForVolumeId: jest.fn((volumeId: string) => displaySetOfVolume[volumeId]),
    getScalarRange: jest.fn((displaySetId: string) => ranges[displaySetId]),
    getEffectiveDisplaySetAppearance: jest.fn((displaySetId: string) => appearances[displaySetId]),
  };
}

describe('the rows of the window level panel', () => {
  beforeEach(() => {
    histogramOf.mockClear();
    jest.spyOn(cache, 'getVolume').mockImplementation(volumeId => volumes[volumeId] as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('a stack shows no volume and has no row', async () => {
    const viewport = makeViewport(Enums.ViewportType.PLANAR, []);

    expect(await getWindowLevelsData(viewport as never)).toEqual([]);
  });

  it('an MPR pane has one row, with the range and the window that the viewport gives', async () => {
    const viewport = makeViewport(Enums.ViewportType.PLANAR, ['volume-ct']);

    const rows = await getWindowLevelsData(viewport as never);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      viewportId: 'viewport-1',
      volumeId: 'volume-ct',
      displaySetId: 'ct',
      modality: 'CT',
      voi: { windowWidth: 400, windowCenter: 40 },
      step: 1,
    });
    expect(viewport.getScalarRange).toHaveBeenCalledWith('ct');
    expect(histogramOf).toHaveBeenCalledWith(volumes['volume-ct'], [-1024, 3071], {
      min: -999,
      max: 10000,
    });
  });

  it('a PET/CT fusion has two rows, each with the window, colormap and opacity of its display set', async () => {
    const viewport = makeViewport(Enums.ViewportType.PLANAR, ['volume-ct', 'volume-pt']);

    const rows = await getWindowLevelsData(viewport as never);

    expect(rows.map(row => row.displaySetId)).toEqual(['ct', 'pt']);
    expect(rows[1]).toMatchObject({
      modality: 'PT',
      voi: { windowWidth: 5, windowCenter: 2.5 },
      opacity: 0.9,
      step: 0.05,
      showOpacitySlider: true,
    });
    expect(rows[1].colormap).toBeDefined();
    expect(rows[0].colormap).toBeUndefined();
    expect(histogramOf).toHaveBeenCalledWith(volumes['volume-pt'], [0, 23.4], {
      min: 0.1,
      max: 5,
    });
  });

  it('a hydrated SEG over a fusion adds no row', async () => {
    const viewport = makeViewport(
      Enums.ViewportType.PLANAR,
      ['volume-ct', 'volume-pt'],
      ['volume-seg']
    );

    const rows = await getWindowLevelsData(viewport as never);

    expect(rows.map(row => row.volumeId)).toEqual(['volume-ct', 'volume-pt']);
    expect(viewport.getVolumeIds).toHaveBeenCalledWith();
  });

  it('a 3D viewport has one row', async () => {
    const viewport = makeViewport(Enums.ViewportType.VOLUME_3D, ['volume-ct']);

    const rows = await getWindowLevelsData(viewport as never);

    expect(rows.map(row => row.displaySetId)).toEqual(['ct']);
  });

  it('a volume whose values have not arrived has no row yet', async () => {
    const viewport = makeViewport(Enums.ViewportType.PLANAR, ['volume-ct']);
    viewport.getScalarRange.mockReturnValue(undefined);

    expect(await getWindowLevelsData(viewport as never)).toEqual([]);
    expect(histogramOf).not.toHaveBeenCalled();
  });

  it('a video viewport has no row', async () => {
    const viewport = { id: 'video', type: Enums.ViewportType.VIDEO };

    expect(await getWindowLevelsData(viewport as never)).toEqual([]);
  });
});

describe('the rows kept while the values on display arrive', () => {
  const ct = { volumeId: 'volume-ct', voi: 'new' };
  const oldCt = { volumeId: 'volume-ct', voi: 'old' };
  const oldPt = { volumeId: 'volume-pt', voi: 'old' };
  const oldSeg = { volumeId: 'volume-seg', voi: 'old' };

  it('takes the new row of a volume', () => {
    expect(keepRowsWithoutRange(['volume-ct'], [ct], [oldCt])).toEqual([ct]);
  });

  it('keeps the last row of a volume that has no new row yet, in the order of the volumes', () => {
    expect(keepRowsWithoutRange(['volume-ct', 'volume-pt'], [ct], [oldPt, oldCt])).toEqual([
      ct,
      oldPt,
    ]);
  });

  it('drops the row of a volume that the viewport no longer shows', () => {
    expect(keepRowsWithoutRange(['volume-ct'], [], [oldCt, oldSeg])).toEqual([oldCt]);
    expect(keepRowsWithoutRange([], [], [oldCt])).toEqual([]);
  });
});
