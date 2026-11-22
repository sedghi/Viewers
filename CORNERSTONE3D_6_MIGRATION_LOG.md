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
- **Seen in the viewer (package U4):** no spec asks for a labelmap on a 3D viewport:
  in every 3D pane of the Playwright suite the representation is a surface on 5.18.3
  and on 6.0, because the callers choose it. Asked for by name, with a hydrated SEG on
  the "3D only" layout,
  `segmentationService.addSegmentationRepresentation(viewportId, { segmentationId, type: 'Labelmap' })`
  threw `viewport.getCurrentImageId is not a function` and drew nothing: the backend
  first calls `updateLabelmapSegmentationImageReferences` of the tools, which reads the
  image on display. The legacy backend gave a surface. Added through cornerstone alone
  (`segmentation.addSegmentationRepresentations`), the labelmap shows as flat coloured
  outlines over the volume, not as bodies in it
  (`laneU4/baselines/M11--surface-as-OHIF-adds-it--labelmap-through-cornerstone.png`).
- **Fix, in OHIF:** decided: a surface again.
  `NextSegmentationBackend.classifyAndPrepareLabelmapAdd` gives `Surface` for a 3D
  viewport before it asks the tools anything, as the legacy backend did.
- **Fix, in cornerstone:** `segmentation.state.updateLabelmapSegmentationImageReferences(viewportId, segmentationId)`
  with the id of a 3D viewport throws on 6.0. The legacy 3D viewport had
  `getCurrentImageId` (read in the code of 5.18.3, not run). To do: answer undefined
  for a viewport without image slices.
