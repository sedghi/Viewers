import React from 'react';
import { act, render } from '@testing-library/react';
import { Enums, metaData } from '@cornerstonejs/core';
import CustomizableViewportOverlay from './CustomizableViewportOverlay';

jest.mock('@ohif/ui-next', () => ({
  ViewportOverlay: () => null,
  formatDICOMDate: (value: string) => value,
}));

jest.mock('../../hooks', () => ({
  useViewportRendering: () => ({ isViewportBackgroundLight: false, windowLevel: undefined }),
}));

const imageIds = ['pt-image-0', 'pt-image-1', 'pt-image-2'];

/**
 * A planar viewport that the overlay finds before its display sets are
 * mounted: it has no view plane normal until `mount()` is called.
 */
function makeViewport(element: HTMLDivElement) {
  let mounted = false;
  return {
    element,
    getViewReference: () => (mounted ? { viewPlaneNormal: [0, 0, 1] } : undefined),
    mount: () => {
      mounted = true;
    },
  };
}

function renderOverlay(element: HTMLDivElement, viewport: ReturnType<typeof makeViewport>) {
  const servicesManager = {
    services: {
      cornerstoneViewportService: { getCornerstoneViewport: () => viewport },
      customizationService: { getCustomization: () => [], transform: (item: unknown) => item },
      toolGroupService: {},
      displaySetService: { getDisplaySetByUID: () => undefined },
    },
  };

  render(
    React.createElement(CustomizableViewportOverlay, {
      element,
      viewportId: 'ptAXIAL',
      viewportData: {
        viewportType: Enums.ViewportType.PLANAR,
        dataShapeType: 'volume',
        data: [
          {
            displaySetInstanceUID: 'pt',
            volume: { direction: [1, 0, 0, 0, 1, 0, 0, 0, 1], imageIds },
          },
        ],
      },
      imageSliceData: { imageIndex: 0, numberOfSlices: 3 },
      servicesManager,
    } as never)
  );
}

describe('the instance number of the overlay', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is read again when the viewport mounts its display sets after the first render', () => {
    const element = document.createElement('div');
    const viewport = makeViewport(element);
    const get = jest.spyOn(metaData, 'get');
    renderOverlay(element, viewport);
    const instanceNumberReads = () =>
      get.mock.calls.filter(
        ([type, imageId]) => type === 'generalImageModule' && imageId === 'pt-image-0'
      );

    expect(instanceNumberReads()).toHaveLength(0);

    act(() => {
      viewport.mount();
      element.dispatchEvent(
        new CustomEvent(Enums.Events.DISPLAY_SETS_CHANGED, {
          detail: { viewportId: 'ptAXIAL', sourceChanged: true },
        })
      );
    });

    expect(instanceNumberReads().length).toBeGreaterThan(0);
  });
});
