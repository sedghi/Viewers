import { Enums, displaySetRegistry, metaData, viewportProjection } from '@cornerstonejs/core';
import type { ECGViewport, PlanarViewport, Types } from '@cornerstonejs/core';
import { ViewportBackend } from './ViewportBackend';
import type { StackMountContext, VolumeMountContext } from './IViewportBackend';
import type { IViewportServiceInternals } from './IViewportServiceInternals';
import type ViewportInfo from '../Viewport';
import type { PositionPresentation } from '../../../types/Presentation';

jest.mock('@cornerstonejs/core', () => {
  const actual = jest.requireActual('@cornerstonejs/core');

  return {
    ...actual,
    viewportProjection: { getFraming: jest.fn(), withFraming: jest.fn() },
  };
});

jest.mock('@cornerstonejs/tools', () => ({
  utilities: { stackContextPrefetch: { enable: jest.fn() } },
}));

const getPresentation = viewportProjection.getFraming as jest.Mock;
const withPresentation = viewportProjection.withFraming as jest.Mock;

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
      presentations: { lutPresentation: { viewportType: 'volume', properties: stored } },
    } as unknown as Partial<VolumeMountContext>);

    expect(mountOptionsOf(viewport).appearance).toEqual(stored);
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

describe('the position presentation of a 3D viewport', () => {
  const viewportInfo = { getViewportType: () => Enums.ViewportType.VOLUME_3D } as ViewportInfo;
  const nextViewState = { parallelScale: 182.7 };

  function make3DViewport() {
    return {
      id: 'viewport-3d',
      type: Enums.ViewportType.VOLUME_3D,
      getViewState: jest.fn(),
      getViewReference: jest.fn(),
      setViewReference: jest.fn(),
      setViewState: jest.fn(),
    };
  }

  beforeEach(() => {
    getPresentation.mockReset();
    withPresentation.mockReset();
  });

  it('holds the zoom and the pan of the view, and no view reference', () => {
    const backend = new ViewportBackend(makeService());
    const viewport = make3DViewport();
    getPresentation.mockReturnValue({ zoom: 0.5, pan: [12, -4] });

    const presentation = backend.getPositionPresentation(
      viewport as unknown as Types.IViewport,
      viewportInfo,
      viewport.id
    );

    expect(getPresentation).toHaveBeenCalledWith(viewport, { selector: { zoom: true, pan: true } });
    expect(presentation.viewReference).toBeNull();
    expect(presentation.viewPresentation).toEqual({ zoom: 0.5, pan: [12, -4] });
    expect(viewport.getViewReference).not.toHaveBeenCalled();
  });

  it('writes the zoom and the pan back against the fit of the viewport as it is now', () => {
    const backend = new ViewportBackend(makeService());
    const viewport = make3DViewport();
    withPresentation.mockReturnValue(nextViewState);

    backend.setPositionPresentation(
      viewport as unknown as Types.IViewport,
      {
        viewportType: Enums.ViewportType.VOLUME_3D,
        viewReference: null,
        viewPresentation: { zoom: 0.5, pan: [12, -4] },
        viewportId: viewport.id,
      } as unknown as PositionPresentation
    );

    expect(withPresentation).toHaveBeenCalledWith(viewport, { zoom: 0.5, pan: [12, -4] });
    expect(viewport.setViewState).toHaveBeenCalledTimes(1);
    expect(viewport.setViewState).toHaveBeenCalledWith(nextViewState);
    expect(viewport.setViewReference).not.toHaveBeenCalled();
  });

  it('leaves a 3D viewport that shows nothing yet', () => {
    const backend = new ViewportBackend(makeService());
    const viewport = make3DViewport();
    getPresentation.mockReturnValue(undefined);
    withPresentation.mockReturnValue(undefined);

    const presentation = backend.getPositionPresentation(
      viewport as unknown as Types.IViewport,
      viewportInfo,
      viewport.id
    );
    backend.setPositionPresentation(
      viewport as unknown as Types.IViewport,
      {
        viewportType: Enums.ViewportType.VOLUME_3D,
        viewReference: null,
        viewPresentation: { zoom: 1, pan: [0, 0] },
        viewportId: viewport.id,
      } as unknown as PositionPresentation
    );

    expect(presentation.viewPresentation).toBeUndefined();
    expect(viewport.setViewState).not.toHaveBeenCalled();
  });
});