- **State:** the OHIF part is fixed in package U4 (not committed yet). Check:
  `SegmentationService.test.ts`, "adds a labelmap that is asked for on a 3D viewport as
  a surface" (the test of `master` again; it failed first), and in the viewer the call
  above returns and the viewport has a `Surface` representation. The cornerstone part is
  open.

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
  - This branch on 6.0 after package U4, on cornerstone `3098597aa`: 239 pass, 4 fail
    (4 pictures differ). 11 of the 15 pass now, none is new, 4 fail in both runs.
    - 2 pass with the stack that becomes a volume for a labelmap of another series
      (M29): `DataOverlayMenuFrameOfReference` and
      `SEGDataOverlayForUnreferencedDisplaySetNoHydration`.
    - 4 pass with the fix of M28 in cornerstone: `MPRThenSEGOverlayNoHydration`,
      `SEGDataOverlayNoHydrationThenMPR` and two of `SegAcrossViewportTypes` ("keeps a
      changed segment color after switching to MPR", "keeps every segment when
      switching from 3D to MPR"). The third, "keeps the labelmap drawn from a stack
      through MPR and back to one viewport", needed the page object of M34 too.
    - 2 pass with the fixes of M23 and M24 in cornerstone:
      `RTContourViewportLayoutChange` and `ManuallyDrawnSegmentation` "should jump to
      and highlight the bidirectional".
    - 2 pass with M28 and a new baseline for the fill of a labelmap (M36):
      `SEGHydrationFromMPR` and `SEGHydrationThenMPR`.
    - 4 wait for cornerstone: `RTHydrationFromMPR` and `SEGHydrationFrom3DFourUp`
      "should properly hydrate" (M30), `MPRThenRTOverlayNoHydration` (M31), and
      `SEGHydrationFrom3DFourUp` "should hydrate SEG only in the target viewport" (M32).
    - Two baseline pictures were updated (M36).
  - This branch on 6.0 after package U5, on cornerstone `62cf392da`: 239 pass, 4 fail
    (4 pictures differ, the same four with the same ratios), 4 skipped; none is new and
    none passes now. The run was made twice. In the first, `UndoRedoMeasurements.spec.ts`
    "should undo and redo a handle move" failed once: it reads the length at the first
    change of the text after the handle move (283 mm), the text then settled on 292 mm,
    and redo was compared with the first value. It passes alone, five times of
    five, and in the second full run. The spec is the one of `master`. No baseline
    picture was updated.
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
- **State:** open: 4 tests fail, and each waits for cornerstone. The 15 of the run
  after package U3, with the run after package U4:

| Spec | Test | On 6.0 after U4 | On 6.0 after U3 |
|---|---|---|---|
| `DataOverlayMenuFrameOfReference.spec.ts` | should only sync segmentations to viewports with same Frame of Reference | passes (M29) | timeout |
| `MPRThenRTOverlayNoHydration.spec.ts` | should launch MPR with unhydrated RTSTRUCT chosen from the data overlay menu | picture differs (0.03) (M31) | picture differs (0.56, of the wrong clip: M35) |
| `MPRThenSEGOverlayNoHydration.spec.ts` | should launch MPR with unhydrated SEG chosen from the data overlay menu | passes (M28) | picture differs (0.14) |
| `ManuallyDrawnSegmentation.spec.ts` | should jump to and highlight the bidirectional of a segment that is not selected | passes (M24) | timeout |
| `RTContourViewportLayoutChange.spec.ts` | should keep RT contours correctly positioned after maximizing and restoring the viewport | passes (M23) | value differs |
| `RTHydrationFromMPR.spec.ts` | should hydrate an RTSTRUCT from MPR | picture differs (0.03) (M30) | picture differs (0.03) |
| `SEGDataOverlayForUnreferencedDisplaySetNoHydration.spec.ts` | should overlay an unhydrated SEG over a display set that the SEG does NOT reference | passes (M29) | picture differs (0.04) |
| `SEGDataOverlayNoHydrationThenMPR.spec.ts` | should launch MPR with unhydrated SEG chosen from the data overlay menu | passes (M28) | picture differs (0.14) |
| `SEGHydrationFrom3DFourUp.spec.ts` | should hydrate SEG only in the target viewport and preserve other viewport orientations | picture differs (0.12) (M32) | picture differs (0.12) |
| `SEGHydrationFrom3DFourUp.spec.ts` | should properly hydrate SEG from 3D four up layout | picture differs (0.10) (M30) | picture differs (0.10) |
| `SEGHydrationFromMPR.spec.ts` | should properly display MPR for MR | passes (M28, and a new baseline: M36) | picture differs (0.14) |
| `SEGHydrationThenMPR.spec.ts` | should properly display MPR for MR | passes (M28, and a new baseline: M36) | picture differs (0.27) |
| `SegAcrossViewportTypes.spec.ts` | keeps a changed segment color after switching to MPR | passes (M28) | picture differs (0.26) |
| `SegAcrossViewportTypes.spec.ts` | keeps every segment when switching from 3D to MPR | passes (M28) | picture differs (0.26) |
| `SegAcrossViewportTypes.spec.ts` | keeps the labelmap drawn from a stack through MPR and back to one viewport | passes (M34, M28) | timeout |

  The 28 of the run after package U2, with the run after package U3 (the 9 that passed
  with U2 are named above):

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
- **Fix, in OHIF, first (package U2):** the helper set the zoom through
  `viewportProjection` (`withPresentation(viewport, { zoom: 0.5 })`, then
  `setViewState`), as the guide said for a 3D viewport then.
- **`attemptAction`** (package U3): its loop ended one attempt before the one that
  throws, so a failed action never failed a test. It runs all its attempts now and
  throws after the last one, with the error of the action as its cause. Five specs use
  it, all for the 3D zoom helper, and all five pass with it: it hid no other failure.
- **The overlay** (package U3): `CustomizableViewportOverlay.tsx` called
  `viewport.getZoom()` in its listener of `CAMERA_MODIFIED` for every viewport, and
  threw there on a 3D viewport when the parallel scale changed. It asks
  `getViewportZoom`, which gives undefined for a viewport without `getZoom`, and the
  listener leaves the scale then. This guard was to go when cornerstone had the
  members (the owner's decision: every other next viewport has them and the legacy 3D
  viewport had them).
- **Fix, in cornerstone:** the 3D viewport has `getZoom`, `setZoom`, `getPan` and
  `setPan` (cornerstone3D `62cf392da`, open issue 122 there; the rows of the four in
  `3-api-map.md`). They read and write through `viewportProjection`: zoom 1 is the fit
  for the direction of the camera now, and a viewport that shows nothing gives 1 and
  keeps its camera on `setZoom`, as the legacy one did. So the codemod need not report
  the four any more: every viewport of 6.0 has them, and a whole slide viewport has
  `getZoom` and `setZoom`, as in 5.x.
- **Fix, in OHIF, then (package U5):** each site is as on `master` again.
  - The overlay calls `viewport.getZoom()` for every viewport. `getViewportZoom` is
    gone.
  - The helper calls `viewport.setZoom(0.5)`. The one thing it has beyond `master` is
    the type of the viewport (`VolumeViewport3D`): `Types.IViewport` of 6.0 has no
    `setZoom`, and the type check said so (M10, the same for every member that is on
    the classes only). The overlay types the viewport as `PlanarViewport` or
    `VolumeViewport3D` for the same reason.
  - `scaleBy` of the viewport operations (the zoom in and zoom out commands) has no
    note any more that a 3D viewport lacks the members. It zooms any viewport that has
    them, so **these commands now zoom a 3D viewport**. On `master` they zoomed a stack
    only (the legacy operations asked `isStackViewportType`), and on the next path of
    5.x a stack and a volume slice. The fit command (`fitViewportToWindow`) is as
    before.
- **State:** fixed: the helper in package U2, `attemptAction` and the overlay in package
  U3, the overlay and the helper as on `master` in package U5 on cornerstone
  `62cf392da` (not committed yet). Checks: the four specs pass, three times each
  (`--repeat-each=3`), and the two of `SEGHydrationFrom3DFourUp` fail as before with
  the same ratios (0.10 and 0.12, M30 and M32). In the viewer, the four 3D layouts with
  the helper of U2 and with the helper of `master` give the same zoom (0.5) and the
  same parallel scale (221.82, 200, 220.92 and 333.08), and their pictures differ by as
  much as two pictures of the same helper do (the noise of the volume rendering: 4.7%,
  1.4%, 1.2% and 2.1% of the pixels by more than 16 either way). When the helper runs
  the 3D viewport shows its volume already, so the case of a viewport that shows
  nothing does not come up. The type comparison has no new error. The overlay of the
  stock 3D hanging protocols is hidden (`hideOverlays`), so no picture shows the zoom
  text of a 3D viewport; `viewport.getZoom()` of the 3D viewport, which the listener
  calls, gives 0.75 there after `setZoom(0.75)`.

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
- **Fix, in cornerstone:** the engine resizes the viewports whose size changed also
  when a frame is scheduled (cornerstone3D `3098597aa`, rows 116 to 120 of its open
  issues list).
- **Fix, in OHIF:** none (rule 3).
- **State:** fixed in cornerstone. Check: `RTContourViewportLayoutChange.spec.ts`
  passes on the linked checkout at `3098597aa` (the full run after package U4).

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
- **Fix, in cornerstone:** `AnnotationTool.hydrateBase` references the image closest
  to the points, as 5.x did (cornerstone3D `3098597aa`).
- **Fix, in OHIF:** none (rule 3).
- **State:** fixed in cornerstone. Check: `ManuallyDrawnSegmentation.spec.ts`, "should
  jump to and highlight the bidirectional of a segment that is not selected", passes on
  the linked checkout at `3098597aa` (the full run after package U4).

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
- **Fix, in cornerstone:** a stack without a window set fires `VOI_MODIFIED` when a
  scroll shows an image with another default window (cornerstone3D `3098597aa`).
- **Fix, in OHIF:** none (rule 3). The pictures of a viewport hide the texts of the
  overlays, and no page picture of the Playwright suite is taken after such a scroll,
  so no test of the suite shows it.
- **State:** fixed in cornerstone. Check: the smallest case again in the viewer on the
  linked checkout at `3098597aa` (`laneU4/voi-6-newbuild.log`): one event with
  `{ lower: -25.5, upper: 710.5 }`, and the overlay goes from W: 95 L: 35 to W: 737
  L: 343. Before: no event, and the overlay stayed.

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
- **The second effect, found in package U4: the image goes black or white in an MPR.**
  A planar viewport fired `VOI_MODIFIED` at the mount of every display set, the
  labelmap overlay too. `voiSyncCallback` of the tools writes an event without a
  `volumeId` to the default display set of each target. OHIF's MPR and its 3D four up
  link their panes with a VOI synchronizer, so one labelmap in one pane set the window
  of the image in the other panes to `{ lower: 0, upper: -1 }`. Measured after a SEG is
  added from the data overlay menu of the axial pane of an MR in MPR: on 5.18.3 no
  `VOI_MODIFIED` after the three of the mount, and the window stays
  `{ -29.5, 658.5 }`; on 6.0 one event `{ 0, -1 }` without a volume id from the axial
  pane, then `{ 0, -1 }` with the volume id of the MR from the two other panes, and
  `getDisplaySetPresentation(<MR>).voiRange` is `{ 0, -1 }` in all of them
  (`laneU4/all-base.log`, `laneU4/segmpr-alpha-6.log`).
- **Tests it explained:** `MPRThenSEGOverlayNoHydration`,
  `SEGDataOverlayNoHydrationThenMPR`, three of `SegAcrossViewportTypes` (one of them
  with M34), and the first failing picture of `SEGHydrationFromMPR` and
  `SEGHydrationThenMPR` (their last picture is M36). With the event stopped in the page
  before any listener, and nothing else changed, the first four passed.
- **Fix, in cornerstone:** a planar viewport fires no `VOI_MODIFIED` for a labelmap, for
  an overlay drawn as images, or for a range with its upper end below its lower end
  (cornerstone3D `3098597aa`).
- **Fix, in OHIF:** none (rule 3).
- **Note:** with M22 a SEG that is added to a stack from the data overlay menu stays
  on a stack, so this showed there too; before M22 that viewport became a volume.
- **State:** fixed in cornerstone. Check, on the linked checkout at `3098597aa`: the
  seven tests above pass in the full run after package U4 with no script in the page;
  one brush stroke on a stack fires no `VOI_MODIFIED` and the overlay stays W: 95
  L: 35; a SEG added in an MPR fires none after the three of the mount
  (`laneU4/voi-6-newbuild.log`).

## M29. A labelmap of another series of the frame of reference did not reach a stack

- **Seen:** `DataOverlayMenuFrameOfReference.spec.ts` ("should only sync segmentations to
  viewports with same Frame of Reference", timeout): a SEG of the CT is added to the CT
  viewport, and the PT viewport of the same frame of reference never lists it. The
  console says `Skipping Labelmap representation of segmentation ... the viewport is not
  a compatible destination for it`. `SEGDataOverlayForUnreferencedDisplaySetNoHydration`
  (picture differs by 0.04): two of the four viewports show no segmentation where the
  baseline has it.
- **Why:** cornerstone draws a labelmap over a stack only when the stack shows the
  images that the labelmap was made for; over a volume it draws any labelmap of the
  frame of reference (`isSegmentationOverlayCompatible` of the tools, the same rule in
  5.18.3). The legacy segmentation backend therefore turned such a stack into a volume
  viewport first (`attemptStackToVolumeConversion`). The next backend had no such step:
  its note said that a planar viewport draws every labelmap in place.
- **Fix, in OHIF:** `NextSegmentationBackend.classifyAndPrepareLabelmapAdd` reports
  `needsVolumeViewport` for a viewport in stack mode when the resolver of the tools
  cannot map the labelmap, the labelmap is of the frame of reference of the viewport,
  and the stack shows none of the images the labelmap was made for. The service then
  asks the viewport grid for the same display sets with `viewportType: 'volume'`
  (`_showViewportAsVolume`), waits for the mount (`VIEWPORT_DATA_CHANGED` with the
  viewport in volume mode), puts the slice, the pan and the zoom back, and adds the
  representation. A second request for the same viewport waits for the first mount. A
  stack that shows the images of the labelmap keeps its viewport also when the resolver
  cannot map yet, which the legacy backend did not tell apart.
- **Measured in the viewer:** the PT stack on image 0 of 83 becomes a volume on slice 0
  of 83 with the labelmap (without the position step it opened on slice 41). In the
  other spec the two stacks become volumes on slice 0 of 40 and 0 of 22 with the
  labelmap, on 6.0 as on the legacy path of 5.18.3.
- **For cornerstone:** `segmentation.getLabelmapImageIds(segmentationId)` gives an array
  and its declared return type is `string | undefined`. To do.
- **Not done:** a labelmap that is a volume (`volumeId` in its data) asked for on a
  stack. The legacy backend always made that viewport a volume. No test shows what 6.0
  does there.
- **State:** fixed in package U4 (not committed yet). Check:
  `SegmentationService.test.ts`, "a labelmap that the resolver cannot map onto a stack"
  (4 tests; "shows the stack as a volume ..." and "mounts the volume once ..." failed
  first), and the two Playwright tests.

## M30. A volume viewport takes a reference that names only an image

- **Seen:** `RTHydrationFromMPR.spec.ts` (picture differs by 0.03): after the RTSTRUCT
  series is dropped on the axial pane of an MPR, the pane is on slice 15 of 262, and the
  baseline has it on slice 130. `SEGHydrationFrom3DFourUp.spec.ts`, "should properly
  hydrate SEG from 3D four up layout" (0.10): the axial pane with the SEG is on slice 9
  of 79, the baseline on slice 39.
- **Why:** OHIF's RTSTRUCT and SEG viewports store a position presentation for the first
  slice that has a segment: `viewReference: { referencedImageId }`, nothing else. The
  viewport service applies it when `isReferenceViewable(viewRef, { withNavigation: true,
  withOrientation: true })` is true. The legacy volume viewport said false, so the pane
  stayed on the slice of the mount. A planar viewport of 6.0 in volume mode says true
  and goes to the image. A stack went there in both versions (the baselines of
  `RTHydration.spec.ts`).
- **Smallest case:** a viewport that shows a CT of 262 images as a volume, in its
  acquisition plane, on slice 131; `ref = { referencedImageId: imageIds[15] }`.

  | Call | 5.18.3 (legacy volume viewport) | 6.0 |
  |---|---|---|
  | `isReferenceViewable(ref)` | false | false |
  | `isReferenceViewable(ref, { withNavigation: true })` | false | true |
  | `setViewReference(ref)` | throws `Incompatible view refs: undefined!==<frame of reference>`, slice 131 | slice 15 |
  | `isReferenceViewable({ ...ref, FrameOfReferenceUID }, { withNavigation: true })` | true | true |

  Measured in the viewer of each checkout (`laneU4/refview-base.log`,
  `laneU4/probes-6-newbuild.log`; the 6.0 numbers are of cornerstone `3098597aa`).
- **The guide:** `2-rendering-changes.md`, "A volume goes where the legacy volume went
  for a part of a reference", says of a reference with another frame of reference or
  with none: "a planar viewport moves nothing and does not throw". It moves.
- **Fix, in cornerstone:** to do. Either the viewport leaves a reference without a
  frame of reference where it is, as the guide says (then both tests pass as they are),
  or the guide names the change (then the two baselines change: the pane opens on the
  first slice with a segment, which is what OHIF asks for and what a stack does).
- **Fix, in OHIF:** none (rule 3).
- **With the rule of 5.18.3 put back in the page** (a script that makes
  `isReferenceViewable` false for such a reference in volume mode, nothing else
  changed): `RTHydrationFromMPR` passes. `SEGHydrationFrom3DFourUp` "should properly
  hydrate" is on the slice of the baseline and stops on the same picture with 0.03:
  the fill of the labelmap in the axial pane, (195, 106, 106) in the baseline and
  (209, 81, 81) now, the change of M36. It will need its baseline then.
- **State:** open, waits for cornerstone. Both tests fail.

## M31. A contour set gets the plane of the pane that draws it first

- **Seen:** `MPRThenRTOverlayNoHydration.spec.ts`: an RTSTRUCT is added from the data
  overlay menu of the sagittal pane of an MPR. The baseline has the contours in the
  axial pane. On 6.0 the axial pane has none and the sagittal pane has 51 flat lines.
- **Why:** `addContourSetsToElement` of the tools (`contourHandler/
  handleContourSegmentation.ts`, the same lines in 5.18.3) makes the annotations of a
  contour set once, when the first viewport draws the representation, and gives each one
  `viewPlaneNormal: getViewportICamera(viewport).viewPlaneNormal`: the normal of that
  viewport, not of the points. The contours of an RTSTRUCT lie in axial planes. Which
  pane draws first is the difference: on 5.18.3 the axial pane, on 6.0 the sagittal one,
  the pane that the overlay was added to.
- **Measured in the viewer of each checkout** (`laneU4/rtorder-base.log`,
  `laneU4/probes-6-newbuild.log`), the same clicks:

  | | 5.18.3 | 6.0 |
  |---|---|---|
  | `SEGMENTATION_REPRESENTATION_MODIFIED`, in order | sagittal, axial, coronal | sagittal, axial, coronal |
  | viewports of the rendering engine, in order | axial, coronal, sagittal | axial, coronal, sagittal |
  | the first contour annotation is made for | `mpr-axial` | `mpr-sagittal` |
  | `viewPlaneNormal` of the 2,265 contour annotations | `[0, 0, -1]` | `[1, 0, 0]` |
  | contour paths drawn: axial, sagittal, coronal | 13, 0, 0 | 0, 51, 0 |

  On 6.0 the three panes say `viewportStatus: 'needsRender'` when the representation is
  added, the sagittal pane still at the next frame. `contourDisplay.render` takes its
  branch for a viewport whose plane does not match the contours only when
  `viewport.viewportStatus === RENDERED`; otherwise it goes on to
  `handleContourSegmentation` at once. The status on 5.18.3 at that moment was not
  measured.
- **Fix, in cornerstone:** to do: the plane of a contour comes from its points, not
  from the viewport that draws it first.
- **Fix, in OHIF:** none (rule 3).
- **State:** open, waits for cornerstone. The test fails.

## M32. A resize keeps the parallel scale of a 3D viewport, not its zoom

- **Seen:** `SEGHydrationFrom3DFourUp.spec.ts`, "should hydrate SEG only in the target
  viewport and preserve other viewport orientations" (picture differs by 0.12): after
  the layout goes from the 3D four up to a 3 by 2 grid, the 3D pane shows the volume
  larger than its cell, cut at both sides. The baseline shows all of it.
- **Why:** the cell of the 3D pane goes from 478 by 330 to 317 by 330 pixels. The
  rendering engine of 5.18.3 kept the zoom of each viewport through a resize
  (`resize(immediate, keepCamera = true)`: reset the camera for the new canvas, then put
  the zoom and the pan back; read in its code). In 6.0 `_resizeVTKViewports` takes
  `keepCamera` and does not read it, and `resize()` of the 3D viewport sets its size
  only. So the camera keeps its parallel scale, and the zoom against the fit changes. A
  planar viewport is not affected: its view state holds the scale against the fit.
  OHIF's own step after a resize (`performResize`: store the position presentations,
  resize, put them back) cannot help: it runs after the element has its new size, where
  the zoom already reads 1.41.
- **Smallest case:** a 3D viewport with a volume at zoom 1, its element made narrower
  (478 by 330 to 317 by 330), `renderingEngine.resize()`.

  | | 5.18.3 | 6.0 |
  |---|---|---|
  | parallel scale before | 130 | 130 |
  | parallel scale after | 182.7 | 130 |
  | `viewportProjection.getPresentation(viewport).zoom` after | | 1.405 |
  | parallel scale after `resetViewState()` | | 182.7 |

  Measured in OHIF's viewer on both (`laneU4/all-base.log`,
  `laneU4/probes-6-newbuild.log`). On 5.18.3 OHIF's own step also runs, so the number
  there is of both together.
