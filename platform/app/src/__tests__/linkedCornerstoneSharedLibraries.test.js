/**
 * @jest-environment node
 */
/*
 * A Cornerstone3D checkout linked into node_modules (`cs3d:link`) keeps its own
 * node_modules. Without an alias, the bundler takes the dependencies of the
 * linked packages from there, so the viewer ships and evaluates a second copy of
 * each library that OHIF imports too: dcmjs alone is about 700 kB of the
 * production bundle before the first picture of the TMTV study, and 16 ms of
 * module evaluation in the dev build. An installed Cornerstone3D resolves these
 * libraries to OHIF's copy; the build must do the same for a linked one.
 */
import fs from 'fs';
import path from 'path';
import { CachedInputFileSystem, ResolverFactory } from 'enhanced-resolve';
import { alias, getModules } from '../../../../.rspack/resolveConfig';

const REPO_ROOT = path.resolve(__dirname, '../../../..');

const resolver = ResolverFactory.createResolver({
  fileSystem: new CachedInputFileSystem(fs, 4000),
  useSyncFileSystemCalls: true,
  alias,
  modules: getModules(),
  mainFields: ['module', 'browser', 'main'],
  conditionNames: ['import', 'module', 'browser', 'default'],
  extensions: ['.js', '.mjs', '.json'],
  symlinks: true,
});

/**
 * The real directory of the ESM build of an installed or linked
 * Cornerstone3D package, from which the bundler resolves its imports.
 */
function cornerstonePackageDir(name) {
  return fs.realpathSync(
    path.join(REPO_ROOT, 'node_modules', '@cornerstonejs', name, 'dist', 'esm')
  );
}

/**
 * The real path of the file that the bundler takes for a request from a
 * directory, with OHIF's resolve settings.
 */
function resolveFile(fromDir, request) {
  const resolved = resolver.resolveSync({}, fromDir, request);
  if (!resolved) {
    throw new Error(`${request} does not resolve from ${fromDir}`);
  }
  return fs.realpathSync(resolved);
}

describe('libraries that OHIF and Cornerstone3D both import', () => {
  test.each([
    ['dcmjs', 'adapters'],
    ['dicom-parser', 'dicom-image-loader'],
    ['gl-matrix', 'core'],
    ['comlink', 'core'],
    ['d3-array', 'tools'],
    ['d3-interpolate', 'tools'],
    ['lodash.get', 'tools'],
    ['@kitware/vtk.js/Rendering/Core/Actor', 'core'],
  ])(
    '%s resolves to one file from OHIF and from @cornerstonejs/%s',
    (request, cornerstonePackage) => {
      const fromOhif = resolveFile(
        path.join(REPO_ROOT, 'extensions', 'cornerstone', 'src'),
        request
      );
      const fromCornerstone = resolveFile(cornerstonePackageDir(cornerstonePackage), request);

      expect(fromCornerstone).toBe(fromOhif);
    }
  );
});
