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
- **State:** fixed in `fbdd648d97` (package U1). Check: `pnpm run build` passes (it
  failed on these two names before).

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
- **State:** the OHIF part is fixed in package U1 (`fbdd648d97`). Checks:
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
- **State:** fixed in `fbdd648d97` (package U1). Check:
  `npx jest extensions/cornerstone/src/utils/getCornerstoneViewportType.test.ts` passes
  (its tests of the legacy mapping failed before).

## M5. The runtime plugins pin the cornerstone major to 5

- **Seen:** `runtimeShared.test.js` fails: expected `@cornerstonejs/core@5`, received
  `@cornerstonejs/core@6`.
- **Why:** OHIF checks that the packages it shares with runtime plugins are on the major
  the plugins were built against. A plugin built against cornerstone 5 does not work on
  6: this is a real break for plugin authors, not only a test.
- **Fix, in OHIF:** done in package U2. `platform/create-ohif/host-shared-majors.json`
  says 6 for `@cornerstonejs/core` and `@cornerstonejs/tools`: it is the one list that
  the test and `create-ohif migrate` read. The four lines of
  `platform/create-ohif/tests/migrate.test.mjs` that name the host's major say 6. The
  docs that name it say 6 (`configurationFiles.md`, `cli-era-extensions.md`,
  `runtime-plugins.md`), and the migration guide of 3.14 has a page for it
  (`migration-guide/3p13-to-3p14/cornerstone3d-6.md`): a runtime plugin that imports
  `@cornerstonejs/core` or `@cornerstonejs/tools` must be rebuilt against
  Cornerstone3D 6.
- **Note:** with the linked cornerstone checkout the test now fails, for the reason it
  passed before: the checkout's `package.json` says 5.19.4 (CI writes the version at
  release), so the test reads `@cornerstonejs/core@5`. It is the one failing jest test
  of this branch while `node_modules/@cornerstonejs` are links.
- **State:** fixed in package U2 (not committed yet). Check: the same test file, run
  on a copy of its folders with a `node_modules/@cornerstonejs/core/package.json` and
  `tools/package.json` that say `6.0.0-beta.1` (what the published beta says), passes
  7 of 7; with `5.18.3` there it fails with `Expected: "@cornerstonejs/core@6"`. The
  75 tests of `create-ohif` (`node --test`) pass.

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
- **State:** the 96 are gone (43 were left after package U1, 23 after package U2, none
  after package U3; not committed yet). The 23 were members of a viewport class read
  from a `Types.IViewport`: the sites type the viewport with its class
  (`PlanarViewport`, `VolumeViewport3D`), and the adapter and the backend give
  `Types.IViewport` its view state and presentation types. Two of them were real
  defects that the missing type hid: M18 (the overlay) and M27 (the orientation
  command). One old error of `hydrateStructuredReport.ts` has another text (its
  `volumeId` is a `string` now, M21), so the comparison lists it as new: it is the
  error `... is not assignable to type 'AnnotationMetadata'` of `master`. The other
  new kinds are the jest globals of the new test files (M13). Whether CI keeps the
  comparison is still the owner's call.
- **The packages the codemod does not cover:** the built `@cornerstonejs/adapters` of
  the linked checkout differs from 5.18.3 in `version.js` only (`diff -r` of
  `dist/esm`), so the SR, SEG and RTSTRUCT code of OHIF calls the same adapters.

## M7. Only 1 of 101 Playwright specs runs on the next viewports

- **Seen:** `grep useNextViewports tests` finds one spec.
- **Why:** the next path is opt-in on 5.x. On 6.0 it is the only path, so 100 specs run
  on a path they never ran on.
- **Fix, in OHIF:** step 1 measures the next path on 5.18.3 first, so that a difference
  on 6.0 can be told from a difference of the path; step 9 runs all of them on 6.0.
- **State:** step 1 is done, its numbers are in M14; step 9 is open.

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
- **State:** fixed in `fbdd648d97` (package U1). Check for the first three:
  `CornerstoneViewportService.test.ts` (7 of its tests fail with the old comparisons:
  shown by putting them back for one run). The other sites have no unit test: step 9
  (Playwright) is their check: the 13 tests that threw from `jumpToImage` pass (M14).
  These are differences from the next path of 5.x, so the table of step 1 shows them as
  changes.

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
- **State:** the OHIF part is fixed in package U1 (`fbdd648d97`). Check: the type
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
- **State:** the OHIF part is fixed in package U1 (`fbdd648d97`). Check: no new
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
- **State:** open, the owner's call. The test is renamed "adds a labelmap that is asked
  for on a 3D viewport as a labelmap" and holds what the one path does now
  (`fbdd648d97`).

## M12. The initial image of a hanging protocol is not applied to a volume viewport

- **Seen:** read in the code. `NextViewportBackend.mountVolumes` mounts the volumes and
  restores the presentations, and does not read `initialImageOptions`. Only an
  overlay-only mount (no base volume) goes on to `jumpToSlice`. The legacy path jumped
  after every volume mount without a position presentation.
