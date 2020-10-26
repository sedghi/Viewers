import cornerstone from 'cornerstone-core';
import OHIF from '@ohif/core';
import queryString from 'query-string';
const { urlUtil: UrlUtil } = OHIF.utils;

const commandsModule = ({ servicesManager, commandsManager }) => {
  const { UINotificationService } = servicesManager.services;

  const actions = {
    exampleAction: ({ viewports }) => {
      const { enabled } = queryString.parse(location.search);

      if (enabled) {
        const enabledElements = cornerstone.getEnabledElements();
        const enabledElement = enabledElements[0].element;
        if (enabledElement) {
          let viewport = cornerstone.getViewport(enabledElement);
          viewport.hflip = !viewport.hflip;
          cornerstone.setViewport(enabledElement, viewport);
        }

        // notification send
        UINotificationService.show({
          title: 'Hint',
          message: 'This is a fake button',
        });
      }
    },
  };
  const definitions = {
    flipThis: {
      commandFn: actions.exampleAction,
      storeContexts: ['viewports'],
    },
  };

  return {
    actions,
    definitions,
    defaultContext: 'ACTIVE_VIEWPORT::CORNERSTONE',
  };
};

export default commandsModule;