- **Fix, in cornerstone:** to do: a resize keeps the zoom and the pan of a 3D viewport
  against its fit, as it does for a planar viewport, or the guide names it.
- **Fix, in OHIF:** none for the resize (rule 3). M33 is the part that was OHIF's.
- **State:** open, waits for cornerstone. The test fails.

## M33. The zoom and the pan of a 3D viewport were not in its position presentation

- **Seen:** read in the code while M32 was sorted, then in the viewer: 3D only, zoom
  0.5, MPR, 3D only again: the zoom is 1.
- **Why:** the legacy backend stored `getViewPresentation({ pan: true, zoom: true })`
  for every viewport, a 3D one too. `NextViewportBackend.getPositionPresentation` stored
  no view presentation for a 3D viewport, and `setPositionPresentation` did nothing for
  one.
- **Fix, in OHIF:** the backend stores the zoom and the pan of a 3D viewport
  (`viewportProjection.getPresentation`) and writes them back against the fit of the
  viewport as it is then (`withPresentation`, `setViewState`). The camera direction is
  not stored, as before.
- **State:** fixed in package U4 (not committed yet). Check:
  `NextViewportBackend.test.ts`, "the position presentation of a 3D viewport" (3 tests,
  2 failed first), and in the viewer: the zoom after the round trip is 0.5 with the
  change and 1 without it (`laneU4/probes-6-newbuild.log`,
  `laneU4/fit3d-back-6-without-newbuild.log`). It does not make the test of M32 pass.

