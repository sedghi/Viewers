# Upgrade to Cornerstone3D 6.0: what went wrong, and the fixes

A record of every problem met while OHIF moved from `@cornerstonejs` 5.18.3 to 6.0, in
the order found. Each entry says what was seen, why, the fix, and where the fix belongs:
in OHIF, in cornerstone (the library, its codemod or its migration guide), or both. The
plan is in `CORNERSTONE3D_6_UPGRADE_PLAN.md`.

An entry is closed only when its fix is in a commit and a check shows it (a test that
failed first, a build, or a run that is named).

| State | Meaning |
|---|---|
| fixed | the fix is committed; the commit and the check are named |
| open | seen and understood, not fixed yet; the step of the plan that fixes it is named |
| decided | left as it is on purpose, with the reason |

## M1. OHIF's jest could not load `@cornerstonejs/core` 6.0.0-beta.1

- **Seen:** 33 of the 153 jest suites did not run:
  `viewport3D.js: Expected values to be strictly equal: '??' !== '||'`, thrown from
  `@babel/plugin-transform-regenerator`.
- **Why:** OHIF's jest transforms `@cornerstonejs/core` with babel, and babel's
  regenerator plugin cannot transform an `await` inside a `??` expression. Core 6.0 had
  one: `staged?.data ?? (await this.dataProvider.load(...))` in the 3D viewport. 5.x had
  none.
- **Fix, in cornerstone:** the expression is a conditional; a test scans the sources of
  every package for an `await` inside a `??` (cornerstone3D `7eecbab52`, open issue 113
  there). It failed first.
- **Fix, in OHIF:** none. Until a beta has the fix, this branch links a cornerstone
  checkout that has it (`node_modules/@cornerstonejs` are links, not committed).
- **State:** fixed in cornerstone; not in a published beta yet (6.0.0-beta.1 has the
  defect).

## M2. The build fails on two functions that 6.0 removed

- **Seen:** `pnpm run build` stops with `ESModulesLinkingError`:
  `utilities.getImageSliceDataForVolumeViewport` (`commandsModule.ts`,
  `CornerstoneViewportService.ts`) and `utilities.viewportSupportsVolumeCompatibility`
  (`ViewportWindowLevel.tsx`) are not exports of `@cornerstonejs/core`.
- **Why:** both are legacy helpers. The codemod reported the three sites and did not
  rewrite them, because the replacement depends on what the caller does with the answer.
- **Fix, in OHIF:** step 4 of the plan, done in package U1. A slice count is
  `viewport.getNumberOfSlices()` (the `jumpToImage` command, and the initial image of
  a volume in `CornerstoneViewportService`); "the viewports that show a volume" is
  `utilities.viewportIsInVolumeMode(viewport)` (`ViewportWindowLevel.tsx`). See M10 for
  what the guide does not say about the first one.
- **State:** fixed in package U1 (not committed yet: the parent commits it). Check:
  `pnpm run build` passes (it failed on these two names before).

## M3. The codemod makes `getCornerstoneViewportType` return `PLANAR` for a stack and for a volume

- **Seen:** read in the diff of the codemod: `ViewportType.STACK` and
  `ViewportType.ORTHOGRAPHIC` both became `ViewportType.PLANAR` in the returns of
  `getCornerstoneViewportType`.
- **Why:** that is right for a viewport type. But OHIF also calls this function to get
  its own "stack or volume" marker (`dataShapeType` in `CornerstoneCacheService`) and
  stores it. The marker is lost. The codemod cannot know that an application uses the
  enum as its own data.
- **Fix, in OHIF:** step 3 of the plan, done in package U1. OHIF has its own type for
  the shape of the data, `ViewportShape` (`stack`, `volume`, `volume3d`, `other`, in
  `utils/viewportDataShape.ts`). `getCornerstoneViewportType(word)` gives the 6.0 type,
  `getDataShapeForViewportType(word)` gives the shape, `viewportData.dataShapeType`
  stores it, `ViewportInfo.getDataShape()` and `getViewportDataShape(viewportData)` read
  it, and a live viewport is asked through `getViewportAdapter(viewport).getShape()`.
  No `ViewportType.STACK` or `ORTHOGRAPHIC` is left.
