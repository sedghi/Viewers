import { Enums, displaySetRegistry, metaData } from '@cornerstonejs/core';
import type { ECGViewport, PlanarViewport, Types } from '@cornerstonejs/core';
import { ViewportBackend } from './ViewportBackend';
import type { StackMountContext, VolumeMountContext } from './IViewportBackend';
import type { IViewportServiceInternals } from './IViewportServiceInternals';
import type ViewportInfo from '../Viewport';
import type { PositionPresentation } from '../../../types/Presentation';

jest.mock('@cornerstonejs/tools', () => ({
  utilities: { stackContextPrefetch: { enable: jest.fn() } },
}));

const imageIds = ['image-0', 'image-1', 'image-2'];

function makeService(): jest.Mocked<IViewportServiceInternals> {
  return {
    _setStackViewport: jest.fn().mockResolvedValue(undefined),
    _setVolumeViewport: jest.fn().mockResolvedValue(undefined),
    _setEcgViewport: jest.fn().mockResolvedValue(undefined),
    _setOtherViewport: jest.fn().mockResolvedValue(undefined),
    setPresentations: jest.fn(),
    _addOverlayRepresentations: jest.fn().mockResolvedValue(undefined),
    _trackViewportDisplaySets: jest.fn(),
  };
}

function makeViewport(id = 'viewport-1') {
  return {
    id,
    element: {},
    setDisplaySets: jest.fn().mockResolvedValue(undefined),
    setDisplaySetAppearance: jest.fn(),
    setViewState: jest.fn(),
    render: jest.fn(),
  };
}

/** The options of the one entry of the first setDisplaySets call of a viewport. */
function mountOptionsOf(viewport: ReturnType<typeof makeViewport>, entry = 0) {
  return viewport.setDisplaySets.mock.calls[0][entry].options;
}

function mountStackOf(
  backend: ViewportBackend,
  viewport: ReturnType<typeof makeViewport>,
  properties: Record<string, unknown> = {},
  initialImageIndex = 0
) {
  return backend.mountStack(
    viewport as unknown as PlanarViewport,
    {
      displaySetInstanceUIDs: ['display-set-1'],
      imageIds,
      initialImageIndex,
      properties,
      presentations: {},
    } as StackMountContext
  );
}

function mountVolumeOf(
  backend: ViewportBackend,
  viewport: ReturnType<typeof makeViewport> & { type?: string },
  context: Partial<VolumeMountContext> = {}
) {
  return backend.mountVolumes(
    viewport as unknown as Types.IViewport,
    {
      filteredVolumeInputArray: [
        {
          volumeInput: {
            imageIds,
            volumeId: 'volumeLoader:display-set-1',
            displaySetInstanceUID: 'display-set-1',
          },
        },
      ],
      volumesProperties: [{ properties: { voiRange: { lower: 0, upper: 100 } } }],
      viewportInfo: { getOrientation: () => Enums.OrientationAxis.AXIAL },
      overlayProcessingResults: [],
      presentations: {},
      ...context,
    } as unknown as VolumeMountContext
  );
}