## M34. A page object of the Playwright tests read the type of the viewport

- **Seen:** `SegAcrossViewportTypes.spec.ts`, "keeps the labelmap drawn from a stack
  through MPR and back to one viewport": `expect.poll(() =>
  initialStack.getViewportType()).toBe('stack')` receives `planar`.
- **Why:** `getViewportType` of `ViewportPageObject` gave `viewport.type`. In 6.0 a
  stack and a volume slice are both `planar` (it is what the test checks that no longer
  exists: the type `stack`).
- **Fix, in OHIF:** the page object gives the mode of a planar viewport
  (`getCurrentMode()`: `stack` or `volume`) and the type of any other viewport
  (`volume3d`). The spec is not changed. A pane of an MPR now reads `volume` where the
  legacy type was `orthographic`; no spec compares with that word.
- **State:** fixed in package U4 (not committed yet). Check: the test passes.

## M35. The picture of a failed clipped screenshot was of the whole page

- **Seen:** `MPRThenRTOverlayNoHydration.spec.ts` fails with "Expected an image 955px
  by 496px, received 1280px by 540px", ratio 0.56, and its "actual" picture is the page
  with the header and the study browser.
- **Why:** `checkForScreenshot` takes a clipped picture of a locator as a picture of
  the page, and it set `locator = page` for that. From the second attempt on the
  bounding box was the one of the page. Only a test that fails its first attempt gets
  there, so the size and the ratio of the failure were wrong, not its verdict.
- **Fix, in OHIF:** the locator stays, each attempt reads its bounding box again.
- **State:** fixed in package U4 (not committed yet). Check: the same spec, which still
  fails for M31, now reports a picture of the size of the baseline and a ratio of 0.03
  (the full run after package U4). `DicomTagBrowser.spec.ts`, the other user of the
  clip, passes.

## M36. Two baselines for the fill of a labelmap in an MPR

- **Seen:** `SEGHydrationFromMPR.spec.ts` (`mprAfterSegHydratedAfterLayoutChange.png`)
  and `SEGHydrationThenMPR.spec.ts` (`segPostHydrationMPRAxialPrimary.png`), both 0.05
  once M28 was fixed: the same layout (axial primary, a hydrated SEG), the segments look
  stronger.
- **Why, the named change:** `2-rendering-changes.md`, "A labelmap fill is drawn with
  the configured alpha". OHIF's style is `fillAlpha: 0.5`. Measured from a canvas
  picture with and one without the labelmap, by the colour of each segment
  (`laneU4/alpha.py`): the legacy volume viewport draws the fill at 0.32, 6.0 at 0.50;
  a stack draws 0.50 in both; the outline is at 1.00 in all four. One pixel of the white
  matter segment (colour 245): 184 in the baseline, 201 now; of the green segment
  (0, 118, 14): (86, 123, 90) and (63, 122, 70).
- **That it is this change:** with the fill lowered in the page to 0.64 of the style
  (0.32, the recipe of the guide for the old look) and nothing else changed, both specs
  pass against the old baselines (`laneU4/whatif/e.log`).
- **What else differs, counted pixel by pixel** (a channel off by more than 16, on
  `segPostHydrationMPRAxialPrimary.png`): 23,500 pixels, 5.0% of the picture. 13,055 of
  them are the fill going from 0.32 to 0.50 over a grey image. With the fill at 0.32,
  10,570 pixels (2.3%) still differ: the steps of the borders between segments. The outline pixels of one segment are the
  same pixels in the sagittal pane (2,803 of 2,803), which is the acquisition plane of
  this series, 95% the same in the coronal pane and 89% in the axial pane, and no shift
  of the picture brings them closer. The two reformatted panes cut the voxel grid at an
  angle: the legacy viewport sampled the 3D texture at each screen pixel, 6.0 cuts the
  slice first and draws that image (the guide, "Slice first is on by default"). These
  pixels are below the limit of the test by themselves, and the other pictures of both
  specs pass with them.
- **Fix, in OHIF:** the two baselines are new (`--update-snapshots` for the two specs).
  They are byte for byte the "actual" pictures of the run before. The update also
  rewrote `mprAfterSEG.png` from a first attempt taken while the labelmap loaded (it
  passes on a later attempt in a normal run): that file was put back as it is in the
  commit. **The new pictures were made on this Mac**; the other baselines come from
  OHIF's CI runner (step 9 of the plan).
- **Pictures:** `laneU4/baselines/`: the two side by side pictures, the old baselines
  (`before/`), the same view with the fill at 0.32, and an enlarged border.
- **State:** done in package U4 (not committed yet). Check: both specs pass.

## M37. Two traps of the renames of step 11

- **Seen (package U5):**
  - `git grep -nE "Next(Viewport|Segmentation)"` found nothing in the renamed files, also
    while their comments still said `PLANAR_NEXT` and native ("next"). A file moved with
    `mv` is untracked until it is committed, and `git grep` reads tracked files only.
  - The plain name of `NextViewportOperations` would be `ViewportOperations.ts`, in the
    folder that has `viewportOperations.ts` (the one alias of `nextViewportOperations`).
    The disk of this Mac is case-insensitive and the checkout has `core.ignorecase=true`:
    the two names are one file there, and git keeps the case of the path it knows. The
    commit would have the old name, and a build on Linux (CI) would not find
    `./ViewportOperations`.
- **Fix, in OHIF:** the search of the package reads tracked and untracked files
  (`git ls-files --cached --others --exclude-standard`, then `grep`). The operations are
  `viewportOperations` in `viewportOperations.ts`: the alias file holds the
  implementation now, and `NextViewportOperations.ts` is gone. The object is no class, so
  its plain name is that of the alias.
- **For the commit:** `git grep` sees the renamed files once they are committed; until
  then the check of a rename needs the untracked files too.
- **State:** fixed in package U5 (not committed yet). Check: the search over tracked and
  untracked files finds no `Next(Viewport|Segmentation)`, no `nextViewports` and no
  `_NEXT` name in `extensions`, `modes`, `tests` and `platform` (the hits left are listed
  in the report of the package), and jest passes with `viewportOperations.test.ts`.