- **Why:** not ported to the next backend.
- **Fix, in OHIF:** done in package U2. After the backend has mounted the volumes,
  `CornerstoneViewportService.setVolumesForViewport` jumps to the initial image when
  there is no position presentation (`_jumpToInitialImage`, which the overlay-only
  mount uses too), as the legacy path did after every volume mount.
  `_getInitialImageIndexForViewport` gives the index for a volume again (M8). The
  hanging protocols `mpr`, `fourUp`, `main3D`, `primary3D`, `primaryAxial`,
  `mprAnd3DVolumeViewport`, those of TMTV and of the dynamic volume extension ask for
  `preset: 'middle'` on their volume viewports.
- **This was the cause of the MPR picture of M14.** Without the jump a volume opened on
  the slice that cornerstone picks, which is not the middle slice of OHIF's formula.
  `MPR.spec.ts`, `mpr2.spec.ts` and `AxialPrimary.spec.ts` failed before the change
  (pictures differ by 0.07, 0.10 and 0.21) and pass after it, run alone before and
  after.
- **State:** fixed in package U2 (not committed yet). Check:
  `CornerstoneViewportService.test.ts`, "a volume mount jumps to the initial image of
  the preset" and "of the index" (both failed first), with "a volume mount with a
  position presentation keeps its position"; and the three Playwright specs above.

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
- **State:** fixed for the comparison (packages U1 and U2 used it); the cornerstone
  question is open.

## M14. 52 Playwright tests fail on the next path of 5.18.3, and 37 on 6.0

- **Seen:** the 101 specs (247 tests) on this Mac, 6 workers, about 9 minutes a run.
  - `master` with 5.18.3, legacy path: 243 pass, 4 skipped, twice in a row. One baseline
    of CI differs on this Mac (`SEGHydrationFromMPR`, `mprAfterSEG.png`).
  - `master` with 5.18.3, next path on (`genericViewports: { enabled: true }` in
    `config/e2e.js`): 191 pass, 52 fail: 24 pictures differ, 14 time out, 13 throw
    "Unsupported viewport type" from the `jumpToImage` command, 1 value differs.
  - This branch on 6.0 after package U1: 206 pass, 37 fail: 27 pictures differ, 9 time
    out, 1 value differs. 16 of the 52 pass now (all 13 of `jumpToImage`, the three of
    `Crosshairs`, `MultiframeRendering`, `TMTVCSVReport`), 36 fail in both, and 1 is new
    (`LabelMapSegmentationColorChange`).
  - This branch on 6.0 after package U2: 215 pass, 28 fail: 18 pictures differ, 9 time
    out, 1 value differs. 9 of the 37 pass now, none is new, 28 fail in both runs.
    - 5 pass with the initial image of a volume viewport (M12): `MPR`, `mpr2`,
      `AxialPrimary`, `RTDataOverlayNoHydrationThenMPR`, `RTHydrationThenMPR`.
    - 4 pass with the zoom of the 3D test helper (M18): `3DOnly`, `3DMain`,
      `3DFourUp`, `3DPrimary`.
    - 5 of the 28 get further than before: their first picture (the MPR or the 3D
      grid) is right now, and they stop on a later picture that the run after U1 never
      reached. So their numbers are not the numbers of the same picture:
      `MPRThenRTOverlayNoHydration` (the picture after the RTSTRUCT overlay),
      `MPRThenSEGOverlayNoHydration` (after the SEG overlay), `SEGHydrationFromMPR`
      (after the SEG), `SEGHydrationFrom3DFourUp` "should properly hydrate" (after the
      SEG), `SegAcrossViewportTypes` "keeps a changed segment color" (the stack after
      the colour change).
  - This branch on 6.0 after package U3: 228 pass, 15 fail: 11 pictures differ, 3 time
    out, 1 value differs. 13 of the 28 pass now, none is new, 15 fail in both runs.
    - 2 pass with the centring on a measurement (M20): `SRHydration`,
      `ScoordRectangle`.
    - 3 pass with the volume id of the SR reference (M21): `Scoord3dProbe` and both
      tests of `SRHydrationArrowNavigation`.
    - 7 pass because a stack with an RTSTRUCT or a SEG over it stays a stack (M22):
      the two of `ContourCombineOperations`, the two of `ContourSmoothOperation`,
      `LabelMapSegmentationColorChange`, `SEGNoHydrationThenMPR` and
      `SegAcrossViewportTypes` "keeps the selected segment selected". The last three
      fail again with the old rule (run once).
    - 1 passes with the window of each image of a stack (M25): `ZoomIn`.
    - 2 wait for cornerstone: `RTContourViewportLayoutChange` (M23) and
      `ManuallyDrawnSegmentation` "should jump to and highlight the bidirectional"
      (M24).
    - `SEGDataOverlayNoHydrationThenMPR` gets further (0.91, now 0.14 on a later
      picture). The other 12 are not sorted yet.
    - The run was made three times. In the first the dev server had been started by
      hand without `TEST_ENV=true`, which the series order of the study browser needs:
      `DataOverlayMenu.spec.ts` failed on that order, also with the changes of the
      package taken out. In the second `ContourSegmentColorChange` "changes the
      contour color when the user saves the edits" failed once (it reads the stroke
      of the contour once, right after the dialog closes); it passes alone, three
      times of three, and in the other two runs.
    - No baseline picture was updated.