describe('the window of a stack mount', () => {
  beforeEach(() => {
    jest.spyOn(metaData, 'get').mockImplementation((type: string) => {
      if (type === 'voiLutModule') {
        return { windowCenter: [34.5], windowWidth: [94] };
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sets no window when none is given, so that each image shows its own', async () => {
    const viewport = makeViewport();
    await mountStackOf(new ViewportBackend(makeService()), viewport);

    expect(viewport.setDisplaySets).toHaveBeenCalledTimes(1);
    expect(mountOptionsOf(viewport).appearance).toEqual({});
    expect(viewport.setDisplaySetAppearance).not.toHaveBeenCalled();
  });

  it('draws the window that is given from the first draw, on the mount', async () => {
    const voiRange = { lower: -160, upper: 240 };
    const viewport = makeViewport();
    await mountStackOf(new ViewportBackend(makeService()), viewport, { voiRange });

    expect(mountOptionsOf(viewport).appearance).toEqual({ voiRange });
    expect(viewport.setDisplaySetAppearance).not.toHaveBeenCalled();
  });
});

describe('the mount of a display set', () => {
  const ohifDisplaySet = { displaySetInstanceUID: 'display-set-1', imageIds, Modality: 'CT' };
  let backend: ViewportBackend;

  beforeEach(() => {
    backend = new ViewportBackend(makeService());
    displaySetRegistry.add('display-set-1', ohifDisplaySet);
  });

  afterEach(() => {
    displaySetRegistry.remove('display-set-1');
  });

  it('names the display set by its UID and says on its options that a stack viewport wants a stack, on its first image', async () => {
    const viewport = makeViewport();
    await mountStackOf(backend, viewport, {}, 2);

    expect(viewport.setDisplaySets).toHaveBeenCalledWith({
      displaySetId: 'display-set-1',
      options: expect.objectContaining({
        mode: 'stack',
        role: 'source',
        initialImageIdIndex: 2,
      }),
    });
  });

  it('shows one display set as a stack in one viewport and as a volume in another under its UID (M42)', async () => {
    const volumeViewport = makeViewport('mpr-axial');
    const stackViewport = makeViewport('stack');

    await mountVolumeOf(backend, volumeViewport);
    await mountStackOf(backend, stackViewport);

    expect(volumeViewport.setDisplaySets).toHaveBeenCalledWith({
      displaySetId: 'display-set-1',
      options: {
        mode: 'volume',
        orientation: Enums.OrientationAxis.AXIAL,
        role: 'source',
        volumeId: 'volumeLoader:display-set-1',
        appearance: { voiRange: { lower: 0, upper: 100 } },
      },
    });
    expect(stackViewport.setDisplaySets).toHaveBeenCalledWith({
      displaySetId: 'display-set-1',
      options: expect.objectContaining({ mode: 'stack', initialImageIdIndex: 0 }),
    });
    expect(volumeViewport.setDisplaySetAppearance).not.toHaveBeenCalled();
  });

  it('registers nothing at the mount: the registry keeps the display set object of OHIF', async () => {
    await mountVolumeOf(backend, makeViewport('mpr-axial'));
    await mountStackOf(backend, makeViewport('stack'));

    expect(displaySetRegistry.get('display-set-1')).toBe(ohifDisplaySet);
    expect(displaySetRegistry.has('display-set-1::stack')).toBe(false);
    expect(displaySetRegistry.has('display-set-1::volume')).toBe(false);
  });

  it('gives the source of a volume mount the stored LUT presentation over the hanging protocol window', async () => {
    const viewport = makeViewport('mpr-axial');
    const stored = { voiRange: { lower: 40, upper: 80 }, invert: true };

    await mountVolumeOf(backend, viewport, {
      presentations: {
        lutPresentation: { viewportType: 'volume', appearances: { 'display-set-1': stored } },
      },
    });

    expect(mountOptionsOf(viewport).appearance).toEqual(stored);
  });

  it('gives each display set of a fusion its own stored appearance, the opacity of the PET too', async () => {
    const viewport = makeViewport('fusion');
    const ptAppearance = {
      colormap: { name: 'hsv', opacityMapping: [{ value: 0, opacity: 0 }] },
      opacity: 0.5,
    };

    await mountVolumeOf(backend, viewport, {
      filteredVolumeInputArray: [
        {
          volumeInput: { imageIds, volumeId: 'volumeLoader:ct', displaySetInstanceUID: 'ct' },
          displaySetOptions: {},
        },
        {
          volumeInput: { imageIds, volumeId: 'volumeLoader:pt', displaySetInstanceUID: 'pt' },
          displaySetOptions: {},
        },
      ] as VolumeMountContext['filteredVolumeInputArray'],
      volumesProperties: [
        { properties: { voiRange: { lower: 0, upper: 100 } }, volumeId: 'volumeLoader:ct' },
        { properties: { opacity: 1 }, volumeId: 'volumeLoader:pt' },
      ],
      presentations: {
        lutPresentation: { viewportType: 'volume', appearances: { pt: ptAppearance } },
      },
    });

    expect(mountOptionsOf(viewport, 0).appearance).toEqual({ voiRange: { lower: 0, upper: 100 } });
    expect(mountOptionsOf(viewport, 1)).toEqual(
      expect.objectContaining({ role: 'overlay', appearance: ptAppearance })
    );
  });

  it('keeps the defaults of a display set whose stored appearance has no override, after a reset', async () => {
    const viewport = makeViewport('mpr-axial');

    await mountVolumeOf(backend, viewport, {
      presentations: {
        lutPresentation: { viewportType: 'volume', appearances: { 'display-set-1': {} } },
      },
    });

    expect(mountOptionsOf(viewport).appearance).toEqual({});
  });

  it('gives a planar volume mount the opacity of the display set options', async () => {
    const viewport = makeViewport('overlay');

    await mountVolumeOf(backend, viewport, {
      volumesProperties: [
        {
          properties: { colormap: { name: 'hsv' }, opacity: 0.4, preset: 'CT-Bone' },
          volumeId: 'volumeLoader:display-set-1',
        },
      ],
    });

    expect(mountOptionsOf(viewport).appearance).toEqual({
      colormap: { name: 'hsv' },
      opacity: 0.4,
    });
  });

  it('puts the slab and the blend mode of a projection on the appearance of a planar volume mount', async () => {
    const viewport = makeViewport('mip');

    await mountVolumeOf(backend, viewport, {
      filteredVolumeInputArray: [
        {
          volumeInput: {
            imageIds,
            volumeId: 'volumeLoader:display-set-1',
            displaySetInstanceUID: 'display-set-1',
            blendMode: Enums.BlendModes.MAXIMUM_INTENSITY_BLEND,
            slabThickness: 400,
          },
          displaySetOptions: {},
        },
      ],
    });

    expect(mountOptionsOf(viewport).appearance).toEqual({
      voiRange: { lower: 0, upper: 100 },
      blendMode: Enums.BlendModes.MAXIMUM_INTENSITY_BLEND,
      slabThickness: 400,
    });
  });

  it('mounts a 3D viewport with the volume id and the preset, and no render mode', async () => {
    const viewport = { ...makeViewport('viewport-3d'), type: Enums.ViewportType.VOLUME_3D };

    await mountVolumeOf(backend, viewport, {
      volumesProperties: [{ properties: { preset: 'CT-Bone', colormap: { name: 'hsv' } } }],
    } as unknown as Partial<VolumeMountContext>);

    expect(viewport.setDisplaySets).toHaveBeenCalledWith({
      displaySetId: 'display-set-1',
      options: {
        role: 'source',
        volumeId: 'volumeLoader:display-set-1',
        appearance: { preset: 'CT-Bone' },
      },
    });
  });

  it('mounts an ECG and a video or whole slide display set by its UID only', async () => {
    const ecgViewport = makeViewport('ecg');
    const videoViewport = makeViewport('video');

    await backend.mountEcg(ecgViewport as unknown as ECGViewport, {
      displaySetInstanceUID: 'ecg-1',
    });
    await backend.mountOther(videoViewport as unknown as Types.IViewport, {
      displaySetInstanceUID: 'video-1',
    });

    expect(ecgViewport.setDisplaySets).toHaveBeenCalledWith({ displaySetId: 'ecg-1' });
    expect(videoViewport.setDisplaySets).toHaveBeenCalledWith({ displaySetId: 'video-1' });
    expect(displaySetRegistry.has('ecg-1')).toBe(false);
    expect(displaySetRegistry.has('video-1')).toBe(false);
  });
});

describe('the stack mount and its stored appearance', () => {
  it('mounts the display set with every key of its appearance, the opacity too', async () => {
    const viewport = makeViewport();
    const appearance = { voiRange: { lower: 1, upper: 2 }, invert: true, opacity: 0.6 };

    await mountStackOf(new ViewportBackend(makeService()), viewport, appearance);

    expect(mountOptionsOf(viewport).appearance).toEqual(appearance);
  });
});

describe('the stored LUT presentation applied to a viewport that shows its display sets', () => {
  it('gives each display set that the viewport shows its stored overrides', () => {
    const viewport = {
      getDisplaySets: jest.fn().mockReturnValue([{ displaySetId: 'ct' }, { displaySetId: 'pt' }]),
      setDisplaySetAppearance: jest.fn(),
    };

    new ViewportBackend(makeService()).setLutPresentation(viewport as unknown as Types.IViewport, {
      viewportType: 'volume',
      appearances: { ct: {}, pt: { opacity: 0.3 }, other: { invert: true } },
    });

    expect(viewport.setDisplaySetAppearance).toHaveBeenCalledTimes(1);
    expect(viewport.setDisplaySetAppearance).toHaveBeenCalledWith('pt', { opacity: 0.3 });
  });
});

describe('the position presentation', () => {
  const planarInfo = { getViewportType: () => 'stack' } as unknown as ViewportInfo;
  const info3D = { getViewportType: () => Enums.ViewportType.VOLUME_3D } as ViewportInfo;
  const viewReference = { referencedImageId: 'image-1', viewPlaneNormal: [0, 0, 1] };

  function makeFramedViewport(type: string, framing?: object, viewable = true) {
    return {
      id: `viewport-${type}`,
      type,
      getViewFraming: jest.fn().mockReturnValue(framing),
      setViewFraming: jest.fn(),
      getViewReference: jest.fn().mockReturnValue(viewReference),
      setViewReference: jest.fn(),
      isReferenceViewable: jest.fn().mockReturnValue(viewable),
      setViewState: jest.fn(),
    };
  }

  const store = (viewport, viewportInfo: ViewportInfo) =>
    new ViewportBackend(makeService()).getPositionPresentation(
      viewport as unknown as Types.IViewport,
      viewportInfo,
      viewport.id
    );

  const restore = (viewport, positionPresentation: PositionPresentation) =>
    new ViewportBackend(makeService()).setPositionPresentation(
      viewport as unknown as Types.IViewport,
      positionPresentation
    );

  it('stores the view reference and the framing of a planar viewport, how it fits too', () => {
    const framing = {
      zoom: 2,
      pan: [10, -4],
      rotation: 90,
      flipHorizontal: true,
      flipVertical: false,
      scaleMode: 'fitWidth',
      fitScale: [2, 2],
    };
    const viewport = makeFramedViewport(Enums.ViewportType.PLANAR, framing);

    const presentation = store(viewport, planarInfo);

    expect(viewport.getViewFraming).toHaveBeenCalledWith();
    expect(presentation).toEqual({
      viewportType: 'stack',
      viewReference,
      viewFraming: framing,
      viewportId: viewport.id,
    });
  });

  it('shows the stored slice first and then the stored framing', () => {
    const framing = { zoom: 2, pan: [10, -4], scaleMode: 'fitWidth', fitScale: [2, 2] };
    const viewport = makeFramedViewport(Enums.ViewportType.PLANAR);
    const order: string[] = [];
    viewport.setViewReference.mockImplementation(() => order.push('reference'));
    viewport.setViewFraming.mockImplementation(() => order.push('framing'));

    restore(viewport, {
      viewportType: 'stack',
      viewReference,
      viewFraming: framing,
    } as PositionPresentation);

    expect(viewport.isReferenceViewable).toHaveBeenCalledWith(viewReference, {
      withNavigation: true,
      withOrientation: true,
    });
    expect(viewport.setViewReference).toHaveBeenCalledWith(viewReference);
    expect(viewport.setViewFraming).toHaveBeenCalledWith(framing);
    expect(order).toEqual(['reference', 'framing']);
    expect(viewport.setViewState).not.toHaveBeenCalled();
  });

  it('keeps the framing of a reference that the viewport cannot show', () => {
    const framing = { zoom: 3 };
    const viewport = makeFramedViewport(Enums.ViewportType.PLANAR, undefined, false);

    restore(viewport, {
      viewportType: 'stack',
      viewReference,
      viewFraming: framing,
    } as PositionPresentation);

    expect(viewport.setViewReference).not.toHaveBeenCalled();
    expect(viewport.setViewFraming).toHaveBeenCalledWith(framing);
  });

  it('places a 3D viewport by the camera of its framing and stores no view reference', () => {
    const framing = {
      camera: { viewPlaneNormal: [1, 0, 0], viewUp: [0, 0, 1], focalPoint: [0, 0, 0] },
      zoom: 0.5,
      pan: [12, -4],
    };
    const viewport = makeFramedViewport(Enums.ViewportType.VOLUME_3D, framing);

    const presentation = store(viewport, info3D);
    restore(viewport, presentation);

    expect(presentation.viewReference).toBeNull();
    expect(presentation.viewFraming).toBe(framing);
    expect(viewport.getViewReference).not.toHaveBeenCalled();
    expect(viewport.setViewReference).not.toHaveBeenCalled();
    expect(viewport.setViewFraming).toHaveBeenCalledWith(framing);
  });

  it('leaves a viewport that showed nothing when it was stored', () => {
    const viewport = makeFramedViewport(Enums.ViewportType.VOLUME_3D, undefined);

    restore(viewport, store(viewport, info3D));

    expect(viewport.setViewFraming).not.toHaveBeenCalled();
    expect(viewport.setViewState).not.toHaveBeenCalled();
  });

  it('shows the slice of a position that a viewport of SEG or RTSTRUCT stored without a framing', () => {
    const viewport = makeFramedViewport(Enums.ViewportType.PLANAR);

    restore(viewport, { viewReference } as PositionPresentation);

    expect(viewport.setViewReference).toHaveBeenCalledWith(viewReference);
    expect(viewport.setViewFraming).not.toHaveBeenCalled();
  });
});
