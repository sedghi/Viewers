import { eventTarget, EVENTS, getEnabledElement } from '@cornerstonejs/core';
import { CommandsManager } from '@ohif/core';

export type initCameraResetArgs = {
  commandsManager: CommandsManager;
};

/**
 * Resets the crosshairs of a viewport when its camera is reset. One listener is
 * added to each element that Cornerstone3D enables and removed when it disables
 * the element, as the context menu and the double click do. Cornerstone3D
 * disables and enables one element again when a pane changes between a stack
 * and a volume, so a listener made at each enable and never removed ran the
 * command once more after each change.
 */
function initCameraReset({ commandsManager }: initCameraResetArgs): void {
  const cameraResetHandler = (evt: CustomEvent) => {
    const { element } = evt.detail;
    const enabledElement = getEnabledElement(element);
    if (!enabledElement) {
      return;
    }
    const { viewportId } = enabledElement;
    commandsManager.runCommand('resetCrosshairs', { viewportId });
  };

  function elementEnabledHandler(evt: CustomEvent) {
    const { element } = evt.detail;

    element.addEventListener(EVENTS.CAMERA_RESET, cameraResetHandler);
  }

  function elementDisabledHandler(evt: CustomEvent) {
    const { element } = evt.detail;

    element.removeEventListener(EVENTS.CAMERA_RESET, cameraResetHandler);
  }

  eventTarget.addEventListener(EVENTS.ELEMENT_ENABLED, elementEnabledHandler.bind(null));

  eventTarget.addEventListener(EVENTS.ELEMENT_DISABLED, elementDisabledHandler.bind(null));
}

export default initCameraReset;
