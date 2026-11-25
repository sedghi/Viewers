const state = {
  // The `defaultContext` of an extension's commandsModule
  DEFAULT_CONTEXT: 'CORNERSTONE',
  enabledElements: {},
};

/**
 * Sets the enabled element `dom` reference for an active viewport.
 * @param {HTMLElement} dom Active viewport element.
 * @return void
 */
const setEnabledElement = (viewportId: string, element: HTMLElement, context?: string): void => {
  const targetContext = context || state.DEFAULT_CONTEXT;

  state.enabledElements[viewportId] = {
    element,
    context: targetContext,
  };
};

/**
 * Grabs the enabled element `dom` reference of an active viewport.
 *
 * @return {HTMLElement} Active viewport element.
 */
const getEnabledElement = viewportId => {
  return state.enabledElements[viewportId];
};

/**
 * Forgets the element of a viewport that Cornerstone3D disabled, unless the
 * viewport id holds another element by now. An entry that stayed held the
 * destroyed element until a viewport of the same id was enabled again, so the
 * element of an id that does not come back was never collected.
 */
const removeEnabledElement = (viewportId: string, element: HTMLElement): void => {
  if (state.enabledElements[viewportId]?.element === element) {
    delete state.enabledElements[viewportId];
  }
};

const reset = () => {
  state.enabledElements = {};
};

export { setEnabledElement, getEnabledElement, removeEnabledElement, reset };
