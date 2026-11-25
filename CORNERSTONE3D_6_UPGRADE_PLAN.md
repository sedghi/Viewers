# Upgrade to Cornerstone3D 6.0: where it stands and the plan

Branch `feat/cornerstone3d-6`, from OHIF `master` at `6fe59945a0` (3.14.0-beta.101,
`@cornerstonejs` 5.18.3). Cornerstone3D 6.0 keeps only the next viewports: the legacy
viewport classes, their API and the setting `useGenericViewport` are gone. The goal is a
complete and clean upgrade: one viewport path in OHIF, no legacy code left, no
compatibility layer.

## What is done

Every step but the run in CI (step 9), Safari on an iPhone (step 10) and the release
(step 12): see [Progress](#progress). The branch has 19 commits on `master` and the
uncommitted work of task O11 (M76, M77). The record of each problem is
`CORNERSTONE3D_6_MIGRATION_LOG.md`, with a summary table at its top.

## How it goes: the numbers

Measured on this Mac. "Before" is `master` on 5.18.3, "first" the branch after the
codemod (21 November), "now" the branch with task O9 on the Cornerstone3D link at
`735fc811e` (25 November); jest and Playwright were run again by task O9b on the link at
`28dd3ab33`, the final head of the plan, with the same results.

| Check | Before (`master`) | First (21 November) | Now (25 November) |
|---|---|---|---|
| jest | 153 suites, 1,853 tests, all pass | 148 suites pass, 5 fail; 1,834 tests pass, 19 fail | 176 suites, 2,016 tests, all pass (task O11; 173 and 2,007 after task O10, 171 and 1,988 before it) |
| build (`pnpm run build`) | passes | fails: 2 removed functions in 3 files | passes |
| type check (`tsc`, not part of OHIF's build) | 8,452 errors | 8,568: 96 new kinds, 22 gone | 8,788 lines in OHIF files (`master` 8,333 by the same count): no new kind of error against `master` but 3 reprints of existing errors and the test-runner globals (`it`, `expect`, `jest`) of the 19 new test files; 21 kinds gone. Task O10 adds no error outside the test-runner globals of its 2 new test files and its new tests, task O11 none outside those of its 3 new test files |
| lint of CI (`pnpm run lint:compiler:ci`) | 94 errors, 94 warnings (the budget) | not run | 94 errors, 94 warnings: the budget, passes |
| Playwright (101 specs, 247 tests) | 243 passed, 4 skipped | not run | 243 passed, 0 failed, 4 skipped, twice (7.4 min each); task O10: 243 passed, 0 failed, 4 skipped (7.6 min); task O11 (249 tests, 2 new): 245 passed, 0 failed, 4 skipped (7.6 min); no baseline changed |

## Progress

Brought to 25 November (tasks O9, O9b, O10 and O11). The Cornerstone3D that the branch is
checked on is the linked checkout at `28dd3ab33`, the last commit of the unified API plan;
task O9 made its checks on `735fc811e`, task O9b checked M71 and ran jest and the
Playwright suite again on `28dd3ab33`, and tasks O10 and O11 made their fixes and checks there.

| Step | State | Commit |
|---|---|---|
| 1. Measure the next path on 5.18.3 | done: 191 pass, 52 fail | entry M14 of the log |
| 2. Delete the legacy path | done | `fbdd648d97` |
| 3. OHIF's own data shape | done | `fbdd648d97` |
| 4. The build passes | done | `fbdd648d97` |
| 5. The other manual sites | done: the codemod reports 0 | `8f7232418c` (package U2) |
| 6. The review sites | done: 23 of 23 read | `8f7232418c` (package U2) |
| 7. The packages the codemod does not cover | done: no new type error is left | `1653f6df00` (package U3) |
| 8. jest | done: 176 suites, 2,016 tests pass (task O11) | packages U2 to U7, tasks O1 to O11 |
| 9. Playwright on 6.0 | on this Mac all pass on the link at `735fc811e`: 243 passed, 0 failed, 4 skipped, twice (7.4 min each); on the link at `28dd3ab33` (task O9b): 243 passed, 0 failed, 4 skipped (7.1 min); with task O10: 243 passed, 0 failed, 4 skipped (7.6 min); with task O11: 245 passed, 0 failed, 4 skipped (7.6 min); the run in CI open (open point 2) | packages U3, U4, U6, U7; tasks O1 to O11 |
| 10. By hand, on devices | the desktop part done twice: package U6 (22 November, old names) and task O9 (25 November, final names): each mode on the GPU and on the CPU against `master`; Safari on an iPhone open | packages U6, U7; task O9 |
| 11. Clean names and docs | done; the interfaces with one implementation were kept on 21 November (open point 1) and deleted in task O8 by the owner's decision of 24 November | `15b843a50a`; `e4f9451c6e` |
| 12. Release | open: a Cornerstone3D 6.0 beta with the commits of the unified API plan, then the pull request | |

### The unified API plan (tasks O1 to O11)

The owner's decisions of 24 November (one display set registry, the appearance and the
framing of a display set, one event for each change, no adapter) were built in
Cornerstone3D and then taken into OHIF by nine tasks; task O10 fixed the two entries of
the log that were OHIF's own and still open, and task O11 the last one (M76) and the
last rule of the `?useNextViewports` path (M77). The record of each is in the log.

| Task | What | State | Commit | Log |
|---|---|---|---|---|
| O1 | On the new Cornerstone3D build; the codemod of the final names on the branch | done | `309cc169f3` | M53 |
| O2 | Display sets registered once and mounted by their UID; no data id registry, no `::stack` and `::volume` | done | `309cc169f3` | M54, closes M42, M51 |
| O3 | The appearance of a display set: one event, two getters, no `isComputedVOI`; one opacity, `opacityMapping` in the protocols | done | `8659924b25` | M56, M57, closes M45, M52 |
| O4 | The position presentation is the view reference and the framing; no native view presentation keys | done | `8659924b25` | M58, closes M33 |
| O5 | `DISPLAY_SETS_CHANGED` and `sliceIndex` in OHIF; no `VIEWPORT_VOLUMES_CHANGED` | done | `67ab3444fd` | M60 |
| O6 | The window level rows, the range of the threshold menu and the capture ask the viewport | done | `67ab3444fd` | M61, closes M17 |
| O7 | The viewport adapter is deleted: OHIF calls the viewports of Cornerstone3D | done | `e4f9451c6e` | M68 |
| O8 | The interfaces with one implementation are deleted | done | `e4f9451c6e` | M69 |
| O9 | OHIF as a whole on the final Cornerstone3D: the gaps of M62 to M67 checked, the flaky spec, every check, each mode by hand, the log, this table and the migration guide | done | `ca046b21d2` | M49, M62 to M67 closed; M70, M71 |
| O9b | M71 checked on the final head of the plan (Cornerstone3D `28dd3ab33`, FX6) and closed; jest and the Playwright suite again on that link | done | `b7e4ae19a2` | closes M71; M75 |
| O10 | OHIF's two open entries: the volume of a display set is valid for the image ids it was made from (every kind of volume OHIF makes); the `CAMERA_RESET` listener removed at `ELEMENT_DISABLED`, and the element state that held destroyed elements | done | `2e5ecdd662` | closes M74, M75; M76 |
| O11 | One path, clean: the RTSTRUCT stack pin of the `?useNextViewports` path deleted (a pane keeps its type and orientation when an RTSTRUCT is hydrated), the last comments of two paths, the dead code checked; one toolbar listener per viewer entry (`registerEventForToolbarUpdate` returns its release) | done (not committed yet) | | closes M76, M77; M78, M79 |

## What OHIF has that makes this smaller

OHIF already has a full next path, used with `?useNextViewports=true`:
`NextViewportBackend`, `NextViewportAdapter`, `NextViewportOperations`,
`NextSegmentationBackend`, and one place that picks the path
(`CornerstoneViewportService`, `getViewportAdapter`). The upgrade is mostly: make that
path the only one and delete the legacy half. 78 of the 138 manual sites are in the
legacy half.

The risk is elsewhere: **1 of the 101 Playwright specs runs with the next viewports
today.** On 6.0 all of them do.

## The plan, step by step

Each step ends with its checks passing, and is one commit or a small series. Work
against a local cornerstone checkout (`pnpm run cs3d:link`, branch
`feat/slice-first-step-1`), so that a fix in cornerstone does not need a new beta each
time; a beta is cut when a group of fixes is ready.

### Step 1. Measure the next path before the upgrade (on 5.18.3)

On `master`, turn the next viewports on for every mode (`genericViewports.enabled` in
`platform/app/public/config/e2e.js`) and run the 101 Playwright specs. The result is the
list of specs that change because of the path, apart from 6.0. It separates the two
causes of a failure in step 9.

Done (21 November): on 5.18.3 the legacy path passes 243 of 243; the next path passes
191 and fails 52. On 6.0 after step 4 the branch passes 206 and fails 37. The lists
are entry M14 of the migration log.

### Step 2. Delete the legacy path

- The four classes `LegacyViewportAdapter`, `LegacyViewportBackend`,
  `LegacyViewportOperations`, `LegacySegmentationBackend`, and
  `getLegacyViewportType`.
- The switch: `isNextViewportsEnabled`, `setNextViewportsEnabled`,
  `resolveNextViewportsEnabled`, the URL parameter `useNextViewports`,
  `appConfig.genericViewports.enabled`, `appConfig.useGenericViewport`, and every branch
  on them (`getCornerstoneViewportType`, `CornerstoneViewportService`,
  `getViewportAdapter`, the TMTV hanging protocol, `nextViewportPolicies`). The next
  branch stays, the legacy branch goes. `genericViewports.viewportRendering` stays (it
  picks CPU or GPU).
- The tests of the legacy mapping.

Done when: no `Legacy*` file and no path switch is left; the manual list is at about 60.

### Step 3. Give OHIF its own data shape

OHIF uses `ViewportType.STACK`, `ORTHOGRAPHIC` and `VOLUME_3D` as its own marker of
"stack or volume" and stores it (`dataShapeType` in `CornerstoneCacheService`,
`viewportDataShape`, `Viewport.getViewportType`, comparisons in
`CornerstoneViewportService`, the overlays). 6.0 has no such values: a stack and an MPR
are both `PLANAR`.

- An OHIF type for the shape (stack, volume, volume3d, other), used wherever the marker
  is stored or compared.
- `getCornerstoneViewportType` returns the 6.0 type (`PLANAR`, `VOLUME_3D`, `VIDEO`,
  `WHOLE_SLIDE`, `ECG`) and accepts the 6.0 type strings; today a stored `'planar'`
  throws "Invalid viewport type".
- For a live viewport, ask `viewport.getCurrentMode()`.
- The words of hanging protocols and modes (`viewportType: 'stack' | 'volume' |
  'orthographic' | 'volume3d'`) stay as they are: they are OHIF's public words, and map
  to a shape and a type. No hanging protocol of a user changes.

Done when: no `ViewportType.STACK` or `ORTHOGRAPHIC` is left (51 sites).

### Step 4. Make the build pass

The two removed functions: `getImageSliceDataForVolumeViewport` (`commandsModule.ts`,
`CornerstoneViewportService.ts`) and `viewportSupportsVolumeCompatibility`
(`ViewportWindowLevel.tsx`), with the replacements of the 6.0 guide (step 6 and step 7
of its upgrade page).

Done when: `pnpm run build` passes and the viewer opens a study.

### Step 5. The other manual sites, by kind

In the order of the 6.0 guide; each kind is one commit. Where the adapter already has
the call, the site uses the adapter.

| Kind | Sites left after step 2 (about) | Becomes |
|---|---|---|
| Camera and view: `getCamera`, `setCamera`, `getViewPresentation`, `setViewPresentation`, `jumpToWorld` | 15 | the view state and view references |
| The look: `setProperties`, `getProperties`, `getBlendMode`, `Types.ViewportProperties` | 12 | the display set presentation |
| The data: `setVolumes`, `addVolumes`, `setStack` | 4 | `setDisplaySets` |
| Events: `STACK_VIEWPORT_SCROLL` | 3 | `CAMERA_MODIFIED` and `NEW_IMAGE` |
| Types and members: `Types.IVolumeViewport`, `IStackViewport`, `_actors`, `isDisabled`, `getTargetImageIdIndex` | 8 | the 6.0 classes and members |

Done when: the codemod, run again, reports 0 manual sites.

### Step 6. The review sites (23)

- `getAllVolumeIds()` (8 sites): the rewrite lists every actor; keep the ids that
  `viewport.hasVolumeId(id)` takes. The guard in `initCineService.ts`
  (`if (!viewport?.getAllVolumeIds) return null`) always returns on 6.0, so the cine of a
  dynamic volume does nothing: fix it.
- `NEW_IMAGE` now fires for each slice of a volume too (`viewportDataShape`,
  `ViewportImageSliceLoadingIndicator`).
- `IMAGE_LOAD_ERROR` has no `imageIdIndex` and also fires for a failed prefetch.
- `setUseCPURendering` (3 sites in `init.tsx`) and the 4 orientation sites.

Done when: each of the 23 is read and either changed or marked right.

### Step 7. The packages the codemod does not cover

`@cornerstonejs/adapters` (16 imports), the DICOM image loader, `ai`,
`polymorphic-segmentation`, `labelmap-interpolation`: read their 6.0 changes against
OHIF's use (segmentation hydration, SR, RTSTRUCT, the ONNX tools). The US annotation
extension and the SR display tool have 7 of the new type errors.

Done when: no new type error is left in a file that imports a cornerstone package (the
96 are at 0).

### Step 8. jest

The 5 failing suites: rewrite `getCornerstoneViewportType.test.ts` for the 6.0 types,
set the cornerstone major of the runtime plugins to 6 (`runtimeShared.test.js` and the
plugin externals), and replace the mocks of legacy viewports in the adapter contract
test, `SegmentationService.test.ts` and `WindowLevelTool.test.ts`.

Done when: jest passes with at least the 1,853 tests of before, less the tests of
deleted code (each named in the commit).

### Step 9. Playwright on 6.0

Run the 101 specs. Sort each difference with the table of step 1:

- the same difference as the next path on 5.x: a 6.0 picture change that the cornerstone
  guide names (labelmap fill, overlay opacity, slices on voxel centres): update the
  baseline, with the guide line in the commit;
- a new difference: a defect, in this port or in cornerstone. A cornerstone defect is
  fixed there with its test and comes with the next beta.

OHIF's baselines are made in CI (its own runner); pictures taken on a Mac are for
reading only.

Done when: every spec passes in CI, and each updated baseline has its reason.

### Step 10. By hand, on devices

Each mode once (basic, longitudinal, segmentation, TMTV, microscopy, US annotation,
preclinical 4D), CPU rendering (`?viewportRendering=cpu`), and Safari on an
iPhone (a video and a stack).

### Step 11. Clean names and docs

- With one path, the word "Next" says nothing: `NextViewportBackend` and its kin get
  plain names, and an interface with one implementation is folded into it where that
  reads better (`IViewportBackend`, `ISegmentationBackend`); the adapter stays as OHIF's
  one door to the viewport.
- `AppTypes`, the configuration docs and the migration guide of OHIF: the three settings
  that are gone, and what an extension author changes (the cornerstone guide and the
  codemod).

Done (21 November, package U5):

- Plain names: `NextViewportAdapter` is `ViewportAdapter`, `NextViewportBackend` is
  `ViewportBackend`, `NextSegmentationBackend` is `SegmentationBackend`, with their files
  and tests. `nextViewportOperations` is `viewportOperations`, in `viewportOperations.ts`,
  the file of its one alias: `ViewportOperations.ts` beside `viewportOperations.ts` cannot
  exist on a case-insensitive disk, and git would keep the old case. `utils/nextViewports.ts`
  is `utils/viewportRendering.ts` (the render backend selection, all that is left of it after
  step 2) and `utils/nextViewportPolicies.ts` is `utils/viewportPolicies.ts`; each has more
  than one user, so they keep their files. The comments and test names that said "next"
  or named a 5.x type (`PLANAR_NEXT` and its kin) for the one path say it in plain words.
- Public: the four classes were never exports of the extension. Its exports
  `NEXT_FUSION_PT_OPACITY` and `NEXT_OVERLAY_OPACITY` are `FUSION_PT_OPACITY` and
  `OVERLAY_OPACITY`. With `isNextViewportsEnabled` and `isNextViewport` (removed in step 2)
  they are in the migration guide. Package U7 removed `FUSION_PT_OPACITY`: the TMTV fusion
  has the PET ramp of `master` again (M45).
- The interfaces stay (open point 1).
- Docs: the migration guide page `migration-guide/3p13-to-3p14/cornerstone3d-6.md` (the
  settings that are gone, what an extension author does, the removed and renamed
  exports and classes), its line in the index of the guide, `genericViewports` in
  `configuration/configurationFiles.md`, and `development/multiresolution-testing.md`.
  `AppTypes` and the config files of `platform/app/public/config/` named no gone setting
  any more (package U1).
- M18 is closed: cornerstone `62cf392da` gives the 3D viewport `getZoom`, `setZoom`,
  `getPan` and `setPan`; the overlay and the 3D test helper call them as on `master`.

### Step 12. Release

A pull request to OHIF on a cornerstone 6.0 beta; cornerstone's OHIF downstream check
points at this branch; `@cornerstonejs` moves to 6.0.0 when it is out.

## Open points for the owner

1. Step 11: fold the one-implementation interfaces, or keep them for a future backend.
   Decided on 21 November that they stay; **decided again by the owner on 24 November
   (the unified API plan, area 5): they are deleted**, with the adapter, in tasks O7 and
   O8 (`e4f9451c6e`). A renderer on a server is a render backend or a viewport type of
   Cornerstone3D, or an extension that implements `IViewportService`
   (`services/ViewportService/README.md`).
2. Step 9: how the CI baselines are updated (from CI artefacts, or another way).
3. A 6.0.0-beta.2 for the babel fix, or work on the linked checkout until more fixes
   are in. The babel fix is in `v6.0.0-beta.2`; the branch is checked on the linked
   checkout at `28dd3ab33`, which has the commits of the unified API plan after it. A
   beta with them is needed before the pull request (step 12).
