/**
 * Stand-in for `@ohif/extension-cornerstone` under jest.
 *
 * Importing that package for real pulls in the cornerstone rendering stack,
 * which does not load under jsdom, and the catch-all `@ohif/(.*)` mapping
 * sends it to `platform/extension-cornerstone/src`, which does not exist. The
 * policies of the viewports (`OVERLAY_OPACITY`) are the real ones.
 */
module.exports = require('../../../cornerstone/src/utils/viewportPolicies');
