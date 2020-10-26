import toolbarModule from './toolbarModule';
import commandsModule from './commandsModule';

export default {
  id: 'new-button-extension',

  preRegistration({
    servicesManager = {},
    commandsManager = {},
    appConfig = {},
    configuration = {},
  }) {},

  getToolbarModule() {
    return toolbarModule;
  },
  getCommandsModule({ servicesManager }) {
    return commandsModule({ servicesManager });
  },
};
