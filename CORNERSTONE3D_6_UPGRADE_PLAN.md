# Upgrade to Cornerstone3D 6.0: where it stands and the plan

Branch `feat/cornerstone3d-6`, from OHIF `master` at `6fe59945a0` (3.14.0-beta.101,
`@cornerstonejs` 5.18.3). Cornerstone3D 6.0 keeps only the next viewports: the legacy
viewport classes, their API and the setting `useGenericViewport` are gone. The goal is a
complete and clean upgrade: one viewport path in OHIF, no legacy code left, no
compatibility layer.

## What is done

| Commit | What |
|---|---|
| `refactor(cornerstone): run the Cornerstone3D 6.0 codemod` | The seven codemod steps and prettier: 25 files, 157 sites rewritten. 138 sites reported for manual work, 23 for review, not changed. |
| `chore(deps): @cornerstonejs 6.0.0-beta.1` | The nine `@cornerstonejs` packages from 5.18.3 to 6.0.0-beta.1, with the lockfile. |

## How it goes: the numbers

Measured on this Mac. "Before" is `master` on 5.18.3; "after" is this branch.

| Check | Before | After |
|---|---|---|
| jest | 153 suites, 1,853 tests, all pass | 148 suites pass, 5 fail; 1,834 tests pass, 19 fail (see the note) |
| build (`pnpm run build`) | passes | fails: 2 removed functions in 3 files |
| type check (`tsc`, not part of OHIF's build) | 8,452 errors | 8,568: 96 new kinds, 22 gone |
| Playwright (101 specs) | not run | not run |

- **Note on jest.** With 6.0.0-beta.1 as published, 33 suites do not run at all: OHIF's
  babel stops on one expression in `@cornerstonejs/core` (an `await` inside `??`). That
  is fixed in cornerstone (`7eecbab52`, not in a published beta yet). The "after" numbers
  are with that one line changed in the local `node_modules`.
- **The build** fails on `utilities.getImageSliceDataForVolumeViewport` (2 files) and
  `utilities.viewportSupportsVolumeCompatibility` (1 file). Both are in the manual list.
- **The 96 new type errors:** 22 are in the legacy path that goes; 22 are
  `ViewportType.STACK` or `ORTHOGRAPHIC`; the rest are removed members (`getCamera`,
  `setProperties`, `getViewPresentation`, `getBlendMode` and others), all in the manual
  list.
- **The 19 failing tests:** 16 pin the legacy type mapping
  (`getCornerstoneViewportType.test.ts`); 2 pin the cornerstone major of the runtime
  plugins (`@cornerstonejs/core@5`); the others are mocks of legacy viewports.

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

Done when: a table of the 101 specs (same picture, other picture, fails) is in this
file.

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

### Step 12. Release

A pull request to OHIF on a cornerstone 6.0 beta; cornerstone's OHIF downstream check
points at this branch; `@cornerstonejs` moves to 6.0.0 when it is out.

## Open points for the owner

1. Step 11: fold the one-implementation interfaces, or keep them for a future backend
   (a server-side renderer was named as a later goal).
2. Step 9: how the CI baselines are updated (from CI artefacts, or another way).
3. A 6.0.0-beta.2 for the babel fix, or work on the linked checkout until more fixes
   are in.