- **Fix, in cornerstone:** the migration guide should name this case: an application
  that stores `ViewportType.STACK` or `ORTHOGRAPHIC` as a marker of its data needs its
  own values. To do.
- **State:** the OHIF part is fixed in package U1 (not committed yet). Checks:
  `getCornerstoneViewportType.test.ts`, `viewportDataShape.test.ts` and
  `CornerstoneCacheService.test.ts` (each word of a hanging protocol gives its 6.0 type,
  its shape and its mount); `git grep -E "ViewportType\.(STACK|ORTHOGRAPHIC)"` finds
  nothing. The cornerstone part is open.

## M4. 16 jest tests pin the legacy type mapping

- **Seen:** `getCornerstoneViewportType.test.ts` fails 16 tests ("should return STACK
  when viewportType is stack" and the like).
- **Why:** they test the mapping to legacy types, which 6.0 does not have.
- **Fix, in OHIF:** steps 2, 3 and 8: the tests are rewritten for the 6.0 types and the
  shape, done in package U1. Each old case has its 6.0 form (the type test, and the
  same case for the shape), except "leaves the legacy mapping unchanged when the flag
  is off", which tested the legacy mapping and is gone.
- **State:** fixed in package U1 (not committed yet). Check:
  `npx jest extensions/cornerstone/src/utils/getCornerstoneViewportType.test.ts` passes
  (its tests of the legacy mapping failed before).

## M5. The runtime plugins pin the cornerstone major to 5

- **Seen:** `runtimeShared.test.js` fails: expected `@cornerstonejs/core@5`, received
  `@cornerstonejs/core@6`.
- **Why:** OHIF checks that the packages it shares with runtime plugins are on the major
  the plugins were built against. A plugin built against cornerstone 5 does not work on
  6: this is a real break for plugin authors, not only a test.
- **Fix, in OHIF:** step 8: the major moves to 6, and OHIF's own migration notes say
  that runtime plugins must be rebuilt against cornerstone 6.
- **Note:** with the linked cornerstone checkout this test passes for the wrong reason:
  the checkout's `package.json` still says 5.19.4 (CI writes the version at release). It
  fails on the published beta.
- **State:** open.

## M6. No type check tells OHIF about a removed name

- **Seen:** OHIF's build does not check types, and `tsc` already reports 8,452 errors
  on 5.18.3, so a removed name such as `ViewportType.STACK` is only `undefined` at run
  time. After the codemod and the bump, 96 new kinds of error appear among them.
- **Why:** OHIF is not type-clean, so the type check is not a gate.
- **Fix, in OHIF:** the upgrade compares the set of type errors with the set on
  `master` (line numbers removed), and is done when no new error is left in a file that
  imports a cornerstone package (step 7). Whether CI keeps such a comparison is the
  owner's call.
- **Note:** with the linked cornerstone checkout the comparison needs one more step,
  see M13.
- **State:** open (96 new kinds at the start; 43 of them are left after package U1).

## M7. Only 1 of 101 Playwright specs runs on the next viewports

- **Seen:** `grep useNextViewports tests` finds one spec.
- **Why:** the next path is opt-in on 5.x. On 6.0 it is the only path, so 100 specs run
  on a path they never ran on.
- **Fix, in OHIF:** step 1 measures the next path on 5.18.3 first, so that a difference
  on 6.0 can be told from a difference of the path; step 9 runs all of them on 6.0.
- **State:** open (step 1 is running).

## M8. On the next path, OHIF's tests of the legacy viewport type were always false

- **Seen:** read in the code while the legacy path was deleted (package U1). OHIF asked
  "is this a stack, is this a volume" with the legacy type: `isStackViewportType`,
  `isOrthographicViewportType`, `isVolumeViewportType`, and
  `viewportInfo.getViewportType() === ViewportType.STACK` or `ORTHOGRAPHIC`. On the next
  path the type of a viewport is `planar` for both, so each of these was false, and the
  code behind it did not run:
  - the initial image of a hanging protocol (`initialImageOptions`: an index or a
    preset) was not applied to a stack;
  - a resize was never queued, however many viewports the grid has (the limits are 12
    stack viewports and 6 volume viewports);
  - `setViewportData` did not stop on a stack without images;
  - the command `jumpToImage` threw `Unsupported viewport type` for every viewport;
  - a volume viewport on a reformatted plane counted as "tracked"
    (`useMeasurementTracking`);
  - adding or removing a layer on a live volume viewport did not see the volume
    (`layerConfigurationUtils.ts` tested `viewport.type === 'orthographic'`): removing a
    layer always gave a stack viewport;
  - `ImageOverlayViewerTool` and `ViewportInfo.contains` did not see a volume.
- **Why:** the next path was built beside the legacy one, and these sites were not
  moved to it. Only 1 of the 101 Playwright specs ran on the next path (M7), so nothing
  showed it.
- **Fix, in OHIF:** each site asks the shape now: `viewportInfo.getDataShape()` or
  `getViewportDataShape(viewportData)` for the data, and
  `getViewportAdapter(viewport).getShape()`, `utilities.getViewportContentMode(viewport)`
  or `utilities.viewportIsInVolumeMode(viewport)` for a live viewport. The legacy
  predicates (`utils/getLegacyViewportType.ts`) are deleted.
- **State:** fixed in package U1 (not committed yet). Check for the first three:
  `CornerstoneViewportService.test.ts` (7 of its tests fail with the old comparisons:
  shown by putting them back for one run). The other sites have no unit test: step 9
  (Playwright) is their check. These are differences from the next path of 5.x, so the
  table of step 1 may show them as changes.

## M9. After the codemod, a test for a legacy 3D viewport is true for every 3D viewport

- **Seen:** read in the code. The codemod rewrote `ViewportType.VOLUME_3D_NEXT` to
  `ViewportType.VOLUME_3D`, which left
  `legacyType === ViewportType.VOLUME_3D || legacyType === ViewportType.VOLUME_3D` in
  `getLegacyViewportType.ts`, and made `isVolumeViewportType` true for a 3D viewport.
  On 5.x it was false there (the type was `volume3dNext`), so `_getLutPresentation` of
  `CornerstoneViewportService` would have called `viewport.getProperties(volumeId)`,
  which 6.0 does not have, for every 3D viewport.
- **Why:** on 5.x `type === ViewportType.VOLUME_3D` meant "a legacy 3D viewport" in an
  application that ran both paths. In 6.0 both names have the value `volume3d`, so the
  same test means "any 3D viewport". The rewrite is right for the name and changes what
  such a test says.
- **Fix, in OHIF:** the legacy branch is deleted: `_getLutPresentation` always reads the
  presentation through the adapter.
- **Fix, in cornerstone:** the guide (the row of the `_NEXT` names in `3-api-map.md`)
  should say it: a 5.x test of a legacy type that was false for a next viewport can be
  true in 6.0, and a comparison with both names is one comparison after the rewrite. The
  codemod could report `x === A || x === A`. To do.
- **State:** the OHIF part is fixed in package U1 (not committed yet). Check: the type
  comparison no longer has `Property 'getProperties' does not exist on type
  'PlanarViewport'` in `CornerstoneViewportService.ts`. The cornerstone part is open.

## M10. The guide's replacement for the slice count does not type-check on `Types.IViewport`

- **Seen:** the replacement of `utilities.getImageSliceDataForVolumeViewport(viewport)`
  in `3-api-map.md` is `viewport.getNumberOfSlices()` and
  `viewport.getCurrentImageIdIndex()`. OHIF gets its viewports from
  `renderingEngine.getViewport(id)` and `getEnabledElement(element)`, typed
  `Types.IViewport`, and `tsc` says
  `Property 'getNumberOfSlices' does not exist on type 'IViewport<object, unknown>'`.
  The old function also gave `undefined` for a viewport without a volume; the row does
  not say what the new call gives there (it gives 0).
- **Why:** the two members are on the planar, video and whole slide classes, not on
  `Types.IViewport`. The doc comment of `IViewport` says to type the variable with the
  class; the row of the function does not.
- **Fix, in OHIF:** the sites type the viewport as `PlanarViewport`.
- **Fix, in cornerstone:** the row should say that the members are on `PlanarViewport`
  (`getViewport<PlanarViewport>(id)`), and that an empty viewport gives 0. To do.
- **State:** the OHIF part is fixed in package U1 (not committed yet). Check: no new
  type error for `getNumberOfSlices` in the files of the package. The cornerstone part
  is open.

## M11. A labelmap asked for on a 3D viewport is no longer made a surface

- **Seen:** the jest test "should add a segmentation representation to volume viewport
  without need for handling" failed when the legacy segmentation backend was deleted:
  `addSegmentationRepresentation(viewportId, { type: Labelmap })` on a 3D viewport added
  a labelmap, and the test expected a surface.
- **Why:** `LegacySegmentationBackend` turned a labelmap into a surface for a 3D
  viewport. `NextSegmentationBackend` passes the type on as it is, and cornerstone 6.0
  can draw a labelmap in a 3D viewport. This is what the next path did on 5.x too. The
  other places of OHIF still choose a surface for a 3D viewport before they call
  (`_setSegmentationPresentation`, the hydration synchronizer, the default when no type
  is given), so only a caller that names `Labelmap` itself sees the difference.
- **Fix, in OHIF:** not decided. Either keep it (a caller that asks for a labelmap gets
  one), or make `NextSegmentationBackend.classifyAndPrepareLabelmapAdd` give a surface
  for a 3D viewport as the legacy backend did. The owner's call.
- **State:** open. The test is renamed "adds a labelmap that is asked for on a 3D
  viewport as a labelmap" and holds what the one path does now.

## M12. The initial image of a hanging protocol is not applied to a volume viewport

- **Seen:** read in the code. `NextViewportBackend.mountVolumes` mounts the volumes and
  restores the presentations, and does not read `initialImageOptions`. Only an
  overlay-only mount (no base volume) goes on to `jumpToSlice`. The legacy path jumped
  after every volume mount without a position presentation.
- **Why:** not ported to the next backend.
- **Fix, in OHIF:** to do, with the camera and view work of step 5: after the mount,
  when there is no position presentation, jump to the initial image
  (`_getInitialImageIndexForViewport` gives it for a volume again, see M8).
  `extensions/cornerstone/src/hps/fourUp.ts` and the hanging protocols of the dynamic
  volume extension use `initialImageOptions` on volume viewports.
- **State:** open.

## M13. With the linked checkout, the type comparison counts paths as new errors

- **Seen:** at the end of package U1 the comparison of the rules (remove
  `(line,column)`, sort, list what is not in the baseline) gave 87 new kinds, where 60
  are real.
- **Why:** two effects of `node_modules/@cornerstonejs/*` being links. `tsc` reports
  errors inside the declaration files of the linked checkout itself (25 kinds, such as
  `Cannot find module 'packages/tools/dist/esm/types'`). And an error message that names
  a module holds its real path, which is now
  `/Users/.../cornerstone3D-ohif-link/packages/core/...` and was
  `.../node_modules/@cornerstonejs/core/...` in the baseline (2 kinds).
- **Fix, in OHIF:** none in the code. The comparison replaces both paths with one token
  and leaves out the lines of files under `../cornerstone3D-ohif-link/`. Every test file
  that is added also adds "Cannot find name 'jest'" and its kin as new kinds, as every
  test file of OHIF has them: they are counted apart (17 of the 60).
- **Fix, in cornerstone:** the 25 kinds say that the built declaration files import
  with paths that only resolve inside the cornerstone repository
  (`packages/tools/dist/esm/types`). Whether the published packages have them too was
  not checked. To do: check, and fix if so.
- **State:** fixed for the comparison (package U1 used it); the cornerstone question is
  open.