- **Why:** the next path was never the path of the test suite (M7). The 13 throws and
  some timeouts were OHIF's tests of the legacy viewport type (M8). The rest is not
  sorted yet. Three pictures read so far show three causes: a 3D volume is drawn about
  twice as large (`3DOnly`: the zoom of the test helper, M18, fixed), an MPR opens on
  another axial slice (`MPR`: the initial image, M12, fixed), and the image sits
  elsewhere after a jump to a hydrated measurement (`SRHydration`: open). One more,
  read in package U2: after an RTSTRUCT overlay is added in the MPR, the contours show
  as lines in the sagittal viewport and not in the axial one, where the baseline has
  them (`MPRThenRTOverlayNoHydration`: open).
- **Fix:** steps 5 and 6 first (calls of members that 6.0 does not have can stop a
  test), then each group of step 9: a picture change that the cornerstone guide names
  gets a new baseline with the guide line; anything else is a defect, fixed in OHIF or
  in cornerstone with a test.
- **State:** open. The 28 of the run after package U2, with the run after package U3
  (the 9 that passed with U2 are named above):

| Spec | Test | On 6.0 after U3 | On 6.0 after U2 | On 6.0 after U1 | On the next path of 5.18.3 |
|---|---|---|---|---|---|
| `ContourCombineOperations.spec.ts` | merge Big Sphere with Small Sphere (nested, no edge crossing) produces the Big Sphere shape | passes (M22) | timeout | timeout | timeout |
| `ContourCombineOperations.spec.ts` | subtract Big Sphere minus Small Sphere (nested, no edge crossing) produces Big Sphere with a hole | passes (M22) | picture differs (0.04) | picture differs (0.04) | picture differs (0.04) |
| `ContourSmoothOperation.spec.ts` | remove points leaves an already decimated contour unchanged | passes (M22) | timeout | timeout | timeout |
| `ContourSmoothOperation.spec.ts` | remove points reduces the active segment contour points | passes (M22) | timeout | timeout | timeout |
| `DataOverlayMenuFrameOfReference.spec.ts` | should only sync segmentations to viewports with same Frame of Reference | timeout | timeout | timeout | timeout |
| `LabelMapSegmentationColorChange.spec.ts` | does not change the labelmap segment color when the user cancels | passes (M22) | picture differs (0.22) | picture differs (0.22) | passed |
| `MPRThenRTOverlayNoHydration.spec.ts` | should launch MPR with unhydrated RTSTRUCT chosen from the data overlay menu | picture differs (0.56) | picture differs (0.56) | picture differs (0.03) | picture differs (0.03) |
| `MPRThenSEGOverlayNoHydration.spec.ts` | should launch MPR with unhydrated SEG chosen from the data overlay menu | picture differs (0.14) | picture differs (0.14) | picture differs (0.03) | picture differs (0.07) |
| `ManuallyDrawnSegmentation.spec.ts` | should jump to and highlight the bidirectional of a segment that is not selected | timeout (M24) | timeout | timeout | throws: Unsupported viewport type |
| `RTContourViewportLayoutChange.spec.ts` | should keep RT contours correctly positioned after maximizing and restoring the viewport | value differs (M23) | value differs | value differs | value differs |
| `RTHydrationFromMPR.spec.ts` | should hydrate an RTSTRUCT from MPR | picture differs (0.03) | picture differs (0.03) | picture differs (0.03) | picture differs (0.03) |
| `SEGDataOverlayForUnreferencedDisplaySetNoHydration.spec.ts` | should overlay an unhydrated SEG over a display set that the SEG does NOT reference | picture differs (0.04) | picture differs (0.04) | picture differs (0.04) | picture differs (0.05) |
| `SEGDataOverlayNoHydrationThenMPR.spec.ts` | should launch MPR with unhydrated SEG chosen from the data overlay menu | picture differs (0.14) | picture differs (0.91) | picture differs (0.91) | picture differs (0.91) |
| `SEGHydrationFrom3DFourUp.spec.ts` | should hydrate SEG only in the target viewport and preserve other viewport orientations | picture differs (0.12) | picture differs (0.12) | picture differs (0.16) | picture differs (0.21) |
| `SEGHydrationFrom3DFourUp.spec.ts` | should properly hydrate SEG from 3D four up layout | picture differs (0.10) | picture differs (0.10) | picture differs (0.29) | picture differs (0.30) |
| `SEGHydrationFromMPR.spec.ts` | should properly display MPR for MR | picture differs (0.14) | picture differs (0.14) | picture differs (0.03) | picture differs (0.07) |
| `SEGHydrationThenMPR.spec.ts` | should properly display MPR for MR | picture differs (0.27) | picture differs (0.27) | picture differs (0.27) | picture differs (0.10) |
| `SEGNoHydrationThenMPR.spec.ts` | should launch MPR with unhydrated SEG | passes (M22) | picture differs (0.08) | picture differs (0.08) | picture differs (0.08) |
| `SRHydration.spec.ts` | should hydrate SR reports correctly | passes (M20) | picture differs (0.77) | picture differs (0.77) | picture differs (0.77) |
| `SRHydrationArrowNavigation.spec.ts` | should keep arrows visible and functional after clicking measurement in right panel | passes (M21) | timeout | timeout | timeout |
| `SRHydrationArrowNavigation.spec.ts` | should navigate SR measurements with next/prev arrows after hydration for 3D SR | passes (M21) | timeout | timeout | timeout |
| `Scoord3dProbe.spec.ts` | should hydrate SCOORD3D probe measurements correctly | passes (M21) | picture differs (0.57) | picture differs (0.57) | picture differs (0.57) |
| `ScoordRectangle.spec.ts` | should hydrate SCOORD rectangle measurements correctly | passes (M20) | picture differs (0.70) | picture differs (0.70) | picture differs (0.70) |
| `SegAcrossViewportTypes.spec.ts` | keeps a changed segment color after switching to MPR | picture differs (0.26) | picture differs (0.22) | picture differs (0.26) | picture differs (0.04) |
| `SegAcrossViewportTypes.spec.ts` | keeps every segment when switching from 3D to MPR | picture differs (0.26) | picture differs (0.26) | picture differs (0.26) | timeout |
| `SegAcrossViewportTypes.spec.ts` | keeps the labelmap drawn from a stack through MPR and back to one viewport | timeout | timeout | timeout | timeout |
| `SegAcrossViewportTypes.spec.ts` | keeps the selected segment selected across viewport types | passes (M22) | timeout | timeout | timeout |
| `ZoomIn.spec.ts` | should render the magnified region with the same horizontal flip as the source viewport | passes (M25) | picture differs (0.94) | picture differs (0.94) | throws: Unsupported viewport type |

