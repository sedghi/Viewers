/*
 * A frame request to a DICOMweb server on another origin needs a CORS preflight
 * (an OPTIONS round trip) when one of its headers is not CORS-safelisted, and a
 * preflight cannot be cached across frames because every frame has its own URL.
 * The quoted Accept header (`type="application/octet-stream"`) is not safelisted
 * (`"` is a CORS-unsafe byte), so a quoted remote source pays two round trips per
 * frame: on the TMTV study from the CloudFront server that is about 3 s of a 5 s load.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import generateAcceptHeader from '../../../core/src/utils/generateAcceptHeader';

const CORS_UNSAFE_BYTE = /[\x00-\x08\x0A-\x1F"():<>?@[\\\]{}\x7F]/;

/**
 * Evaluates a config file of public/config the way the page does and returns
 * the config it sets on its window.
 */
function loadAppConfig(name) {
  const sandbox = { window: { location: { search: '' }, config: undefined } };
  const source = fs.readFileSync(path.join(__dirname, '../../public/config', name), 'utf8');
  vm.runInNewContext(source, sandbox);
  return sandbox.window.config;
}

/**
 * The data sources of a config whose WADO root is on another origin.
 */
function remoteDicomWebSources(config) {
  return config.dataSources.filter(
    ({ namespace, configuration }) =>
      namespace.endsWith('dicomweb') && /^https:\/\//.test(configuration?.wadoRoot ?? '')
  );
}

describe('frame requests to a remote DICOMweb server', () => {
  test.each(['e2e.js', 'default.js'])(
    'every remote source of %s sends a CORS-safelisted Accept header',
    name => {
      const sources = remoteDicomWebSources(loadAppConfig(name));
      expect(sources.length).toBeGreaterThan(0);
      for (const { sourceName, configuration } of sources) {
        const [accept] = generateAcceptHeader(
          configuration.acceptHeader,
          configuration.requestTransferSyntaxUID,
          configuration.omitQuotationForMultipartRequest
        );
        expect({ sourceName, unsafe: CORS_UNSAFE_BYTE.test(accept) }).toEqual({
          sourceName,
          unsafe: false,
        });
        expect(accept.length).toBeLessThanOrEqual(128);
      }
    }
  );

  test('e2e.js loads with the request pool limits of the deployed viewer', () => {
    const deployed = loadAppConfig('default.js').maxNumRequests;
    const e2e = loadAppConfig('e2e.js').maxNumRequests;
    expect(deployed.prefetch).toBeGreaterThan(5);
    expect(e2e).toEqual(deployed);
  });
});
