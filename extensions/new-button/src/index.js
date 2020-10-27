import toolbarModule from './toolbarModule';
import commandsModule from './commandsModule';
import queryString from 'query-string';

export default {
  id: 'new-button-extension',

  preRegistration({
    servicesManager = {},
    commandsManager = {},
    appConfig = {},
    configuration = {},
  }) {},

  getToolbarModule() {
    const { enabled } = queryString.parse(location.search);
    return enabled == 'true' ? toolbarModule : undefined;
  },
  getCommandsModule({ servicesManager }) {
    return commandsModule({ servicesManager });
  },
};
