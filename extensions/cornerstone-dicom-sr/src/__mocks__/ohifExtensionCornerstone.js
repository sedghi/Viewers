/**
 * Stand-in for `@ohif/extension-cornerstone` under jest.
 *
 * The SOP class handler reads the cornerstone tool source name and version from
 * the cornerstone extension, the SR hydration reads the scheme of its volume ids,
 * and importing that package for real pulls in the
 * cornerstone rendering stack, which does not load under jsdom. The catch-all
 * `@ohif/(.*)` mapping also sends it to `platform/extension-cornerstone/src`, which
 * does not exist.
 */
module.exports = {
  VOLUME_LOADER_SCHEME: 'cornerstoneStreamingImageVolume',
  Enums: {
    CORNERSTONE_3D_TOOLS_SOURCE_NAME: 'Cornerstone3DTools',
    CORNERSTONE_3D_TOOLS_SOURCE_VERSION: '0.1',
  },
};
