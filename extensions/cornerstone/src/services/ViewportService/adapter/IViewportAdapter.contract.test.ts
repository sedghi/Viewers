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
    setDisplaySetAppearance: jest.fn(),
    setViewState: jest.fn(),
    getViewState: jest.fn().mockReturnValue({ rotation: 90, flipHorizontal: true }),
    getCurrentMode: jest.fn().mockReturnValue('stack'),
    getSourceDisplaySetId: jest.fn().mockReturnValue('source-uid'),
    getDisplaySetAppearance: jest.fn().mockReturnValue({}),
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
  it('getAppearance reads the overrides of a display set, the source when none is named', () => {
    const viewport = makeViewport({
      getDisplaySetAppearance: jest.fn().mockReturnValue({ invert: true }),
    });
    const adapter = getViewportAdapter(viewport);
    expect(adapter.getAppearance()).toEqual({ invert: true });
    expect(viewport.getDisplaySetAppearance).toHaveBeenCalledWith(undefined);
    adapter.getAppearance('ds-2');
    expect(viewport.getDisplaySetAppearance).toHaveBeenCalledWith('ds-2');
  });

  it('getAppearance gives a window that a caller set also when it equals the default', () => {
    const voiRange = { lower: 0, upper: 80 };
    const appearance = getViewportAdapter(
      makeViewport({
        getDisplaySetAppearance: jest.fn().mockReturnValue({ voiRange }),
        getDefaultVOIRange: jest.fn().mockReturnValue({ lower: 0, upper: 80 }),
      })
    ).getAppearance();

    expect(appearance).toEqual({ voiRange });
  });

  it('getEffectiveAppearance reads what is drawn, the defaults included', () => {
    const effective = { voiRange: { lower: -160, upper: 240 }, invert: true, opacity: 1 };
    const viewport = makeViewport({
      getDisplaySetAppearance: jest.fn().mockReturnValue({}),
      getEffectiveDisplaySetAppearance: jest.fn().mockReturnValue(effective),
    });
    const adapter = getViewportAdapter(viewport);

    expect(adapter.getEffectiveAppearance('ds-1')).toEqual(effective);
    expect(viewport.getEffectiveDisplaySetAppearance).toHaveBeenCalledWith('ds-1');
    expect(adapter.getAppearance('ds-1')).toEqual({});
  });

  it('getEffectiveAppearance is empty for a display set that is not mounted', () => {
    const viewport = makeViewport({
      getEffectiveDisplaySetAppearance: jest.fn().mockReturnValue(undefined),
    });

    expect(getViewportAdapter(viewport).getEffectiveAppearance('ds-x')).toEqual({});
  });

  it('setAppearance targets setDisplaySetAppearance', () => {
    const viewport = makeViewport();
    getViewportAdapter(viewport).setAppearance({ invert: true }, 'ds-1');
    expect(viewport.setDisplaySetAppearance).toHaveBeenCalledWith('ds-1', { invert: true });

    getViewportAdapter(viewport).setAppearance({ invert: false });
    expect(viewport.setDisplaySetAppearance).toHaveBeenCalledWith({ invert: false });
  });

  it('getBlendMode reads the blend mode of the appearance', () => {
    const getDisplaySetAppearance = jest.fn((displaySetId = 'ds-mip') =>
      displaySetId === 'ds-mip' ? { blendMode: Enums.BlendModes.MAXIMUM_INTENSITY_BLEND } : {}
    );
    const mip = makeViewport({ getDisplaySetAppearance });

    expect(getViewportAdapter(mip).getBlendMode()).toBe(Enums.BlendModes.MAXIMUM_INTENSITY_BLEND);
    expect(getViewportAdapter(mip).getBlendMode('ds-other')).toBeUndefined();
    expect(getViewportAdapter(makeViewport()).getBlendMode()).toBeUndefined();
  });
});

describe('data addressing', () => {
  it('getShownDisplaySetId gives the UID when the viewport shows nothing yet', () => {
    expect(getViewportAdapter(makeViewport()).getShownDisplaySetId('ds-1')).toBe('ds-1');
  });

  it('getShownDisplaySetId gives the UID of a display set that the viewport shows', () => {
    const viewport = makeViewport({
      getDisplaySets: jest
        .fn()
        .mockReturnValue([{ displaySetId: 'ct-1' }, { displaySetId: 'pt-1' }]),
    });
    expect(getViewportAdapter(viewport).getShownDisplaySetId('pt-1')).toBe('pt-1');
  });

  it('getShownDisplaySetId gives undefined for a display set that the viewport does not show', () => {
    const viewport = makeViewport({
      getDisplaySets: jest.fn().mockReturnValue([{ displaySetId: 'mr-1' }]),
    });
    expect(getViewportAdapter(viewport).getShownDisplaySetId('sr-1')).toBeUndefined();
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
});
