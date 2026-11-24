import { Enums, metaData, viewportProjection } from '@cornerstonejs/core';
import type { PlanarViewport, Types } from '@cornerstonejs/core';
import { ViewportBackend } from './ViewportBackend';
import type { StackMountContext, VolumeMountContext } from './IViewportBackend';
import type { IViewportServiceInternals } from './IViewportServiceInternals';
import type ViewportInfo from '../Viewport';
import type { PositionPresentation } from '../../../types/Presentation';

jest.mock('@cornerstonejs/core', () => {
  const actual = jest.requireActual('@cornerstonejs/core');

  return {
    ...actual,
    viewportProjection: { getPresentation: jest.fn(), withPresentation: jest.fn() },
  };
});

jest.mock('@cornerstonejs/tools', () => ({
  utilities: { stackContextPrefetch: { enable: jest.fn() } },
}));

const getPresentation = viewportProjection.getPresentation as jest.Mock;
const withPresentation = viewportProjection.withPresentation as jest.Mock;

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

function makeViewport() {
  return {
    id: 'viewport-1',
    element: {},
    setDisplaySets: jest.fn().mockResolvedValue(undefined),
    setDisplaySetPresentation: jest.fn(),
    setViewState: jest.fn(),
  };
}

/** Mounts a stack whose images each have a window in their metadata. */
async function mountStack(properties: Record<string, unknown>) {
  const backend = new ViewportBackend(makeService());
  const viewport = makeViewport();

  await backend.mountStack(
    viewport as unknown as PlanarViewport,
    {
      displaySetInstanceUIDs: ['display-set-1'],
      imageIds,
      initialImageIndex: 0,
      properties,
      presentations: {},
    } as StackMountContext
  );
  backend.onViewportDisabled(viewport.id);

  return viewport;
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
    const viewport = await mountStack({});

    expect(viewport.setDisplaySets).toHaveBeenCalledTimes(1);
    expect(viewport.setDisplaySetPresentation).not.toHaveBeenCalled();
  });

  it('sets the window that is given', async () => {
    const voiRange = { lower: -160, upper: 240 };
    const viewport = await mountStack({ voiRange });

    expect(viewport.setDisplaySetPresentation).toHaveBeenCalledWith({ voiRange });
  });
});

describe('the data id of a mount', () => {
  const voiRange = { lower: 0, upper: 100 };
  let backend: ViewportBackend;

  function makeVolumeViewport(id: string) {
    return {
      id,
      setDisplaySets: jest.fn().mockResolvedValue(undefined),
      setDisplaySetPresentation: jest.fn(),
      render: jest.fn(),
    };
  }

  function mountVolume(viewport: ReturnType<typeof makeVolumeViewport>) {
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
        volumesProperties: [{ properties: { voiRange } }],
        viewportInfo: { getOrientation: () => Enums.OrientationAxis.AXIAL },
        overlayProcessingResults: [],
        presentations: {},
      } as unknown as VolumeMountContext
    );
  }

  function mountStackOf(viewport: ReturnType<typeof makeViewport>) {
    return backend.mountStack(
      viewport as unknown as PlanarViewport,
      {
        displaySetInstanceUIDs: ['display-set-1'],
        imageIds,
        initialImageIndex: 0,
        properties: {},
        presentations: {},
      } as StackMountContext
    );
  }

  beforeEach(() => {
    backend = new ViewportBackend(makeService());
  });

  afterEach(() => {
    backend.destroy();
  });

  it('mounts a stack of a display set that another viewport shows as a volume by a data id of its own', async () => {
    const volumeViewport = makeVolumeViewport('mpr-axial');
    const stackViewport = makeViewport();

    await mountVolume(volumeViewport);
    await mountStackOf(stackViewport);

    expect(volumeViewport.setDisplaySets).toHaveBeenCalledWith(
      expect.objectContaining({ displaySetId: 'display-set-1' })
    );
    expect(stackViewport.setDisplaySets).toHaveBeenCalledWith(
      expect.objectContaining({ displaySetId: 'display-set-1::stack' })
    );
  });

  it('mounts a volume of a display set that another viewport shows as a stack by a data id of its own', async () => {
    const stackViewport = makeViewport();
    const volumeViewport = makeVolumeViewport('mpr-axial');

    await mountStackOf(stackViewport);
    await mountVolume(volumeViewport);

    expect(stackViewport.setDisplaySets).toHaveBeenCalledWith(
      expect.objectContaining({ displaySetId: 'display-set-1' })
    );
    expect(volumeViewport.setDisplaySets).toHaveBeenCalledWith(
      expect.objectContaining({ displaySetId: 'display-set-1::volume' })
    );
    expect(volumeViewport.setDisplaySetPresentation).toHaveBeenCalledWith('display-set-1::volume', {
      voiRange,
    });
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
