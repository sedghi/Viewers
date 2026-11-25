import { Enums, displaySetRegistry, metaData } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
import { mountStack, mountVolumes } from './viewportMounts';
import type { VolumeMountContext } from './viewportMounts';
import type { DisplaySetAppearanceOverrides } from '../../types/Presentation';

jest.mock('@cornerstonejs/tools', () => ({
  utilities: { stackContextPrefetch: { enable: jest.fn() } },
}));

const imageIds = ['image-0', 'image-1', 'image-2'];

function makeViewport(id = 'viewport-1', type: string = Enums.ViewportType.PLANAR) {
  return {
    id,
    type,
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
  viewport: ReturnType<typeof makeViewport>,
  appearance: DisplaySetAppearanceOverrides = {},
  initialImageIndex = 0
) {
  return mountStack(viewport as unknown as Types.IViewport, {
    displaySetInstanceUID: 'display-set-1',
    initialImageIndex,
    appearance,
  });
}

function mountVolumeOf(
  viewport: ReturnType<typeof makeViewport>,
  context: Partial<VolumeMountContext> = {}
) {
  return mountVolumes(viewport as unknown as Types.IViewport, {
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
    orientation: Enums.OrientationAxis.AXIAL,
    ...context,
  });
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
    await mountStackOf(viewport);

    expect(viewport.setDisplaySets).toHaveBeenCalledTimes(1);
    expect(mountOptionsOf(viewport).appearance).toEqual({});
    expect(viewport.setDisplaySetAppearance).not.toHaveBeenCalled();
  });

  it('draws the window that is given from the first draw, on the mount', async () => {
    const voiRange = { lower: -160, upper: 240 };
    const viewport = makeViewport();
    await mountStackOf(viewport, { voiRange });

    expect(mountOptionsOf(viewport).appearance).toEqual({ voiRange });
    expect(viewport.setDisplaySetAppearance).not.toHaveBeenCalled();
  });
});

describe('the mount of a display set', () => {
  const ohifDisplaySet = { displaySetInstanceUID: 'display-set-1', imageIds, Modality: 'CT' };

  beforeEach(() => {
    displaySetRegistry.add('display-set-1', ohifDisplaySet);
  });

  afterEach(() => {
    displaySetRegistry.remove('display-set-1');
  });

  it('names the display set by its UID and says on its options that a stack viewport wants a stack, on its first image', async () => {
    const viewport = makeViewport();
    await mountStackOf(viewport, {}, 2);

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

    await mountVolumeOf(volumeViewport);
    await mountStackOf(stackViewport);

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
    await mountVolumeOf(makeViewport('mpr-axial'));
    await mountStackOf(makeViewport('stack'));

    expect(displaySetRegistry.get('display-set-1')).toBe(ohifDisplaySet);
    expect(displaySetRegistry.has('display-set-1::stack')).toBe(false);
    expect(displaySetRegistry.has('display-set-1::volume')).toBe(false);
  });

  it('gives the source of a volume mount the stored LUT presentation over the hanging protocol window', async () => {
    const viewport = makeViewport('mpr-axial');
    const stored = { voiRange: { lower: 40, upper: 80 }, invert: true };

    await mountVolumeOf(viewport, {
      lutPresentation: { viewportType: 'volume', appearances: { 'display-set-1': stored } },
    });

    expect(mountOptionsOf(viewport).appearance).toEqual(stored);
  });

  it('gives each display set of a fusion its own stored appearance, the opacity of the PET too', async () => {
    const viewport = makeViewport('fusion');
    const ptAppearance = {
      colormap: { name: 'hsv', opacityMapping: [{ value: 0, opacity: 0 }] },
      opacity: 0.5,
    };

    await mountVolumeOf(viewport, {
      filteredVolumeInputArray: [
        {
          volumeInput: { imageIds, volumeId: 'volumeLoader:ct', displaySetInstanceUID: 'ct' },
          displaySetOptions: {},
        },
        {
          volumeInput: { imageIds, volumeId: 'volumeLoader:pt', displaySetInstanceUID: 'pt' },
          displaySetOptions: {},
        },
      ],
      volumesProperties: [
        { properties: { voiRange: { lower: 0, upper: 100 } }, volumeId: 'volumeLoader:ct' },
        { properties: { opacity: 1 }, volumeId: 'volumeLoader:pt' },
      ],
      lutPresentation: { viewportType: 'volume', appearances: { pt: ptAppearance } },
    });

    expect(mountOptionsOf(viewport, 0).appearance).toEqual({ voiRange: { lower: 0, upper: 100 } });
    expect(mountOptionsOf(viewport, 1)).toEqual(
      expect.objectContaining({ role: 'overlay', appearance: ptAppearance })
    );
  });

  it('keeps the defaults of a display set whose stored appearance has no override, after a reset', async () => {
    const viewport = makeViewport('mpr-axial');

    await mountVolumeOf(viewport, {
      lutPresentation: { viewportType: 'volume', appearances: { 'display-set-1': {} } },
    });

    expect(mountOptionsOf(viewport).appearance).toEqual({});
  });

  it('gives a planar volume mount the opacity of the display set options', async () => {
    const viewport = makeViewport('overlay');

    await mountVolumeOf(viewport, {
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

    await mountVolumeOf(viewport, {
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
    const viewport = makeViewport('viewport-3d', Enums.ViewportType.VOLUME_3D);

    await mountVolumeOf(viewport, {
      volumesProperties: [{ properties: { preset: 'CT-Bone', colormap: { name: 'hsv' } } }],
    });

    expect(viewport.setDisplaySets).toHaveBeenCalledWith({
      displaySetId: 'display-set-1',
      options: {
        role: 'source',
        volumeId: 'volumeLoader:display-set-1',
        appearance: { preset: 'CT-Bone' },
      },
    });
  });
});

describe('the stack mount and its stored appearance', () => {
  it('mounts the display set with every key of its appearance, the opacity too', async () => {
    const viewport = makeViewport();
    const appearance = { voiRange: { lower: 1, upper: 2 }, invert: true, opacity: 0.6 };

    await mountStackOf(viewport, appearance);

    expect(mountOptionsOf(viewport).appearance).toEqual(appearance);
  });
});
