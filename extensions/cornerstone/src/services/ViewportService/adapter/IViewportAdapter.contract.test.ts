import { Enums, cache } from '@cornerstonejs/core';
import { getViewportAdapter, isVolumeRenderingViewport } from './getViewportAdapter';
import { NextViewportAdapter } from './NextViewportAdapter';

/**
 * Contract tests for IViewportAdapter: every behavioral guarantee the UI layer
 * relies on is asserted against the implementation over mock viewports.
 */

const { ViewportType, OrientationAxis } = Enums;

/** Minimal planar viewport. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeNextViewport(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'next-viewport',
    setDisplaySets: jest.fn().mockResolvedValue(undefined),
    setDisplaySetPresentation: jest.fn(),
    setViewState: jest.fn(),
    getViewState: jest.fn().mockReturnValue({ rotation: 90, flipHorizontal: true }),
    getCurrentMode: jest.fn().mockReturnValue('stack'),
    getSourceDataId: jest.fn().mockReturnValue('source-uid'),
    getDisplaySetPresentation: jest.fn().mockReturnValue({}),
    getDefaultVOIRange: jest.fn().mockReturnValue(undefined),
    getViewReference: jest.fn().mockReturnValue({
      viewPlaneNormal: [0, 0, 1],
      cameraFocalPoint: [1, 2, 3],
    }),
    ...overrides,
  };
}

describe('getViewportAdapter', () => {
  it('gives a NextViewportAdapter for a viewport', () => {
    expect(getViewportAdapter(makeNextViewport())).toBeInstanceOf(NextViewportAdapter);
  });

  it('caches one adapter per viewport instance', () => {
    const viewport = makeNextViewport();
    expect(getViewportAdapter(viewport)).toBe(getViewportAdapter(viewport));
  });

  it('throws on a missing viewport', () => {
    expect(() => getViewportAdapter(null)).toThrow();
    expect(() => getViewportAdapter(undefined)).toThrow();
  });
});

describe('classification', () => {
  it('getShape resolves the content shape', () => {
    expect(getViewportAdapter(makeNextViewport({ type: ViewportType.VOLUME_3D })).getShape()).toBe(
      'volume3d'
    );
    expect(
      getViewportAdapter(
        makeNextViewport({ getCurrentMode: jest.fn().mockReturnValue('empty') })
      ).getShape()
    ).toBe('other');
    expect(
      getViewportAdapter(
        makeNextViewport({
          type: ViewportType.VIDEO,
          getCurrentMode: jest.fn().mockReturnValue('video'),
        })
      ).getShape()
    ).toBe('other');

    expect(
      getViewportAdapter(
        makeNextViewport({ getCurrentMode: jest.fn().mockReturnValue('stack') })
      ).getShape()
    ).toBe('stack');
    expect(
      getViewportAdapter(
        makeNextViewport({ getCurrentMode: jest.fn().mockReturnValue('volume') })
      ).getShape()
    ).toBe('volume');
  });

  it('isVolumeRendering: volume mode only', () => {
    expect(
      isVolumeRenderingViewport(
        makeNextViewport({ getCurrentMode: jest.fn().mockReturnValue('volume') })
      )
    ).toBe(true);
    expect(
      isVolumeRenderingViewport(
        makeNextViewport({ getCurrentMode: jest.fn().mockReturnValue('stack') })
      )
    ).toBe(false);
    // A 3D viewport reorients in place but does NOT support planar volume controls.
    const next3d = makeNextViewport({ getCurrentMode: jest.fn().mockReturnValue('volume3d') });
    expect(isVolumeRenderingViewport(next3d)).toBe(false);
    expect(getViewportAdapter(next3d).canReorientInPlace()).toBe(true);
  });

  it('isInAcquisitionPlane reads the view-state orientation', () => {
    // The default (unset orientation) counts as acquisition.
    expect(
      getViewportAdapter(
        makeNextViewport({ getViewState: jest.fn().mockReturnValue({}) })
      ).isInAcquisitionPlane()
    ).toBe(true);
    expect(
      getViewportAdapter(
        makeNextViewport({
          getViewState: jest.fn().mockReturnValue({ orientation: OrientationAxis.SAGITTAL }),
        })
      ).isInAcquisitionPlane()
    ).toBe(false);
  });

  describe('isInAcquisitionPlane on a volume', () => {
    const axialCt = {
      direction: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      dimensions: [512, 512, 100],
      spacing: [0.7, 0.7, 2],
    } as unknown as ReturnType<typeof cache.getVolume>;

    beforeEach(() => jest.spyOn(cache, 'getVolume').mockReturnValue(axialCt));
    afterEach(() => jest.restoreAllMocks());

    it('tests the geometry, so axial on an axial CT counts', () => {
      const axialOn = (viewPlaneNormal: number[]) =>
        getViewportAdapter(
          makeNextViewport({
            getViewState: jest.fn().mockReturnValue({ orientation: OrientationAxis.AXIAL }),
            getViewReference: jest.fn().mockReturnValue({ volumeId: 'ct', viewPlaneNormal }),
          })
        ).isInAcquisitionPlane();

      expect(axialOn([0, 0, 1])).toBe(true);
      expect(axialOn([1, 0, 0])).toBe(false);
    });
  });

  it('hasContent reads the content mode', () => {
    expect(getViewportAdapter(makeNextViewport()).hasContent()).toBe(true);
    expect(
      getViewportAdapter(
        makeNextViewport({ getCurrentMode: jest.fn().mockReturnValue('empty') })
      ).hasContent()
    ).toBe(false);
  });
});

describe('view geometry', () => {
  it('getViewState/setViewState pass through', () => {
    const viewport = makeNextViewport();
    const adapter = getViewportAdapter(viewport);
    expect(adapter.getViewState().rotation).toBe(90);
    adapter.setViewState({ rotation: 180 });
    expect(viewport.setViewState).toHaveBeenCalledWith({ rotation: 180 });
  });

  it('getViewPlaneNormal and getFocalPoint resolve from the view reference', () => {
    expect(getViewportAdapter(makeNextViewport()).getViewPlaneNormal()).toEqual([0, 0, 1]);
    expect(getViewportAdapter(makeNextViewport()).getFocalPoint()).toEqual([1, 2, 3]);
  });
});

describe('per-display-set appearance', () => {
  it('getPresentation: per-binding read, defaulting to the source dataId', () => {
    const viewport = makeNextViewport({
      getDisplaySetPresentation: jest.fn().mockReturnValue({ invert: true }),
    });
    const adapter = getViewportAdapter(viewport);
    expect(adapter.getPresentation()).toEqual({ invert: true });
    expect(viewport.getDisplaySetPresentation).toHaveBeenCalledWith('source-uid');
    adapter.getPresentation('ds-2');
    expect(viewport.getDisplaySetPresentation).toHaveBeenCalledWith('ds-2');
  });

  it('getPresentation stamps isComputedVOI when the VOI matches the binding default', () => {
    const voiRange = { lower: 0, upper: 80 };
    const stamped = getViewportAdapter(
      makeNextViewport({
        getDisplaySetPresentation: jest.fn().mockReturnValue({ voiRange }),
        getDefaultVOIRange: jest.fn().mockReturnValue({ lower: 0, upper: 80 }),
      })
    ).getPresentation();
    expect(stamped.isComputedVOI).toBe(true);

    const notStamped = getViewportAdapter(
      makeNextViewport({
        getDisplaySetPresentation: jest.fn().mockReturnValue({ voiRange }),
        getDefaultVOIRange: jest.fn().mockReturnValue({ lower: 10, upper: 90 }),
      })
    ).getPresentation();
    expect(notStamped.isComputedVOI).toBeUndefined();
  });

  it('setPresentation targets setDisplaySetPresentation', () => {
    const next = makeNextViewport();
    getViewportAdapter(next).setPresentation({ invert: true }, 'ds-1');
    expect(next.setDisplaySetPresentation).toHaveBeenCalledWith('ds-1', { invert: true });

    // No dataId: falls back to the source binding.
    getViewportAdapter(next).setPresentation({ invert: false });
    expect(next.setDisplaySetPresentation).toHaveBeenCalledWith('source-uid', { invert: false });
  });

  it('getDefaultVOIRange gives the binding default', () => {
    expect(
      getViewportAdapter(
        makeNextViewport({ getDefaultVOIRange: jest.fn().mockReturnValue({ lower: 1, upper: 2 }) })
      ).getDefaultVOIRange('ds-1')
    ).toEqual({ lower: 1, upper: 2 });
  });

  it('getColormap reads the presentation of the binding', () => {
    const next = makeNextViewport({
      getDisplaySetPresentation: jest.fn().mockReturnValue({ colormap: { name: 'jet' } }),
    });
    expect(getViewportAdapter(next).getColormap('ds-1')).toEqual({ name: 'jet' });
  });

  it('setLayerOpacity merges into the existing colormap', () => {
    const next = makeNextViewport({
      getDisplaySetPresentation: jest.fn().mockReturnValue({ colormap: { name: 'jet' } }),
    });
    expect(getViewportAdapter(next).setLayerOpacity('ds-1', 0.5)).toBe(true);
    expect(next.setDisplaySetPresentation).toHaveBeenCalledWith('ds-1', {
      colormap: { name: 'jet', opacity: 0.5 },
    });
  });

  it('setLayerThreshold merges into the existing colormap', () => {
    const next = makeNextViewport({
      getDisplaySetPresentation: jest.fn().mockReturnValue({ colormap: { name: 'jet' } }),
    });
    expect(getViewportAdapter(next).setLayerThreshold('ds-1', 42)).toBe(true);
    expect(next.setDisplaySetPresentation).toHaveBeenCalledWith('ds-1', {
      colormap: { name: 'jet', threshold: 42 },
    });
  });

  it('getBlendMode reads the blend mode of the presentation', () => {
    const getDisplaySetPresentation = jest.fn((dataId: string) =>
      dataId === 'ds-mip' ? { blendMode: Enums.BlendModes.MAXIMUM_INTENSITY_BLEND } : {}
    );
    const mip = makeNextViewport({
      getSourceDataId: jest.fn().mockReturnValue('ds-mip'),
      getDisplaySetPresentation,
    });

    expect(getViewportAdapter(mip).getBlendMode()).toBe(Enums.BlendModes.MAXIMUM_INTENSITY_BLEND);
    expect(getViewportAdapter(mip).getBlendMode('ds-other')).toBeUndefined();
    expect(getViewportAdapter(makeNextViewport()).getBlendMode()).toBeUndefined();
  });

  it('getOpacityGamma is linear', () => {
    expect(getViewportAdapter(makeNextViewport()).getOpacityGamma()).toBe(1);
  });
});

describe('data addressing', () => {
  it('getDataIdForDisplaySet gives the bare UID', () => {
    expect(getViewportAdapter(makeNextViewport()).getDataIdForDisplaySet('ds-1')).toBe('ds-1');
  });

  it('getVolumeIds is empty for a viewport without actors', () => {
    expect(getViewportAdapter(makeNextViewport()).getVolumeIds()).toEqual([]);
  });

  it('getVolumeIds keeps the ids that the viewport takes as volume ids', () => {
    const viewport = makeNextViewport({
      getActors: jest
        .fn()
        .mockReturnValue([
          { referencedId: 'volume-ct' },
          { referencedId: 'volume-pt' },
          { referencedId: 'labelmap-image-7' },
          { referencedId: 'surface-geometry' },
          { referencedId: undefined },
          { referencedId: 'volume-ct' },
        ]),
      hasVolumeId: jest.fn((id: string) => id.startsWith('volume-')),
    });

    expect(getViewportAdapter(viewport).getVolumeIds()).toEqual(['volume-ct', 'volume-pt']);
  });

  it('getVolumeIds is empty for a stack, whose actors stand for images', () => {
    const viewport = makeNextViewport({
      getActors: jest.fn().mockReturnValue([{ referencedId: 'image-0' }]),
      hasVolumeId: jest.fn().mockReturnValue(false),
    });

    expect(getViewportAdapter(viewport).getVolumeIds()).toEqual([]);
  });

  it('getDataIdForVolumeId gives the binding that shows the volume', () => {
    const viewport = makeNextViewport({
      findDataIdByVolumeId: jest.fn((id: string) => (id === 'volume-pt' ? 'ds-pt' : undefined)),
    });

    expect(getViewportAdapter(viewport).getDataIdForVolumeId('volume-pt')).toBe('ds-pt');
    expect(getViewportAdapter(viewport).getDataIdForVolumeId('volume-other')).toBeUndefined();
    expect(
      getViewportAdapter(makeNextViewport()).getDataIdForVolumeId('volume-pt')
    ).toBeUndefined();
  });

  it('getVoxelManagerForDisplaySet resolves from the cornerstone cache', () => {
    const voxelManager = { getRange: () => [0, 100] as [number, number] };
    const derivedVoxelManager = { getRange: () => [0, 1] as [number, number] };
    const spy = jest.spyOn(cache, 'getVolumes').mockReturnValue([
      // A derived id that merely EMBEDS the UID must not match (anchored lookup);
      // real volumeIds are `${volumeLoaderSchema}:${displaySetInstanceUID}`.
      { volumeId: 'derived-ds-1-labelmap', voxelManager: derivedVoxelManager },
      { volumeId: 'cornerstoneStreamingImageVolume:ds-1', voxelManager },
    ] as never);
    try {
      expect(getViewportAdapter(makeNextViewport()).getVoxelManagerForDisplaySet('ds-1')).toBe(
        voxelManager
      );
      expect(
        getViewportAdapter(makeNextViewport()).getVoxelManagerForDisplaySet('missing')
      ).toBeUndefined();
    } finally {
      spy.mockRestore();
    }
  });
});

describe('capture (copyDisplayedContentTo)', () => {
  it('remounts the source dataId and copies presentation + view state', async () => {
    const source = makeNextViewport({
      getDisplaySetPresentation: jest.fn().mockReturnValue({ invert: true }),
      getViewState: jest.fn().mockReturnValue({ orientation: 'axial', rotation: 45 }),
    });
    const target = makeNextViewport({
      getSourceDataId: jest.fn().mockReturnValue('capture-uid'),
      setViewReference: jest.fn(),
    });

    await getViewportAdapter(source).copyDisplayedContentTo(target as never);

    expect(target.setDisplaySets).toHaveBeenCalledWith({
      displaySetId: 'source-uid',
      options: { orientation: 'axial', role: 'source' },
    });
    expect(target.setDisplaySetPresentation).toHaveBeenCalledWith('capture-uid', { invert: true });
    expect(target.setViewReference).toHaveBeenCalledWith({
      viewPlaneNormal: [0, 0, 1],
      cameraFocalPoint: [1, 2, 3],
    });
    expect(target.setViewState).toHaveBeenCalledWith({ orientation: 'axial', rotation: 45 });
  });
});
