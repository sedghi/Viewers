import { Enums, cache } from '@cornerstonejs/core';
import { getViewportAdapter, isVolumeRenderingViewport } from './getViewportAdapter';
import { ViewportAdapter } from './ViewportAdapter';

/**
 * Contract tests for IViewportAdapter: every behavioral guarantee the UI layer
 * relies on is asserted against the implementation over mock viewports.
 */

const { ViewportType, OrientationAxis } = Enums;

/** Minimal planar viewport. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeViewport(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'viewport-1',
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
  it('gives a ViewportAdapter for a viewport', () => {
    expect(getViewportAdapter(makeViewport())).toBeInstanceOf(ViewportAdapter);
  });

  it('caches one adapter per viewport instance', () => {
    const viewport = makeViewport();
    expect(getViewportAdapter(viewport)).toBe(getViewportAdapter(viewport));
  });

  it('throws on a missing viewport', () => {
    expect(() => getViewportAdapter(null)).toThrow();
    expect(() => getViewportAdapter(undefined)).toThrow();
  });
});

describe('classification', () => {
  it('getShape resolves the content shape', () => {
    expect(getViewportAdapter(makeViewport({ type: ViewportType.VOLUME_3D })).getShape()).toBe(
      'volume3d'
    );
    expect(
      getViewportAdapter(
        makeViewport({ getCurrentMode: jest.fn().mockReturnValue('empty') })
      ).getShape()
    ).toBe('other');
    expect(
      getViewportAdapter(
        makeViewport({
          type: ViewportType.VIDEO,
          getCurrentMode: jest.fn().mockReturnValue('video'),
        })
      ).getShape()
    ).toBe('other');

    expect(
      getViewportAdapter(
        makeViewport({ getCurrentMode: jest.fn().mockReturnValue('stack') })
      ).getShape()
    ).toBe('stack');
    expect(
      getViewportAdapter(
        makeViewport({ getCurrentMode: jest.fn().mockReturnValue('volume') })
      ).getShape()
    ).toBe('volume');
  });

  it('isVolumeRendering: volume mode only', () => {
    expect(
      isVolumeRenderingViewport(
        makeViewport({ getCurrentMode: jest.fn().mockReturnValue('volume') })
      )
    ).toBe(true);
    expect(
      isVolumeRenderingViewport(
        makeViewport({ getCurrentMode: jest.fn().mockReturnValue('stack') })
      )
    ).toBe(false);
    // A 3D viewport reorients in place but does NOT support planar volume controls.
    const viewport3d = makeViewport({ getCurrentMode: jest.fn().mockReturnValue('volume3d') });
    expect(isVolumeRenderingViewport(viewport3d)).toBe(false);
    expect(getViewportAdapter(viewport3d).canReorientInPlace()).toBe(true);
  });

  it('isInAcquisitionPlane reads the view-state orientation', () => {
    // The default (unset orientation) counts as acquisition.
    expect(
      getViewportAdapter(
        makeViewport({ getViewState: jest.fn().mockReturnValue({}) })
      ).isInAcquisitionPlane()
    ).toBe(true);
    expect(
      getViewportAdapter(
        makeViewport({
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
          makeViewport({
            getViewState: jest.fn().mockReturnValue({ orientation: OrientationAxis.AXIAL }),
            getViewReference: jest.fn().mockReturnValue({ volumeId: 'ct', viewPlaneNormal }),
          })
        ).isInAcquisitionPlane();

      expect(axialOn([0, 0, 1])).toBe(true);
      expect(axialOn([1, 0, 0])).toBe(false);
    });
  });

  it('hasContent reads the content mode', () => {
    expect(getViewportAdapter(makeViewport()).hasContent()).toBe(true);
    expect(
      getViewportAdapter(
        makeViewport({ getCurrentMode: jest.fn().mockReturnValue('empty') })
      ).hasContent()
    ).toBe(false);
  });
});

describe('view geometry', () => {
  it('getViewState/setViewState pass through', () => {
    const viewport = makeViewport();
    const adapter = getViewportAdapter(viewport);
    expect(adapter.getViewState().rotation).toBe(90);
    adapter.setViewState({ rotation: 180 });
    expect(viewport.setViewState).toHaveBeenCalledWith({ rotation: 180 });
  });

  it('getViewPlaneNormal and getFocalPoint resolve from the view reference', () => {
    expect(getViewportAdapter(makeViewport()).getViewPlaneNormal()).toEqual([0, 0, 1]);
    expect(getViewportAdapter(makeViewport()).getFocalPoint()).toEqual([1, 2, 3]);
  });
});

describe('per-display-set appearance', () => {
  it('getPresentation: per-binding read, defaulting to the source dataId', () => {
    const viewport = makeViewport({
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
      makeViewport({
        getDisplaySetPresentation: jest.fn().mockReturnValue({ voiRange }),
        getDefaultVOIRange: jest.fn().mockReturnValue({ lower: 0, upper: 80 }),
      })
    ).getPresentation();
    expect(stamped.isComputedVOI).toBe(true);

    const notStamped = getViewportAdapter(
      makeViewport({
        getDisplaySetPresentation: jest.fn().mockReturnValue({ voiRange }),
        getDefaultVOIRange: jest.fn().mockReturnValue({ lower: 10, upper: 90 }),
      })
    ).getPresentation();
    expect(notStamped.isComputedVOI).toBeUndefined();
  });

  it('setPresentation targets setDisplaySetPresentation', () => {
    const viewport = makeViewport();
    getViewportAdapter(viewport).setPresentation({ invert: true }, 'ds-1');
    expect(viewport.setDisplaySetPresentation).toHaveBeenCalledWith('ds-1', { invert: true });

    // No dataId: falls back to the source binding.
    getViewportAdapter(viewport).setPresentation({ invert: false });
    expect(viewport.setDisplaySetPresentation).toHaveBeenCalledWith('source-uid', {
      invert: false,
    });
  });

  it('getDefaultVOIRange gives the binding default', () => {
    expect(
      getViewportAdapter(
        makeViewport({ getDefaultVOIRange: jest.fn().mockReturnValue({ lower: 1, upper: 2 }) })
      ).getDefaultVOIRange('ds-1')
    ).toEqual({ lower: 1, upper: 2 });
  });

  it('getColormap reads the presentation of the binding', () => {
    const viewport = makeViewport({
      getDisplaySetPresentation: jest.fn().mockReturnValue({ colormap: { name: 'jet' } }),
    });
    expect(getViewportAdapter(viewport).getColormap('ds-1')).toEqual({ name: 'jet' });
  });

  it('setLayerOpacity merges into the existing colormap', () => {
    const viewport = makeViewport({
      getDisplaySetPresentation: jest.fn().mockReturnValue({ colormap: { name: 'jet' } }),
    });
    expect(getViewportAdapter(viewport).setLayerOpacity('ds-1', 0.5)).toBe(true);
    expect(viewport.setDisplaySetPresentation).toHaveBeenCalledWith('ds-1', {
      colormap: { name: 'jet', opacity: 0.5 },
    });
  });

  it('setLayerOpacity scales a ramp that a hanging protocol gives as a list in opacity', () => {
    const ramp = [
      { value: 0, opacity: 0 },
      { value: 0.1, opacity: 0.8 },
      { value: 1, opacity: 0.9 },
    ];
    const viewport = makeViewport({
      getDisplaySetPresentation: jest
        .fn()
        .mockReturnValue({ colormap: { name: 'hsv', opacity: ramp } }),
    });

    expect(getViewportAdapter(viewport).setLayerOpacity('pt-1', 0.5)).toBe(true);
    expect(viewport.setDisplaySetPresentation).toHaveBeenCalledWith('pt-1', {
      colormap: { name: 'hsv', opacityMapping: ramp, opacity: 0.5 },
    });
  });

  it('setLayerOpacity keeps the opacity mapping that it scaled before', () => {
    const ramp = [
      { value: 0, opacity: 0 },
      { value: 1, opacity: 0.9 },
    ];
    const viewport = makeViewport({
      getDisplaySetPresentation: jest.fn().mockReturnValue({
        colormap: { name: 'hsv', opacity: 0.5, opacityMapping: ramp, threshold: 2 },
      }),
    });

    getViewportAdapter(viewport).setLayerOpacity('pt-1', 0);
    expect(viewport.setDisplaySetPresentation).toHaveBeenCalledWith('pt-1', {
      colormap: { name: 'hsv', opacityMapping: ramp, threshold: 2, opacity: 0 },
    });
  });

  it('setLayerThreshold merges into the existing colormap', () => {
    const viewport = makeViewport({
      getDisplaySetPresentation: jest.fn().mockReturnValue({ colormap: { name: 'jet' } }),
    });
    expect(getViewportAdapter(viewport).setLayerThreshold('ds-1', 42)).toBe(true);
    expect(viewport.setDisplaySetPresentation).toHaveBeenCalledWith('ds-1', {
      colormap: { name: 'jet', threshold: 42 },
    });
  });

  it('getBlendMode reads the blend mode of the presentation', () => {
    const getDisplaySetPresentation = jest.fn((dataId: string) =>
      dataId === 'ds-mip' ? { blendMode: Enums.BlendModes.MAXIMUM_INTENSITY_BLEND } : {}
    );
    const mip = makeViewport({
      getSourceDataId: jest.fn().mockReturnValue('ds-mip'),
      getDisplaySetPresentation,
    });

    expect(getViewportAdapter(mip).getBlendMode()).toBe(Enums.BlendModes.MAXIMUM_INTENSITY_BLEND);
    expect(getViewportAdapter(mip).getBlendMode('ds-other')).toBeUndefined();
    expect(getViewportAdapter(makeViewport()).getBlendMode()).toBeUndefined();
  });

  it('getOpacityGamma is linear', () => {
    expect(getViewportAdapter(makeViewport()).getOpacityGamma()).toBe(1);
  });

  it('addresses a display set that shows under a data id of its own by its UID', () => {
    const viewport = makeViewport({
      getDisplaySets: jest
        .fn()
        .mockReturnValue([{ displaySetId: 'ct-1' }, { displaySetId: 'pt-1::volume' }]),
      getDisplaySetPresentation: jest.fn((dataId: string) =>
        dataId === 'pt-1::volume' ? { colormap: { name: 'hsv' } } : {}
      ),
    });
    const adapter = getViewportAdapter(viewport);

    expect(adapter.getColormap('pt-1')).toEqual({ name: 'hsv' });
    expect(adapter.setLayerOpacity('pt-1', 0.5)).toBe(true);
    expect(viewport.setDisplaySetPresentation).toHaveBeenCalledWith('pt-1::volume', {
      colormap: { name: 'hsv', opacity: 0.5 },
    });
    adapter.getDefaultVOIRange('pt-1');
    expect(viewport.getDefaultVOIRange).toHaveBeenCalledWith('pt-1::volume');
  });

  it('addresses a display set that shows under a data id of its own by that data id', () => {
    const viewport = makeViewport({
      getDisplaySets: jest
        .fn()
        .mockReturnValue([{ displaySetId: 'ct-1' }, { displaySetId: 'pt-1::volume' }]),
    });

    getViewportAdapter(viewport).setPresentation({ invert: true }, 'pt-1::volume');
    expect(viewport.setDisplaySetPresentation).toHaveBeenCalledWith('pt-1::volume', {
      invert: true,
    });
  });
});

describe('data addressing', () => {
  it('getDataIdForDisplaySet gives the bare UID', () => {
    expect(getViewportAdapter(makeViewport()).getDataIdForDisplaySet('ds-1')).toBe('ds-1');
  });

  it('getDataIdForDisplaySet gives the UID of a display set that the viewport shows', () => {
    const viewport = makeViewport({
      getDisplaySets: jest
        .fn()
        .mockReturnValue([{ displaySetId: 'ct-1' }, { displaySetId: 'pt-1' }]),
    });
    expect(getViewportAdapter(viewport).getDataIdForDisplaySet('pt-1')).toBe('pt-1');
  });

  it('getDataIdForDisplaySet gives the data id of its own of a display set shown in a second shape', () => {
    const viewport = makeViewport({
      getDisplaySets: jest.fn().mockReturnValue([{ displaySetId: 'ct-1::stack' }]),
    });
    expect(getViewportAdapter(viewport).getDataIdForDisplaySet('ct-1')).toBe('ct-1::stack');
  });

  it('getDataIdForDisplaySet gives undefined for a display set that the viewport does not show', () => {
    const viewport = makeViewport({
      getDisplaySets: jest.fn().mockReturnValue([{ displaySetId: 'mr-1' }]),
    });
    expect(getViewportAdapter(viewport).getDataIdForDisplaySet('sr-1')).toBeUndefined();
  });

  it('getVolumeIds is empty for a viewport without actors', () => {
    expect(getViewportAdapter(makeViewport()).getVolumeIds()).toEqual([]);
  });

  it('getVolumeIds keeps the ids that the viewport takes as volume ids', () => {
    const viewport = makeViewport({
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
    const viewport = makeViewport({
      getActors: jest.fn().mockReturnValue([{ referencedId: 'image-0' }]),
      hasVolumeId: jest.fn().mockReturnValue(false),
    });

    expect(getViewportAdapter(viewport).getVolumeIds()).toEqual([]);
  });

  it('getDataIdForVolumeId gives the binding that shows the volume', () => {
    const viewport = makeViewport({
      findDataIdByVolumeId: jest.fn((id: string) => (id === 'volume-pt' ? 'ds-pt' : undefined)),
    });

    expect(getViewportAdapter(viewport).getDataIdForVolumeId('volume-pt')).toBe('ds-pt');
    expect(getViewportAdapter(viewport).getDataIdForVolumeId('volume-other')).toBeUndefined();
    expect(getViewportAdapter(makeViewport()).getDataIdForVolumeId('volume-pt')).toBeUndefined();
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
      expect(getViewportAdapter(makeViewport()).getVoxelManagerForDisplaySet('ds-1')).toBe(
        voxelManager
      );
      expect(
        getViewportAdapter(makeViewport()).getVoxelManagerForDisplaySet('missing')
      ).toBeUndefined();
    } finally {
      spy.mockRestore();
    }
  });
});

describe('capture (copyDisplayedContentTo)', () => {
  it('remounts the source dataId and copies presentation + view state', async () => {
    const source = makeViewport({
      getDisplaySetPresentation: jest.fn().mockReturnValue({ invert: true }),
      getViewState: jest.fn().mockReturnValue({ orientation: 'axial', rotation: 45 }),
    });
    const target = makeViewport({
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