## M15. An optional call of a legacy member fails without a sign

- **Seen:** read in the code while the last manual and review sites were done (package
  U2). OHIF calls many viewport members as `viewport?.member?.()` or tests
  `if (!viewport?.member)`. When 6.0 has no such member the call gives `undefined` and
  the code goes on with it:
  - `initCineService.ts`: `if (!viewport?.getAllVolumeIds) return null` returned for
    every viewport, so `getSyncedViewports` gave no viewport and the cine of a dynamic
    (4D) volume played in its own viewport only;
  - `viewport?.getBlendMode?.() === 1` (3 sites) was never true, so the labelmap of a
    MIP viewport was not added with `LABELMAP_EDGE_PROJECTION_BLEND`;
  - `viewport?.getCamera?.()?.viewPlaneNormal` (the progress scrollbar, 2 sites) was
    always undefined, so the scrollbar worked its mode out again on every pan, zoom
    and scroll;
  - `getTargetImageIdIndex?.() ?? getSliceIndex()` (the page object of the Playwright
    tests) always took the second call.
- **Why:** the optional call was written for "a viewport of another class". On 5.x
  with the legacy path the member was there. Neither the build nor a test says that it
  is gone. The codemod reports each of these names (manual or review), which is how
  they were found.
- **Fix, in OHIF:** each site asks the adapter or the 6.0 member:
  `getViewportAdapter(viewport).getVolumeIds()` (the ids of the actors that
  `viewport.hasVolumeId(id)` takes), `getBlendMode()` (new in the adapter: the
  `blendMode` of the presentation of the source), `getViewPlaneNormal()`, and
  `viewport.getCurrentImageIdIndex()`.
- **Fix, in cornerstone:** the guide could say it under "What can go wrong" of step 2:
  an optional call of a removed member (`viewport.getAllVolumeIds?.()`) compiles in
  JavaScript, and in TypeScript on an untyped viewport, and gives `undefined` for every
  viewport. To do.
