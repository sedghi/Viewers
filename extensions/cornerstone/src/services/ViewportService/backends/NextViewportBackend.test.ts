import { metaData } from '@cornerstonejs/core';
import type { PlanarViewport } from '@cornerstonejs/core';
import { NextViewportBackend } from './NextViewportBackend';
import type { StackMountContext } from './IViewportBackend';
import type { IViewportServiceInternals } from './IViewportServiceInternals';

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
  const backend = new NextViewportBackend(makeService());
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
