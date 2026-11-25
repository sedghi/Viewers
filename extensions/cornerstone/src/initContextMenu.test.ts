import { eventTarget, EVENTS } from '@cornerstonejs/core';
import initContextMenu from './initContextMenu';
import { getEnabledElement, reset } from './state';

describe('initContextMenu', () => {
  beforeAll(() => {
    initContextMenu({
      cornerstoneViewportService: { getViewportInfo: () => ({}) },
      customizationService: { getCustomization: () => ({}) },
      commandsManager: { run: jest.fn() },
    });
  });

  afterEach(() => {
    reset();
  });

  /** What Cornerstone3D fires when a viewport takes or leaves an element. */
  function fire(type: string, viewportId: string, element: HTMLElement) {
    eventTarget.dispatchEvent(new CustomEvent(type, { detail: { element, viewportId } }));
  }

  it('keeps the element of an enabled viewport by its id', () => {
    const element = document.createElement('div');

    fire(EVENTS.ELEMENT_ENABLED, 'default', element);

    expect(getEnabledElement('default')?.element).toBe(element);
  });

  it('forgets the element of a viewport that Cornerstone3D disabled, so that the element can be collected', () => {
    const element = document.createElement('div');
    fire(EVENTS.ELEMENT_ENABLED, 'default', element);

    fire(EVENTS.ELEMENT_DISABLED, 'default', element);

    expect(getEnabledElement('default')).toBeUndefined();
  });

  it('keeps the new element of a viewport id when the old element is disabled after it', () => {
    const oldElement = document.createElement('div');
    const newElement = document.createElement('div');
    fire(EVENTS.ELEMENT_ENABLED, 'mpr-axial', oldElement);

    fire(EVENTS.ELEMENT_ENABLED, 'mpr-axial', newElement);
    fire(EVENTS.ELEMENT_DISABLED, 'mpr-axial', oldElement);

    expect(getEnabledElement('mpr-axial')?.element).toBe(newElement);
  });
});
