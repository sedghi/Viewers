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
- **Fix, in OHIF:** step 4 of the plan.
- **State:** open.

## M3. The codemod makes `getCornerstoneViewportType` return `PLANAR` for a stack and for a volume

- **Seen:** read in the diff of the codemod: `ViewportType.STACK` and
  `ViewportType.ORTHOGRAPHIC` both became `ViewportType.PLANAR` in the returns of
  `getCornerstoneViewportType`.
- **Why:** that is right for a viewport type. But OHIF also calls this function to get
  its own "stack or volume" marker (`dataShapeType` in `CornerstoneCacheService`) and
  stores it. The marker is lost. The codemod cannot know that an application uses the
  enum as its own data.
- **Fix, in OHIF:** step 3 of the plan (an OHIF type for the shape).
- **Fix, in cornerstone:** the migration guide should name this case: an application
  that stores `ViewportType.STACK` or `ORTHOGRAPHIC` as a marker of its data needs its
  own values. To do.
- **State:** open.

## M4. 16 jest tests pin the legacy type mapping

- **Seen:** `getCornerstoneViewportType.test.ts` fails 16 tests ("should return STACK
  when viewportType is stack" and the like).
- **Why:** they test the mapping to legacy types, which 6.0 does not have.
- **Fix, in OHIF:** steps 2, 3 and 8: the tests are rewritten for the 6.0 types and the
  shape.
- **State:** open.

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
- **State:** open (96 new kinds).

## M7. Only 1 of 101 Playwright specs runs on the next viewports

- **Seen:** `grep useNextViewports tests` finds one spec.
- **Why:** the next path is opt-in on 5.x. On 6.0 it is the only path, so 100 specs run
  on a path they never ran on.
- **Fix, in OHIF:** step 1 measures the next path on 5.18.3 first, so that a difference
  on 6.0 can be told from a difference of the path; step 9 runs all of them on 6.0.
- **State:** open (step 1 is running).