- **State:** the OHIF part is fixed in package U2 (not committed yet). Checks:
  `initCineService.test.ts` (new; 2 of its 4 tests fail with the old guard),
  `IViewportAdapter.contract.test.ts` ("getVolumeIds keeps the ids that the viewport
  takes as volume ids", "getBlendMode reads the blend mode of the presentation"). The
  cine of a 4D volume and the labelmap on a MIP were not seen on a screen: no Playwright
  spec opens the preclinical 4D mode, and the TMTV specs pass as before. Step 10. The
  cornerstone part is open.

## M16. After the codemod, three places do the same thing twice

- **Seen:** read in the review sites (package U2):
  - `init.tsx` added `imageLoadFailedHandler` to `IMAGE_LOAD_FAILED` twice: one line
    was `IMAGE_LOAD_ERROR` before the rewrite;
  - `init.tsx` called `setRenderBackend('cpu')` or `setRenderBackend('auto')` (the
    rewrite of `setUseCPURendering(true)` and `(false)`) and then
    `setRenderBackend(renderBackend)` for the same setting;
  - `UNSUPPORTED_WINDOW_LEVEL_VIEWPORT_TYPES` was `[ViewportType.ECG, ViewportType.ECG]`:
    the second was `ECG_NEXT`.
- **Why:** each rewrite is right for its line. An application that ran both paths on
  5.x had one line for each, and the two lines are one after the rewrite. It is the
  case of M9 again.
- **Fix, in OHIF:** one line each. `IMAGE_LOAD_FAILED` is enough for the handler: the
  image loader fires it for every failed load (a stack image, a frame of a volume, a
  prefetch), and the handler reads only `detail.error`. `setRenderBackend(renderBackend)`
  takes `cpu`, `gpu`, `auto` and a registered backend, after `init()`.
- **Fix, in cornerstone:** the codemod could report a rewrite that makes a line equal
  to its neighbour, or an array with the same member twice (with M9). To do.
- **State:** the OHIF part is fixed in package U2 (not committed yet). Check: jest in
  full and `pnpm run build`; `WindowLevelTool.test.ts` for the list. The cornerstone
  part is open.

## M17. The Window Level panel had no rows on the one path

- **Seen:** read in the code (package U2, the `setProperties` site and three review
  sites of `ViewportWindowLevel.tsx`). The panel (the left panel of the preclinical 4D
  mode) draws one histogram with a window for each volume of the active viewport.
  `getWindowLevelsData` asked the adapter for the volume ids, and the adapter's
  `getVolumeIds()` gave `[]` with a "to do" note, so the panel said "No window level
  data available". Its two handlers called `viewport.setProperties`, which 6.0 does not
  have.
- **Why:** not ported to the next path.
- **Fix, in OHIF:** `getVolumeIds()` of the adapter gives the ids of the actors that
  `viewport.hasVolumeId(id)` takes (not image ids, labelmap images or surfaces). The
  panel reads the window of the source from its presentation, or
  `getDefaultVOIRange()` when none was set, and the opacity of a volume from the
  colormap of its presentation. A change of the window is `setPresentation`, a change
  of the opacity is `setLayerOpacity`, both addressed by the binding that shows the
  volume (`getDataIdForVolumeId`, new in the adapter). The three helpers that read the
  opacity from the transfer function of the actor are gone: the next presentation
  update would write the look of the actor again.
- **State:** fixed in the code in package U2 (not committed yet), **not seen on a
  screen**: no Playwright spec opens the preclinical 4D mode and the test data has no
  4D study. Check so far: `IViewportAdapter.contract.test.ts` (the volume ids and the
  binding of a volume), the build and the type comparison (no `setProperties` is left).
  Step 10 opens the mode by hand.

## M18. The 3D pictures of the Playwright tests were twice as large

- **Seen:** the four 3D specs of M14 (`3DOnly`, `3DMain`, `3DFourUp`, `3DPrimary`)
  showed the volume about twice as large as the baseline.
- **Why:** the test helper `tests/utils/reduce3DviewportSize.ts` calls
  `viewport.setZoom(0.5)` on the 3D viewport, and a 3D viewport of 6.0 has no
  `setZoom` (step 5 of the guide). The call threw `setZoom is not a function`, and
  `attemptAction` of the tests caught it: its loop ends one attempt before the one that
  would throw, so it never fails. The codemod does not report `setZoom`, because a
  planar viewport has it. The type check does:
  `Property 'setZoom' does not exist on type 'IViewport'`.
- **Fix, in OHIF:** the helper sets the zoom through `viewportProjection`
  (`withPresentation(viewport, { zoom: 0.5 })`, then `setViewState`), as the guide says
  for a 3D viewport.
- **`attemptAction`** (package U3): its loop ended one attempt before the one that
  throws, so a failed action never failed a test. It runs all its attempts now and
  throws after the last one, with the error of the action as its cause. Five specs use
  it, all for the 3D zoom helper, and all five pass with it: it hid no other failure.
- **The overlay** (package U3): `CustomizableViewportOverlay.tsx` called
  `viewport.getZoom()` in its listener of `CAMERA_MODIFIED` for every viewport, and
  threw there on a 3D viewport when the parallel scale changed. It asks
  `getViewportZoom`, which gives undefined for a viewport without `getZoom`, and the
  listener leaves the scale then. **This guard goes when cornerstone has the
  members:** the 3D viewport of cornerstone will get `getZoom`, `setZoom`, `getPan` and
  `setPan` (the owner's decision: every other next viewport has them and the legacy 3D
  viewport had them).
- **Fix, in cornerstone:** the codemod could report `getZoom`, `setZoom`, `getPan` and
  `setPan` for review ("a 3D viewport has none of them, a whole slide viewport has no
  pan"). To do.
- **State:** the helper is fixed in package U2, `attemptAction` and the overlay in
  package U3 (not committed yet). Check: the four specs pass (run alone, and in the
  full run). The guard of the overlay and the cornerstone part are open.

## M19. The error text of the slice loading indicator never showed, on 5.x too

- **Seen:** read in `ViewportImageSliceLoadingIndicator.tsx` (a review site of
  `IMAGE_LOAD_ERROR`). The component listens for the load error on the element and
  shows "Error Loading Image" when the failed image is the one in `imageIdToBeLoaded`.
- **Why:** 5.x fired `IMAGE_LOAD_ERROR` on the `eventTarget`, never on an element, and
  nothing ever sets `imageIdToBeLoaded`. So the branch did not run on `master`. After
  the codemod it listens to `IMAGE_LOAD_FAILED` on the element, which no code fires
  there either.
- **Fix, in OHIF:** none here. The upgrade keeps what the user saw (no error text). To
  make it work: listen on the `eventTarget`, compare `detail.imageId` with
  `viewport.getCurrentImageId()` (a failed prefetch fires the event too), and clear
  the error on the next image: today an error would stay for good. The owner's call.
- **What changed in the file:** "Loading..." was started by `STACK_VIEWPORT_SCROLL`.
  It starts on `CAMERA_MODIFIED` now, only for a stack and only when the index asked
  for is not the index of the image on display, so a pan or a zoom starts nothing.
  `NEW_IMAGE` ends it, as before.
- **State:** decided for now (left as on 5.x). The scroll part is fixed in package U2;
  it has no unit test, and the Playwright tests do not wait for the text.

## M20. A jump to a measurement did not bring it into view

- **Seen:** `SRHydration.spec.ts` and `ScoordRectangle.spec.ts` (pictures differ by
  0.77 and 0.70): after a click on a measurement the slice is right and the measurement
  sits near an edge, where the baseline has it in the centre.
- **Why:** the legacy path moved the focal point of the camera to the centre of a
  measurement that was not in view, and zoomed out for one larger than the view
  (`centerOnMeasurement`). The next path returned false with a note "no in-plane pan
  yet". `setViewReference` goes to the slice and keeps the pan.
- **Fix, in OHIF:** `centerOnMeasurement` of the viewport operations pans the centre of
  the measurement to the centre of the canvas and zooms out by the old rule, in one
  view state change through `viewportProjection` (the pan of a presentation is in
  canvas pixels at zoom 1, so the distance on the canvas is divided by the zoom). It
  does nothing on a 3D viewport.
- **Fix, in cornerstone:** the row of `setCamera()` in `3-api-map.md` says that a move
  to a place is a view reference. It should also say that a view reference moves the
  slice only, and give the recipe for "bring this world point to the centre of the
  canvas", which `setCamera({ focalPoint })` did: `worldToCanvas(point)`, then a `pan`
  that is larger by the distance to the centre of the canvas divided by the zoom. To do.
- **State:** the OHIF part is fixed in package U3 (not committed yet). Check:
  `NextViewportOperations.test.ts` (new; 2 of its 5 centring tests fail without the
  change) and the two Playwright specs. The cornerstone part is open.

## M21. The view reference of a hydrated SCOORD3D measurement named a display set as its volume

- **Seen:** `Scoord3dProbe.spec.ts` (picture differs by 0.57: the viewport is on the
  middle slice, with no probe) and both tests of `SRHydrationArrowNavigation.spec.ts`
  (timeout: no annotation shows after the jump).
- **Why:** `hydrateStructuredReport` wrote `volumeId: displaySetInstanceUID` in the
  metadata of a measurement without an image. The volume of a display set has the id
  `<volume loader scheme>:<displaySetInstanceUID>`. The legacy volume viewport did not
  read `volumeId` in `isReferenceViewable`, so the wrong value did no harm. A planar
  viewport of 6.0 reads it: `isReferenceViewable(metadata, { withNavigation: true })`
  was false for the viewport that shows the volume, so the jump took the path "mount
  the display set again", and the stored position was refused there too.
  `findViewportConvertibleToVolume` built a reference with the same wrong id.
- **Fix, in OHIF:** both places give the volume id (the loader scheme of the display
  set, or the default one). `DisplaySet` has `volumeLoaderSchema` in its type.
- **Fix, in cornerstone:** the guide says "Volume: by volume, normal and focal point"
  in the row of `isReferenceViewable()`. It should say that this is new: the legacy
  volume viewport compared the frame of reference, the plane and the image, never
  `volumeId`, so a reference with a `volumeId` that is no volume of the viewport was
  viewable in 5.x and is not in 6.0. The case, on a planar viewport that shows the
  volume `scheme:A` of a display set `A`:
  `viewport.isReferenceViewable({ FrameOfReferenceUID, volumeId: 'A', cameraFocalPoint, planeRestriction: { FrameOfReferenceUID, point } }, { withNavigation: true })`
  is true on 5.18.3 (a legacy volume viewport) and false on 6.0, where it is true
  with `volumeId: 'scheme:A'`. Measured in the viewer, with the metadata of the
  SCOORD3D probe of the test. To do.
- **State:** the OHIF part is fixed in package U3 (not committed yet). Checks:
  `hydrateStructuredReport.test.ts` (new; both tests fail with the old line),
  `CornerstoneViewportService.test.ts` ("a viewport that could show a measurement as a
  volume", 2 tests, both failed first), and the three Playwright tests, which fail
  again when the line of `hydrateStructuredReport` is put back (run once). The
  cornerstone part is open.

## M22. A stack with an RTSTRUCT or a SEG over it was mounted as a volume

- **Seen:** `ContourCombineOperations.spec.ts` (merge: 35 contour paths where one is
  expected; subtract: no hole) and both "remove points" tests of
  `ContourSmoothOperation.spec.ts` (35 paths).
- **Why:** `CornerstoneCacheService.createViewportData` makes a stack a volume when the
  viewport has two or more display sets that are all reconstructable (a fusion). Its
  comment said that SEG and RTSTRUCT are not reconstructable. They are: their SOP class
  handlers copy `isReconstructable` from the display set they reference. So the
  RTSTRUCT preview (`[CT, RTSTRUCT]`, type `stack`) was mounted as a volume, which
  registered the data id of the CT with a volume id. The registry of data ids keeps a
  volume registration ("first writer wins"), so the stack mount of the hydration that
  followed was drawn as a volume slice too: OHIF said `stack` and
  `viewport.getCurrentMode()` said `volume`. In volume mode the tools show a contour
  by its place in space, in stack mode by its image. The contour operations of the
  tools write their result on the plane of the slice on display and keep the image of
  each source contour, which is right for a stack only. On the legacy path the
  viewport was a stack.
- **Fix, in OHIF:** the fusion rule counts the display sets that are not overlays
  (`isOverlayDisplaySet`).
- **Left as it is:** the registry still keeps a volume registration of a data id for a
  later stack mount of the same display set (a stack opened after its MPR, in another
  viewport, is drawn as a volume slice). Not seen in a failing test. Step 11.
- **Also explained by it:** `LabelMapSegmentationColorChange.spec.ts` ("does not
  change the labelmap segment color when the user cancels"),
  `SEGNoHydrationThenMPR.spec.ts` and `SegAcrossViewportTypes.spec.ts` ("keeps the
  selected segment selected across viewport types") pass with the change and fail
  again with the old rule (run once). They show a SEG over a stack.
- **State:** fixed in package U3 (not committed yet). Check:
  `CornerstoneCacheService.test.ts` ("a stack with a reconstructable RTSTRUCT over it
  stays a stack", and the same for SEG; both failed first) and the seven Playwright
  tests.

## M23. `worldToCanvas` of a planar viewport is stale after a resize that meets a scheduled frame

- **Seen:** `RTContourViewportLayoutChange.spec.ts`: after a viewport is maximized and
  restored, the contour is drawn with the coordinates of the maximized canvas (twice
  as large, most of it outside the viewport). The image itself is right.
- **Why:** a planar viewport keeps the CSS size of its canvas
  (`cachedCanvasDimensions`) and drops it in `viewport.resize()`.
  `renderingEngine.resize()` returns before it calls `viewport.resize()` when a frame
  is scheduled already (`_resizeVTKViewports`: `if (this._animationFrameSet) return`),
  and the next call finds the canvas at its new size and does nothing. So the viewport
  keeps the old size for `worldToCanvas` and `canvasToWorld` until another resize. The
  legacy viewports read the size of the canvas on each call. OHIF resizes while the
  viewports of the new layout mount and render, so it meets a scheduled frame.
- **Smallest case:** one planar viewport, its element at half its size, then
  `renderingEngine.render(); renderingEngine.resize(false); renderingEngine.render();`
  and four frames later `viewport.worldToCanvas(<the world point of the centre>)`. On
  5.18.3 (legacy stack viewport): `[239, 166]` in a canvas of 478 by 331. On 6.0:
  `[478, 331]`, the centre of the old canvas. With `resize(false)` alone both give
  `[239, 166]`.
- **Fix, in cornerstone:** to do (drop the cached size also when the resize is put
  off, or when the engine copies a frame of another size to the canvas).
- **Fix, in OHIF:** none (rule 3).
- **State:** open, waits for cornerstone. The test fails.

## M24. An annotation hydrated for points on another slice references the image on display

- **Seen:** `ManuallyDrawnSegmentation.spec.ts`, "should jump to and highlight the
  bidirectional of a segment that is not selected": the bidirectional of Segment 1 is
  computed while slice 41 is on display, and the jump to it stays on slice 41 where
  slice 11 is expected.
- **Why:** `AnnotationTool.hydrateBase` of the tools takes
  `viewport.getViewReference({ points: [points[0]] })?.referencedImageId`. The option
  `points` sets the plane restriction of the reference; the image is the image on
  display. On 5.x the same function took the image closest to the point for a legacy
  stack viewport (`getClosestStackImageIndexForPoint`) and for a legacy volume
  viewport.
- **Smallest case:** a stack on image 40, `p` on the plane of image 10:
  `LengthTool.hydrate(viewportId, [p, q])`. The `referencedImageId` of the annotation
  is image 10 on 5.18.3 and image 40 on 6.0;
  `utilities.getClosestStackImageIndexForPoint(p, viewport)` gives 10 on both.
- **Fix, in cornerstone:** to do.
- **Fix, in OHIF:** none (rule 3). OHIF could pass `referencedImageId` to `hydrate`,
  which would hide it for this one tool.
- **State:** open, waits for cornerstone. The test fails.

## M25. Every image of a stack was shown with the window of its first image

- **Seen:** `ZoomIn.spec.ts` (picture differs by 0.94): on slice 62 of an MR series the
  brain is white, in the viewport and in the loupe, and the overlay says W: 95 L: 35.
- **Why:** `NextViewportBackend.mountStack` set a window from the metadata of the
  first image when the hanging protocol gave none, with the note that a next viewport
  does not take the window of the metadata. In 6.0 it does: a stack without a window
  in its presentation shows each image with the window of its own metadata, as the
  legacy stack viewport did. The window that OHIF set held for every image. Each image
  of this series has its own window (95/35 for the first, 737/343 for image 62).
- **Fix, in OHIF:** the seed is gone. A stack mount sets a window only when the
  hanging protocol or a stored presentation gives one.
- **State:** fixed in package U3 (not committed yet). Check:
  `NextViewportBackend.test.ts` (new; "sets no window when none is given" failed
  first) and `ZoomIn.spec.ts`. What is left is M26.

## M26. No `VOI_MODIFIED` when a stack scrolls to an image with another window

- **Seen:** with M25 fixed the picture is right and the overlay of the viewport still
  says W: 95 L: 35 on slice 62, where the baseline of the legacy path says W: 737
  L: 343.
- **Why:** OHIF reads the window for its overlay at the mount and on `VOI_MODIFIED`.
  The legacy stack viewport fired `VOI_MODIFIED` when a new image came with another
  window. A planar viewport of 6.0 draws the new window and fires nothing. The guide
  says that in stack mode `VOI_MODIFIED` fires only for a change; here the window of
  the picture changes.
- **Smallest case:** a stack whose images have their own windows, no window set,
  a listener of `VOI_MODIFIED` on the element, `viewport.setImageIdIndex(61)`. On
  5.18.3: one event with `range: { lower: -25.5, upper: 710.5 }`. On 6.0: no event,
  `getDisplaySetPresentation(id).voiRange` is undefined and
  `getDefaultVOIRange(id)` gives `{ lower: -25.5, upper: 710.5 }`.
- **Fix, in cornerstone:** to do (fire the event, or name in the guide what an
  application listens to instead).
- **Fix, in OHIF:** none (rule 3). The pictures of a viewport hide the texts of the
  overlays, and no page picture of the Playwright suite is taken after such a scroll,
  so no test shows it.
- **State:** open, waits for cornerstone.

## M27. The orientation command threw on a 3D viewport

- **Seen:** one of the type errors of M6: `setOrientation` does not exist on
  `IViewport`. In the viewer, with the "3D only" layout:
  `commandsManager.runCommand('setViewportOrientation', { viewportId, orientation: 'sagittal' })`
  threw `viewport.setOrientation is not a function`. The orientation menu of a viewport
  runs this command, and it is offered on a 3D viewport.
- **Why:** a 3D viewport of 6.0 has no `setOrientation` (the row of the 3D viewport in
  `3-api-map.md`). The legacy 3D viewport had it.
- **Fix, in OHIF:** `setOrientation` of the viewport operations: a planar viewport
  takes the orientation as before; a 3D viewport turns its camera to the vectors of
  axial, sagittal or coronal (`CONSTANTS.MPR_CAMERA_VALUES`) with `setViewState` and
  fits with `resetViewState`, as the guide says. For `acquisition` and `reformat` it
  warns and leaves the camera.
- **Fix, in cornerstone:** the row gives the call for two vectors. It should say what
  an axis name, the acquisition plane and a reformat name become on a 3D viewport,
  which the legacy `setOrientation` took. To do.
- **State:** the OHIF part is fixed in package U3 (not committed yet). Check:
  `NextViewportOperations.test.ts` ("setOrientation", 5 tests, all failed first), and
  the command in the viewer: the view plane normal goes from `[0, -1, 0]` to
  `[1, 0, 0]`. No Playwright spec opens the orientation menu on a 3D viewport. The
  cornerstone part is open.

## M28. A labelmap on a stack sets the window text of the viewport to W: 2 L: 0

- **Seen:** in segmentation mode, one brush stroke on a stack: the overlay goes from
  W: 95 L: 35 to W: 2 L: 0, and the image keeps its window. The same after a SEG is
  added to a stack from the data overlay menu (the third picture of
  `DataOverlayMenu.spec.ts`: within the tolerance of the test, so it passes).
- **Why:** the tools mount a labelmap on a stack as a display set of the viewport, and
  the viewport fires `VOI_MODIFIED` on the element for it, with
  `range: { lower: 0, upper: -1 }`. The keys of the detail are `viewportId`, `range`,
  `volumeId`, `VOILUTFunction`, `invert` and `colormap`: nothing names the display
  set, and a display set drawn as images has no `volumeId`. OHIF's
  `useViewportRendering` takes the range of each `VOI_MODIFIED` of the element as the
  window of the viewport. On the legacy stack viewport a labelmap fired no
  `VOI_MODIFIED`.
- **Smallest case:** a stack, a listener of `VOI_MODIFIED` on the element, one brush
  stroke of a new labelmap. 5.18.3 (legacy stack viewport): no event, and the overlay
  stays W: 95 L: 35. 6.0: two events with `{ lower: 0, upper: -1 }`, and the overlay
  says W: 2 L: 0.
- **Fix, in cornerstone:** to do (no `VOI_MODIFIED` for a labelmap layer, or the id of
  the display set in the detail, so that a listener can keep the events of its own
  display set).
- **Fix, in OHIF:** none (rule 3). When the detail names the display set, the hook
  compares it with the display set it shows.
- **Note:** with M22 a SEG that is added to a stack from the data overlay menu stays
  on a stack, so this shows there too; before M22 that viewport became a volume.
- **State:** open, waits for cornerstone.
