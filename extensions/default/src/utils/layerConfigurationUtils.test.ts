import { configureViewportForLayerAddition, DEFAULT_OPACITY } from './layerConfigurationUtils';

/**
 * Services of a mounted viewport that shows a CT and takes a PT as a layer,
 * from the data overlay menu.
 */
function makeServicesManager() {
  const displaySets = {
    ct: { displaySetInstanceUID: 'ct', Modality: 'CT' },
    pt: { displaySetInstanceUID: 'pt', Modality: 'PT' },
  };

  return {
    services: {
      cornerstoneViewportService: {
        getCornerstoneViewport: () => ({ getCurrentMode: () => 'volume' }),
        getOrientation: () => 'axial',
      },
      displaySetService: { getDisplaySetByUID: (uid: string) => displaySets[uid] },
      customizationService: { getCustomization: () => undefined },
    },
  } as unknown as AppTypes.ServicesManager;
}

function addPT() {
  return configureViewportForLayerAddition({
    viewport: { viewportId: 'default', displaySetInstanceUIDs: ['ct'], viewportOptions: {} },
    displaySetInstanceUID: 'pt',
    currentDisplaySetUIDs: ['ct'],
    servicesManager: makeServicesManager(),
  });
}

describe('a display set added as a layer from the data overlay menu', () => {
  it('starts over a live viewport at the opacity that 3.13 drew the 0.9 of the menu with', () => {
    const legacyLook = 1 - (1 - DEFAULT_OPACITY) ** 0.125;

    const { displaySetOptions } = addPT();

    expect(displaySetOptions[0]).toEqual({});
    expect(displaySetOptions[1].colormap).toEqual({ name: 'hsv' });
    expect(displaySetOptions[1].opacity).toBe(0.25);
    expect(displaySetOptions[1].opacity).toBeCloseTo(legacyLook, 3);
  });
});
