import { cache } from '@cornerstonejs/core';
import initCineService from './initCineService';

jest.mock('@cornerstonejs/tools', () => ({
  utilities: { cine: { playClip: jest.fn(), stopClip: jest.fn() } },
}));

const DYNAMIC_VOLUME_ID = 'cornerstoneStreamingDynamicImageVolume:pt-4d';
const STATIC_VOLUME_ID = 'cornerstoneStreamingImageVolume:ct';

const volumes = {
  [DYNAMIC_VOLUME_ID]: { volumeId: DYNAMIC_VOLUME_ID, isDynamicVolume: () => true },
  [STATIC_VOLUME_ID]: { volumeId: STATIC_VOLUME_ID, isDynamicVolume: () => false },
};

/** A viewport whose actors stand for the ids, and which takes the volume ids among them. */
function makeViewport(id: string, referencedIds: string[]) {
  return {
    id,
    getActors: () => referencedIds.map(referencedId => ({ referencedId })),
    hasVolumeId: (volumeId: string) => referencedIds.includes(volumeId) && volumeId in volumes,
  };
}

/** The `getSyncedViewports` that initCineService gives the cine service. */
function getSyncedViewportsOf(
  viewports: ReturnType<typeof makeViewport>[],
  viewportType = 'volume'
) {
  const setServiceImplementation = jest.fn();
  const servicesManager = {
    services: {
      cineService: { setServiceImplementation },
      viewportGridService: {
        getState: () => ({
          viewports: new Map(
            viewports.map(({ id }) => [id, { viewportId: id, viewportOptions: { viewportType } }])
          ),
        }),
      },
      cornerstoneViewportService: {
        getCornerstoneViewport: (viewportId: string) => viewports.find(vp => vp.id === viewportId),
      },
    },
  } as unknown as AppTypes.ServicesManager;

  initCineService(servicesManager);

  return setServiceImplementation.mock.calls[0][0].getSyncedViewports as (
    viewportId: string
  ) => { viewportId: string }[];
}

describe('initCineService: the viewports that a cine of a dynamic volume takes along', () => {
  beforeEach(() => {
    jest.spyOn(cache, 'getVolume').mockImplementation(((volumeId: string) => {
      if (!volumeId) {
        throw new Error('getVolume: volumeId must be defined');
      }
      return volumes[volumeId];
    }) as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('gives the other viewports that show the dynamic volume of the source', () => {
    const getSyncedViewports = getSyncedViewportsOf([
      makeViewport('axial', [DYNAMIC_VOLUME_ID]),
      makeViewport('sagittal', [DYNAMIC_VOLUME_ID]),
      makeViewport('ct-only', [STATIC_VOLUME_ID]),
    ]);

    expect(getSyncedViewports('axial')).toEqual([{ viewportId: 'sagittal' }]);
  });

  it('finds the dynamic volume behind a static one, a labelmap and a surface', () => {
    const getSyncedViewports = getSyncedViewportsOf([
      makeViewport('fusion', [
        STATIC_VOLUME_ID,
        DYNAMIC_VOLUME_ID,
        'labelmap-image-3',
        'surface-geometry',
        undefined,
      ]),
      makeViewport('pt', [DYNAMIC_VOLUME_ID]),
    ]);

    expect(getSyncedViewports('fusion')).toEqual([{ viewportId: 'pt' }]);
  });

  it('gives none for a source that shows no dynamic volume', () => {
    const getSyncedViewports = getSyncedViewportsOf([
      makeViewport('ct', [STATIC_VOLUME_ID]),
      makeViewport('ct-2', [STATIC_VOLUME_ID]),
    ]);

    expect(getSyncedViewports('ct')).toEqual([]);
  });

  it('gives none for a stack, whose actors stand for images', () => {
    const getSyncedViewports = getSyncedViewportsOf(
      [makeViewport('stack', ['image-0']), makeViewport('pt', [DYNAMIC_VOLUME_ID])],
      'stack'
    );

    expect(getSyncedViewports('stack')).toEqual([]);
  });
});
