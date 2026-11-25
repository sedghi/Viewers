import React from 'react';
import { act, render } from '@testing-library/react';
import { Enums } from '@cornerstonejs/core';
import CinePlayer from './CinePlayer';

const mockCineService = {
  setCine: jest.fn(),
  setIsCineEnabled: jest.fn(),
  playClip: jest.fn(),
  stopClip: jest.fn(),
  setViewportCineClosed: jest.fn(),
};
const mockCines = { 'viewport-1': { isPlaying: true, frameRate: 10 } };

jest.mock('@ohif/ui-next', () => ({
  useCine: () => [{ isCineEnabled: true, cines: mockCines }, mockCineService],
}));

jest.mock('@state', () => ({ useAppConfig: () => [{}] }), { virtual: true });

function renderCinePlayer(element: HTMLDivElement) {
  const servicesManager = {
    services: {
      customizationService: { getCustomization: () => () => null },
      displaySetService: {
        getDisplaySetByUID: () => ({ displaySetInstanceUID: 'ct' }),
      },
      viewportGridService: {
        getState: () => ({
          viewports: new Map([['viewport-1', { displaySetInstanceUIDs: ['ct'] }]]),
        }),
      },
    },
  };

  return render(
    React.createElement(CinePlayer, {
      enabledVPElement: element,
      viewportId: 'viewport-1',
      servicesManager,
    } as never)
  );
}

function fireDisplaySetsChanged(element: HTMLDivElement, sourceChanged: boolean) {
  act(() => {
    element.dispatchEvent(
      new CustomEvent(Enums.Events.DISPLAY_SETS_CHANGED, {
        detail: {
          viewportId: 'viewport-1',
          displaySets: [
            { displaySetId: 'ct', role: 'source' },
            { displaySetId: 'labelmap', role: 'overlay' },
          ],
          sourceDisplaySetId: 'ct',
          added: sourceChanged ? ['ct'] : ['labelmap'],
          removed: [],
          sourceChanged,
        },
      })
    );
  });
}

describe('the cine player and the display sets of its viewport', () => {
  beforeEach(() => {
    Object.values(mockCineService).forEach(fn => fn.mockClear());
  });

  it('listens once to DISPLAY_SETS_CHANGED and lets go of the same listener', () => {
    const element = document.createElement('div');
    const add = jest.spyOn(element, 'addEventListener');
    const remove = jest.spyOn(element, 'removeEventListener');

    const { unmount } = renderCinePlayer(element);
    const added = add.mock.calls.filter(([name]) => name === Enums.Events.DISPLAY_SETS_CHANGED);

    expect(added).toHaveLength(1);

    unmount();
    const removed = remove.mock.calls.filter(
      ([name]) => name === Enums.Events.DISPLAY_SETS_CHANGED
    );

    expect(removed).toHaveLength(1);
    expect(removed[0][1]).toBe(added[0][1]);
  });

  it('leaves the cine alone when a labelmap is added', () => {
    const element = document.createElement('div');
    renderCinePlayer(element);
    mockCineService.setCine.mockClear();

    fireDisplaySetsChanged(element, false);

    expect(mockCineService.setCine).not.toHaveBeenCalled();
  });

  it('does not stop a cine that another listener of the same event started', () => {
    const element = document.createElement('div');
    renderCinePlayer(element);
    mockCineService.setCine.mockClear();
    mockCines['viewport-1'].isPlaying = false;

    fireDisplaySetsChanged(element, true);
    mockCines['viewport-1'].isPlaying = true;

    expect(mockCineService.setCine).toHaveBeenCalledTimes(1);
    expect(mockCineService.setCine.mock.calls[0][0].isPlaying).toBeUndefined();
  });

  it('takes the frame rate of the series again when the source changes, and keeps playing', () => {
    const element = document.createElement('div');
    renderCinePlayer(element);
    mockCineService.setCine.mockClear();

    fireDisplaySetsChanged(element, true);

    expect(mockCineService.setCine).toHaveBeenCalledTimes(1);
    expect(mockCineService.setCine).toHaveBeenCalledWith({
      id: 'viewport-1',
      isPlaying: true,
      frameRate: 24,
    });
  });
});
