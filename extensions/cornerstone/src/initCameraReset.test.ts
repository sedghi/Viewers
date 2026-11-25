import { eventTarget, EVENTS, getEnabledElement } from '@cornerstonejs/core';
import initCameraReset from './initCameraReset';

jest.mock('@cornerstonejs/core', () => {
  const actual = jest.requireActual('@cornerstonejs/core');
  return { ...actual, getEnabledElement: jest.fn() };
});

describe('initCameraReset', () => {
  const commandsManager = { runCommand: jest.fn() };

  beforeAll(() => {
    initCameraReset({ commandsManager } as never);
  });

  beforeEach(() => {
    commandsManager.runCommand.mockClear();
    jest.mocked(getEnabledElement).mockImplementation(() => ({ viewportId: 'mpr-axial' }) as never);
  });

  /** What Cornerstone3D fires when a viewport takes or leaves an element. */
  function fire(type: string, element: HTMLElement) {
    eventTarget.dispatchEvent(
      new CustomEvent(type, { detail: { element, viewportId: 'mpr-axial' } })
    );
  }

  function resetCamera(element: HTMLElement) {
    element.dispatchEvent(new CustomEvent(EVENTS.CAMERA_RESET, { detail: { element } }));
  }

  it('resets the crosshairs of the viewport once at a camera reset', () => {
    const element = document.createElement('div');
    fire(EVENTS.ELEMENT_ENABLED, element);

    resetCamera(element);

    expect(commandsManager.runCommand).toHaveBeenCalledTimes(1);
    expect(commandsManager.runCommand).toHaveBeenCalledWith('resetCrosshairs', {
      viewportId: 'mpr-axial',
    });
  });

  it('resets them once on an element that was disabled and enabled again, as a pane that changes between a stack and a volume', () => {
    const element = document.createElement('div');
    for (let round = 0; round < 4; round++) {
      fire(EVENTS.ELEMENT_ENABLED, element);
      fire(EVENTS.ELEMENT_DISABLED, element);
    }
    fire(EVENTS.ELEMENT_ENABLED, element);

    resetCamera(element);

    expect(commandsManager.runCommand).toHaveBeenCalledTimes(1);
  });

  it('leaves no listener on an element that Cornerstone3D disabled', () => {
    const element = document.createElement('div');
    fire(EVENTS.ELEMENT_ENABLED, element);
    fire(EVENTS.ELEMENT_DISABLED, element);

    resetCamera(element);

    expect(commandsManager.runCommand).not.toHaveBeenCalled();
  });
});
