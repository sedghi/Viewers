const base = require('../../jest.config.base.js');

module.exports = {
  ...base,
  moduleNameMapper: {
    '^@cornerstonejs/tools/segmentation$':
      '<rootDir>/../../node_modules/@cornerstonejs/tools/dist/esm/stateManagement/segmentation',
    ...base.moduleNameMapper,
    '^@ohif/extension-default$':
      '<rootDir>/../cornerstone-dicom-seg/src/__mocks__/ohifExtensionStub.js',
    '^@ohif/([^/]+)/src/(.*)$': '<rootDir>/../../platform/$1/src/$2',
    '@ohif/(.*)': '<rootDir>/../../platform/$1/src',
  },
  // rootDir: "../.."
  // testMatch: [
  //   //`<rootDir>/platform/${pack.name}/**/*.spec.js`
  //   "<rootDir>/platform/app/**/*.test.js"
  // ]
};
