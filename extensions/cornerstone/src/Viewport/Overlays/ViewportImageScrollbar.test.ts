import React from 'react';
import { act, render } from '@testing-library/react';
import { Enums } from '@cornerstonejs/core';
import CornerstoneImageScrollbar from './ViewportImageScrollbar';

jest.mock('@ohif/ui-next', () => ({
  ImageScrollbar: () => null,
}));

const imageIds = Array.from({ length: 52 }, (_, index) => `image-${index}`);

/** A stack of 52 images that shows image 3. */
function makeStackViewport(element: HTMLDivElement) {
  return {
    id: 'viewport-1',
    type: Enums.ViewportType.PLANAR,
    element,
    getCurrentMode: () => 'stack',
    getCurrentImageIdIndex: () => 3,
    getNumberOfSlices: () => 52,
  };
}

function renderScrollbar(element: HTMLDivElement, setImageSliceData: jest.Mock) {
  const viewport = makeStackViewport(element);
  const servicesManager = {
    services: {
      cineService: { getState: () => ({ isCineEnabled: false }) },
      cornerstoneViewportService: { getCornerstoneViewport: () => viewport },
    },
  };

  render(
    React.createElement(CornerstoneImageScrollbar, {
      viewportData: {
        viewportType: Enums.ViewportType.PLANAR,
        dataShapeType: 'stack',
        data: [{ displaySetInstanceUID: 'ct', imageIds }],
      },
      viewportId: 'viewport-1',
      element,
      imageSliceData: { imageIndex: 3, numberOfSlices: 52 },
      setImageSliceData,
      scrollbarHeight: '100px',
      servicesManager,
    } as never)
  );
}

describe('the image scrollbar', () => {
  it('follows the slice index of NEW_IMAGE', () => {
    const element = document.createElement('div');
    const setImageSliceData = jest.fn();
    renderScrollbar(element, setImageSliceData);
    setImageSliceData.mockClear();

    act(() => {
      element.dispatchEvent(
        new CustomEvent(Enums.Events.NEW_IMAGE, {
          detail: { sliceIndex: 12, numberOfSlices: 52, displaySetId: 'ct', imageId: 'image-12' },
        })
      );
    });

    expect(setImageSliceData).toHaveBeenCalledTimes(1);
    expect(setImageSliceData).toHaveBeenCalledWith({ imageIndex: 12, numberOfSlices: 52 });
  });
});
