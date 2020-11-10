import toolbarModule from './toolbarModule';
import csTools from 'cornerstone-tools';
import AlirezaCobbAngleTool from './AlirezaCobbAngleTool';

export default {
  id: 'cobb-angle',

  preRegistration({
    servicesManager = {},
    commandsManager = {},
    appConfig = {},
    configuration = {},
  }) {
    csTools.addTool(AlirezaCobbAngleTool, {});
    csTools.setToolActive('AlirezaCobbAngle', { mouseButtonMask: 1 });
  },

  getToolbarModule() {
    return toolbarModule;
  },
  getCommandsModule({ servicesManager }) {
    return null;
  },
};
