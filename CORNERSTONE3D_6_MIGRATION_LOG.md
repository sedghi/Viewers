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

## Summary (27 November, tasks O9 to O21)

The state of every entry today, on the branch at `2bbed3c040` (task O11) and the
Cornerstone3D link at `472d908e8`. Task O9 checked the entries on the Cornerstone3D link
at `735fc811e`; task O9b moved the link to `28dd3ab33`, the final head of the unified API
plan, checked M71 there and ran jest and the Playwright suite again on it; task O10 fixed
OHIF's two open entries (M74, M75) on that link and found M76; task O11 fixed M76,
deleted the RTSTRUCT stack pin of the `?useNextViewports` path (M77) and found M78 and
M79. The link then moved to `472d908e8`, five Cornerstone3D commits later (lanes FX7 to
FX11); task O12 ran every check on it, measured M41, M46, M48 and M78 in the viewer and
closed them, checked the source rules of FX8 and FX10 in OHIF's own flows, and found M80.
The link then moved to `487285b21` (lane FX12, the cut of a contour segmentation in the
other planes): M79 was seen fixed in the viewer and closed, and jest, the build and the
Playwright suite ran again on it (task O13). The last move, on 26 November, is to
`c2f202429` (lane FX13, the follow-ups of M79): the same three checks ran again on it
(176 suites and 2,016 tests pass; 245 passed, 0 failed, 4 skipped).
Task O15 (26 November, same link) took the four things the owner found in the viewer
that day: M80 closed with the owner's choice of 0.25, M81 (the opacity slider of a TMTV
fusion), M82 (the thumbnails; the owner's are test data, and the canvas helper of
Cornerstone3D draws black) and M83 (a PET overlay shows another slice first; OHIF's part
fixed, Cornerstone3D's part open); with it 178 suites and 2,028 tests pass, and the
Playwright suite gives 247 passed (2 new tests), 0 failed, 4 skipped.
Task O16 (26 November) moved the link to `2810086ec` (lanes FX14 to FX16: one slice grid
for a volume view, the camera of a video and an ECG through a resize, one polySeg worker).
Before any edit, jest (178 suites, 2,028 tests), the type check (no new error), the build
and the lint budget passed, and the Playwright suite gave 218 passed, 29 failed, 4 skipped:
21 specs whose click on a segment no longer moves a stack (M87, OHIF, fixed), 7 pictures
of the MPR of an MR turned 12.5 degrees in its plane and of a DWI of an even count, which
the slice grid explains (their baselines replaced, the owner's exception for this task;
one more picture of the same MR showed behind them, 8 in all, lane O16
`baselines/LIST.md`), and the picture of `RTHydrationFromMPR` after its layout change
(M89). It fixed the sync
of the TMTV panes (M84), the Reset button (M88), measured the thumbnails (M82 closed), the
camera of a video and an ECG through a panel and a layout change, the CPU canvas during a
panel drag (no blank frame), the cuts of an RTSTRUCT with one worker, the scroll of a stack
with a SEG, a tilted series and the 3D points of an SR, and found M85 and M86 in
Cornerstone3D.
Task O17 (26 November) moved the link to `610c47210` (lane FX17: an overlay of a streaming
volume shows no copy of another slice, the mount option `initialViewReference`, six small
rows; and the offset of a 3D tile). Before any edit jest (180 suites, 2,047 tests), the
type check (no new error), the build and the lint budget passed, and the Playwright suite
gave 249 passed, 3 failed (the three pictures of M89, nothing else), 4 skipped. It named
every part of the three pictures of M89 and replaced their baselines (two parts are the
slice grid of FX14, one the cuts of M79, two are pictures where the branch is right and
the old baseline wrong), checked M83 in the viewer against `master` and closed it, started
the source of every volume mount at its stored view reference with the new option, and
the panes that mount into a placed camera position group at the position of the group
(M93), and found M90 (a gap: nothing to wait on for the cuts of an RTSTRUCT), M91 (a
Cornerstone3D defect: a mount refuses a reference beyond the slices of the acquisition
plane) and M92 (an OHIF behaviour, also on `master`: loading an RTSTRUCT into an MPR pane
takes it to its default slice).
Task O18 (26 November) moved the link to `c1dd07a1f` (lanes FX18 to FX21: the calls of
`setDisplaySets` and `addDisplaySet` take effect in call order and a streaming volume
fires one `IMAGE_VOLUME_MODIFIED` per image; the camera position synchronizer keeps the
slice of a pane through another pane's zoom, pan or resize and gives a group one scale;
the slice grid of a view can be asked before a mount, a mount starts at any slice of its
view, and an event says when the cuts of a contour segmentation are complete; the cache
never replaces an image by a worse one). Before any edit jest (180 suites, 2,062 tests),
the type check (no new error), the build and the lint budget passed, and the Playwright
suite gave 253 passed, 4 skipped and one failure, the `test.fail` of M91, which now
passed; no picture changed. It checked and closed M85, M86, M90 and M91, started every
pane of a camera position group at the position of the group before any of them mounts
(`utilities.getVolumeSliceGrid`: each pane of TMTV now draws one slice at the load) and
dropped the hold of the synchronizer around a mount, kept the replay of the framing at a
resize (M95), fixed M92 for an RTSTRUCT and a SEG, made the specs that show the cuts of an
RTSTRUCT in an MPR wait for them, measured the PET load (not slower than `master`) and the
TMTV load (about 2 s slower than `master`, in Cornerstone3D: M94). After its changes jest
gives 180 suites and 2,083 tests passed, the type check no new error outside the
test-runner globals of its tests, the build and the lint budget pass, and the Playwright
suite 257 passed, 0 failed, 4 skipped (261 tests, 3 new); one baseline is replaced under
the owner's exception (`mprAfterRTHydrated`, lane O18 `baselines/LIST.md`).
Task O20 (26 November) moved the link to `8333d7dba` (lane FX23: a pane draws during a
load only when its own picture changed, a volume whose requests the application queued
loads once, the sampler resolves a frame once) and timed the TMTV load of the owner's
complaint from the navigation on both sides, with the DevTools data. With today's
`config/e2e.js` the load of the CloudFront `ohif` source takes 6.35 s on the branch and
5.95 s on `master`: a CORS preflight for each frame and 5 requests in flight pace it on
both sides (M96, OHIF, fixed); with the fix every volume is loaded and every pane drawn
at 2.0 s on both sides (the branch 24 ms sooner, 58 frames drawn against 295), 4 s sooner
than `master` today. A production build gives 1.61 s against 1.63 s. The branch is still
later on the first picture after the mount (48 ms in production: M94, narrowed) and on
the first rows of the sagittal and coronal panes (M97: the decode workers start at the
first frame; M98: the 100 ms tick), both in Cornerstone3D. Nine of the ten TMTV panes draw
a 2D slice gathered on the CPU, the MIP alone holds a 3D texture: 16 MB of textures
against 81 MB on `master`. Jest gives 181 suites and 2,086 tests passed, the type check no
new error outside the test-runner globals of its new test file, the build and the lint
budget pass, and the Playwright suite 257 passed, 0 failed, 4 skipped (6.5 min, from
7.8: the studies of the fixtures load from the `ohif` source); no baseline is replaced.
Task O21 (27 November) moved the link to `bda7dafac` (lane FX24: the decode workers start
when the page is idle, the first delivery into an empty pane draws at the next frame, the
CPU slice path takes the frame's own array and one row per arriving frame) and timed the
first picture of the TMTV load stage by stage on both sides, five alternating loads each,
in the dev build and in production (M94). The 110 ms of the orchestrator's dev benchmark
were the start of the page (OHIF's bundle took a second copy of dcmjs and seven other
libraries from the linked checkout: M101, fixed; the orchestrator's dev server of the
branch serves an export whose long module ids cost about 40 ms more), the init of
Cornerstone3D (3 ms: M100) and the mount, where `master` draws its first picture with
three of its ten panes mounted and the branch with all ten (every pane mounted and drawn
191 ms sooner in production), and Cornerstone3D samples the first slice of volumes that
have no frame yet (M99). OHIF's group start computed the same slice grids about fifty
times (M102, fixed). M97 and M98 are checked fixed in OHIF's page. With the orchestrator's
script after the fixes, production: loaded 1,531 against 1,658 ms, 61 frames against
283, the first picture 1,030 against 1,012 ms, long tasks 440 against 404 ms; dev:
1,934 against 2,036 ms, 60 frames against 280, 1,397 against 1,358 ms, 762 against
716 ms. Jest gives 182 suites and 2,096 tests passed, the type check no new error outside
the test-runner globals of its tests, the build and the lint budget pass, and the
Playwright suite 257 passed, 0 failed, 4 skipped (6.5 min); no baseline is replaced.
"Whose" says where the problem was: in OHIF, in Cornerstone3D (the library, its codemod
or its guide), in a test of OHIF, or "work" for an entry that records a planned task and
not a defect.

| Entry | The problem, in one line | Whose | State today |
|---|---|---|---|
| M1 | OHIF's jest could not load core 6.0.0-beta.1 (`await` inside `??`) | Cornerstone | fixed in cornerstone `7eecbab52`, in 6.0.0-beta.2 |
| M2 | The build failed on two functions that 6.0 removed | OHIF | fixed `fbdd648d97` |
| M3 | `getCornerstoneViewportType` gave `PLANAR` for a stack and a volume | OHIF | fixed `fbdd648d97`; the Cornerstone guide names the case (step by step) |
| M4 | 16 jest tests pinned the legacy type mapping | OHIF test | fixed `fbdd648d97` |
| M5 | The runtime plugins pinned the cornerstone major to 5 | OHIF | fixed `8f7232418c` |
| M6 | No type check told OHIF about a removed name | OHIF | fixed `1653f6df00`; O9: no new error kind against `master` |
| M7 | Only 1 of 101 Playwright specs ran on the next viewports | OHIF test | fixed: all run on 6.0 (M14) |
| M8 | OHIF's tests of the legacy type were always false on the next path | OHIF | fixed `fbdd648d97` |
| M9 | A test of a legacy 3D type is true for every 3D viewport after the codemod | OHIF | fixed `fbdd648d97`; the Cornerstone guide names it (api map) |
| M10 | The guide's slice count does not type-check on `Types.IViewport` | OHIF + Cornerstone guide | OHIF fixed `fbdd648d97`; open for cornerstone: the guide row does not say the members are on `PlanarViewport` (small) |
| M11 | A labelmap asked for on a 3D viewport was not made a surface | OHIF + Cornerstone | fixed `e5881fc1a7` and in cornerstone (C5, its row 127) |
| M12 | The initial image of a protocol was not applied to a volume | OHIF | fixed `8f7232418c` |
| M13 | The type comparison counted paths of the linked checkout as errors | OHIF method + Cornerstone | fixed: the comparison; the declaration paths in cornerstone (C2, row 114); O9: no such error on the link |
| M14 | 52 specs failed on the next path of 5.18.3, 37 on 6.0 | OHIF + Cornerstone | fixed on this Mac (O9: 243 passed, 0 failed, 4 skipped, twice (7.4 min each), link `735fc811e`; O9b: 243 passed, 0 failed, 4 skipped (7.1 min), link `28dd3ab33`; O10: 243 passed, 0 failed, 4 skipped (7.6 min), same link; O11: 245 passed (2 new tests), 0 failed, 4 skipped (7.6 min), same link; O12: 245 passed, 0 failed, 4 skipped (7.2 min), link `472d908e8`; O15: 247 passed (2 new tests), 0 failed, 4 skipped (7.4 min), link `c2f202429`; O16: 249 passed (5 new tests), 3 failed (the pictures of M89), 4 skipped (7.7 min), link `2810086ec`; O17: 254 passed (2 new tests), 0 failed, 4 skipped (7.5 min), link `610c47210`; O18: 257 passed (3 new tests), 0 failed, 4 skipped (7.8 min), link `c1dd07a1f`); the run in CI open, waits for the owner (open point 2 of the plan) |
| M15 | An optional call of a legacy member failed without a sign | OHIF | fixed `8f7232418c`; the Cornerstone guide names it (step by step) |
| M16 | Three places did the same thing twice after the codemod | OHIF + Cornerstone codemod | OHIF fixed `8f7232418c`; open for cornerstone: a report of a rewrite that duplicates a line (small) |
| M17 | The window level panel had no rows | OHIF | fixed `67ab3444fd` (M61) |
| M18 | The 3D pictures of the Playwright tests were twice as large | Cornerstone | fixed in cornerstone `62cf392da`; OHIF as on `master` in `15b843a50a` |
| M19 | The error text of the slice loading indicator never showed (5.x too) | OHIF | decided: left as on 5.x |
| M20 | A jump to a measurement did not bring it into view | OHIF | fixed `1653f6df00`; the Cornerstone guide has the recipe |
| M21 | The reference of a hydrated SCOORD3D named a display set as its volume | OHIF | fixed `1653f6df00`; Cornerstone judges a reference by its image or plane (DS4) |
| M22 | A stack with an RTSTRUCT or a SEG over it was mounted as a volume | OHIF | fixed `1653f6df00` |
| M23 | `worldToCanvas` was stale after a resize that met a scheduled frame | Cornerstone | fixed in cornerstone `3098597aa` |
| M24 | A hydrated annotation referenced the image on display | Cornerstone | fixed in cornerstone `3098597aa` |
| M25 | Every image of a stack showed the window of its first image | OHIF | fixed `1653f6df00` |
| M26 | No `VOI_MODIFIED` when a stack scrolled to an image with another window | Cornerstone | fixed in cornerstone `3098597aa` |
| M27 | The orientation command threw on a 3D viewport | OHIF + Cornerstone guide | OHIF fixed `1653f6df00`; open for cornerstone: the guide does not say what an axis name does on a 3D viewport (small) |
| M28 | A labelmap on a stack set the window text to W: 2 L: 0 | Cornerstone | fixed in cornerstone `3098597aa` |
| M29 | A labelmap of another series did not reach a stack | OHIF | fixed `e5881fc1a7` |
| M30 | A volume viewport took a reference that names only an image | Cornerstone | fixed in cornerstone (C5) |
| M31 | A contour set got the plane of the pane that drew it first | Cornerstone | fixed in cornerstone `1b3b2247e` |
| M32 | A resize kept the parallel scale of a 3D viewport | Cornerstone | fixed in cornerstone `1b3b2247e` |
| M33 | The zoom and the pan of a 3D viewport were not stored | OHIF | fixed `8659924b25` (M58) |
| M34 | A page object of the tests read the type of the viewport | OHIF test | fixed `e5881fc1a7` |
| M35 | The picture of a failed clipped screenshot was of the whole page | OHIF test | fixed `e5881fc1a7` |
| M36 | Two baselines for the fill of a labelmap in an MPR | OHIF test | fixed `e5881fc1a7` (the Cornerstone guide names the fill) |
| M37 | Two traps of the renames of step 11 | OHIF | fixed `15b843a50a` |
| M38 | A window level drag in an MPR changed the window twice as much | Cornerstone | fixed in cornerstone (C6), checked in O3 |
| M39 | On the CPU a planar viewport missed a resize back to its first size | Cornerstone | fixed in cornerstone (C6, its row 129); O9: on the CPU a 2x2 layout and back is the GPU picture; its jump effect was M72 |
| M40 | A resize kept the pan of a planar viewport as a share of the canvas | Cornerstone | fixed in cornerstone (C5), checked in O4 |
| M41 | A console warning of Chrome on the CPU path (`willReadFrequently`) | Cornerstone | fixed in cornerstone `ccb599e2a` (FX7), checked in O12: no warning of the CPU draw step on a stack, an MPR or the TMTV mode |
| M42 | A stack of a series shown as a volume elsewhere was drawn as a volume slice | OHIF + Cornerstone | fixed `309cc169f3` with cornerstone DS3 |
| M43 | A jump to an empty segment put every pane on slice NaN | OHIF + Cornerstone | fixed `2f4718f986` and in cornerstone (C6, row 133) |
| M44 | An SR, SEG or RTSTRUCT viewport showed no window text | OHIF | fixed `2f4718f986` |
| M45 | The PET of a TMTV fusion tinted the whole pane red | OHIF | fixed `8659924b25` (M57) |
| M46 | The ultrasound pleura and B-line tool threw before the first image | Cornerstone | fixed in cornerstone `ccb599e2a` (FX7), checked in O12: no error on the GPU or the CPU, the lines and their percentage as on `master` |
| M47 | A reference that names the PET of a fusion made the PET the source | Cornerstone | fixed in cornerstone (C6 row 131, DS4 row 150) |
| M48 | A whole slide viewport never reported that it had rendered | Cornerstone | fixed in cornerstone `ccb599e2a` (FX7), checked in O12: `rendered` 2.1 to 2.3 s after the page opens, GPU and CPU |
| M49 | The cine of a stack with a labelmap played at 15 to 17 a second | Cornerstone | fixed in cornerstone `735fc811e` (FX4), checked in O9: as `master` |
| M50 | The TMTV CSV export did nothing on the CPU | not found | closed by measurement in O9: on the CPU the statistics of the GPU and the CSV file |
| M51 | A planar viewport took a reference only while its data was registered | Cornerstone | fixed in cornerstone (DS3, DS4); the OHIF registry deleted in `309cc169f3` |
| M52 | A list in `colormap.opacity` replaced the overall opacity | Cornerstone | fixed in cornerstone (one opacity), closed in `8659924b25` |
| M53 | The codemod on this branch; it left the keys of a module mock | Cornerstone codemod | the run done in `309cc169f3`; the defect fixed in cornerstone (FX2, row 206) |
| M54 | One store of display sets (task O2) | work | done `309cc169f3` |
| M55 | A video that does not load left its mount waiting for ever | Cornerstone | fixed in cornerstone `99867e2c5` (FX2); OHIF decided in O7 |
| M56 | The appearance of a display set (task O3) | work | done `8659924b25` |
| M57 | One opacity, and the TMTV fusion with the look of `master` (task O3) | work | done `8659924b25` |
| M58 | The position presentation is the view reference and the framing (task O4) | work | done `8659924b25` |
| M59 | The pan of a 3D viewport was lost on a layout change | Cornerstone | fixed in cornerstone `3f3c6ff7a` (FX3), checked in O7 |
| M60 | The display set event, the slice index and the scroll in OHIF (task O5) | work | done `67ab3444fd` |
| M61 | The window level rows, the threshold range and the capture (task O6) | work | done `67ab3444fd` |
| M62 | A 3D viewport did not give the volume of its mounts | Cornerstone | fixed in cornerstone `735fc811e` (FX4), checked in O9 |
| M63 | The stack prefetch added a listener at each enable | Cornerstone | fixed in cornerstone `735fc811e` (FX4), checked in O9; the rest is M71 |
| M64 | A synchronizer added an `ELEMENT_DISABLED` listener at each change | Cornerstone | fixed in cornerstone `735fc811e` (FX4), checked in O9 |
| M65 | A volume of 12-bit images kept 8 bits when its first image fit in 8 | Cornerstone | fixed in cornerstone `735fc811e` (FX4), checked in O9 |
| M66 | The labelmap of a stack was mounted again for every image | Cornerstone | fixed in cornerstone `735fc811e` (FX4), checked in O9 |
| M67 | A 3D pane that went to a pane of another size came back with half its pan | Cornerstone | fixed in cornerstone `869981396` (FX5), checked in O9 |
| M68 | The viewport adapter is deleted (task O7) | work | done `e4f9451c6e` |
| M69 | The interfaces with one implementation are deleted (task O8) | work | done `e4f9451c6e` |
| M70 | A spec of the contour colour read the stroke before the next draw | OHIF test | fixed `ca046b21d2` (O9) |
| M71 | A destroyed stack viewport keeps its prefetch listener | Cornerstone | fixed in cornerstone `28dd3ab33` (FX6), checked in O9b |
| M72 | On the CPU a jump to a measurement pushed the image out of the pane | OHIF | fixed `ca046b21d2` (O9) |
| M73 | The PET axial pane of TMTV showed its slice without the instance number | OHIF | fixed `ca046b21d2` (O9) |
| M74 | A volume of a display set that grew while no viewport showed it keeps its first images | OHIF | fixed `2e5ecdd662` (O10); `master` has it too |
| M75 | OHIF adds a `CAMERA_RESET` listener to each enabled element and never removes it | OHIF | fixed `2e5ecdd662` (O10), with the element state that held destroyed elements; `master` has it too |
| M76 | Each mode entry adds a `TOOL_ACTIVATED` listener to `eventTarget` that is never removed | OHIF | fixed `2bbed3c040` (O11); `master` has it too |
| M77 | Hydrating an RTSTRUCT made its pane a stack, also a sagittal or coronal pane of an MPR | OHIF | fixed `2bbed3c040` (O11): the rule of the `?useNextViewports` path is deleted |
| M78 | A stack with the contours of an RTSTRUCT draws its annotations about 140 ms after each scroll | Cornerstone | fixed in cornerstone `472d908e8` (FX11), checked in O12: 33 ms, as on `master` |
| M79 | A sagittal or coronal pane draws no cut of the contours of an RTSTRUCT | Cornerstone | fixed in cornerstone `487285b21` (lane FX12), checked in the viewer in task O13 |
| M80 | A PET added from the data overlay menu tints the pane more than on `master` | OHIF | fixed in task O15 (`3aee48d6fe`): `OVERLAY_OPACITY` 0.25, the owner's choice; 0.08% of the pixels differ from `master` |
| M81 | The opacity slider of a TMTV fusion starts at 100% while its PET is drawn at 25% at most | OHIF | fixed in task O15 (`3aee48d6fe`): the ramp is the shape, `opacity` 0.2501 the level; the slider starts at 25% |
| M82 | The thumbnails of the CT and the SCOUT are blown out | Cornerstone | the owner's thumbnails: decided, they are JPEG files of the test data, the same on `master`; found on the way: `loadImageToCanvas` drew black on the tiled engine (`sx`, `sy` of a planar viewport): fixed in cornerstone `2810086ec` (FX14), checked in task O16 (the 23 series as `master`) |
| M83 | A PET added as a data overlay shows the wrong slice for about a second | OHIF + Cornerstone | fixed: OHIF part in task O15 (`3aee48d6fe`), its start moved to `initialViewReference` in task O17 (`3728bdd459`); Cornerstone part in `9a329a5fa` (FX17), checked in task O17: the PET layer is empty until its own frame, then the right slice, never another (three runs; `master` shows a copy from 27 slices away for 0.5 to 1.0 s) |
| M84 | The panes of a TMTV sync group open on the slice of the pane that mounts last | OHIF + Cornerstone | Cornerstone part (the default slice) in `2810086ec` (FX14); OHIF part fixed in task O16 (`080428db4f`): the panes go to the slice of the finest grid; the resize writes only the framing; since task O18 (`2746e912d9`) every pane of a group starts at that slice before any pane mounts, with no hold of the synchronizer |
| M85 | A zoom or a resize of a PET pane moves the CT panes of its sync group to the centre of the PET slice | Cornerstone | fixed in cornerstone `9642ce820` (FX19), checked in task O18: the CT sagittal pane stays on 256 through a zoom, a pan, a resize and a panel toggle of the PET pane, as on `master` |
| M86 | The panes of a camera position sync group show one zoom against the fit, not one scale | Cornerstone | fixed in cornerstone `9642ce820` (FX19), checked in task O18: one scale in every group, the CT's fit (246.07 at the load, `master` 246.86) |
| M87 | A click on a segment does not move a stack to it | OHIF | fixed in task O16 (`080428db4f`): `navigatePlanarViewportToPoint` |
| M88 | The Reset button keeps the slice of a volume pane | OHIF | fixed in task O16 (`080428db4f`): the middle slice, all panes of the crosshairs |
| M89 | Three pictures change on the link `2810086ec` for a reason not found | Cause not found | closed in task O17 (`3728bdd459`): every part named (the slice grid of FX14, the cuts of M79, two pictures where the branch is right and the baseline wrong); the baselines replaced |
| M90 | A test cannot wait for the cuts of an RTSTRUCT in the other MPR planes | Cornerstone | fixed in cornerstone `be7cbd1c8` (FX21: `SEGMENTATION_CONTOUR_CUTS_COMPLETED`, `getContourCutsState`); the RT specs of an MPR wait on it since task O18 (`2746e912d9`) |
| M91 | A sagittal or coronal mount refuses an `initialViewReference` beyond the slices of the acquisition plane | Cornerstone | fixed in cornerstone `be7cbd1c8` (FX21), checked in task O18: the `test.fail` removed, the case passes |
| M92 | Loading an RTSTRUCT into an MPR pane takes the pane to its default slice, on `master` too | OHIF | fixed in task O18 (`2746e912d9`): a pane that mounts again the display set it shows keeps its position, through the load and the hydration of an RTSTRUCT or a SEG |
| M93 | A pane mounts at its position: `initialViewReference` in the mounts | work | done in task O17 (`3728bdd459`): every volume mount starts at its stored view reference, a pane mounting into a placed camera group at the group's position |
| M94 | The TMTV load takes about 2 s longer than on `master` | Cornerstone | the load fixed in cornerstone `8333d7dba` (FX23) and measured in task O20: with M96, every volume at 1,995 ms on the branch against 2,019 ms on `master` with the same settings (5,985 ms on `master` today), 58 frames drawn against 295, less main thread time; task O21 on `bda7dafac` with M101 and M102: loaded 1,531 against 1,658 ms in production, 1,934 against 2,036 ms in dev, every pane mounted and drawn 191 ms sooner; open, waits for cornerstone, for the first picture (18 ms later in production, 39 ms in dev: M99, M100, and `master` draws before seven of its ten panes have a volume) |
| M95 | The resize keeps its replay of the framing, which FX19 said to drop | OHIF | decided in task O18: without it no pane refits a pane of another size (`mpr2` 39% of its pixels, cropped), with it a group keeps one scale and `master`'s numbers |
| M96 | The TMTV load from the `ohif` source of `config/e2e.js` is paced at 5 frames per round trip and a CORS preflight per frame, on `master` too | OHIF | fixed in task O20 (`7d7b04e53c`): `e2e.js` takes the pool limits of `default.js` and an unquoted `Accept` header for that source; the load ends 4 s sooner on both sides |
| M97 | The decode workers start at the first frame the viewer decodes (5.18.3 made them at registration), about 90 ms on the first frames | Cornerstone | fixed in cornerstone `bda7dafac` (FX24, workers made when idle), checked in task O21: made at 280 ms, ready by 380 ms, about 700 ms before the first decode |
| M98 | A sagittal or coronal pane of TMTV shows its first rows on the next 100 ms tick, about 0.2 s after `master` with M97 | Cornerstone | fixed in cornerstone `bda7dafac` (FX24, the first delivery into an empty pane at the next frame), checked in task O21: every pane draws 26 ms after the first frame (`master` 3 ms), no 100 ms tick |
| M99 | A planar pane of a volume samples its first slice at the mount, before any frame of the volume has arrived (18 ms of the TMTV mount in production) | Cornerstone | open, waits for cornerstone (proposal: skip the rows of frames that have not arrived) |
| M100 | `init()` of Cornerstone3D takes about 3 ms longer: the probe of the rendering capabilities | Cornerstone | open, waits for cornerstone (small) |
| M101 | The viewer ships a second copy of dcmjs and seven other libraries with a linked Cornerstone3D (1.03 MB before the first picture in production) | OHIF | fixed in task O21 (not committed yet): `dedupeAlias` in `.rspack/resolveConfig.js` |
| M102 | The panes of a camera position group computed the slice grid of every member at each mount (about 50 grids for 6) | OHIF | fixed in task O21 (not committed yet): one grid per volume of the cache, orientation and slice step measure |

**The count.** 102 entries; 9 of them record a planned task ("work": M54, M56 to M58,
M60, M61, M68, M69, M93), so the upgrade met **93 problems**:

| Whose | Problems | Fixed | Open | Decided |
|---|---|---|---|---|
| Cornerstone3D (the library, its codemod or its guide) | 41 | 38, all in Cornerstone3D (M71 in `28dd3ab33`, checked in task O9b; M41, M46 and M48 in `ccb599e2a` and M78 in `472d908e8`, checked in task O12; M79 in `487285b21`, checked in task O13; M82 in `2810086ec`, checked in task O16; M85 and M86 in `9642ce820`, M90 and M91 in `be7cbd1c8`, checked in task O18; M97 and M98 in `bda7dafac`, checked in task O21) | 3: M94 (the first picture of the TMTV load, 18 ms after `master`'s in production), M99 (a planar pane samples its slice at the mount before any frame arrived), M100 (the probe of the rendering capabilities in `init()`) | |
| OHIF (34 in its code, 6 in its tests) | 40 | 38 in OHIF (M74 and M75 in `2e5ecdd662`; M76 and M77 in `2bbed3c040`; M80 and M81 in `3aee48d6fe`; M87 and M88 in `080428db4f`; M92 in `2746e912d9`; M96 in `7d7b04e53c`; M101 and M102 in task O21, not committed yet) | | 2: M19, M95 |
| Both | 10 | 6 (M11, M13, M42, M43; M84: the Cornerstone part in `2810086ec`, the OHIF part in `080428db4f` and task O18; M83: the OHIF part in `3aee48d6fe` and `3728bdd459`, the Cornerstone part in `9a329a5fa`, checked in task O17); the OHIF part of M10, M16 and M27 | M14 waits for the owner (the run in CI); the Cornerstone part of M10, M16 and M27 (two guide notes and a codemod report, small) | |
| Cause not found | 2 (M50, M89) | M50 closed by measurement in task O9; M89 closed in task O17 (every part named) | | |

Open today: **M14** (waits for the owner: the Playwright run in CI); three of
Cornerstone3D about the TMTV load: **M94**, now only the first picture (18 ms after
`master`'s in a production build, 39 ms in dev; every pane is mounted and drawn 191 ms
sooner and the load ends 127 ms sooner than on `master`, task O21), **M99** (a planar pane
samples its first slice at the mount before any frame has arrived, 18 ms of the mount) and
**M100** (the probe of the rendering capabilities in `init()`, about 3 ms); and three
small asks of Cornerstone3D in M10, M16 and M27 whose OHIF part is done. M85, M86, M90 and
M91 are fixed in Cornerstone3D and checked in task O18, M97 and M98 in task O21; M92 is
fixed in OHIF in task O18, M96 in task O20, M101 and M102 in task O21. M95 records a
decision of task O18 that the owner may want to take otherwise.

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
- **State today (task O9):** fixed in cornerstone `7eecbab52`, which is in the tag `v6.0.0-beta.2`; the link at `735fc811e` has it.

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
- **State today (task O9):** closed: the OHIF part in `fbdd648d97`; the Cornerstone guide names the case (`4-upgrade-step-by-step.md`: an application that stores `ViewportType.STACK` or `ORTHOGRAPHIC` as its own marker of the data gives itself its own values).

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
- **State:** fixed in package U2 (committed in `8f7232418c`). Check: the same test file, run
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
  after package U3; committed in `1653f6df00`). The 23 were members of a viewport class read
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
- **State today (task O9):** done: every spec runs on the one path (M14).

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
- **State today (task O9):** closed: the OHIF part in `fbdd648d97`; the Cornerstone guide names it (the paragraph before the rows of the `_NEXT` names in `3-api-map.md`).

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
- **State today (task O9):** the OHIF part closed in `fbdd648d97`; the Cornerstone part (the row should say that the members are on `PlanarViewport` and that an empty viewport gives 0) is open, a small guide note.

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
- **State:** the OHIF part is fixed in package U4 (committed in `e5881fc1a7`). Check:
  `SegmentationService.test.ts`, "adds a labelmap that is asked for on a 3D viewport as
  a surface" (the test of `master` again; it failed first), and in the viewer the call
  above returns and the viewport has a `Surface` representation. The cornerstone part is
  open.
- **State today (task O9):** closed: the OHIF part in `e5881fc1a7`; the Cornerstone part fixed by package C5 (its open issue 127: undefined for a viewport without an image on display).

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
- **State:** fixed in package U2 (committed in `8f7232418c`). Check:
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
- **State today (task O9):** closed: the comparison leaves the paths out; the declaration paths are fixed in cornerstone by package C2 (its open issue 114); the type check of task O9 on the link at `735fc811e` has no `Cannot find module 'packages/...'` error (`master` on 5.18.3 has 27).

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
  - This branch on 6.0 after package U6, on cornerstone `1b3b2247e`: 242 pass, 1 fails
    (a picture differs, 0.08), 4 skipped. Against the run after package U4: 0 new, 3 no
    longer failing: `RTHydrationFromMPR` (M30), `MPRThenRTOverlayNoHydration` (M31) and
    `SEGHydrationFrom3DFourUp` "should properly hydrate" (M30, then two new baselines of
    the fill alpha, M36). The one left, `SEGHydrationFrom3DFourUp` "should hydrate SEG
    only in the target viewport and preserve other viewport orientations", has its 3D
    pane right now (M32) and fails for M42, an OHIF cause that is not small
    (`laneU6/pw/run-full.json`, `laneU6/pw/run-full.tsv`).
  - This branch on 6.0 after package U7, on cornerstone `1b3b2247e`: 243 pass, 0 fail, 4
    skipped (the four `test.skip` of TMTV), 6 workers. Against the run after package U6: 0
    new, 1 no longer failing: `SEGHydrationFrom3DFourUp` "should hydrate SEG only in the
    target viewport and preserve other viewport orientations" (M42), against its baselines.
    No baseline picture was updated (`laneU7/pw/run-full-6.json`, `run-full-6.tsv`). A run
    before it with Playwright's default of 12 workers on this Mac (24 cores) failed 4:
    three clicks of the layout menu of 3D specs timed out (`3DOnly`,
    `SEGHydrationFrom3DFourUp` "should properly hydrate", `SEGHydrationThen3DOnly`) and
    `LivewireContourSegmentation` "should keep two disjoint Livewire contours separate"
    saw 8 handles where it waits for 3. All four pass alone, twice each, and in the run
    with 6 workers (`laneU7/pw/run-full.json`, `four-alone.json`): the load of 12 workers,
    not the change. The runs of this log are with 6 workers.
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
- **State:** open for CI (step 9): on this Mac every test passes after package U7 (243 pass,
  4 skipped). The 4 that waited for cornerstone after package U4 are settled: 3 pass after
  package U6, and the fourth after package U7 (M42). The 15 of the run
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
- **State today (task O9):** on this Mac every spec passes on the link at `735fc811e` (task O9); the run in CI is open, waits for the owner (open point 2 of the plan).
- **Task O12, link at `472d908e8`:** 245 passed, 0 failed, 0 flaky, 4 skipped (7.2 min, 6 workers, `TEST_ENV=true`); the two expected failures (`test.fail`) failed as expected; no baseline changed. The two whole slide specs do not wait for `rendered` (their `visitStudy` waits for the network), so M48 does not change their time: `WSI` 8.0 s on the old link, 7.8 s now; `MicroscopyPanel` 8.1 s, 8.6 s.
- **Task O17, link at `610c47210`:** before its changes 249 passed, 3 failed (the three pictures of M89), 4 skipped (7.5 min); after them 254 passed, 0 failed, 0 flaky, 4 skipped (7.5 min, 6 workers, `TEST_ENV=true`, 258 tests with the 2 of `MPRPaneMountsAtStoredPosition.spec.ts`); the three expected failures (`test.fail`: `ContourSegmentRename`, `UndoRedoSegmentation`, and the M91 case of the new spec) failed as expected; 3 baselines replaced by the owner's exception (M89, lane O17 `baselines/LIST.md`).

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
- **State:** the OHIF part is fixed in package U2 (committed in `8f7232418c`). Checks:
  `initCineService.test.ts` (new; 2 of its 4 tests fail with the old guard),
  `IViewportAdapter.contract.test.ts` ("getVolumeIds keeps the ids that the viewport
  takes as volume ids", "getBlendMode reads the blend mode of the presentation"). The
  cine of a 4D volume and the labelmap on a MIP were not seen on a screen: no Playwright
  spec opens the preclinical 4D mode, and the TMTV specs pass as before. Step 10. The
  cornerstone part is open.
- **State today (task O9):** closed: the OHIF part in `8f7232418c`; the Cornerstone guide names it (`4-upgrade-step-by-step.md`: an optional call of a removed member does not fail either).

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
- **State:** the OHIF part is fixed in package U2 (committed in `8f7232418c`). Check: jest in
  full and `pnpm run build`; `WindowLevelTool.test.ts` for the list. The cornerstone
  part is open.
- **State today (task O9):** the OHIF part closed in `8f7232418c`; the Cornerstone part (a report of a rewrite that makes a line equal to its neighbour) is open, small.

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
- **State:** fixed in the code in package U2 (committed in `8f7232418c`), **not seen on a
  screen**: no Playwright spec opens the preclinical 4D mode and the test data has no
  4D study. Check so far: `IViewportAdapter.contract.test.ts` (the volume ids and the
  binding of a volume), the build and the type comparison (no `setProperties` is left).
  Step 10 opens the mode by hand.
- **Closed by M61 (task O6):** the rows ask the viewport (`getVolumeIds()`,
  `getDisplaySetIdForVolumeId`, `getScalarRange`, `getEffectiveDisplaySetAppearance`) in
  place of the actors of the adapter, and were seen on a screen on both sides: the panel
  added to the left panel of the viewer and of TMTV, and in the preclinical 4D mode with
  the 4D study of the test data.

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
  `62cf392da` (committed in `15b843a50a`). Checks: the four specs pass, three times each
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
- **State today (task O9):** decided, left as on 5.x (the owner's call to make the error text work).

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
- **State:** the OHIF part is fixed in package U3 (committed in `1653f6df00`). Check:
  `NextViewportOperations.test.ts` (new; 2 of its 5 centring tests fail without the
  change) and the two Playwright specs. The cornerstone part is open.
- **State today (task O9):** closed: the OHIF part in `1653f6df00`; the Cornerstone guide gives the recipe (the pan that brings a point to the centre of the canvas, in the section of the camera synchronizer of `2-rendering-changes.md`).

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
- **State:** the OHIF part is fixed in package U3 (committed in `1653f6df00`). Checks:
  `hydrateStructuredReport.test.ts` (new; both tests fail with the old line),
  `CornerstoneViewportService.test.ts` ("a viewport that could show a measurement as a
  volume", 2 tests, both failed first), and the three Playwright tests, which fail
  again when the line of `hydrateStructuredReport` is put back (run once). The
  cornerstone part is open.
- **State today (task O9):** closed: the OHIF part in `1653f6df00`; Cornerstone judges a reference by its image or its plane (DS4), so a `volumeId` that is no volume of the viewport no longer decides it.

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
  viewport, is drawn as a volume slice). Not seen in a failing test. Step 11. Seen in a
  failing test in package U6, once M32 was fixed: M42, fixed in package U7 (a data id for
  each shape).
- **Also explained by it:** `LabelMapSegmentationColorChange.spec.ts` ("does not
  change the labelmap segment color when the user cancels"),
  `SEGNoHydrationThenMPR.spec.ts` and `SegAcrossViewportTypes.spec.ts` ("keeps the
  selected segment selected across viewport types") pass with the change and fail
  again with the old rule (run once). They show a SEG over a stack.
- **State:** fixed in package U3 (committed in `1653f6df00`). Check:
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
- **State:** fixed in package U3 (committed in `1653f6df00`). Check:
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
- **State:** the OHIF part is fixed in package U3 (committed in `1653f6df00`). Check:
  `NextViewportOperations.test.ts` ("setOrientation", 5 tests, all failed first), and
  the command in the viewer: the view plane normal goes from `[0, -1, 0]` to
  `[1, 0, 0]`. No Playwright spec opens the orientation menu on a 3D viewport. The
  cornerstone part is open.
- **State today (task O9):** the OHIF part closed in `1653f6df00`; the Cornerstone part (what an axis name, the acquisition plane and a reformat name become on a 3D viewport) is open, a small guide note.

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
- **State:** fixed in package U4 (committed in `e5881fc1a7`). Check:
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
- **Fixed in cornerstone** `1b3b2247e` (open issues 123 to 128 there): in volume mode a
  view reference that names an image and no frame of reference is not viewable with any
  option, as on the legacy volume viewport, so OHIF leaves the pane where it is.
  `setViewReference` with such a reference still goes to the image, where 5.18.3 threw
  (decided there).
- **State:** fixed in cornerstone. Checks (package U6, on the linked checkout at
  `1b3b2247e`): `RTHydrationFromMPR.spec.ts` passes; `SEGHydrationFrom3DFourUp.spec.ts`
  "should properly hydrate SEG from 3D four up layout" is on the slice of the baseline and
  passes with the two new pictures of the fill alpha (M36) and three times in a row
  (`laneU6/pw/waited-1.json`, `laneU6/pw/m36b-repeat.json`).

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
- **Fix, in cornerstone:** the plane of a contour comes from its points, not from the
  viewport that draws it first (cornerstone3D `1b3b2247e`, open issues 123 to 128 there).
- **Fix, in OHIF:** none (rule 3).
- **State:** fixed in cornerstone. Check (package U6, on the linked checkout at
  `1b3b2247e`): `MPRThenRTOverlayNoHydration.spec.ts` passes (`laneU6/pw/waited-1.json`).

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
- **Fix, in cornerstone:** `renderingEngine.resize(immediate, keepCamera)` reads
  `keepCamera` again for the planar and 3D viewports, and the fit of a 3D viewport uses
  the size the engine draws at (cornerstone3D `1b3b2247e`, open issues 123 to 128 there).
- **Fix, in OHIF:** none for the resize (rule 3). M33 is the part that was OHIF's.
- **State:** fixed in cornerstone. Check (package U6, on the linked checkout at
  `1b3b2247e`): in `SEGHydrationFrom3DFourUp.spec.ts` "should hydrate SEG only in the
  target viewport and preserve other viewport orientations" the 3D pane of the 3 by 2 grid
  shows all of the volume, as the baseline does. **The test still fails, for another
  cause: M42** (the pane of the SEG, 0.08). With only the cause of M42 taken away in the
  page, the whole test passes, its 3D pictures included (`laneU6/whatif/stackPayload.json`).

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
- **State:** fixed in package U4 (committed in `e5881fc1a7`). Check:
  `NextViewportBackend.test.ts`, "the position presentation of a 3D viewport" (3 tests,
  2 failed first), and in the viewer: the zoom after the round trip is 0.5 with the
  change and 1 without it (`laneU4/probes-6-newbuild.log`,
  `laneU4/fit3d-back-6-without-newbuild.log`). It does not make the test of M32 pass.
- **Closed by M58 (task O4, committed in `8659924b25`):** the position presentation of a 3D
  viewport is its framing, `viewport.getViewFraming()`, with the camera: the direction
  comes back too, with the zoom and the pan against the fit (the pan only while M59 is
  open). `viewportProjection` and `_set3DViewPresentation` are gone from the backend.

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
- **State:** fixed in package U4 (committed in `e5881fc1a7`). Check: the test passes.

## M35. The picture of a failed clipped screenshot was of the whole page

- **Seen:** `MPRThenRTOverlayNoHydration.spec.ts` fails with "Expected an image 955px
  by 496px, received 1280px by 540px", ratio 0.56, and its "actual" picture is the page
  with the header and the study browser.
- **Why:** `checkForScreenshot` takes a clipped picture of a locator as a picture of
  the page, and it set `locator = page` for that. From the second attempt on the
  bounding box was the one of the page. Only a test that fails its first attempt gets
  there, so the size and the ratio of the failure were wrong, not its verdict.
- **Fix, in OHIF:** the locator stays, each attempt reads its bounding box again.
- **State:** fixed in package U4 (committed in `e5881fc1a7`). Check: the same spec, which still
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
- **State:** done in package U4 (committed in `e5881fc1a7`). Check: both specs pass.
- **Two more pictures (package U6), once M30 was fixed:** `SEGHydrationFrom3DFourUp.spec.ts`,
  "should properly hydrate SEG from 3D four up layout", `threeDFourUpAfterSEG.png` (0.03)
  and the picture after it, `threeDFourUpAfterSegHydrated.png`, which the test had not
  reached before. The same cause: the commonest changes are the red segment from
  (192, 104, 104) to (208, 80, 80) and the green one from (104, 192, 104) to
  (80, 208, 80); 0.3% and 0.07% of the pixels differ by more than 32. With the fill
  lowered in the page to 0.64 of the style and nothing else changed, the test passes
  against the old pictures (`laneU6/whatif/alpha.json`). The two pictures were made with
  `--update-snapshots=changed` for this one test (`-g`): no other file changed, and the
  test passes with them three times in a row (`laneU6/pw/m36b-repeat.json`). Made on
  this Mac. The old pictures and a side by side of each are in `laneU6/baselines/`.

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
- **State:** fixed in package U5 (committed in `15b843a50a`). Check: the search over tracked and
  untracked files finds no `Next(Viewport|Segmentation)`, no `nextViewports` and no
  `_NEXT` name in `extensions`, `modes`, `tests` and `platform` (the hits left are listed
  in the report of the package), and jest passes with `viewportOperations.test.ts`.

## M38. A window level drag in an MPR changes the window twice as much

- **Seen (package U6, step 10):** basic mode, the CT "CT WB 5.0 B35f" (174 images) of
  the test study "PETCT", MPR, one drag of the window level tool over the axial pane
  (8% of the pane to the right, 5% up). The window goes from W: 752 L: -164 to W: 844
  L: -336 on 6.0 and to W: 798 L: -250 on 5.18.3 (legacy path). On the GPU and on the
  CPU. The same drag on the stack gives the same window on both.
- **Why:** the multiplier of `WindowLevelTool`. On 5.18.3 the tool gives the volume id of
  a volume viewport to `_getMultiplierFromDynamicRange`, which takes the range of the
  middle slice of the volume. On 6.0 it gives no volume id (`volumeId: undefined`, after
  `utilities.getScalingDescriptor(viewport)`), so the multiplier comes from
  `viewport.getImageData().voxelManager.getRange()`: the range of the whole volume. For
  this CT that range is [-1024, 2572], twice the range of the middle slice.
- **Smallest case:** the MPR of that CT;
  `ToolGroupManager.getToolGroupForViewport(id).getToolInstance('WindowLevel')._getMultiplierFromDynamicRange(viewport, volumeId)`
  as each version calls it: 2 on 5.18.3, 4 on 6.0 (each of the three panes). On the stack:
  2 on both (`laneU6/probes/wlmpr.log`). The same on cornerstone `62cf392da` and
  `1b3b2247e`.
- **The guide:** says nothing of the window level tool.
- **Fix, in cornerstone:** to do: the tool gives the volume id of the volume on display
  in volume mode, as 5.x did, or the guide names the change.
- **Fix, in OHIF:** none (rule 3).
- **State:** open, waits for cornerstone.
- **Closed (task O3, 25 November):** fixed in cornerstone (the guide: "a window level drag
  in volume mode takes its multiplier from the volume on display, as 5.x did"). Check, the
  same drag on both (8% right, 5% up of the axial pane of the MPR of the CT
  `1.3.6.1.4.1.14519.5.2.1.1706.8374.643249677828306008300337414785`): W: 166 L: -56 on
  5.18.3 and on this branch (lane O3, `cases/{base,branch}/mpr-wl-drag/log.json`).

## M39. On the CPU a planar viewport misses a resize back to its first size

- **Seen (package U6, step 10):** basic mode on the CPU (`?viewportRendering=cpu`), the
  same CT stack: layout 1 by 2, then 1 by 1. In the 1 by 1 layout the image is drawn
  stretched to twice its width, and a length drawn with the same two clicks reads 365 mm
  where the GPU reads 241 mm. The overlay and the slice are right. On the GPU the
  viewport comes back as it was.
- **Why, read in the code and measured:** `ContextPoolRenderingEngine._resizeVTKViewports`
  resizes a viewport when the size of its element differs from `canvas.width` and
  `canvas.height` of the canvas that `getOrCreateCanvas(element)` gives. On the CPU path
  that canvas keeps its first size (1115 by 842 in all three steps below: the CPU draws
  into a second canvas). The change to half the width differs from 1115 and runs
  `viewport.resize()`. The change back to 1115 equals the stale 1115, so the viewport is
  not told, and it keeps the geometry of the half width.
- **Smallest case**, with cornerstone calls only (`laneU6/specs/resizecore.spec.ts`,
  `laneU6/probes/resizecore.log`): a stack in a viewport of 1115 by 842,
  `viewport.setPan([89, 50])`, the element at half its width and
  `renderingEngine.resize(true)`, then the element at its width again and
  `renderingEngine.resize(true)`. `viewport.worldToCanvas(<centre of the image>)`:

  | | panned | half width | full width again |
  |---|---|---|---|
  | 6.0, GPU | [647.3, 471.8] | [324.1, 471.5] | [647.3, 471.8] |
  | 6.0, CPU | [647.3, 471.8] | [324.1, 471.5] | [324.1, 471.5] |
  | 5.18.3, GPU (legacy stack) | [647.3, 471.8] | [368.5, 471.5] | [647.3, 471.8] |

  5.18.3 on the CPU is wrong in its own way: `setPan([89, 50])` reads back
  [91.6, -130.6], and each resize moves the image further up (the centre at y 206, -98,
  -409), out of the viewport. The 6.0 rows are the same on cornerstone `62cf392da` and
  `1b3b2247e`.
- **Second effect, a jump:** in the longitudinal mode on the CPU (the MR "SAG T-1" of the
  test study "BRAIN SELLA"), layout 1 by 2 and back, two measurements, then a click on a
  measurement in the panel: the panel opens, the viewport is resized, and the centring on
  the measurement (M20) works from the stale geometry. The pan goes to [-788.7, -268.3]
  and the image leaves the viewport; the length reads 146 mm where the GPU reads 96.5 mm.
  On the GPU the same steps keep the image in view.
- **Fix, in cornerstone:** to do: the engine compares the element with the size that the
  viewport draws at (the CPU canvas on the CPU path).
- **Fix, in OHIF:** none (rule 3).
- **State:** open, waits for cornerstone.
- **Closed (task O9, link at `735fc811e`):** fixed in cornerstone (package C6, its open
  issue 129: the context pool engine compares with the size it draws each viewport at).
  In the viewer on the CPU (lane O9 `specs/modes.spec.ts`, basic viewer): the CT stack
  through a 2x2 layout and back is the same picture as on the GPU (0.0% of the pixels
  differ by more than 16), and the stack, MPR and capture steps differ from the GPU by at
  most 0.17%. The second effect, the jump to a measurement on the CPU, had another cause:
  M72.

## M40. A resize keeps the pan of a planar viewport as a share of the canvas

- **Seen (package U6, step 10):** basic mode, the CT stack, panned, then the measurement
  panel opens: the canvas goes from 1115 to 868 pixels wide and the image moves about 20
  pixels towards the centre on 6.0. On 5.18.3 it keeps its place. On the GPU and on the
  CPU.
- **Why:** the view state of a planar viewport holds the pan as `anchorCanvas`, a share
  of the canvas (`[0.5, 0.5]` is the centre). After a resize the same share is a smaller
  distance in pixels. The legacy viewports kept the focal point of the camera, so the
  image kept its distance from the centre in screen pixels.
- **Smallest case:** the table of M39: `getPan()` after the element goes to half its
  width is [44.5, 50] on 6.0 and [89, 50] on 5.18.3, and the centre of the image is at x
  324.1 against 368.5. Back at full width both read [89, 50]. The same on cornerstone
  `1b3b2247e`, whose `resize(immediate, keepCamera)` reads `keepCamera` again.
- **The guide:** the row of `resetCameraForResize()` in `3-api-map.md` says "The same in
  both modes", and "Display area and stretch" in `2-rendering-changes.md` does not name
  a resize.
- **Fix, in cornerstone:** to do: keep the pan in screen pixels through a resize, as 5.x
  did, or name the change in the guide.
- **Fix, in OHIF:** none (rule 3).
- **State:** open, waits for cornerstone. A small move, seen only after a pan.
- **Closed (task O4, 25 November):** fixed in cornerstone (a resize of a planar viewport
  keeps its parallel scale and its focal point). Check: the CT stack, panned, the window
  from 1600 to 1100 pixels wide and back: the centre of the image stays 128 and 47 pixels
  from the centre of the canvas on 5.18.3 and on this branch, at the same scale (lane O3,
  `cases/{base,branch}/resize-pan/log.json`). OHIF's resize keeps storing and restoring
  the position presentation, now the framing (M58).

## M41. A console warning of Chrome on the CPU path

- **Seen (package U6, step 10):** on the CPU, at the first image of a stack and at the
  first image of an MPR: `Canvas2D: Multiple readback operations using getImageData are
  faster with the willReadFrequently attribute set to true`. 5.18.3 on the CPU has no
  such warning.
- **Why, read in the code:** the CPU draw step of a planar viewport reads its canvas back
  with `getImageData` (for example `planarSampledSliceCanvas.ts`, the blend of a slice
  over what is drawn below it), and no 2D context of `core` or `tools` is made with
  `willReadFrequently`. Chrome warns once for each such canvas.
- **Fix, in cornerstone:** to do: `getContext('2d', { willReadFrequently: true })` for the
  canvases that are read back on each draw.
- **Fix, in OHIF:** none (rule 3).
- **State before task O12:** open, waits for cornerstone. A warning, nothing else is
  seen. Task O9: no 2D context of `core` or `tools` at `735fc811e` is made with
  `willReadFrequently`.
- **Fixed in cornerstone (lane FX7, `ccb599e2a`):** the canvas that a planar viewport
  shows on the CPU and the overlay layer of a video viewport are made with
  `willReadFrequently: true`, and the CPU draw step no longer reads back the canvas into
  which it writes the pixels of an image. The Cornerstone guide names it
  (`2-rendering-changes.md`, "The canvas that shows keeps its pixels in memory").
- **Checked (task O12, link at `472d908e8`, lane O12 `specs/m41.spec.ts`,
  `specs/m41trace.spec.ts`, `cases/m41/`):** with `?viewportRendering=cpu`, each case on a
  new page, every console message counted by its text. A CT stack scrolled over 10
  images: 0 readback warnings. An MPR scrolled in its three panes, then zoomed out to 0.6
  so that the faces of the volume are in view and scrolled again: 0. The TMTV mode, each
  of its 10 panes scrolled: 1, and that one is not the CPU draw step: a trace of
  `getContext` and `getImageData` shows a 400 by 400 canvas of vtk.js
  (`vtkAnnotatedCubeActor`, the cube of the orientation marker tool) read 18 times. The
  same single warning comes on the GPU, on the branch and on `master` (on the CPU
  `master` draws no volume pane and makes no cube). Each canvas of a viewport on the CPU
  path is made with `willReadFrequently: true` and is read 1 to 6 times without a
  warning. The entry had no count for the old link.
- **State:** fixed in cornerstone `ccb599e2a`, checked in task O12.

## M42. A stack of a series that another pane shows as a volume is drawn as a volume slice

- **Seen (package U6):** `SEGHydrationFrom3DFourUp.spec.ts`, "should hydrate SEG only in
  the target viewport and preserve other viewport orientations" (0.08 on
  `afterSEGHydrated.png`), once M32 was fixed: the SEG is loaded into the third pane of a
  3 by 2 grid made from the 3D four up. On 5.18.3 that pane is a stack on image 1 of 52 (a
  slice of the chest, with three segments). On 6.0 OHIF mounts it as a stack too
  (`viewportType: 'stack'`), but `viewport.getCurrentMode()` is `volume`, and it stays on
  slice 26 of 52 (the abdomen) (`laneU6/probes/seg3x2-base.json`,
  `laneU6/probes/seg3x2-v6.json`). The slice follows from the mode: a stack goes to the
  first image with a segment, a volume does not (M30).
- **Why:** OHIF registers one data id per display set, its UID
  (`DataIdRegistry`, `dataIdRegistry.ts`), and the first registration wins, except that a
  volume one replaces a stack one. The panes of the 3D four up register the CT with its
  `volumeId`. The stack mount of the SEG viewport registers `{ imageIds }` under the same
  id, which is ignored, so cornerstone finds a `volumeId`. A planar data set with a
  `volumeId` always takes the volume path (`isVolumeBackedDataSet` in
  `PlanarRenderPathDecisionService.ts` of core). The guide registers a stack as `{ imageIds }` and a
  volume as `{ imageIds, volumeId }` under a display set id each (the rows of `setStack()`
  and `setVolumes()` in `3-api-map.md`), so a series shown both ways at once needs two ids.
  On the legacy path the stack was a `StackViewport`. M22 named this case ("left as it
  is", no failing test then).
- **Smallest case:** the steps of the test above; read the third pane after the
  hydration: 5.18.3 `stack` on image index 0 of 52; 6.0 `planar`, mode `volume`, on index
  25 of 52.
  With the `volumeId` taken out of the registration of the CT in the page just before the
  SEG is loaded, and nothing else changed: mode `stack` on index 0 of 52, and the whole
  test passes against its baselines (`laneU6/whatif/`, `stackPayload.json`, the picture
  `laneU6/baselines/afterSEGHydrated-whatif-stackPayload.png`).
- **What a user sees:** a series opened as a stack after it was shown as a volume in
  another pane (an MPR, a 3D layout) is drawn as a volume slice: the slice of an RTSTRUCT
  or a SEG, the window level drag (M38) and the texture of the volume (reduced with
  `lossyDownsampling`) follow the volume.
- **Fix, in OHIF (package U7):** a mount gets a data id of its own while its display set
  is registered for the other shape. Replacing the registration at the stack mount is not
  a fix: a mounted planar viewport reads its registration again after the mount
  (`PlanarViewport.getDataSet`, eight places, the render path decision among them), so
  the MPR panes would lose their volume.
  - **One home:** `utils/displaySetDataId.ts`. `getDataIdForShape(uid, shape, shapeOfUID)`
    names the data id of a display set for a shape (`stack` or `volume`), and
    `getDisplaySetUIDForDataId(dataId)` gives the display set UID back.
  - **The scheme:** a display set keeps its UID as data id. Only while the UID is
    registered for the other shape does a mount get `<uid>::stack` or `<uid>::volume`, as
    `::overlay` was reserved for an overlay. Why: a series shown one way (every stack of
    the basic viewer, every MPR, the TMTV panes, a 3D view) keeps its UID, its
    registration, its removal at the last release and the data id in its annotations, as
    before. Only a series shown both ways at once has a second data id. A fixed suffix per
    shape would change the data id of every stack (or of every volume) for a case that
    needs both at once. Measured: after a stack, an MPR of its series gets the UID (the
    stack pane is released first), and so does the stack again after the MPR.
  - **The registry:** `DataIdRegistry.register(viewportId, displaySetInstanceUID, payload)`
    gives the data id to mount by. A payload never replaces a registration of another
    shape: `promotesToVolume` is gone (a volume payload replaced a stack one under a data
    id that a stack viewport was bound to: the cause of this entry and of the same effect
    in one pane, a stack shown after its MPR in that pane). The unused
    `DataIdRegistry.dataIdFor` (the `::overlay` scheme) is gone: the helper is the one
    home. The registry keeps the registrations that a reference can name: M51.
  - **The readers:** the backend mounts and addresses the presentations of a volume by the
    data id that the registry gives; the ECG, video and slide mounts track the display set
    UID in the service bookkeeping (they tracked the data id, the same value until now).
    The adapter resolves the id given to `getPresentation`, `setPresentation` and
    `getDefaultVOIRange`, a data id or the UID of a display set that shows under a data id
    of its own, to that binding. So `getColormap`, `setLayerOpacity` (the fusion slider,
    and the window level panel, which gives it a data id), `setLayerThreshold`,
    `getBlendMode` and the viewport operations `setWindowLevel` and `setColormap` reach
    the binding as they are. `getDataIdForDisplaySet` gives the data id under which the
    viewport shows the display set (so `useViewportRendering` and the colour bar). The
    window level panel reads its data ids from cornerstone (`findDataIdByVolumeId`). No
    other reader: a search of `dataId`, `displaySetId`, `getSourceDataId` and
    `getDisplaySets` over tracked and untracked files, and the type check (the signature of
    `registerDataId` changed). The view references of measurements carry the data id
    into cornerstone, which reads its registration (M51); OHIF reads no data id from them.
  - **OHIF's migration page** (`cornerstone3d-6.md`), point 5 for extension authors: a
    data id is the display set UID, or `<uid>::stack` / `<uid>::volume`; ask the adapter.
- **Fix, in cornerstone:** none for the scheme; the guide's model has one id for each. The
  references are M51.
- **Replaced (task O2, 25 November):** Cornerstone keeps what is true of the data in the
  registration and what one viewport wants on its mount (`mode`, `volumeId`,
  `initialImageIdIndex`, `appearance`), and a mount copies what it reads, so a display set
  registered once under its UID shows as a stack in one viewport and as a volume in
  another (task DS3 of cornerstone). OHIF registers each display set once, when it is
  made (`displaySetStore.ts`, M54), and mounts it by its UID with `mode: 'stack'` or
  `mode: 'volume'`. `DataIdRegistry`, `utils/displaySetDataId.ts` and the scheme
  `<uid>::stack` / `<uid>::volume` are deleted, and so is point 5 of OHIF's migration page
  (data ids). Checked: `ViewportBackend.test.ts` ("shows one display set as a stack in one
  viewport and as a volume in another under its UID (M42)") and, in the viewer, an axial CT
  as a stack beside its axial volume (M54). The Playwright run of M54 is the run of
  `SEGHydrationFrom3DFourUp.spec.ts`.
- **State:** closed by task O2 (committed in `309cc169f3`); the workaround of package U7 is
  deleted. The checks of package U7 below are history:
  - jest: `utils/displaySetDataId.test.ts` (5 tests), `backends/dataIdRegistry.test.ts` (10
    tests: a stack mount after a volume one, a volume mount after a stack one, the same
    display set in both at once, the remounts; 9 failed on the registry of `2f4718f986`,
    `laneU7/jest-registry-before.log`), `ViewportBackend.test.ts` "the data id of a mount"
    (2 tests, both failed first), `IViewportAdapter.contract.test.ts` (3 tests; 2 failed
    first, the third guards a call by data id, `laneU7/jest-adapter-backend-before.log`).
  - Playwright: `SEGHydrationFrom3DFourUp.spec.ts` passes, both tests, against their
    baselines, no new picture; "preserve other viewport orientations" three times in a row
    (`laneU7/pw/m42.json`, `m42-repeat.json`). The 38 specs that move a series between a
    stack and a volume (data overlays, SEG and RTSTRUCT over MPR, M22, M29, M34, TMTV, 3D):
    50 pass, 4 skipped (`laneU7/pw/item1-subset.json`).
  - In the viewer, against 5.18.3, basic mode, the CT of the test study "PETCT"
    (`laneU7/specs/refs.spec.ts`, `laneU7/probes/refs-*.json`): the CT shown as a stack
    after its MPR in the same pane is a stack on image 87 of 174 (before: a volume slice);
    a 1x2 grid with the CT as a stack and as an axial volume, the stack shown again after
    the volume is a stack (before: a volume slice). A length drawn on the stack and one
    drawn on the volume are drawn on both panes and each jump lands on its slice (30, 20,
    71, 62 of 174, as on 5.18.3), also after the pane of the other shape is gone.

## M43. A jump to an empty segment put every pane on slice NaN

- **Seen (package U6, step 10):** TMTV mode, the test study "LUNG DELAYS": a segmentation
  with an empty segment (the rectangle threshold throws on both versions, see the note),
  then a click on the segment in the panel. On 6.0 all ten panes go to slice NaN, stop
  reporting rendered, and the console says `ImageId not found for sliceIndex: NaN` and
  `No imageId found within the specified criteria`; the crosshairs after it do nothing.
  On 5.18.3 nothing moves.
- **Why:** the statistics of an empty segment have the centre `[NaN, NaN, NaN]` (the CSV
  export says `NaN NaN NaN`, on both versions). `SegmentationService.jumpToSegmentCenter`
  checked only that a centre exists and handed it to the backend. The legacy backend
  called `viewport.jumpToWorld`, which left the viewport where it was; the backend of 6.0
  calls `setViewReference({ cameraFocalPoint })`, which takes the NaN.
- **Smallest case**, cornerstone calls only, the axial pane of an MPR of a CT on slice
  87 of 174 (`laneU6/specs/nanref.spec.ts`, `laneU6/probes/nanref.log`):
  `viewport.setViewReference({ cameraFocalPoint: [NaN, NaN, NaN] })`: 5.18.3 (legacy
  volume viewport) throws `Incompatible view refs` and stays on 87; 6.0 (planar, volume
  mode) takes it and the slice is NaN. `jumpToWorld([NaN, NaN, NaN])` of 5.18.3 stays on
  87.
- **Fix, in OHIF:** `jumpToSegmentCenter` treats a centre that is not a finite point as no
  centre: it warns `No center found for segmentation` and moves nothing, as 5.x did.
- **Fix, in cornerstone:** to do: `setViewReference` ignores a focal point that is not
  finite, as the legacy viewport did (it threw).
- **Note:** the "Run" of the rectangle threshold tool throws
  `getVolume: volumeId must not be undefined` on 5.18.3 and on 6.0 alike (the same
  steps), so the segment stays empty on both: not a difference of the upgrade.
- **State:** the OHIF part is fixed in package U6 (committed in `2f4718f986`). Check:
  `SegmentationService.test.ts`, "does not move the viewport when the centre of the
  segment is not a point" (it failed first, `laneU6/jest-before-fix.log`), with "moves the
  viewport to the centre of the segment"; in the TMTV mode the same steps now warn
  `No center found` and the panes stay on slice 52, as on 5.18.3
  (`laneU6/runs/tmtv/v6-gpu-fix/`). The cornerstone part is open.
- **State today (task O9):** closed: the OHIF part in `2f4718f986`; the Cornerstone part fixed by package C6 (its open issue 133: a reference with a value that is not finite is not viewable and moves nothing).

## M44. An SR, SEG or RTSTRUCT viewport showed no window text

- **Seen (package U6, step 10):** longitudinal mode, the SR "SR_LEN_BDIR" of the test study
  "BRAIN SELLA" opened in a viewport: the bottom left of the overlay is empty on 6.0;
  5.18.3 shows `W: 1997 L: 998`. The same for a SEG before its hydration (segmentation
  mode, the MR "MPRAGE": empty against `W: 603 L: 270`). The picture is the same.
- **Why:** the overlay reads the window through `useViewportRendering`, which asks the
  presentation and the default window of the display set of the grid. In such a
  viewport that is the SR (or SEG), while the viewport shows the images it references.
  The viewport has no binding for the SR's id, so both answers are empty. The legacy
  `getProperties()` gave the applied window whatever the display set
  (`laneU6/probes/srwindow.log`: `viewport.getDisplaySets()` lists the MR,
  `getDefaultVOIRange()` of the source gives -0.5 to 1995.5, the 5.x window).
- **Fix, in OHIF:** `ViewportAdapter.getDataIdForDisplaySet` gives `undefined` when the
  viewport shows other display sets and not this one (it lists them with
  `getDisplaySets()`), and `readPresentation` of `useViewportRendering` passes that on, so
  a call without a data id reads the source. A viewport that shows the display set, or
  that shows nothing yet, gets the UID as before. The colour bar service already took an
  undefined data id as "the active binding".
- **State:** fixed in package U6 (committed in `2f4718f986`). Checks:
  `IViewportAdapter.contract.test.ts`, "getDataIdForDisplaySet gives undefined for a
  display set that the viewport does not show" (it failed first), with "gives the UID of
  a display set that the viewport shows"; in the viewer the SR viewport shows
  `W: 1997 L: 998` again (`laneU6/probes/srwindow.log`, the last line), and the SEG
  preview `W: 603 L: 270`, as on 5.18.3 (`laneU6/runs/segmentation/v6-gpu-fix/`).

## M45. The PET of a TMTV fusion tints the whole pane red

- **Seen (package U6, step 10):** TMTV mode, the test study "LUNG DELAYS" (PT and CT), the
  three fusion panes: where the PET is zero, also outside the body, the pane is dark red,
  (96, 0, 0), where 5.18.3 (legacy path) has black. 0.22 of the pixels of the page
  differ by more than 16 from the first step on, almost all in the fusion panes
  (`laneU6/sbs/tmtv-gpu-01.png`).
- **Why:** the hanging protocol of `master` gives the PET of the fusion the colour map
  `hsv` with an opacity ramp, `[{ value: 0, opacity: 0 }, { value: 0.1, opacity: 0.8 },
  { value: 1, opacity: 0.9 }]`, so a zero PET is transparent. The next path of 5.x
  replaced the ramp with a flat 0.4 (`NEXT_FUSION_PT_OPACITY` in
  `getHangingProtocolModule.ts`), and step 2 of the plan kept the flat value for the one
  path (`FUSION_PT_OPACITY` in `extensions/tmtv/src/utils/hpViewports.ts`). The comment
  of `master` gave the reason: a next viewport applies the ramp as it is, so the
  opacity slider at 100% would not cover the CT. With the flat value the lowest colour
  of `hsv`, red, is drawn at 0.4 everywhere: 0.4 of 255 is the 96 measured.
- **The guide:** "A labelmap fill is drawn with the configured alpha" says that a colour
  layer with a numeric opacity is drawn as given. It does not cover this: the number
  here is OHIF's choice in place of the ramp. The brighter CT in the same panes is
  named ("An opaque slice of a volume is drawn at its window").
- **What the slider did on 5.18.3 (read in `master`, measured):** the legacy
  `setLayerOpacity` wrote a number into the colormap that `getProperties()` gave back as
  `{ opacity: <overall>, opacityMapping: <ramp> }`, and the volume viewport drew each
  point of the ramp at the number times its opacity (`updateOpacityMapping`). The slider
  opens at 1 and shows the ramp as it is. Its position went through a gamma of 1/5 (the
  legacy blend drew an opacity weaker): 50% wrote 0.87.
- **Fix, in OHIF (package U7):**
  - The TMTV hanging protocol gives the PET of the three fusion panes the ramp of
    `master` again (`hsv`, `[{ value: 0, opacity: 0 }, { value: 0.1, opacity: 0.8 },
    { value: 1, opacity: 0.9 }]`, `extensions/tmtv/src/utils/hpViewports.ts`; the comment
    of `master` about the legacy and next paths is gone with them).
  - The slider scales the ramp: `ViewportAdapter.setLayerOpacity` keeps the opacity points
    of the layer as the `opacityMapping` of the colormap (a list stored in `opacity`, as
    the hanging protocol gives it, moves there) and writes the number as `opacity`.
    Cornerstone draws `opacity` times each point (`ColormapPublic` of 6.0). Without this a
    number replaced the ramp (M52). The gamma of the slider stays 1 (a planar viewport
    draws the opacity as given), so 100% gives the ramp as it is and 50% each point at
    half.
  - The slider reads a ramp drawn as given as 1 (`resolveOpacityScalar`; it read the
    highest point, 0.9), as 5.18.3 read it back.
  - `FUSION_PT_OPACITY` (an export of `@ohif/extension-cornerstone`, `NEXT_FUSION_PT_OPACITY`
    in 3.13) has no user left and is removed; OHIF's migration page says so.
- **Fix, in cornerstone:** none for this entry; the merge of a list in `opacity` is M52.
- **What stays different from 5.18.3, named by the guide:** the ramp is drawn with its
  opacities as given ("A labelmap fill is drawn with the configured alpha": "the same holds
  for a colour layer with a numeric opacity, such as the PET layer of a fusion"; and the
  table of presentations in `2-rendering-changes.md`: "the opacities between 0 and 1 show
  as given. The legacy viewport drew them weaker"). So a hot spot is redder, and PET noise
  in the air (0.02 SUV) shows a faint red. The guide's `petColorMapPresentation()` gives
  weaker points for the legacy look; not used here, as the package asked for the ramp of
  `master`. The owner can choose them.
- **State:** fixed in package U7 (committed in `78432e76cb`). Checks:
  - jest: `IViewportAdapter.contract.test.ts` "setLayerOpacity scales a ramp that a hanging
    protocol gives as a list in opacity" (failed first) and "keeps the opacity mapping that
    it scaled before"; `utils/resolveOpacityScalar.test.ts` (3 tests, 2 failed first;
    `laneU7/jest-item2-before.log`).
  - In the viewer, TMTV mode, the test study "LUNG DELAYS", the axial fusion pane on the
    same slice on both (`laneU7/specs/fusion.spec.ts`, `laneU7/probes/fusion-*.json`; the
    slider driven through its menu, 100%, 50%, 0%):

    | | 5.18.3 | 6.0 before | 6.0 now |
    |---|---|---|---|
    | colormap of the PET at the start | the ramp, overall 1 | flat 0.4 | the ramp |
    | the slider when it opens | 1 | 0.4 | 1 |
    | most common colour of the pane | black, 67% | (96, 0, 0), 71% | black, 60% |
    | a pixel of air with PET 0.024 SUV | (7, 0, 0) | (102, 0, 3) | (49, 0, 1) |
    | the hottest PET voxel of the slice (9.7 SUV), 100% | (166, 102, 102) | (184, 82, 82) at 0.4; (255, 0, 0) at 1 | (243, 14, 14) |
    | the same, slider at 50% | (157, 112, 112) (0.87 × ramp) | (196, 68, 68) (flat 0.5) | (190, 75, 75) (0.5 × ramp) |
    | slider at 0% | the CT alone, (136, 136, 136) | the same | the same |

    The sagittal and coronal fusion panes start with the ramp too.
  - Playwright: the TMTV specs that run pass (`TMTVCSVReport`, `TMTVSUV`); the other four
    are `test.skip` in their sources, as on `master`, and the suite has no TMTV picture, so
    no baseline changes (`laneU7/pw/tmtv.json`).
- **Closed by M57 (task O3, committed in `8659924b25`):** the ramp is `colormap.opacityMapping`,
  the slider sets `opacity` alone, `resolveOpacityScalar` and the colormap juggling of
  `setLayerOpacity` are gone, and the PET of the fusion gets the ramp of `master` in the
  look that 5.18.3 drew it with, so the fusion panes look as on `master`.

## M46. The ultrasound pleura and B-line tool throws before the first image is drawn

- **Seen (package U6, step 10):** US annotation mode, a US study of the public demo server
  (1 series, 9 instances): at the opening of the mode, on the GPU and on the CPU, one page
  error `getImage: imageId must not be undefined`. 5.18.3 has none. After it the mode
  works: the depth guide shows, and the pleura line, the B-lines and their percentage
  (39.14% on both versions), the frame table, the jump to a frame and the JSON export are
  as on 5.18.3.
- **Why, from the stack:** `UltrasoundPleuraBLineTool.renderAnnotation` ->
  `getFanShapeGeometryParameters` -> `deriveFanGeometryFromViewport` ->
  `calculateFanGeometry(viewport.getCurrentImageId())` -> `getPixelData` ->
  `cache.getImage(undefined)`. The tools draw before the first image of the stack is
  drawn, and `getCurrentImageId()` of a planar viewport gives the image that is drawn, so
  it is undefined then (the guide says so in "Events and image loading of a planar
  viewport"). The legacy stack viewport gave the image of the current index at once.
- **Fix, in cornerstone:** to do: `deriveFanGeometryFromViewport` waits for an image (no
  image id, no fan geometry) instead of asking the cache for `undefined`.
- **Fix, in OHIF:** none (rule 3).
- **State:** open, waits for cornerstone. One error at the opening, nothing else seen.
  Seen again in task O9 (link at `735fc811e`, lane O9 `cases/m46/`): the US annotation
  mode on that study (`1.2.840.113663.1500.1.248223208.1.1.20110323.105903.687`) gives
  `getImage: imageId must not be undefined` at the opening; `master` gives none.
  `deriveFanGeometryFromViewport` is as it was.
- **Fixed in cornerstone (lane FX7, `ccb599e2a`):** the tool finds no fan while the
  viewport has drawn no image (`getFanShapeGeometryParameters()` gives false) and derives
  it at the next render. The Cornerstone guide names it (`2-rendering-changes.md`, events
  and image loading of a planar viewport).
- **Checked (task O12, link at `472d908e8`, lane O12 `specs/m46.spec.ts`, `cases/m46/`):**
  the US annotation mode on that study, on the branch and on `master`, on the GPU and on
  the CPU: no page error and no console error, at the opening or after. The depth guide
  draws its 10 dashes on all four. A pleura line and a B-line drawn with the same clicks
  give `B-Line/Pleura : 16.07 %` on the branch on the GPU and on the CPU and on `master`
  on the GPU, 15.92 % on `master` on the CPU (the 39.14 % of package U6 came from other
  lines).
- **State:** fixed in cornerstone `ccb599e2a`, checked in task O12.

## M47. A view reference that names the PET of a fusion makes the PET the source

- **Seen (package U6, step 10):** TMTV mode, the test study "LUNG DELAYS": a click in the
  MIP jumps the PET panes to the brightest point, and the synchronizers take the fusion
  panes there too. After it the three fusion panes show the CT only: the PET is under the
  CT, red only where the CT has no image, and the sagittal and coronal fusion panes count
  their slices in the grid of the PET (64 of 128 where they had 258 of 512). On the GPU
  and on the CPU. On 5.18.3 the fusion keeps the PET over the CT and the CT's grid
  (`laneU6/sbs/tmtv-step12-gpu-cpu-base.png`: branch GPU, branch CPU, base GPU).
- **Smallest case**, cornerstone calls only, the sagittal fusion pane (CT source, PET
  overlay) and the sagittal PET pane of that study (`laneU6/specs/fusionref.spec.ts`,
  `laneU6/probes/fusionref.log`): `fusion.setViewReference(pt.getViewReference())`.

  | | 5.18.3 (legacy volume viewport) | 6.0 |
  |---|---|---|
  | the reference | no `dataId` | `dataId` of the PET display set |
  | source before / after | (none) | CT / **PET** |
  | display sets after | | `overlay:CT`, `source:PET` |
  | actors before / after | CT, PET / CT, PET | CT, PET / **PET, CT** |
  | slice before / after | 256/512 / 256/512 | 258/512 / **64/128** |

- **Why:** a planar viewport that is given a reference naming one of its overlays as
  `dataId` makes that binding its source. The guide says what a reference does to the
  time point of a dynamic volume, not to the source of a fusion.
- **Fix, in cornerstone:** to do: a view reference that names an overlay of the viewport
  moves the view and keeps the source, or the synchronizers send no `dataId` to a
  viewport that shows that data as an overlay.
- **Fix, in OHIF:** none (rule 3).
- **State:** open, waits for cornerstone.
- **State today (task O9):** closed: fixed in cornerstone by package C6 (its open issue 131) and lane DS4 (150): no view reference changes the source.

## M48. A whole slide viewport never reports that it has rendered

- **Seen (package U6, step 10):** the SM study of the test data in the basic viewer
  (cornerstone's whole slide viewport): the test helper `waitForViewportsRendered` waits
  its full time after every step. The slide shows and pans, zooms and measures as on
  5.18.3.
- **Why:** `WSIViewport.setRendered()` of 6.0 does nothing ("DOM-driven WSI rendering"), so
  `viewportStatus` stays `preRender`. The legacy whole slide viewport took `setRendered`
  of the base class. `3-api-map.md` lists `viewportStatus` as "Same name".
- **Smallest case:** the slide open for 8 s: `viewport.viewportStatus` is `rendered` on
  5.18.3 and `preRender` on 6.0 (`laneU6/specs/wsiprobe.spec.ts`,
  `laneU6/probes/wsiprobe.log`).
- **Who reads it:** OHIF's Playwright helpers (every spec that waits for the viewports
  of a layout with a slide), and code that waits for `RENDERED` before it draws (the
  contour display of the tools takes another branch when a viewport is not rendered,
  M31).
- **Fix, in cornerstone:** to do: the viewport sets `RENDERED` when the map has drawn, or
  the guide names the difference.
- **Fix, in OHIF:** none (rule 3).
- **Seen again (task O9, link at `735fc811e`, lane O9 `cases/modes/*/microscopy/`):** the
  slide in the basic viewer, 10 s after the mount: `preRender` on this branch, GPU and
  CPU; `rendered` on `master`. `WSIViewport.setRendered()` is still a no-op.
- **Also measured:** three wheel ticks over the slide add 0.88 to the zoom of 6.0, three
  times alike; 5.18.3 adds between 0.90 and 1.08 from run to run (the map's animated wheel
  zoom). Not counted as a difference.
- **Fixed in cornerstone (lane FX7, `ccb599e2a`):** the viewport is `rendered` when the map
  has drawn every tile of its view (the `rendercomplete` of OpenLayers), and again after
  each later complete draw; a pass of the rendering engine leaves it `needsRender` until
  then. The Cornerstone guide names it (`2-rendering-changes.md`, whole slide viewports).
- **Checked (task O12, link at `472d908e8`, lane O12 `specs/m48.spec.ts`, `cases/m48/`):**
  the slide in the basic viewer, the status sampled every 100 ms from the navigation:
  `rendered` 2.3 s after it on the GPU and 2.1 s on the CPU; `master` 1.8 s and 1.7 s (it
  reports `rendered` after the first pass, before the tiles). After 20 s the predicate of
  OHIF's `waitForViewportsRendered` resolves in 9 ms on the GPU and 11 ms on the CPU,
  where it waited its 15 s; after a wheel zoom the status is `rendered` again; the
  capture of the slide is `rendered`. No spec of OHIF waits for it on the slide (their
  `visitStudy` waits for the network): `WSI` took 8.0 s on the old link and 7.8 s now,
  `MicroscopyPanel` 8.1 s and 8.6 s.
- **State:** fixed in cornerstone `ccb599e2a`, checked in task O12.

## M49. The cine of a stack with a labelmap plays at 15 to 17 images a second

- **Seen (package U6, step 10):** segmentation mode, the MR "MPRAGE" (128 images) of the
  test data: after one brush stroke the cine set to 24 per second shows fewer images per
  second on 6.0. Without a labelmap both versions show 24.
- **Measured** (`laneU6/specs/cinespeed.spec.ts`, `laneU6/probes/cinespeed.log`; images
  shown in 5 s, counted from `IMAGE_RENDERED`, two runs of two plays each, GPU):

  | | 5.18.3 | 6.0 |
  |---|---|---|
  | no labelmap | 24.0, 24.2, 24.1, 24.2 | 24.0, 24.2, 24.2, 24.2 |
  | one labelmap | 24.1, 24.2, 24.3, 24.1 | 15.3, 16.4, 15.1, 16.7 |

- **Why:** not looked into: each image of a stack with a labelmap takes longer to show on
  6.0.
- **Fix, in cornerstone:** to do (find what each new image of a stack with a labelmap
  costs).
- **Fix, in OHIF:** none (rule 3).
- **State:** open, waits for cornerstone.
- **Closed (task O9, 25 November, link at `735fc811e`):** the labelmap of a stack is one
  display set per labelmap layer whose image follows the slice, styled at once (FX4, M66);
  FX4 measured the cine of its karma case at 24.3 images a second where it was 20. In the
  viewer (lane O9 `specs/gaps.spec.ts`, `cases/m66/`): the CT stack of the SEG study of the
  segmentation mode, cine at 24 a second for 5 s, `NEW_IMAGE` (or `STACK_NEW_IMAGE`)
  counted on the element: without a labelmap 24.2 a second on both sides; with one brushed
  labelmap 21.0 and 21.4 on this branch, 21.2 and 21.4 on `master`. The same as `master`.

## M50. The TMTV CSV export does nothing on the CPU

- **Seen (package U6, step 10):** TMTV mode on the CPU (`?viewportRendering=cpu`), the test
  study "LUNG DELAYS": add a segmentation, click CSV: no file, and no message in the
  console. On the GPU the same steps download `ACRIN-NSCLC-FDG-PET-042_tmtv.csv`. 5.18.3
  draws no volume on the CPU, so it cannot be compared there.
- **What is known:** on the CPU the new segment has no statistics (`cachedStats` is
  empty; on the GPU it has `namedStats` with min, max, mean, count, center, volume and
  `lesionGlycolysis`). `exportTMTVReportCSV` reads
  `report['namedStats_lesionGlycolysis'].value` of each segment, so it throws inside an
  async command, which shows nothing. A jump to that segment says `No center found` for
  the same reason (`laneU6/probes/tmtvexport.log`).
- **Why the statistics are missing on the CPU:** not found in this package.
- **Fix:** to do: find where the statistics of a new segmentation are computed and why
  that gives nothing with the CPU backend; then decide where it belongs. The export could
  also say so when a segment has no statistics (the same code on `master`).
- **State:** open, cause not found.
- **Closed by measurement (task O9, link at `735fc811e`; lane O9 `specs/notshown.spec.ts`,
  `cases/m50/`):** the steps of `TMTVCSVReport.spec.ts` (the uniformity phantom of the TMTV
  specs, a segmentation, one brush click in the middle of the CT axial pane, then CSV) on
  the CPU: the segment has its statistics (291 voxels, mean 1.065 SUV, lesion glycolysis
  6871), the same as on the GPU, and `202009231_tmtv.csv` is downloaded; `master` on the GPU
  gives the same numbers within the brush footprint (288 voxels). Which commit of
  Cornerstone3D changed it was not looked for. "LUNG DELAYS", the study of the first
  report, was not repeated: a brush click there painted no voxel on either side in this
  task's probe.

## M51. A planar viewport takes a reference of other data only while that data is registered

- **Seen (package U7, with M42):** a 1x2 grid with the CT of the test study "PETCT" as a
  stack and as an axial volume (data ids `<uid>` and `<uid>::volume`), a length drawn on
  the volume, then the volume pane removed (layout 1x1). A jump to the length from the
  measurement panel: with the registration of `<uid>::volume` taken out in the page, the
  stack pane is made a volume to show it; 5.18.3 goes to the image in the stack. The other
  way (a length drawn on the stack `<uid>::stack` beside an MPR, then only the axial
  volume left): with `<uid>::stack` taken out, the volume does not move; 5.18.3 goes to
  the slice (`laneU7/probes/refs-gone-v6-whatif-nokeep.json`, `refs-gone-base.json`).
- **Why:** the metadata of an annotation is the view reference of its pane, with its data
  id (and its volume id when drawn on a volume). A planar viewport whose bindings have
  neither takes the reference only through `isOtherDataReferenceViewable`
  (`genericViewportReferenceCompatibility.ts`), which needs the image ids of the data of
  the reference: its registration, or its volume in the cache. The legacy viewports had
  no data ids: a stack took a reference by its image, a volume by its frame of reference,
  plane and image.
- **Smallest case**, cornerstone calls only (`laneU7/specs/unregistered.spec.ts`,
  `laneU7/probes/unregistered-*.json`): the CT stack on image 40 of 174, `ref` the view
  reference of the same stack taken on image 10, asked with `{ withNavigation: true }`:

  | The reference | 5.18.3 (legacy stack) | 6.0 |
  |---|---|---|
  | `ref` as it is (the data id of the stack on 6.0) | true | true |
  | `ref` without a data id | true | true |
  | `ref` with a data id that is not registered | true | **false** |
  | the same data id, registered with the image ids of the stack | | true |
  | `ref` without a data id, with the volume id of the CT (not in the cache) | true | **false** |

- **The guide:** the rows of `setStack()` and `setVolumes()` in `3-api-map.md` register a
  stack and a volume under a display set id each, so a series shown both ways at once has
  two. It does not say that a reference of one is taken on the other only while the first
  is registered, or that the application keeps that registration.
- **Fix, in OHIF:** the registry keeps the registrations that a reference can name (M42):
  the UID of a display set while any data id of it is registered, and the data id of a
  second shape until the service is destroyed (one payload of image ids each). The
  checks of M42 in the viewer pass with it.
- **Fix, in cornerstone:** to do: a reference of data that is not registered (or not in
  the cache) is decided by its image, as on the legacy viewports; or the guide says that
  an application keeps the registration of a data id while references to it can be shown.
  With the first, OHIF's registry could release the data id of a second shape at its last
  viewport again.
- **Replaced (task O2, 25 November):** Cornerstone judges a reference by its image or its
  plane, also when its display set is no longer registered, and a stack moves nothing for
  a reference of a volume that names no image (the row "No view reference changes the
  source; a reference is judged by its image or its plane" of `5-from-a-6-beta.md`). And
  with one id per display set the id of a reference is the UID of a display set that the
  store keeps for the whole mode. OHIF keeps no registration for references any more: the
  registry of package U7 is deleted (M42, M54).
- **Checked in the viewer** (M54): the CT as a stack and as an axial volume, a length on
  each, then the pane of the other shape removed: a jump to the length of the volume puts
  the stack, which stays a stack, on image 30; a jump to the length of the stack puts the
  volume on slice 40. The same jumps with both panes land on 30 and 40.
- **State:** closed by task O2 and cornerstone (committed in `309cc169f3`).

## M52. A list of opacities in `colormap.opacity` takes the place of the overall opacity

- **Seen (package U7, with M45):** TMTV mode, the opacity slider of a fusion pane at 50%,
  then the colour map of the PET set again (`setViewportColormap`, which gives the ramp of
  the hanging protocol again as a list in `opacity`): on 5.18.3 the ramp stays at 0.87 and
  the slider at 50%; on 6.0 the ramp is drawn at 1 and the slider shows 100%
  (`laneU7/probes/fusion-v6-colormap.json`, `fusion-base-colormap.json`).
- **Why:** on 5.18.3 a list in `colormap.opacity` set the opacity mapping of the volume and
  kept its overall opacity, and a number set the overall and kept the mapping
  (`_applyColormapOpacity`, `updateOpacityMapping`, `updateOpacity` of 5.x);
  `getProperties()` gave `{ opacity: <overall>, opacityMapping }` back. A planar viewport of
  6.0 stores the presentation as it is set and merges a colormap one level deep, so the
  list and the number share the key `opacity`: each replaces the other.
- **Smallest case**, cornerstone calls only, the PET of the axial fusion pane of that
  study (`laneU7/specs/ramp2.spec.ts`, `laneU7/probes/ramp2-*.json`;
  `setDisplaySetPresentation(id, { colormap })` on 6.0, `setProperties({ colormap }, id)`
  on 5.18.3; `ramp` the list of M45):

  | Step | 5.18.3: the colormap read back, a cold pixel (PET 0.024) | 6.0 |
  |---|---|---|
  | `{ name: 'hsv', opacity: ramp }` | `{ opacity: 1, opacityMapping: ramp }`, (7, 0, 0) | `{ opacity: ramp }`, (49, 0, 1) |
  | then `{ opacity: 0.5 }` | `{ opacity: 0.5, opacityMapping: ramp }`, (3, 0, 0) | `{ opacity: 0.5 }`: **the ramp is gone**, (128, 0, 3) |
  | then `{ name: 'hsv', opacity: ramp }` | `{ opacity: 0.5, opacityMapping: ramp }` | `{ opacity: ramp }`: **the scale is 1 again** |

- **The guide:** `2-rendering-changes.md` says "A list in `colormap.opacity` is read as
  `colormap.opacityMapping`, as on the legacy volume viewport" and "A number in `opacity`
  after opacity points multiplies the points". With the points given as a list in
  `opacity` a number replaces them.
- **Fix, in cornerstone:** to do: a list in `colormap.opacity` is stored as
  `opacityMapping` and keeps the stored number in `opacity`, as on 5.x; or the guide says
  that the points go in `opacityMapping` and a list in `opacity` replaces the number.
- **Fix, in OHIF:** none (rule 3). The opacity slider does not depend on it: since M45
  `setLayerOpacity` writes the points as `opacityMapping` and the scale as `opacity`. If
  cornerstone stores a list as `opacityMapping`, a colormap without a number in `opacity`
  reaches the slider, which reads it as unset (`resolveOpacityScalar` takes the value of
  `opacity`): it should then read an `opacityMapping` without `opacity` as 1.
- **State:** open, waits for cornerstone. What a user sees: after a change of the colour
  map of the PET of a fusion, the opacity slider is back at 100%.
- **Closed by M57 (task O3, committed in `8659924b25`):** fixed in cornerstone by one opacity:
  `colormap.opacity` is gone, a list is `colormap.opacityMapping` and a number is the
  `opacity` of the appearance, two keys that cannot replace each other; a colormap
  update keeps the stored mapping and threshold. `setViewportColormap` sets the colormap
  and leaves the opacity of a display set whose protocol gives a ramp, so the slider
  keeps its place.

## M53. The codemod step of the names after 6.0.0-beta.2, on this branch (task O1)

- **Run:** the `api-names` step of Cornerstone3D at `880c03496`, from
  `packages/codemods`: `node scripts/run-registry.mjs --steps api-names
  <ohif>/extensions <ohif>/modes <ohif>/platform` on `78432e76cb` (1,854 source files,
  34 s), then prettier on the changed files. The diff, the JSON of every reported site
  and the log are in the lane folder of task O1 (`codemod.diff`, `codemod.json`,
  `codemod.log`).
- **Numbers:** 16 files, 37 changed lines; **35 rewritten, 66 manual sites in 15 files,
  16 review sites in 8 files**. The same as the measure of task CM1 on a copy of the same
  commit: its diff has the same added and removed lines, and its 117 report entries are
  the same (file, line, rule).
  - Rewritten: 6 `VIEWPORT_NEW_IMAGE_SET` and 4 `VOLUME_VIEWPORT_NEW_VOLUME` to
    `DISPLAY_SETS_CHANGED`, 4 `VOI_MODIFIED` and 2 `COLORMAP_MODIFIED` to
    `DISPLAY_SET_APPEARANCE_CHANGED` (with one read of `detail.range` and one of
    `detail.colormap` to `detail.effective.*`), 4 `viewportProjection.getPresentation`
    to `getFraming`, 4 `withPresentation` to `withFraming`, 3 `Types.ViewPresentation`
    to `Types.ViewFraming`, 4 `genericViewportDisplaySetMetadataProvider` to
    `displaySetRegistry` and its `get(type, id)` to `get(id)`, 1 `detail.imageIdIndex` of
    `NEW_IMAGE` to `detail.sliceIndex`.
- **Wrong rewrites:** none.
- **A site the step could have resolved from the file (for cornerstone):** two test files
  mock `viewportProjection` in a `jest.mock('@cornerstonejs/core', ...)` factory. The step
  rewrote the reads `viewportProjection.getPresentation` and `withPresentation` of the
  same files, and left the keys of the mock as they were, without a report, so the tests
  read `undefined.mockReset()` (`ViewportBackend.test.ts`, `viewportOperations.test.ts`).
  Smallest input:

  ```ts
  import { viewportProjection } from '@cornerstonejs/core';

  jest.mock('@cornerstonejs/core', () => ({
    ...jest.requireActual('@cornerstonejs/core'),
    viewportProjection: { getPresentation: jest.fn(), withPresentation: jest.fn() },
  }));

  const getPresentation = viewportProjection.getPresentation as jest.Mock;
  ```

  The step writes `viewportProjection.getFraming` on the last line and leaves the keys
  `getPresentation` and `withPresentation`; it should rename them to `getFraming` and
  `withFraming` (the factory is the module `@cornerstonejs/core` and the key is
  `viewportProjection`), or report them as it reports the keys of a mock of
  `setDisplaySetPresentation`. Fixed by hand in OHIF. To do in cornerstone (a fixture of
  the family of the framing names).
- **Also seen:** a listener `evt => evt.detail` of the renamed `DISPLAY_SETS_CHANGED`
  (`CornerstoneViewportService.ts`, the prefetch listener) has a type error after the
  rewrite (`detail` does not exist on `Event`) on the line after the changed one. Before
  the rewrite the old name was not an event of 6.0, so `evt` was `any`. The step lists the
  site for review, and the measure of CM1 counts errors on changed lines only, so its "no
  new type error" does not see it. Fixed in OHIF by typing the parameter
  (`Types.EventTypes.DisplaySetsChangedEvent`); the listener itself is the work of task O5.
- **Where the manual and review sites went:**
  - by hand, renames only (task O1): `setDisplaySetPresentation`,
    `getDisplaySetPresentation`, `resetDisplaySetPresentation` (39 sites, the adapter,
    the backend, `viewportOperations.ts` and the mocks of the tests), `getSourceDataId`
    (4) and `findDataIdByVolumeId` (1);
  - gone with the code (task O2): the `add` of a descriptor that is not a literal
    (`dataIdRegistry.ts`, deleted), the 3D `renderMode` (`ViewportBackend.ts`, deleted),
    the `dataId` of the colour bar data (OHIF's own key, now `displaySetId`);
  - left, they compile: 16 `colormap.opacity` and the 7 `DISPLAY_SET_APPEARANCE_CHANGED`
    sites of `ViewportWindowLevel.tsx` and `useViewportRendering.tsx` (task O3); the 10
    `DISPLAY_SETS_CHANGED` listeners and the 2 `detail.imageIdIndex` reads of
    `ViewportImageScrollbar.tsx` and `ViewportSliceProgressScrollbar/helpers.ts`, which
    read `undefined` until they read `sliceIndex` (task O5).
- **Type check** (`tsc` of the root, error sets against `78432e76cb`, the lines of the
  linked checkout left out): 1,820 error kinds (file, code, message) in 8,797 lines before,
  1,795 in 8,752 after this entry and M54. 27 kinds are gone (the six removed event names
  in 8 files, the four projection names in 4 files, the two deleted test files,
  `genericViewports`). No kind is new: the error of `appConfig` in `init.tsx`
  (`appConfig` is `unknown` there) names `viewportRendering` where it named
  `genericViewports`, and the counts of the test-runner globals (`it`, `expect`, which the
  root `tsc` does not type) grow with the new tests.
- **Build:** `pnpm run build` passes.
- **State:** done in task O1 (committed in `309cc169f3`). The defect of the step is open, waits
  for cornerstone.
- **State today (task O9):** closed: the run in `309cc169f3`; the defect of the step (the keys of a module mock) is fixed in cornerstone by lane FX2 (its open issue 206), and the measure counts the errors off the changed lines (207).

## M54. One store of display sets: each display set is registered once, a mount says what it wants (task O2)

- **Seen:** on the build of `880c03496` the registry of display sets is one store, the
  `DISPLAY_SET` module of `@cornerstonejs/metadata`, the store where `displaySetStore.ts`
  already kept OHIF's display sets. The backend still registered a payload under the UID
  of a display set at each mount (`DataIdRegistry`, `{ kind, imageIds, volumeId,
  initialImageIdIndex }`) and removed it at the last release: on this build that
  replaces OHIF's display set object in the shared store with the payload, and then
  deletes it, so `displaySetService.getDisplaySetByUID` gives the payload, then nothing.
  A test of the viewport service shows it on the code of `78432e76cb`: a stack mount and
  a `disableElement` remove the display set from the store (the test of "a layout change"
  below fails there).
- **Fix, in OHIF:**
  - `displaySetStore.ts` registers each display set with `displaySetRegistry.add(uid,
    displaySet)` of `@cornerstonejs/metadata` when it is made or replaced, reads it with
    `get` and removes it with `remove` (delete, `onModeExit`). The registered object is
    the display set: no copy, no `displaySetId`.
  - Nothing is registered at a mount. `backends/dataIdRegistry.ts` and
    `utils/displaySetDataId.ts` are deleted with their tests (`<uid>::stack`,
    `<uid>::volume`), and with them `registerDataId`, `onViewportDisabled` and `destroy`
    of the backend. A viewport names a display set by its `displaySetInstanceUID`.
  - Each mount says what its viewport wants (`PlanarMountOptions`,
    `Volume3DMountOptions`):
    - a stack: `{ mode: 'stack', orientation: ACQUISITION, role: 'source',
      initialImageIdIndex, appearance, renderBackend }`;
    - a volume or MPR pane: one `setDisplaySets` call, each display set with `{ mode:
      'volume', orientation, role, volumeId, appearance, renderBackend }`, the
      `volumeId` the one that `CornerstoneCacheService` made (`${volumeLoaderSchema}:${uid}`
      for an image display set, the volume of a parametric map);
    - a 3D viewport: `{ role, volumeId, appearance }`; `{ renderMode: 'vtkVolume3d' }` is
      gone;
    - an ECG, video or whole slide viewport: `{ displaySetId: uid }`. Cornerstone reads
      the image id of the `instance` of the display set (video, ECG), and the `imageIds`
      and the `WADO_WEB_CLIENT` metadata of the first image (whole slide).
    - The appearance of the first draw is on the mount: the VOI, invert and colormap of
      the hanging protocol, or of the stored LUT presentation (a stack), and for a
      volume the hanging protocol values with the blend mode and the slab of a projection,
      and the LUT presentation over the source; the preset of a 3D viewport. The calls of
      `setDisplaySetPresentation` after the mount and the `applyPreset` on the actor are
      gone. The appearance work proper (overrides and effective values, opacity) is task
      O3.
  - The mode comes from OHIF's viewport type (the shape that `CornerstoneCacheService`
    stores): `'stack'` for a stack viewport, `'volume'` for a volume, MPR or fusion pane.
    No OHIF mount asks for `'auto'`: the viewport type always says what the pane is, and
    `'auto'` would show the axial pane of an axial CT, or a dynamic volume that is not in
    the cache yet, as a stack. The capture of the download dialog mounts the source in the
    mode that the source viewport reports (`getDisplaySets()`).
  - `CornerstoneCacheService` gives each display set its `imageIds` at each mount (it gave
    them only when its per-UID cache was empty, so a display set replaced by a new object
    had none), and gives a display set that changed (it grew, or its metadata changed) the
    image ids of the data source again when a viewport that shows it is invalidated. Its
    per-UID cache of stack image ids is gone: after a growth it kept the old images. The
    invalidation of a volume removed the kept image ids under the volume id while they
    are kept under the UID.
  - A parametric map names its volume: its load sets `displaySet.volumeId` to the volume
    it makes. Cornerstone mounts a display set without image ids by the `volumeId` of its
    registration; a `volumeId` on the mount alone is refused ("has no imageIds or volumeId
    of a cached volume"), measured in the viewer.
  - The adapter has no mapping of ids any more. `getDataIdForDisplaySet` is
    `getShownDisplaySetId`: the UID when the viewport shows it (or shows nothing), else
    undefined, so that the window and colour bar of an SR, SEG or RTSTRUCT viewport read the
    source (M44).
  - `appConfig.genericViewports` is gone: its one setting is `appConfig.viewportRendering`.
    OHIF's migration page says so, with before and after; the page of the display set
    store says what a viewport reads from a display set.
- **Checks:**
  - jest (all): 162 suites, 1,959 tests pass. On `78432e76cb`, counted from the files:
    164 suites, 1,962 tests; the two suites of the deleted files go (15 tests), and the
    tests below are new. `displaySetStore.test.ts` (5 new; 3 fail with the store of
    `78432e76cb`), `CornerstoneCacheService.test.ts` (4 new, a display set that grows: all
    fail on `78432e76cb`), `CornerstoneViewportService.test.ts` ("a layout change keeps a
    display set in the store when the viewports that showed it are released": fails on an
    export of `78432e76cb`), `ViewportBackend.test.ts` (the mounts of each family, one
    display set as a stack and as a volume under its UID, nothing registered at a mount).
  - In the viewer (dev server with `TEST_ENV=true`, probes in the lane folder of task O1,
    `specs/` and `probes/`):
    - the CT of `1.3.6.1.4.1.14519.5.2.1.256467663913010332776401703474716742458` (axial,
      52 images) as a stack in one pane and as an axial volume in the other: the panes
      say `stack` and `volume` under the same id, the store holds OHIF's object, no second
      id is registered. A length drawn on the volume (slice 30) and one on the stack
      (image 40): each jump lands on its image with both panes, with the stack alone (it
      stays a stack, image 30) and with the volume alone (slice 40);
    - the dynamic PET of `2.25.232704420736447710317909004159492840763` in the preclinical
      4D mode: the three panes in `volume` mode with
      `cornerstoneStreamingDynamicImageVolume:<uid>`; a computed display set made as
      `PanelGenerateImage` makes it and swapped in by `swapDynamicWithComputedDisplaySet`:
      the three panes in `volume` mode with its volume;
    - ECG (`1.3.76.13.65829.2.20130125082826.1072139.2`), whole slide
      (`1.2.276.0.7230010.3.1.2.296485376.1.1665793212.499772`) and video
      (`2.25.96975534054447904995905761963464388233`, in Chrome from the AWS source; see
      M55): each mounted by its UID from OHIF's object;
    - a display set with a volume and no image ids, as a parametric map: refused
      without `volumeId` on the object, mounted as an overlay with it. No parametric map is
      in the test data, so OHIF's own PMAP flow was not run.
  - SEG and RTSTRUCT over a stack and an MPR, hydration, layout and hanging protocol
    changes: the Playwright suite, once, 6 workers, `TEST_ENV=true` (7.7 minutes): 238
    passed, 5 failed, 4 skipped. `SEGHydrationFrom3DFourUp.spec.ts` (the case of M42, the
    one failure of the run of 22 November) passes. The 5 failures all fell in the first
    two minutes of the run (`ContourSegmentationFillOutlineOpacity` "should hide the
    inactive segmentation contour when inactive display is turned off",
    `DataOverlayMenu`, `DicomTagBrowser` "should open DICOM Tag Browser with active
    viewport series when viewport has display set", `FreehandContourSegmentation` "should
    keep distinct freehand contours drawn into the same segment separate", `FreehandROI`
    "rectangle and freehand at identical coordinates should yield comparable area"); the
    five specs run again alone, 2 workers: 26 of 26 pass. No baseline was changed.
- **State:** fixed in task O2 (committed in `309cc169f3`). M42 and M51 are closed by it.

## M55. A video that does not load leaves its mount waiting for ever

- **Seen (task O2):** the video study of the test data
  (`2.25.96975534054447904995905761963464388233`) through the `e2e` data source: the
  viewport stays empty, and `viewport.setDisplaySets({ displaySetId })` neither resolves
  nor rejects (30 s, then the page was closed); no error in the console. The video element
  has `error.code` 4 (`DEMUXER_ERROR_COULD_NOT_OPEN`) and `networkState` 3: the URL of the
  static test data (`.../index.mp4`) gives the HTML page of the dev server, the file is
  `pixeldata.mp4`. The bundled Chromium of Playwright cannot decode H.264 at all
  (`canPlayType('video/mp4; codecs="avc1.42E01E"')` is empty), so it waits the same way for
  the AWS copy, which Chrome plays.
- **Why:** `waitForVideoReady` of `VideoViewport.ts` waits for `loadeddata` or `canplay`
  and listens to no `error` event.
- **Smallest case**, cornerstone calls only: a `VideoViewport`,
  `displaySetRegistry.add('v', { imageId })` with an `imageUrlModule` whose `rendered` URL
  is not a video, then `await viewport.setDisplaySets({ displaySetId: 'v' })`: never
  settles; `DISPLAY_SETS_CHANGED` never fires.
- **Fix, in cornerstone:** the mount rejects with the media error of the element
  (cornerstone3D `99867e2c5`, FX2).
- **Fix, in OHIF:** none (rule 3). The URL of the video of the static test data
  (`index.mp4` for a file named `pixeldata.mp4`) is a question of the test data and of
  `directURL`, on `master` too; not looked into further.
- **Seen in the viewer (task O7, link at `99867e2c5`; lane O7 `specs/m55video.spec.ts`,
  `specs/m55next.spec.ts`, `cases/m55/`):**
  - `viewport.setDisplaySets({ displaySetId })` of the video rejects at once with
    `[VideoViewport] The display set "<id>" did not load its video <url>:
    MEDIA_ERR_SRC_NOT_SUPPORTED (PipelineStatus::DEMUXER_ERROR_COULD_NOT_OPEN: FFmpegDemuxer:
    open context failed)`; `DISPLAY_SETS_CHANGED` fires 0 times; the viewport is `empty`
    with no video element.
  - The next mount works: the AWS copy of the video in Chrome, its first load answered
    with a 404 by a route, then the route removed: `setDisplaySets` of the same viewport
    resolves, `DISPLAY_SETS_CHANGED` fires once, the mode is `video`, and OHIF's mount of
    the pane plays the video (3360 frames). On `master` the pane stays empty after the
    route is removed.
  - What OHIF does with the rejection: `setViewportData` catches it and logs
    `[CornerstoneViewportService] Failed to set the viewport data` with that message, once;
    no unhandled rejection; `VIEWPORT_DATA_CHANGED` is not fired; the pane stays empty with
    its overlay. What OHIF does when the images of a stack fail to load (all `frames/` of
    the TMTV study answered with a 404), on both sides: a console error and
    `appConfig.httpErrorHandler` (a `console.warn` in the default and e2e configs) through
    `IMAGE_LOAD_FAILED`, a black pane, no notification and no message in the pane. The
    message "Error Loading Image" of `ViewportImageSliceLoadingIndicator` never shows, on
    `master` either: it waits for `imageIdToBeLoaded`, which nothing sets.
- **Decided:** a video pane behaves as a stack pane already: the error goes to the console
  with the message of Cornerstone, the pane stays empty, and a later mount works. Nothing
  changed in OHIF. (The ECG mount shows a notification, `The ECG waveform could not be
  loaded.`; a stack and a video do not.)
- **State:** fixed in cornerstone `99867e2c5`; OHIF decided as above (task O7).

## M56. The appearance of a display set: one event, two getters, no guessing (task O3)

- **Seen (on `309cc169f3`, read in the code, then shown by tests that fail there):**
  - The viewer read one appearance per display set (`getPresentation` of the adapter):
    the overrides of Cornerstone3D 6, with a window that equals the default window of the
    image stamped `isComputedVOI` so that the stored LUT presentation dropped it. A window
    that the user set to the default was dropped too.
  - The invert of a MONOCHROME1 image: `viewportOperations.invert` read the overrides,
    where the invert of such an image is its default, not an override. The first click of
    the invert button set `invert: true` on an image that is drawn inverted already, and
    nothing changed on the screen.
  - The stored LUT presentation held the appearance of the source only. The PET of a fusion
    lost its colormap and opacity on a layout change and back; on `master` the legacy path
    stored the properties of each volume.
  - `useViewportRendering` took the window, the opacity and the threshold of every appearance
    event of the element: in a fusion an event of the CT set the readout of the PET.
  - The 3D preset of the viewport menu was applied to the actor (`utilities.applyPreset`);
    the next change of the appearance of the 3D viewport writes the look of the actor again
    from the appearance ("An edit of an actor does not last" in the guide), and a layout
    change and back gave the preset of the hanging protocol.
- **Fix, in OHIF:**
  - The adapter has `getAppearance(id?)` (the overrides: store or copy),
    `getEffectiveAppearance(id?)` (what is drawn: show or compare) and `setAppearance`.
    `isComputedVOI`, `getDefaultVOIRange`, `getColormap`, `setLayerOpacity`,
    `setLayerThreshold`, `getOpacityGamma` and `cleanProperties` of the LUT presentation are
    gone. Nothing compares a window with the default window any more.
  - Readouts read the effective appearance: the window level text and the opacity and
    threshold menus (`useViewportRendering`, its `readPresentation` is
    `readEffectiveAppearance`), the toggled state of the invert button, the colour bar
    service, the rows of the window level panel and the invert command.
  - One listener of `DISPLAY_SET_APPEARANCE_CHANGED` in `useViewportRendering`, for every
    cause, for the display set that the hook reads (the source in a viewport of an SR, SEG
    or RTSTRUCT, M44); the window level panel takes `effective.voiRange` when `voiRange` is a
    changed key. OHIF has no synchronizer of its own: the VOI synchronizers are those of the
    tools, which act on `'edit'` and `'reset'` only.
  - The LUT presentation is `{ viewportType, appearances }`: the overrides of each display
    set that the viewport shows, by UID. A stack and a volume mount give each display set its
    stored overrides, else the display set options of the hanging protocol.
  - The preset of a 3D viewport is set on its appearance (`setAppearance({ preset })`).
  - `reportsVOI`, `keepsStackVOI` and `getPresentationEventVolumeId`, named by the plan,
    were members of `PlanarViewport` of Cornerstone3D, not OHIF code, and are gone from it.
- **Checks:**
  - jest: the new tests of the adapter, the operations (the invert of a MONOCHROME1 and a
    MONOCHROME2 image, the preset, the colormap with its opacity, the reset), the backend
    (the stored appearance of each display set of a fusion, a reset display set),
    the service (what the LUT store holds, what a stack mount takes) and
    `hooks/useViewportRendering.test.ts` (new: the readouts follow the event of the PET and
    not that of the CT, for every cause; the slider and the threshold write one key; the
    source of an SR viewport). Run on an export of `309cc169f3`: 33 of them fail, the 58
    others pass (lane O3, `jest-failfirst.log`). The jest config of the extension maps
    `@ohif/<package>/src/...` imports, so the hook can be loaded.
  - In the viewer, the same steps on this branch and on `master` (legacy path), lane O3
    `cases/`: a CT stack (window preset, window level drag, invert, zoom, pan, rotation, flip,
    2x2 layout and back, reset), an MPR (preset in one pane, round trip through "Axial
    Primary", reset), a series dropped into a second pane, the colour bar: the window level
    texts are the same on both at every step, and the pictures of the stack, the MPR panes
    that were not edited, the colour bar and the drop are the same (0.00% of the pixels
    differ by more than 16). In the MPR the mount writes no window into the other panes, an
    edit in one pane reaches the other two, a reset resets all three. `master` loses the
    rotation of an MPR pane on the round trip and keeps the invert after a reset; this
    branch keeps the rotation and resets the invert.
  - No MONOCHROME1 image is in the test data of OHIF (the CR, DX, MG and US series of the
    local and the remote data are MONOCHROME2 or colour), so the MONOCHROME1 cases are shown
    by jest only, with the tests of Cornerstone3D for the default invert and its event
    (open issues 156 and 157 of Cornerstone3D).
  - jest (all): 163 suites, 1,977 tests pass (`309cc169f3`: 162, 1,959). The type check of
    the root has no new error kind outside the test-runner globals of the new tests, and
    one kind less. `pnpm run build` passes. The Playwright suite once, 6 workers,
    `TEST_ENV=true` (7.1 minutes): 243 passed, 0 failed, 4 skipped; no baseline changed.
- **State:** fixed in task O3 (committed in `8659924b25`).

## M57. One opacity: the hanging protocols, the slider, and the TMTV fusion with the look of `master` (task O3)

- **Seen:** `colormap.opacity` is gone from Cornerstone3D 6: a number is the `opacity` of the
  appearance, a list of points is `colormap.opacityMapping`, the alpha of a pixel is
  `opacity * mapping(value)`, 0 below `colormap.threshold`, on every render path. The
  protocols of the TMTV mode (3 fusion panes), of the dynamic volume mode (2) and the
  parametric map viewport gave the ramp as a list in `colormap.opacity`, and OHIF's own
  overlay options of the data overlay menu gave a number there.
- **What the fusion looked like with the ramp of `master` drawn as given** (TMTV mode, the
  study "LUNG DELAYS", the three fusion panes on their middle slice, lane O3
  `tmtv/as-given/`): 40 to 76% of the pixels differ from `master` by more than 16; the lungs
  and the soft tissue are red, the CT under them is hidden. The legacy volume viewport drew
  an opacity `a` of the PET as `1 - (1 - a) ** 0.125` (the guide: "The legacy look of a
  numeric opacity is not copied"; its `petColorMapPresentation()` gives the weaker points).
- **Fix, in OHIF:**
  - The protocols give `colormap.opacityMapping`. The TMTV fusion panes get the ramp of
    `master` (0 at SUV 0, 0.8 at 0.1, 0.9 from 1 on) in the legacy look, 13 points from 0 to
    0.2501 (`FUSION_PT_OPACITY_MAPPING` in `extensions/tmtv/src/utils/hpViewports.ts`), as the
    TMTV example of Cornerstone3D does. The dynamic volume protocol and the parametric map
    keep their numbers under the new key (their look was not measured: no test data for the
    parametric map, and the 4D PET is not a fusion over a CT).
  - The overlay options of the data overlay menu give `opacity` beside the colormap.
  - `ViewportInfo` reads `opacity` of the display set options, and a `colormap.opacity` of a
    protocol from outside OHIF gets a `console.error` in a development build and is left
    out: no translation.
  - The opacity slider sets `{ opacity }`; the threshold menu sets `{ colormap: { threshold } }`;
    the readout is the effective `opacity`. `utils/resolveOpacityScalar.ts` and its test are
    deleted, with the gamma of the slider (`opacityLinear` of the hook).
  - `setViewportColormap` gives the ramp of the protocol again and leaves the opacity when the
    protocol has a ramp (as `master` did), else the `opacity` of the protocol, else the one
    given.
- **Checks (lane O3, `tmtv/`, specs `tmtvFusion.spec.ts`; each side makes the Cornerstone3D
  calls that its slider and threshold code make):**
  - "LUNG DELAYS", GPU: at rest 0.00 to 0.29% of the pixels of the fusion panes differ from
    `master` by more than 16 (99% within 3 levels); slider at 50% 0.00 to 0.25% (this branch
    a little weaker: the slider sets the opacity that is drawn, `master` went through a gamma
    of 1/5 and its blend); threshold 2.5 SUV: `master` hides the whole PET (no point of the
    ramp above 1 SUV, so its threshold rose to nothing), this branch keeps the lesions at the
    ramp, 0.6 to 2.5% of the pixels. The guide names both.
  - The uniformity phantom of the TMTV specs, threshold 0.5: 5.5 to 6.7% at 100% (its legacy
    exponent is 0.0625, not 0.125, as the guide says of a phantom), 0.0 to 0.13% at 50%.
  - The CT alone (slider at 0): the same as `master` (at most 0.24%).
  - CPU (`?viewportRendering=cpu`): this branch draws the GPU picture (at most 0.06% of the
    pixels differ). `master` on the CPU never draws the fusion panes (the legacy volume
    viewport has no CPU path), so there is no picture of `master` to compare.
  - jest: `Viewport.test.ts` (new: the error for `colormap.opacity`, the opacity of the
    options), the hook test (one key per control), the backend test (the opacity of the
    options on the mount).
- **State:** fixed in task O3 (committed in `8659924b25`). Closes M45 and M52.

## M58. The position presentation is the view reference and the framing (task O4)

- **Seen (read in the code):** `ViewportBackend` stored the keys of the planar view state
  that encode the pan and the zoom (`NATIVE_VIEW_PRESENTATION_KEYS`), cleared a stale display
  area by hand, and stored the zoom and the pan of a 3D viewport through `viewportProjection`
  without its direction (`_set3DViewPresentation`): about 100 lines that worked around the
  round trip of a framing, fixed in Cornerstone3D (`getViewFraming` keeps `scaleMode` and
  `fitScale`, a 3D framing carries its camera).
- **Fix, in OHIF:** the position presentation is `{ viewportType, viewReference,
  viewFraming }`, `viewFraming` from `viewport.getViewFraming()` (typed
  `PlanarViewFraming | Volume3DProjectionFraming`, no casts); a planar viewport shows the
  view reference when it can and then `setViewFraming(viewFraming)`; a 3D viewport only the
  framing. `viewPresentation` is gone (the RTSTRUCT viewport wrote an empty one). The stores
  live in memory only (zustand without persistence, nothing in the URL or local storage),
  so nothing stored before this change is read. The display area of a hanging protocol
  (mammography) goes through `setViewState({ displayArea })` and has
  `storeAsInitialCamera: true` in the protocol, so a reset (`resetViewState`) shows it again.
- **Checks:** jest, `ViewportBackend.test.ts`: what is stored (the framing with `scaleMode` and
  `fitScale`), the order of the restore (reference, then framing), a reference that the
  viewport cannot show, a 3D camera, a viewport that showed nothing, a position of the SEG
  or RTSTRUCT viewport without a framing. In the viewer (lane O3 `cases/`): the CT stack
  zoomed, panned, turned and flipped keeps its framing through a 2x2 layout and back, pixel
  for pixel, as `master`; an MPR pane keeps its zoom and rotation through "Axial Primary"
  and back (`master` loses the rotation); the mammography protocol shows its display area,
  a zoom takes it away, the zoom and the pan come back after a layout change, and the reset
  shows the display area again, the same pictures as `master` (only the zoomed pane in a 1x1
  layout differs: `master` keeps the display area under a zoom, a planar viewport of 6.0
  drops it, which the guide names); a 3D viewport keeps its preset, direction and zoom
  through MPR and back (`master` loses the direction and the preset), not its pan (M59).
- **State:** fixed in task O4 (committed in `8659924b25`). Closes M33; M38 and M40 are closed by the
  checks above.

## M59. The pan of a 3D viewport is lost on a layout change

- **Seen (task O4):** 3D only, a pan and a zoom, MPR, 3D only again: the direction and the
  zoom come back, the view is centred again. OHIF stores the position presentation when the
  viewport component unmounts, after React has detached its element.
- **Why:** `getViewFraming()` of a 3D viewport whose element has no size gives `pan: [0, 0]`
  and `scale.mmPerCanvasPixel` of twice the parallel scale, with the camera of the panned
  view; `setViewFraming` of that framing puts the focal point back on the fit. A planar
  viewport gives the same framing with or without a size.
- **Smallest case**, Cornerstone3D calls only (lane O3, `specs/pan3dMin.spec.ts`,
  `cases/pan3d-min.json`): a `VolumeViewport3D` with a mounted volume,
  `setViewFraming({ pan: [40, 20], zoom: 1.5 })`, then `element.style.display = 'none'`,
  `const framing = viewport.getViewFraming()` gives `pan: [0, 0]`, `zoom: 1.5`,
  `mmPerCanvasPixel: 157.6` (0.167 with a size); `element.style.display = ''`,
  `viewport.resetViewState()`, `viewport.setViewFraming(framing)` gives `pan: [0, 0]`. The
  same steps on a planar viewport give `pan: [40, 20]` back.
- **Also seen:** `setViewFraming` of a 3D framing without its `camera` (`{ pan, position,
  rotation, scale, zoom }`) leaves the viewport without a view plane normal and a zoom
  (`getViewFraming()` gives `zoom: undefined`). OHIF never writes such a patch.
- **Fix, in cornerstone:** every family frames the view at the last size its canvas had
  while its element has none (cornerstone3D `3f3c6ff7a`, FX3).
- **Fix, in OHIF:** none (rule 3). The service stores `getViewFraming()` as it is.
- **Seen in the viewer (task O7, link at `99867e2c5`; lane O7 `specs/m59pan3d.spec.ts`,
  `cases/m59/`):** 3D only of the LIVER CT, a pan (middle drag) and a zoom (right drag):
  pan `[58.34, 29.24]`, zoom 0.731. A grid change to 2x1 and back to 1x1: pan, zoom and
  focal point come back exactly. 3D only, MPR, 3D only: they come back exactly. `master`
  gives the same values to 0.01.
- **State:** fixed in cornerstone `3f3c6ff7a`; checked in the viewer in task O7. A round
  trip through a 3D pane of another size is M67.

## M60. The display set event, the slice index and the scroll events in OHIF (task O5)

- **Seen (read in the code, then shown by tests that fail on `8659924b25`):**
  - The codemod renamed ten listeners of `VIEWPORT_NEW_IMAGE_SET` and
    `VOLUME_VIEWPORT_NEW_VOLUME` to `Events.DISPLAY_SETS_CHANGED` (M53). The event of
    Cornerstone3D 6 fires also when an overlay comes or goes (`detail.sourceChanged`
    false), where the two old events fired only for a new source.
  - `CinePlayer.tsx` added the same handler twice and took every event as a new
    series: an overlay set the frame rate back to 24 (or the frame rate of the series).
  - `CornerstoneViewportService._setStackViewport` added an anonymous listener to the
    element at every stack mount and never removed it; the N-th mount of a pane
    enabled the stack prefetch N more times. The stack mount of the backend already
    enables it once, after `setDisplaySets`.
  - `TrackedCornerstoneViewport.tsx` added its listener with the callback of one
    render and removed it with the callback of a later one.
  - The three toolbar entries `listeners: { [EVENTS.DISPLAY_SETS_CHANGED]: { commandName:
    'toggleImageSliceSync' } }` (the Image Slice Sync button of the cornerstone
    customization, of `basic-test-mode` and of `usAnnotation`) never ran: the default
    extension subscribes the `listeners` of a button to `ACTIVE_VIEWPORT_ID_CHANGED` and
    `VIEWPORTS_READY` of the viewport grid only, and no command is named
    `toggleImageSliceSync` (the button runs `toggleSynchronizer` with `type: 'imageSlice'`).
  - `NEW_IMAGE` gives `detail.sliceIndex`; `ViewportImageScrollbar.tsx` and
    `ViewportSliceProgressScrollbar/helpers.ts` read `detail.imageIdIndex` (undefined).
    The legacy scrollbar (`viewportScrollbar.variant: 'legacy'`) put its thumb on 0 at
    every scroll; the progress scrollbar ignored the event and was saved by its
    `CAMERA_MODIFIED` listener.
  - OHIF's own `VIEWPORT_VOLUMES_CHANGED` of `CornerstoneViewportService` told the window
    level panel and the preclinical 4D mode that the volumes of a viewport changed,
    which `DISPLAY_SETS_CHANGED` says now.
- **What each listener cares for:**

  | Listener | Cares for | Now |
  |---|---|---|
  | `CinePlayer` (frame rate, auto play of a series) | the source | `if (!detail.sourceChanged) return`; one listener, removed with the same function |
  | `TrackedCornerstoneViewport` (is the series tracked) | the source | an effect on the element, `if (!detail.sourceChanged) return` |
  | stack prefetch of `CornerstoneViewportService` | the source | deleted: the backend enables the prefetch once per stack mount |
  | Image Slice Sync button (three toolbar definitions) | never ran | entries deleted |
  | window level panel (rows per volume) | every layer | a capture listener on `document` for its viewport; it recomputes when the source changed or `getVolumeIds()` differs from its rows |
  | preclinical 4D auto play | the source | a capture listener on `document`, once |
  | `SegmentationService`, dynamic volume, TMTV, parametric map | no listener on the branch (the `convertStackToVolumeViewport` listener of `master` went with M22) | nothing |

- **Scroll:** no OHIF code listens to `STACK_VIEWPORT_SCROLL` or to an out of bounds
  event. The loading indicator starts on `CAMERA_MODIFIED` when the index asked for is
  not the one shown, and ends on `NEW_IMAGE` (M19); the frame view synchronizer syncs on
  `CAMERA_MODIFIED` with `NEW_IMAGE` as an auxiliary event and reads no detail. OHIF has
  no "next series when the scroll passes the end" behaviour, on `master` either (no
  listener of `STACK_SCROLL_OUT_OF_BOUNDS` or `VOLUME_VIEWPORT_SCROLL_OUT_OF_BOUNDS` in
  `master`); none was added.
- **Found while doing it:** the preclinical listener runs in the capture phase on
  `document`, before the listener of `CinePlayer` on the element of the same pane. The
  cine handler then read the cine state before React had applied the play of the
  preclinical listener, and wrote `isPlaying: false` back: the 4D cine did not start in
  3 of 3 runs before the fix. `CinePlayer` now passes `isPlaying` only when it turns the cine on
  (`undefined` keeps the state), so it never writes a stale value.
- **Fix, in OHIF:** as in the table. `VIEWPORT_VOLUMES_CHANGED` is gone from the events
  of `CornerstoneViewportService` (a row in the OHIF migration guide). The two scrollbars
  read `sliceIndex`.
- **Checks:**
  - jest: `CinePlayer.test.ts` (new, 4: one listener removed with the same function; a
    labelmap leaves the cine alone; a stale state is not written back; a new source
    takes the frame rate again), `ViewportImageScrollbar.test.ts` (new),
    `ViewportSliceProgressScrollbar/helpers.test.ts` (new),
    `CornerstoneViewportService.test.ts` (a stack mount adds no element listener, five
    mounts; no `VIEWPORT_VOLUMES_CHANGED`). On an export of `8659924b25` (lane O5,
    `jest-failfirst.log`) 8 of these fail.
  - In the viewer, the same steps on this branch and on `master` (legacy path), lane O5
    `specs/` and `events/`, `scroll/`, `loading/`, `listeners/`, `preclinical/`:
    - cine at 24 per second on a CT stack: a new labelmap (Add segmentation) keeps it
      playing on both; a SEG from the data overlay menu, another series dropped into
      the pane and a SEG hydration stop it on both (OHIF mounts or replaces the
      viewport), and the frame rate goes back to 24 after the series change on both;
    - a PET layer added to a CT pane from the data overlay menu and removed: the menu
      lists it, the opacity and threshold menus are enabled, and back, the same on both;
    - the progress and the legacy scrollbar, the overlay text and "Loading..." after a
      wheel scroll, a jump and cine, in a stack of 20 images, a sagittal MPR pane and an
      oblique plane: the scrollbar value is the index of the viewport at every step, on
      both; with a throttled network a jump to an image that is not loaded shows
      "Loading..." for about 0.5 s on both, and no step leaves it on;
    - the preclinical 4D mode (`2.25.232704420736447710317909004159492840763`): the
      cine plays from 5 or 10 s in 4 of 4 runs after the fix; `master` played in 1 of 2 runs;
    - five rounds of 2x2, 1x1, MPR, 1x1 and a series change: the listeners that OHIF
      adds stay the same in number on the element of the pane, on `document` and on
      `eventTarget`. Two Cornerstone listeners grow, on `master` too: M63 and M64.
- **Checks of tasks O5 and O6 together:** jest (all) 169 suites, 2,004 tests pass
  (`8659924b25`: 163, 1,977); the type check of the root has no new error kind outside
  the test-runner globals of the new tests (the error of `enableElement` in the download
  form is printed with `Types.RGB` for `RGB`, and the preclinical mode has one more line
  of its error `'exports' does not exist on type 'unknown'`); `pnpm run build` passes;
  the Playwright suite once, 6 workers, `TEST_ENV=true` (7.0 minutes): 243 passed, 0
  failed, 4 skipped; no baseline changed.
- **State:** fixed in task O5 (committed in `67ab3444fd`).

## M61. The window level rows, the range of the threshold menu and the capture ask the viewport (task O6)

- **Seen (read in the code, then in the viewer):**
  - The rows of the window level panel came from the actors of the viewport
    (`getViewportAdapter(viewport).getVolumeIds()`, `getActors()` and `hasVolumeId`),
    the range of each row from a worker that computed it again from the voxels, the
    window of an overlay row (the PET of a fusion) from the display set options of the
    hanging protocol, not from what is drawn.
  - The range of the threshold menu (`useViewportRendering`, `pixelValueRange`) came from
    a scan of the cache for a volume whose id ends with the UID of the display set
    (`getVoxelManagerForDisplaySet` of the adapter).
  - The capture of the download dialog (`copyDisplayedContentTo` of the adapter)
    mounted the source only, without its `volumeId`, then copied the view state: a fusion
    lost its PET, the capture loaded a second copy of the CT volume under a new id
    (`cornerstoneStreamingImageVolume:volume-1rtppm9` beside the volume of the pane), the
    pan and zoom were copied in the units of the pane, and the capture viewport was
    mounted again at each change of its size.
- **Fix, in OHIF:**
  - Rows: `getVolumeIds()` of the planar or 3D viewport (no labelmap of a
    segmentation), the display set of each volume from `getDisplaySetIdForVolumeId`, its
    range from `getScalarRange(displaySetId)`, its window, colormap and opacity from
    `getEffectiveDisplaySetAppearance(displaySetId)`. The histogram bins the values of
    the volume (of the time point on display for a dynamic volume) between that range;
    the `getRange` task of the worker is gone. A volume whose values on display have not
    arrived keeps its last row. The handlers set the window and the opacity on the
    display set of the row. `utils/getPlanarOr3DViewport.ts` types a viewport as planar
    or 3D by its `type`.
  - The threshold range: `getScalarRange(displaySetInstanceUID)`.
  - Capture: every display set of `source.getDisplaySets()` that is not the labelmap of a
    segmentation (its registration has `reference.kind === 'segmentation'`), each with
    the options of its mount and the overrides of its appearance
    (`getDisplaySetAppearance`) as the mount option `appearance`; then the view reference
    and `getViewFraming()` of the source; then the segmentation representations of the
    source, once. The capture viewport is mounted once; a change of its size resizes it
    and shows the view of the source again. The orchestration stays in the download form.
  - `getDataIdForVolumeId`, `getVoxelManagerForDisplaySet` and `copyDisplayedContentTo`
    of the adapter are deleted (no caller left).
- **Checks:**
  - jest: `ViewportWindowLevel/utils.test.ts` (new: a stack has no row, an MPR one, a
    fusion two, a fusion with a labelmap two, 3D one, a volume without values none yet,
    a video none; the kept rows), `getViewportVolumeHistogram.test.ts` (new),
    `CornerstoneViewportDownloadForm.test.ts` (new: the layers of a fusion without the
    labelmap, with their options and overrides; the reference then the framing; one
    representation of each segmentation; a size change does not mount again),
    `useViewportRendering.test.ts` (2 new). On the export of `8659924b25` 17 of them
    fail (the capture suite after its `@ohif/core/src` import is changed in the copy:
    that import cannot be mapped in jest, and the form now imports `useSystem` from
    `@ohif/core`).
  - The window level panel in the viewer (added to the left panel with `panelService`),
    on both sides (lane O5 `wl/`): a stack no row on both; an MPR pane one; 3D one; an MR
    MPR one, and after a SEG hydration one on this branch, two on `master` (a row for
    the labelmap); the TMTV fusion two, and two with a labelmap, on both. The PET row
    shows the window that is drawn (0 to 4, as `getProperties` of `master` gives it);
    `master` showed the protocol's 0 to 5. The MR row has the range 0 to 943 that
    Cornerstone gives; `master` showed 0 to 255, the values that its volume holds (M65).
    In the preclinical 4D mode the row comes when the time point on display has arrived
    (about 30 s) and stays; `master` shows the histogram of the last time point from
    about 10 s.
  - The capture in the viewer (lane O5 `capture/`), at 1.25 times the size of the pane
    and then at 500 by 500: a CT stack zoomed, turned and with a length, a sagittal MPR
    pane zoomed and turned, 3D, and the TMTV fusion with a PET opacity of 0.7 and a
    brushed labelmap. The capture shows the layers of the pane (the fusion: CT, PET with
    its colormap, ramp, window and opacity, and the labelmap once, with one
    representation), the slice, the framing and the same world point at the centre of
    the canvas at both sizes. Its canvas, scaled to the pane, differs from the pane by
    more than 16 in 0.09% (stack), 0.16% (MPR) and 1.04% (fusion: the outline of the
    labelmap, drawn at a fixed width in pixels) of the pixels; 3D 14% (a 3D remount is
    not pixel deterministic, M58; the camera is the same). No volume is loaded again,
    except for 3D (M62).
- **State:** fixed in task O6 (committed in `67ab3444fd`). Closes M17.

## M62. A 3D viewport does not give the volume of its mounts

- **Seen (task O6):** the capture of a 3D pane loads a second copy of its volume
  (`cornerstoneStreamingImageVolume:volume-u3nwmr` beside
  `cornerstoneStreamingImageVolume:<uid>`).
- **Why:** `VolumeViewport3D.getDisplaySets()` is the method of `BaseViewport`: each entry
  is `{ displaySetId, options: { role } }`, without the `volumeId` of the mount. A mount
  copied from it loads `utilities.getDefaultVolumeId(imageIds)`. The planar viewport gives
  the options of each mount (DS3).
- **Smallest case**, Cornerstone3D calls only: a `VolumeViewport3D`,
  `await viewport.setDisplaySets({ displaySetId: 'ct', options: { volumeId: 'myVolume' } })`,
  then `viewport.getDisplaySets()` gives `[{ displaySetId: 'ct', options: { role: 'source' } }]`;
  `otherViewport3D.setDisplaySets(...viewport.getDisplaySets())` creates and loads a
  volume with the default id.
- **Fix, in cornerstone:** `getDisplaySets()` of every viewport family gives the resolved
  options of each mount; a 3D viewport gives `{ role, volumeId }` (cornerstone3D
  `735fc811e`, FX4).
- **Fix, in OHIF:** none (rule 3). The capture mounted what `getDisplaySets()` gives
  already (M61); nothing in it existed for this gap, so nothing is removed. The cast
  `options as Record<string, unknown>` stays: `Types.IViewport` types the options of a
  mount as `unknown`, and the capture adds `appearance` to them.
- **Checked (task O9, link at `735fc811e`):** the smallest case in the page of the viewer
  (lane O9 `specs/gaps.spec.ts`, `cases/gaps-small/`): the 3D pane of "3D only" gives
  `{ role: 'source', volumeId: 'cornerstoneStreamingImageVolume:<uid>' }`, and a second 3D
  viewport given `...getDisplaySets()` shows the same entry and loads no volume. The OHIF
  case (`specs/capture.spec.ts`, `cases/capture/`): the capture of a CT stack, a sagittal
  MPR pane, a 3D pane and the TMTV fusion with a labelmap, each at 1.25 times its pane and
  at 500 by 500: no volume is made in any of the four (the 3D capture made
  `cornerstoneStreamingImageVolume:volume-u3nwmr` before), and the layers, overrides,
  framing, reference and world point at the centre are those of the pane.
- **State:** closed (fixed in cornerstone `735fc811e`, checked in task O9).

## M63. The stack prefetch adds a listener at each enable that its disable cannot remove

- **Seen (task O5, counting listeners):** `eventTarget` has one more
  `IMAGE_CACHE_IMAGE_REMOVED` listener after each stack mount (1 to 7 in five rounds of
  layout changes), on `master` (5.18.3) too.
- **Why:** `stackContextPrefetch.enable(element)` and `disable(element)` of the tools each
  call `getPromiseRemovedHandler(element)`, which makes a new function; `enable` adds it
  to `eventTarget`, `removeEventListener` of the same new function removes nothing, and
  `disable` cannot reach the one that was added. Each listener keeps its element.
- **Smallest case**, Cornerstone3D calls only: a planar viewport with a stack,
  `utilities.stackContextPrefetch.enable(element)` three times, then `disable(element)`:
  `eventTarget.listeners[Events.IMAGE_CACHE_IMAGE_REMOVED]` holds three more functions
  than before.
- **Fix, in cornerstone:** one handler per element, used by `enable` and `disable` of
  both prefetches (cornerstone3D `735fc811e`, FX4).
- **Fix, in OHIF:** none (rule 3). The backend enables the prefetch once per stack mount;
  the per-mount listener of OHIF that enabled it again is gone (M60).
- **Checked (task O9, link at `735fc811e`; lane O9 `cases/gaps-small/`):** the smallest
  case: three `enable` add no listener, `disable` removes the one there is; the same for
  `stackPrefetch`. The five rounds of layout changes of M60 (`specs/listeners.spec.ts`,
  `cases/listeners/`) still add one `IMAGE_CACHE_IMAGE_REMOVED` listener per round (2 to
  8): each is the handler of a stack viewport that a layout change destroyed, which no
  one disables. That is another defect: M71.
- **State:** closed (fixed in cornerstone `735fc811e`, checked in task O9); what is left
  is M71.

## M64. A synchronizer adds an `ELEMENT_DISABLED` listener each time its viewports change

- **Seen (task O5, counting listeners):** five rounds of 2x2, 1x1, MPR and 1x1: the
  `ELEMENT_DISABLED` listeners of `eventTarget` grow from 2 to 85 and those of the element
  of a pane from 0 to 58, all of them the `disableHandler` of `Synchronizer`; the same on
  `master`.
- **Why:** `Synchronizer._updateDisableHandlers` makes a new `disableHandler` at each call,
  so its `removeEventListener` removes nothing and its `addEventListener` adds one more,
  on each viewport of the synchronizer, at each `add` and `remove`.
- **Smallest case**, Cornerstone3D calls only: a synchronizer with two viewports (event
  source `element`), `synchronizer.add` of a third viewport: the element of the first
  viewport has three `ELEMENT_DISABLED` listeners where it had two.
- **Fix, in cornerstone:** one handler per synchronizer, on `eventTarget`, which removes
  a disabled viewport by its rendering engine and viewport ids (cornerstone3D `735fc811e`,
  FX4).
- **Fix, in OHIF:** none (rule 3).
- **Checked (task O9, link at `735fc811e`):** the smallest case (lane O9
  `cases/gaps-small/`): a synchronizer of two MPR panes adds one `ELEMENT_DISABLED`
  listener to `eventTarget` and none to an element; a third viewport adds none; destroying
  the synchronizer removes it. The five rounds of M60 (`cases/listeners/`):
  `ELEMENT_DISABLED` on `eventTarget` 4 after the first load, 5 after round 1, and 5 after
  each later round; 0 on the element of the pane.
- **State:** closed (fixed in cornerstone `735fc811e`, checked in task O9).

## M65. A volume of 12-bit images keeps 8 bits when its first image fits in 8 bits

- **Seen (task O6, the window level row of an MR):** the MR of
  `1.3.12.2.1107.5.2.32.35162.30000015050317233592200000046` (Bits Stored 12): its volume
  holds a `Uint8Array` whose largest value is 255, while `voxelManager.getRange()` and
  `getScalarRange()` give `[0, 943]`; the same volume on `master`.
- **Why (seen, not read in the loader):** the image loader gives each image the smallest
  array that holds its values: image 0 a `Uint8Array` (largest value 135), image 64 a
  `Uint16Array` (637). The volume takes the type of the first image, so values above 255
  are cut.
- **Smallest case**, Cornerstone3D calls only: `volumeLoader.createAndCacheVolume(id, {
  imageIds })` of that series, `volume.load()`; then
  `volume.voxelManager.getCompleteScalarDataArray()` is a `Uint8Array` with largest value
  255, and `(await imageLoader.loadAndCacheImage(imageIds[64])).voxelManager.getScalarData()`
  is a `Uint16Array` with largest value 637.
- **Fix, in cornerstone:** the array type of a volume comes from the metadata of its
  series (Bits Allocated, Pixel Representation, the modality LUT and scaling), not from the
  array of a cached image (cornerstone3D `735fc811e`, FX4; the guide: "The array type of a
  volume").
- **Fix, in OHIF:** none (rule 3).
- **Checked (task O9, link at `735fc811e`; lane O9 `specs/gaps.spec.ts`,
  `specs/m65ohif.spec.ts`, `specs/wlRows.spec.ts`, `cases/m65/`, `cases/m65-ohif/`,
  `cases/wl/`):**
  - The volume of the MR in an MPR is a `Uint16Array`, largest value 943, which is its
    range and `getScalarRange()`. As a stack each image keeps the array that fits its own
    values (image 0 a `Uint8Array` up to 135, image 64 a `Uint16Array` up to 637), and the
    stack gives the range of the image on display: no value is cut there. `master` holds a
    `Uint8Array` with largest value 255.
  - The window level row of the MR MPR spans 0 to 943 (`master` 0 to 255) and bins the
    true values. A stack has no row, on both sides.
  - Other places that showed values of the cut data on `master`: the statistics of the
    segments of the SEG over this MR in the segmentation mode (the tooltip and the CSV of a
    segment read `cachedStats.namedStats` from `getStatistics`). Cerebral white matter:
    mean 358.5, largest 656 on this branch; mean 107.7, largest 255 on `master`; the same
    count of voxels (175,929); cerebral grey matter 230.7 against 159.9. The values of
    `master` were the true values modulo 256. The picture of the MPR is right on both
    sides (the texture is filled from each image).
- **State:** closed (fixed in cornerstone `735fc811e`, checked in task O9). A user sees
  other segment statistics than on `master` for a series with values above 255 whose
  first image fits in 8 bits; the Cornerstone guide names the change of the array type.

## M66. The labelmap of a stack is mounted again for every image

- **Seen (task O5):** cine of a CT stack with a labelmap: the element of the pane gets two
  `DISPLAY_SETS_CHANGED` for each image (146 in about 7 s at 24 per second), each with
  `sourceChanged: false`: the labelmap image of the last image is removed and the one of
  the next image is added (`syncStackLabelmapActors` mounts each labelmap image as a
  display set through `addImages`).
- **Why it matters:** a listener for every layer runs twice at each scroll of such a
  stack. The window level panel compares the volume ids before it recomputes, so it does
  nothing then (M60). The cost of the two mounts at each image may be part of M49 (the
  cine of a stack with a labelmap plays slower); not measured.
- **Fix, in cornerstone:** the labelmap of a stack is one display set per labelmap layer
  whose image follows the slice: `addImages` with the id of a mounted image replaces its
  image and fires nothing (cornerstone3D `735fc811e`, FX4).
- **Fix, in OHIF:** none needed. The filter of the window level panel (recompute when the
  source changed or `getVolumeIds()` differs from the rows) stays: the rows are made from
  `getVolumeIds()`, and an overlay that is no row (a labelmap shown on an MPR fires the
  event with `sourceChanged` false and the same volumes) needs no new histogram. It was
  not only a guard against this churn. The sentence of OHIF's migration page about two
  events per image is gone.
- **Checked (task O9, link at `735fc811e`; lane O9 `specs/gaps.spec.ts`, `cases/m66/`):**
  cine at 24 a second for 5 s of the CT stack of the SEG study with a brushed labelmap: 0
  `DISPLAY_SETS_CHANGED` on the element (146 in about 7 s before), in two runs; the
  images a second are those of `master` (M49).
- **State:** closed (fixed in cornerstone `735fc811e`, checked in task O9).

## M67. A 3D pane that goes to a pane of another size and back comes back with half its pan

- **Seen (task O7, link at `99867e2c5`; lane O7 `specs/m59pan3d.spec.ts`,
  `specs/m59fourup.spec.ts`, `cases/m59/`):** 3D only of the LIVER CT (1275 by 942), pan
  `[58.34, 29.24]` and zoom 0.731; 3D four up: the 3D pane (638 by 470) shows pan
  `[29.11, 14.59]`, the same world point at its centre (focal point x -33.99 for -34.04);
  3D only again: pan `[29.11, 14.59]`, the focal point moved (x -24.01). `master` keeps
  `[58.34, 29.24]` in both steps (in the small pane at another world point).
- **Why (measured, not read in the code):** the framing read in the small pane is the same
  visible, hidden and detached (FX3 is right). `setViewFraming` of a framing read in a
  638 by 470 pane, written to a 1275 by 942 pane, gives the same pan in canvas pixels,
  as the guide says for a 3D framing (zoom and pan against the fit of the viewport it is
  written to). The way in keeps the world point instead: the framing is written to the new
  pane and a resize, which keeps the camera of a 3D viewport, follows. The two rules
  together lose half of the pan on the round trip.
- **Smallest case**, Cornerstone3D calls only (measured in the viewer, lane O7
  `cases/m59/fourup-min.json`): the 3D pane of 3D four up (638 by 470), `setPan([30, 15])`,
  `const framing = viewport.getViewFraming()`; the 3D pane of 3D only (1275 by 942),
  `resetViewState()`, `setViewFraming(framing)`: `getPan()` gives `[30, 15]` and the focal
  point is another world point. A resize keeps the camera of a 3D viewport, so the world
  point (guide, "Smaller changes"); not measured alone.
- **Fix, in cornerstone:** a framing has `worldPan` beside `pan`, the shift of the fit
  centre in world units; `setViewFraming` takes `worldPan` in place of `pan`, so a framing
  written to a pane of another size shows the same world point at the centre, as a resize
  does (cornerstone3D `869981396`, FX5; the guide: "A framing carried to another size
  keeps the world point at the centre").
- **Fix, in OHIF:** none (rule 3). The service stores `getViewFraming()` and gives it to
  `setViewFraming` as it is, so the stored framing carries `worldPan`.
- **Checked (task O9, link at `735fc811e`; lane O9 `specs/m67.spec.ts`, `cases/m67/`,
  `cases/m67-small/`):** 3D only of the LIVER CT, the same mouse pan and zoom as above:
  pan `[58.34, 29.24]`, `worldPan` `[20.03, 10.04]`, zoom 0.731; 2x1 and back, MPR and
  back, 3D four up and back: each time pan, zoom and focal point as after the edit. In
  the four up pane (638 by 470) the pan reads `[29.19, 14.63]` with the same `worldPan`
  and focal point: the same world point at the centre. `master` keeps the pan in pixels
  there, at another world point (lane O7). The smallest case: the framing of the four up
  pane after `setPan([30, 15])` written to the 3D pane of 3D only gives the same
  `worldPan` and focal point, `getPan()` `[59.95, 29.98]`.
- **State:** closed (fixed in cornerstone `869981396`, checked in task O9). What a user
  sees against `master`: a panned 3D view keeps its world point at the centre in a pane of
  another size, where `master` keeps the pan in pixels; the Cornerstone guide names it.

## M68. The viewport adapter is deleted: OHIF calls the viewports of Cornerstone3D (task O7)

- **Seen (read in the code):** after tasks O1 to O6 every member of `IViewportAdapter`
  was a pass to a member of the viewport, through optional calls on a structural type
  (`getCurrentMode?.()`, `getDisplaySetAppearance?.(...)`) and an index signature on its
  types, except two: `getShownDisplaySetId` (the rule of M44) and `getVolumeIds` (a scan
  of the actors). 23 files of code called it, in 79 places; the extension exported
  `getViewportAdapter`, `isVolumeRenderingViewport` and `getViewportFocalPoint`.
- **Fix, in OHIF:** `services/ViewportService/adapter/` is deleted (`IViewportAdapter`,
  `ViewportAdapter`, `getViewportAdapter`, the index, the contract test of 22 tests).
  Each member and what replaces it:

  | Adapter member | Replaced by | Kind |
  |---|---|---|
  | `getShape() === 'volume3d'` | `isVolumeViewport3D(viewport)`: `viewport.type === VOLUME_3D`, as the adapter answered by the type, also for an empty 3D pane | Cornerstone type, narrowed |
  | `getShape() === 'stack'` / `'volume'` | `viewport.getCurrentMode() === 'stack'` / `'volume'` | Cornerstone call |
  | `isVolumeRendering()`, `isVolumeRenderingViewport(viewport)` | `viewport.getCurrentMode() === 'volume'` | Cornerstone call |
  | `canReorientInPlace()` | `getCurrentMode()` is `'volume'` or `'volume3d'` | Cornerstone call |
  | `isInAcquisitionPlane()` | `viewport.isInAcquisitionPlane()` of a planar viewport (true for a stack, the geometry for a volume) | Cornerstone call |
  | `hasContent()` | `getCurrentMode()` not `'empty'` and not `'unknown'` | Cornerstone call |
  | `getViewState()`, `setViewState()` | `viewport.getViewState()`, `setViewState()`; the flips and the rotation read as `Pick<Types.ICamera, ...>` | Cornerstone call |
  | `getViewPlaneNormal()`, `getFocalPoint()`, `getViewportFocalPoint(viewport)` | `viewport.getViewReference()?.viewPlaneNormal`, `?.cameraFocalPoint` | Cornerstone call |
  | `getAppearance(id)`, `getEffectiveAppearance(id)` | `getDisplaySetAppearance(id) ?? {}`, `getEffectiveDisplaySetAppearance(id) ?? {}` | Cornerstone call |
  | `setAppearance(props, id?)` | `setDisplaySetAppearance(id, props)`, or `setDisplaySetAppearance(props)` for the source | Cornerstone call |
  | `getBlendMode()` | `getPlanarOr3DViewport(viewport)?.getDisplaySetAppearance()?.blendMode` | Cornerstone call |
  | `getShownDisplaySetId(uid)` | `getShownDisplaySetId(viewport, uid)`, `utils/getShownDisplaySetId.ts` (M44: the UID when `getDisplaySets()` lists it or is empty) | OHIF helper, OHIF's own rule |
  | `getVolumeIds()` | `getPlanarOr3DViewport(viewport)?.getVolumeIds() ?? []`, without labelmaps (below) | Cornerstone call |
  | the types `ViewportAppearance`, `ViewportColormap`, `ViewportViewState`, `VOIRange` | `DisplaySetAppearanceOverrides` (`types/Presentation.ts`: `Partial<PlanarDisplaySetAppearance & Volume3DDisplaySetAppearance>`); the others unused | Cornerstone types |

  `utils/viewportTypeGuards.ts` replaces `utils/getPlanarOr3DViewport.ts`:
  `isPlanarViewport`, `isVolumeViewport3D`, `isVideoViewport`, `isECGViewport` (type
  predicates by `viewport.type`, no cast) and `getPlanarOr3DViewport`. The zoom command
  asks `viewportHasZoom` of Cornerstone3D. No `as unknown as`, no `Record<string, unknown>`
  and no optional-method type on a viewport is left in the callers.
- **`getVolumeIds`, per caller:** the adapter's actor scan gave what
  `viewport.getVolumeIds()` gives, without labelmaps, in all 30 panes of six situations
  (MPR, 3D four up, an MR MPR with a hydrated SEG, the TMTV fusion with and without a new
  labelmap, a stack with a labelmap; lane O7 `specs/volumeIds.spec.ts`,
  `cases/volumeIds/log.json`); only `getVolumeIds({ includeSegmentations: true })` of the
  MIP pane lists a labelmap. The cine (the dynamic volume a pane plays, and the panes that
  show it) and the command `getVolumeIdForDisplaySet` take `getVolumeIds()`: a labelmap is
  never a volume that plays, and the command never gave one.
- **The exports** `getViewportAdapter`, `isVolumeRenderingViewport` and
  `getViewportFocalPoint` of `@ohif/extension-cornerstone` are gone, each with a row in the
  migration guide (`cornerstone3d-6.md`, "Removed and renamed exports" and "The viewport
  adapter is gone"). tmtv and the default extension call the viewport.
- **Decided:** the LUT presentation stores the overrides of a planar or a 3D viewport only
  (`getPlanarOr3DViewport`), the two families whose mounts read it; a video, whole slide
  or ECG pane stored its overrides before and nothing read them.
- **Checks:** jest: `utils/getShownDisplaySetId.test.ts` (new, the three cases of M44 from
  the contract test); `initCineService.test.ts` gives the viewports `getVolumeIds` in place
  of actors; two mocks of `SegmentationService.test.ts` get `getCurrentMode` and one of
  `CornerstoneViewportService.test.ts` a `type` (the adapter called them optionally).
  The rest of the checks are in M69.
- **State:** fixed in task O7 (committed in `e4f9451c6e`).

## M69. The interfaces with one implementation are deleted (task O8)

- **Seen (read in the code):** `IViewportBackend`, `IViewportServiceInternals`,
  `IViewportOperations` and `ISegmentationBackend` (35 places in 14 files) each had one
  implementation. They were kept on 21 November for a renderer on a server. The service
  and `ViewportBackend` called each other: the service computed a mount and passed it to
  the backend, which mounted and called the service back (`setPresentations`,
  `_addOverlayRepresentations`, `_trackViewportDisplaySets`); `mountEcg`, `mountOther`,
  `setLutPresentation`, `setPositionPresentation` and `getPositionPresentation` were passes.
- **Fix, in OHIF:** the four interfaces and both `backends/` folders are deleted.
  - `CornerstoneViewportService` implements `IViewportService` of `@ohif/core` only. It
    routes a mount to its family (`_setDisplaySets`, the body of `dispatchMount`), mounts
    an ECG, a video and a whole slide by the UID itself, re-mounts with the camera kept
    (`updateViewport`, the body of `remount`), and after a mount replays the position and
    segmentation presentations and adds the overlays, in the order the backend did.
  - `viewportMounts.ts`: `mountStack` and `mountVolumes`, the translation of the viewport
    data of a hanging protocol into `setDisplaySets` (options, appearance, slab, render
    backend), with no call back into the service.
  - `viewportPresentations.ts`: `getPositionPresentation`, `setPositionPresentation`,
    `getLutPresentation`, `setLutPresentation`; `WITH_ORIENTATION` is defined there once
    (the backend had a copy) and the service exports it as before.
  - `viewportOperations.ts` moves to `services/ViewportService/`, without its interface;
    its `getViewPlaneNormal` (a pass) is gone, the service reads the view reference.
  - `SegmentationService/classifyAndPrepareLabelmapAdd.ts` and
    `SegmentationService/assembleSegmentationDataForSEG.ts` (the SEG overlap group
    assembly) are plain functions; `jumpToSegmentCenter` (a pass that always answered
    true) is `viewport.setViewReference({ cameraFocalPoint: world })` in the service.
  - `backends/README.md` is `services/ViewportService/README.md`: where each concern lives,
    and that a renderer on a server goes under `IViewport` in Cornerstone3D
    (`registerRenderBackend`, `registerViewportType`) or into an OHIF extension of its own
    that implements `IViewportService`.
- **Checks (tasks O7 and O8 together, link at `99867e2c5`):**
  - jest: 170 suites, 1986 tests pass (lane O7 `jest-final.json`; base 169 and 2004: the
    contract test of the adapter (22 tests) is gone, `ViewportBackend.test.ts` is
    `viewportMounts.test.ts` and `viewportPresentations.test.ts`, its ECG and video case is
    in `CornerstoneViewportService.test.ts`, `CornerstoneCacheService.test.ts` routes
    through the service).
  - Type check against the base `67ab3444fd` (lane O7 `tsc-base.log`, `tsc-after.log`): no
    new error; 8971 error lines become 8864, all of the 107 the test-runner globals of the
    deleted test files. No error kind of the source goes: the adapter-era code had none of
    its own, its casts and optional calls hid the types; the calls to the viewports are
    typed and checked now.
  - Build passes. Lint: no new error or warning on the 41 changed files.
  - The numbers (lane O7 `measure.sh`, source without tests and docs):

    | | master `6fe59945a0` | plan start `78432e76cb` | before O7 `67ab3444fd` | after O8 |
    |---|---|---|---|---|
    | lines of `services/ViewportService/` | 4899 | 4179 | 3576 | 2825 |
    | lines of the cornerstone extension | 43233 | 42098 | 41441 | 40661 |
    | `as any` / `as unknown as` on a line that names a viewport (all OHIF source) | 18 | 15 | 11 | 0 |
    | plain casts to a viewport type (`as PlanarViewport`, ...) | 41 | 31 | 30 | 16 |
    | files that import a viewport class or type of Cornerstone3D by name | 1 | 21 | 22 | 18 |
    | files that use `Types.IViewport` | 23 | 13 | 15 | 14 |
  - Lines of the change: OHIF source without tests and docs 1213 added, 1995 deleted
    (`viewportOperations.ts` moved and counts on both sides); tests 781 added, 1060
    deleted; the migration guide and the READMEs (without this log) 133 added, 83 deleted.
  - Playwright, the whole suite, 6 workers, `TEST_ENV=true`: before (link at `99867e2c5`,
    no change) 243 passed, 0 failed, 4 skipped in 7.0 min; after 242 passed, 1 failed, 4
    skipped in 7.0 min (lane O7 `pw-base.json`, `pw-after.json`). The failure is
    `ContourSegmentColorChange.spec.ts` "changes the contour color when the user saves the
    edits", a flaky spec that fails as often on the base: M70. No baseline picture changed.
- **State:** fixed in task O8 (committed in `e4f9451c6e`).

## M70. A spec of the contour colour reads the stroke before the next draw

- **Seen (task O8):** `ContourSegmentColorChange.spec.ts` "changes the contour color when
  the user saves the edits" fails now and then: the stroke of the SVG path is still
  `rgba(0, 235, 235, 1)` where `rgba(255, 0, 255, 1)` is expected. Alone, ten runs each
  (`--repeat-each=10`, one worker): 3 of 10 fail on the base `67ab3444fd` (an export of
  the commit with the installed packages linked, served on the same port) and 3 of 10 on
  the branch with tasks O7 and O8. The base run of the whole suite passed it by chance.
- **Why (read in the spec):** it reads the `stroke` of the path right after the colour
  dialog closes and the row of the panel shows the new colour; the SVG of the contour is
  drawn again at the next render of the viewport, which may not have happened yet.
- **Fix, in OHIF:** to do, in the test: wait for the stroke (`expect.poll` or
  `toHaveAttribute` on the path) instead of reading it once. Not done here: a test that
  these tasks do not touch.
- **Measured (task O9):** not a delay of the product. `segmentationService.setSegmentColor`
  (the call of the colour dialog) on the RTSTRUCT of the spec, five colours, counted with
  a `MutationObserver` and animation frames (lane O9 `specs/m70timing.spec.ts`,
  `cases/m70-timing/`): the row of the panel takes the colour in frame 0 or 1, the stroke
  of the path in frame 3, on this branch and on `master` alike. A test that reads the
  stroke once when the row shows the colour can read the old stroke on both. The original
  spec, alone, ten runs, one worker: 6 of 10 pass on this branch, 0 of 10 on `master`
  (its own copy of the spec against `master` served with its committed `e2e.js`).
- **Fix, in OHIF (task O9):** `tests/ContourSegmentColorChange.spec.ts` waits for the
  stroke with `toHaveAttribute('stroke', ...)` on the path (Playwright retries it), no
  fixed sleep. Checks: 20 of 20 on this branch (`--repeat-each=20 --workers=1`, lane O9
  `m70-branch-20.json`), and the same test against `master`, 10 of 10
  (`m70-master-fixed-10.json`).
- **State:** fixed `ca046b21d2` (task O9).

## M71. A stack viewport that is destroyed keeps its prefetch listener

- **Seen (task O9, link at `735fc811e`):** five rounds of layout changes (2x2, 1x1, MPR,
  1x1, another series), the listeners of M60 counted again: `IMAGE_CACHE_IMAGE_REMOVED` on
  `eventTarget` grows by one a round (2 to 8). Each new one is the handler that
  `stackContextPrefetch.enable(element)` made for the element of a stack viewport, and it
  stays when that viewport is destroyed; it holds the element. M63 (one listener per
  `enable`) is fixed: a pane enabled again adds none.
- **Why (read in the code):** the prefetch keeps a handler per element on `eventTarget`
  until `disable(element)`. Nothing calls `disable` when the rendering engine disables the
  element: OHIF enables the prefetch at each stack mount (`mountStack` in
  `viewportMounts.ts`) and calls no `disable`, on `master` too, and the prefetch does not
  listen to `ELEMENT_DISABLED`, as the synchronizer and the tool groups do since FX4. Its
  state by element (`getToolState`) stays as well (row 217 of Cornerstone3D's open issues).
- **Smallest case**, Cornerstone3D calls only (lane O9 `specs/m63disabled.spec.ts`,
  `cases/m63-disabled/`): a planar viewport on a new element, `setDisplaySets` of a stack,
  `utilities.stackContextPrefetch.enable(element)`, then `renderingEngine.disableElement`
  of that viewport: `eventTarget.listeners[IMAGE_CACHE_IMAGE_REMOVED]` holds one more
  function after each of three rounds (2, 3, 4, 5).
- **Fix, in cornerstone:** when the element of a viewport is disabled (by
  `disableElement` or by the destroy of its rendering engine), the tools' `ELEMENT_DISABLED`
  path (`removeEnabledElement`) calls `disable` of both stack prefetches; `disable` removes
  the cache listeners on `eventTarget`, the `NEW_IMAGE` listener, the timer (one per
  element now), the state and the queued requests of that element. `stackPrefetch.disable`
  also stopped emptying the whole prefetch queue (the loads of every other viewport with
  it): it removes the requests of its own element only (cornerstone3D `28dd3ab33`, FX6,
  its open issues rows 217, 223 and 224).
- **Fix, in OHIF:** none (rule 3). A call of `disable` in `disableElement` would work too;
  it is not added, as the library keeps this state per element and can drop it itself.
- **Checked (task O9b, link at `28dd3ab33`; lane O9b `specs/`, `cases/`):**
  - The smallest case (`m63disabled.spec.ts`), three rounds with `stackContextPrefetch` as
    in O9 and three with `stackPrefetch`: `IMAGE_CACHE_IMAGE_REMOVED` on `eventTarget` is 2,
    3 after `enable`, and 2 again after `disableElement`, in every round (O9: 2, 3, 4, 5).
    The element has one `NEW_IMAGE` listener while the prefetch is on and none after.
  - The five rounds of layout changes in OHIF (`listeners.spec.ts`, run twice, the same
    numbers): `IMAGE_CACHE_IMAGE_REMOVED` is 2 after the first load, then 1 after each of
    the five rounds, so it grows by 0 a round (O9: 2, 4, 5, 6, 7, 8). The one left is the
    cache's own (`markRemoved`); no prefetch handler is left, as the pane after each round is
    an MPR pane. `ELEMENT_DISABLED` stays flat after round 1, as in O9 (M64). Of the 24
    elements destroyed in the five rounds, 19 are collected after a forced garbage
    collection; 5 stay alive, detached: 2 of round 1 and the 3 panes of the last round, none
    of rounds 2 to 4, so nothing grows by round. What holds them is not the prefetch (no
    prefetch handler is left) and was not looked for. The only listener on each of them is
    OHIF's `CAMERA_RESET` listener (M75); no listener of the prefetch is left on any
    destroyed element.
  - The other change in the viewer (`volumeKeepsLoading.spec.ts`, `ownElementOnly.spec.ts`,
    the `LIVER 3 PHASE` study, network slowed to 1 MB/s and 0.6 MB/s): a pane with a CT as
    a sagittal volume still loading (11 of 79 frames; in the second case 10 of 79), the
    stack pane beside it closed by a layout change (1x2 to 1x1; 1x3 to 1x2). The 63 (66)
    queued requests of the volume are in the pool just before and just after the change,
    and the volume loads to the end (79 of 79, `IMAGE_VOLUME_LOADING_COMPLETED`, never
    cancelled, 21 s and 64 s). The queued requests of the other stack pane stay (70 before,
    70 after); in an earlier run of the 1x3 case (its volume came from the cache, so it
    counts for this only) the closed pane's own 75 queued requests went and the other
    pane's 70 stayed. OHIF's volumes load with `coarseInterleavedRetrieveStages`, whose
    requests are of the type `thumbnail`, so the old `stackPrefetch.disable` (it emptied the
    `prefetch` queue only, and only for an element with `stackPrefetch` on, which OHIF never
    enables: it uses `stackContextPrefetch`) could not have stopped a volume of OHIF; it
    would have taken the queued prefetch of every other stack pane.
- **State:** closed (fixed in cornerstone `28dd3ab33`, checked in task O9b).

## M72. On the CPU a jump to a measurement pushed the image out of the pane

- **Seen (task O9, each mode by hand on the CPU):** longitudinal mode on the CPU
  (`?viewportRendering=cpu`), the SR of the test study of `SRHydration.spec.ts`
  (`1.3.6.1.4.1.14519.5.2.1.7695.4007.324475281161490036195179843543`) hydrated, the stack
  moved to image 1, then a click on the second measurement of the panel: the stack goes to
  image 59 and the image moves to the top left corner of the pane, its centre near the
  corner (50% of the pixels of the grid differ from the GPU). On the GPU the measurement
  is centred. `master` on the CPU centres it too. This is the second effect of M39, which
  stayed after the fix of the resize.
- **Why (measured, lane O9 `specs/cpujump.spec.ts`, `cases/cpujump/`):** a planar viewport
  drawn on the CPU draws into a CPU canvas; `viewport.canvas` is the GPU canvas, hidden,
  with a CSS size of 0 by 0 (its buffer keeps its first size, 1275 by 942).
  `viewportOperations.centerOnMeasurement` read `viewport.canvas.clientWidth` and
  `clientHeight`, so it panned the centre of the measurement to the canvas point (0, 0):
  pan `[-450.3, -484.8]` on the CPU against `[63.7, -13.8]` on the GPU. The Cornerstone
  guide names it (the row of `getCanvas()` in `3-api-map.md`: "`viewport.canvas` is the
  GPU canvas in both; `viewport.getCanvas()` gives the canvas that shows").
- **Fix, in OHIF:** `centerOnMeasurement` measures `viewport.getCanvas()`. No other OHIF
  code reads the size of `viewport.canvas`.
- **Fix, in cornerstone:** none.
- **Checks:** `viewportOperations.test.ts`, "pans to the centre of the canvas that shows
  the picture when the CPU draws it" (failed first, lane O9 `jest-cpujump-failfirst.log`;
  16 of 16 after). In the viewer on the CPU: pan `[63.7, -13.8]` after the jump, as on
  the GPU.
- **State:** fixed `ca046b21d2` (task O9).

## M73. The PET axial pane of TMTV showed its slice without the instance number

- **Seen (task O9, TMTV against `master`):** at the opening of the TMTV mode the PET
  axial pane reads `1/135` where the CT and fusion axial panes and `master` read
  `I:135 (1/135)`; after the first change of slice it reads `I:102 (34/135)` as on
  `master`.
- **Why (measured, lane O9 `specs/ptoverlay.spec.ts`, `cases/ptoverlay/`):** the overlay
  computed the instance number of a volume slice once for each slice index (`useMemo` on
  the viewport data and the index), and it needs the view plane normal of the viewport. The
  overlay of the PET pane rendered while its viewport existed with no display set (`1/0`,
  no view reference); the mount came 0.4 s later, with the same slice index, so the number
  was never read again. On `master` the legacy viewport had a camera before its mount.
- **Fix, in OHIF:** `CustomizableViewportOverlay` renders again when its viewport fires
  `DISPLAY_SETS_CHANGED` (a state counter) and reads the instance number at each render
  (it was a memo of the slice index; a counter in the memo's dependencies is an
  "unnecessary dependency" to the hook rule and would break the lint budget of CI).
- **Checks:** `CustomizableViewportOverlay.test.ts` (new; it failed first, lane O9
  `jest-overlay-failfirst.log`). In the viewer: the PET axial pane reads `I:135 (1/135)`
  from the mount.
- **State:** fixed `ca046b21d2` (task O9).

## M74. A volume of a display set that grew while no viewport showed it keeps its first images

- **Seen (task O9, lane O9 `specs/notshown.spec.ts`, `cases/notshown-grow/`):** the CT of
  the DFCI study (120 images) cut to 100 images before its first mount, shown as an MPR,
  then the pane given another series, then the display set given its 120 images back and
  its metadata invalidated (`setDisplaySetMetadataInvalidated`): shown as a stack it has
  120 images on this branch (100 on `master`); shown as an MPR again its volume has 100
  slices on this branch and on `master`.
- **Why (read in the code):** `CornerstoneCacheService` keeps the image ids of the volume of
  each display set (`volumeImageIds`) and uses the cached volume again while both exist.
  The invalidation of a display set's metadata makes the volume again only for a viewport
  that shows it then; a stack mount reads the image ids of the data source again (task O2)
  and does not forget the kept volume.
- **Why, more (task O10):** two more paths kept the old volume. The image ids of a volume
  mount came from `displaySet.imageIds` first, which a display set keeps from its last
  mount, so a display set that grew read its old image ids. And a stack invalidation
  forgot the kept image ids (`_refreshImageIds`) while the volume stayed in the cache, so
  the next volume mount found a volume and nothing to compare it with. The invalidation of
  a volume that a viewport shows took the id `cornerstoneStreamingImageVolume:<uid>` for
  every display set, so a dynamic volume (`cornerstoneStreamingDynamicImageVolume:<uid>`)
  was not made again; and when two viewports showed the volume, each one took the volume
  out of the cache, the second one the volume that the first had just made.
- **The rule (task O10):** the volume of a display set is valid for the image ids it was
  made from. At each volume mount the cache service reads the image ids of the display
  set (from the data source for a display set of instances; the display set's own
  `imageIds` for one made in the client with no instances, which does not grow) and
  compares them, as a set, with those its volume was made from. When they differ, or the
  volume id differs (the display set moved to the dynamic volume loader when its second
  time point arrived), the old volume goes and the new one is made under the id. A volume
  that no viewport shows is removed from the cache (`removeVolumeLoadObject`: its loads
  stop, its data is freed); one that a viewport still shows only leaves the index of the
  cache, as the invalidation did before, and that viewport mounts the display set again on
  the change (`DISPLAY_SET_SERIES_METADATA_INVALIDATED`). The kinds the rule touches:
  - a 4D dynamic volume: its image ids are all the time points; a time point that arrives
    makes the volume again, and the static volume made before the second time point
    leaves the cache with it (the commands that look a dynamic volume up by a part of its
    id found the first key that held the display set's UID);
  - a volume made in the client: the parametric map keeps the volume its load makes (it is
    outside the rule, as before), and the computed display set of the dynamic volume panel
    keeps its own `imageIds`, so its volume is taken as it is and never replaced;
  - a volume that two viewports show: each viewport's invalidation takes the volume out
    only while the cache still holds the volume that this viewport shows, so the second
    viewport takes the volume the first one made; in a fusion only the display set that
    grew gets a new volume. Two display sets never share one volume id in OHIF (the id
    holds the display set's UID).
  What hangs on the volume follows by itself: OHIF's labelmaps are made from the image ids
  of the display set and reference images, not the volume; the LUT presentation is keyed
  by the display set's UID and the position presentation is a view reference and a
  framing, which stay valid with the new volume under the same id.
- **Fix, in OHIF (task O10):** `CornerstoneCacheService.ts`. What replaced what:
  `volumeImageIds` (display set to the image ids of its volume, forgotten at every
  invalidation) is `madeVolumes` (display set to the volume id and the image ids it was
  made from, kept as long as that volume); the mount through `createAndCacheVolume` only
  while the kept ids existed is `_getVolume` (drops the made volume when its id or image
  ids differ, notes the new one before it loads, then `createAndCacheVolume`);
  `_getCornerstoneVolumeImageIds` reads the data source first (it read
  `displaySet.imageIds` first); the `cs3DCache._volumeCache.delete` of the invalidation is
  `_dropVolume` (`removeVolumeLoadObject` when no viewport shows the volume,
  `utilities.getViewportsWithVolumeId`; out of the index only when one does); the
  invalidation takes the volume that the viewport shows, with its own id, and only while
  the cache still holds it; `_refreshImageIds` no longer forgets the made volume. OHIF's
  page of the display set store (`display-set-store.md`) says the rule.
- **Fix, in cornerstone:** none.
- **Checks (task O10):**
  - `CornerstoneCacheService.test.ts`, 13 new tests; 10 failed first (lane O10
    `jest-m74-failfirst.log`): a volume and a 3D mount of a display set that grew while no
    viewport showed it; one that grew while shown as a stack elsewhere; a fusion with one
    grown display set; a dynamic volume whose time point arrived; a display set that moved
    from the static to the dynamic loader (one volume of it left); the invalidation of a
    dynamic volume on display; two viewports that show a volume, one new volume for both;
    a volume still shown is not destroyed; and a display set grown by the real
    `DisplaySetService` (split rules, `extendInstances`, one invalidation event). Three
    guards pass before and after: the same image ids in another order keep the volume, and
    the computed volume of the dynamic panel and the volume of a parametric map are never
    replaced. 32 of 32 pass.
  - In the viewer (lane O10 `specs/m74Growth.spec.ts`, `cases/m74-growth/`): the `LIVER 3
    PHASE` study with `?customization=split/enableNewSplit` (without the split rules a
    series that arrives in two parts makes a second display set: the stack SOP class
    handler has no `addInstances`). The first metadata response of "Recon 3" (79 images)
    is cut to its first 55 by a route of the test; the display set is shown as an MPR
    (55 slices), the pane gets another series, then the rest of the series arrives through
    the data source (`deleteStudyMetadataPromise` and `retrieve.series.metadata` again: the
    store adds the instances, `INSTANCES_ADDED`, `makeDisplaySets`, the display set grows by
    `extendInstances`, one invalidation, still one display set) while no viewport shows it.
    The next MPR: 79 slices in the three panes on this branch, one volume of the display
    set in the cache; 55 slices on this branch without the fix and on `master`.
- **State:** fixed in task O10, committed in `2e5ecdd662`.

## M75. OHIF adds a `CAMERA_RESET` listener to each enabled element and never removes it

- **Seen (task O9b, checking M71 on the link at `28dd3ab33`):** after `disableElement` an
  element still has one listener, of `CAMERA_RESET`, for a viewport made with Cornerstone3D
  calls only (lane O9b `specs/m63disabled.spec.ts`, every round) and for the 5 elements
  of OHIF's panes still alive after the five layout rounds of M71 (`listeners.spec.ts`).
- **Why (read in the code, lane O9b `specs/whoReset.spec.ts`, `cases/who-reset/`):**
  `elementEnabledHandler` in `extensions/cornerstone/src/init.tsx` runs at each
  `ELEMENT_ENABLED` and adds a `CAMERA_RESET` listener to the element (it runs
  `resetCrosshairs`); nothing removes it. `master` has the same code.
- **What it costs:** more than O9b thought. The listener holds only `commandsManager`, but
  it grows on a live element too (task O10, lane O10 `specs/listeners.spec.ts`,
  `cases/listeners/`, the five layout rounds of M71): Cornerstone3D disables and enables
  one element again when a pane changes between a stack and a volume (the 1x1 pane of the
  rounds, 8 times in five rounds), and each enable added one more anonymous listener. The
  pane had 2, 3, 5, 7, 9, 11 `CAMERA_RESET` listeners after the first load and each round
  (one of the 2 of the first load is not OHIF's), so a reset of its camera ran
  `resetCrosshairs` 10 times after the fifth round. `master` the same: 2, 3, 5, 7, 9, 11.
- **What held the destroyed elements (task O10):** the 5 elements of M71's rounds still
  alive after a forced garbage collection (2 of round 1, the 3 panes of the last round;
  25 distinct elements disabled) were each held by OHIF's own element state:
  `state.enabledElements[viewportId].element` (`extensions/cornerstone/src/state.ts`, read
  by the TMTV commands and the download form for the active viewport). It is set at each
  `ELEMENT_ENABLED` (by `initContextMenu` and by `OHIFCornerstoneViewport`) and was never
  cleared: an entry was replaced only when a viewport of the same id was enabled again, so
  `default` and the extra pane of the first 2x2 layout, ids that never come back after
  round 1, kept their elements, and the 3 panes of the last round kept theirs until their
  ids come back. Found by a heap snapshot after the forced collection: each element was
  tagged with a marker object and its shortest strong retainer path read (lane O10
  `markers.js`, `cases/listeners/before-m75/retainers.txt`).
- **Fix, in OHIF (task O10):** the `CAMERA_RESET` listener moved from the
  `ELEMENT_ENABLED` handler of `init.tsx` (an anonymous function made at each enable,
  never removed) to `initCameraReset.ts`, which works as `initContextMenu` and
  `initDoubleClick` do: one handler for every element, added at `ELEMENT_ENABLED` and
  removed at `ELEMENT_DISABLED`. `initContextMenu`'s `ELEMENT_DISABLED` handler, where OHIF
  already removes its click listener from a disabled element, now also forgets the element
  of the viewport (`removeEnabledElement` in `state.ts`, only while the entry holds that
  element, so a viewport id that moved to a new element keeps the new one).
- **The rest of the pattern, looked at (task O10):** in `init.tsx`, `IMAGE_LOAD_FAILED`
  and `ERROR` are added to `eventTarget` once at init; `initViewTiming` adds
  `IMAGE_RENDERED` to an element only while the timing of the first images runs and
  removes it at its first render, one module function, so an element enabled again does
  not get it twice; an element disabled before its first render keeps it, holding nothing
  (not changed). Over the five rounds no OHIF listener of `eventTarget` grows (63 from
  round 1 on), the elements of the panes keep 55 listeners each round, `document` has
  none of Cornerstone's types. One more growing listener was found by leaving the viewer
  for the study list and opening it again: M76.
- **Fix, in cornerstone:** none.
- **Checks (task O10):**
  - `initCameraReset.test.ts` (new): one reset per camera reset, also on an element
    disabled and enabled again four times, none after the disable. Run on the code of
    `init.tsx` moved as it was, it failed first (5 calls for 1, 1 call for 0; lane O10
    `jest-m75-failfirst.log`).
  - `initContextMenu.test.ts` (new): the element of a disabled viewport is forgotten, the
    new element of a moved id is kept. The forget test failed first on the unchanged
    `initContextMenu.ts`.
  - In the viewer, the five rounds again: `CAMERA_RESET` on the pane 2 in every round, one
    of them OHIF's (was 2, 3, 5, 7, 9, 11; the other one is there from the first load and
    does not grow), the pane's 55 listeners flat, `eventTarget` flat at 63 from round 1;
    of the 25 destroyed elements none is alive after the forced collection (was 5), and
    no destroyed element has a listener left (the only alive element is the one the pane
    still uses).
- **State:** fixed in task O10, committed in `2e5ecdd662`.

## M76. Each mode entry adds a `TOOL_ACTIVATED` listener to `eventTarget` that is never removed

- **Seen (task O10, lane O10 `specs/modeRoundTrip.spec.ts`, `cases/mode-round-trip/`):**
  the viewer left for the study list and opened again in the same page, three times:
  `eventTarget` has 65, 66, 67, 68 listeners after each opening; the one type that grows is
  `CORNERSTONE_TOOLS_TOOL_ACTIVATED` (2, 3, 4, 5), each new one the callback of the toolbar
  service (`refreshToolbarState` of the active viewport).
- **Why (read in the code):** the cornerstone extension's `onModeEnter` calls
  `toolbarService.registerEventForToolbarUpdate(cornerstone.eventTarget,
  [TOOL_ACTIVATED])`. For a target with `addEventListener`, `registerEventForToolbarUpdate`
  keeps the return value of `addEventListener` (nothing) as the unsubscription, and the
  service never releases its `_serviceSubscriptions` (the line in `reset()` is commented
  out). The same holds for the pub-sub registrations of that `onModeEnter`
  (`VIEWPORT_DATA_CHANGED`, three segmentation events) and of the measurement tracking
  extension: each mode entry adds one more callback to each. `master` has the same code.
- **What it costs:** little: one more toolbar refresh per event per mode entry, no element
  held.
- **Fix, in OHIF (task O11):** `registerEventForToolbarUpdate` returns the function that
  removes every listener it added: the `unsubscribe` of each `subscribe` for a pub-sub
  service, a `removeEventListener` of the same callback for an event target. The field
  `_serviceSubscriptions`, which kept the return values and was never read, is removed.
  The cornerstone extension puts the three releases of its `onModeEnter` into the list
  that its `onModeExit` already runs; the measurement tracking extension keeps its
  release and gets an `onModeExit` that runs it. The registrations made once at the init
  of the app (cine and hotkeys in the default extension, colorbar and segmentation in the
  cornerstone extension) do not keep the return value and live as long as the app, as
  before. A change of the API of `@ohif/core` (a return value, and the field gone): in
  OHIF's migration guide for 3.14, page `toolbar-service.md`, and its index.
- **Fix, in cornerstone:** none.
- **Checks (task O11):**
  - `ToolbarService.registerEventForToolbarUpdate.test.ts` (new, `@ohif/core`): the
    toolbar refreshes on an event of a pub-sub service and of an event target until the
    release, and five registrations released in turn keep one listener on each. On the
    service as it was, all 3 failed (`release is not a function`; lane O11
    `jest-m76-service-failfirst.log`).
  - `onModeEnterExit.test.ts` (new, cornerstone extension): five `onModeEnter` and
    `onModeExit` of the extension with the real toolbar service. Failed first: the
    `TOOL_ACTIVATED` listeners of `eventTarget` 1, 2, 3, 4, 5, the subscriptions of the
    viewport service 1 to 5 and of the segmentation service 9, 12, 15, ...
    (`jest-m76-extension-failfirst.log`); now the same after each entry and 0 after the
    last exit.
  - In the viewer (lane O11 `specs/modeRoundTrip.spec.ts`, the method of lane O10): the
    viewer left for the study list and opened again five times. On the committed
    `2e5ecdd662` (served from an export on port 3335): `eventTarget` 64, 65, 66, 67, 68, 69
    listeners after each opening, `TOOL_ACTIVATED` 2 to 7, the subscriptions of the
    tracked measurements service 10, 15, 20, 25, 30, 35, of `VIEWPORT_DATA_CHANGED` 4, 9,
    10, 11, 12, 13. With the fix: `eventTarget` 64 and `TOOL_ACTIVATED` 2 at every
    opening, the tracked measurements service 10, `VIEWPORT_DATA_CHANGED` 4 then 8 from
    the second opening on (4 subscriptions that come once, at the second opening, and do
    not grow; the same step is in the run before the fix).
- **State:** fixed in task O11, committed in `2bbed3c040`.

## M77. Hydrating an RTSTRUCT made its pane a stack, also a sagittal or coronal pane of an MPR

- **Seen (the orchestrator, 25 November, on `master` `6fe59945a0` and the branch
  `b7e4ae19a2`; measured again in task O11):** study
  `1.3.6.1.4.1.5962.99.1.2968617883.1314880426.1493322302363.3.0`, Layout then MPR, a
  pane made active, the RTSTRUCT thumbnail double clicked, "yes" to the hydration. The
  pane the RTSTRUCT was loaded from became a stack in the acquisition orientation
  (`getDisplaySets()`: `mode: 'stack'`, 262 slices), so the sagittal or the coronal pane
  showed axial images; the axial pane looked the same, but was a stack too. On `master`
  every pane stays a volume in its orientation.
- **Why:** `getHydrationViewportTypeForModality` (`utils/viewportPolicies.ts`) gave
  `'stack'` for an RTSTRUCT. `hydrateSecondaryDisplaySet` passed it as `viewportType` to
  `loadSegmentationDisplaySetsForViewport`, which merged `viewportOptions: { viewportType:
  'stack' }` over the options of the target pane. It was the rule of the
  `?useNextViewports` path of 3.13 (`modality === 'RTSTRUCT' && isNextViewportsEnabled()`,
  OHIF #6101, `3c0e245398`, "keep referenced CT in stack mode on RTSTRUCT hydrate"), kept
  without its condition when the flag went, so it held for every pane. Its reason, in that
  commit: on the next path of 5.x the hydration of an RTSTRUCT on a stack pane mounted the
  CT as a volume slice, "the slow path", while contours on a stack scrolled fast. That
  promotion was M22 (the preview `[CT, RTSTRUCT]` mounted as a volume, kept by the
  first-writer-wins registry of data ids), fixed in package U3 (`1653f6df00`) and M42, and
  the registry is gone since task O2. So the pin protected nothing on 6.0.
- **Measured (task O11, lane O11 `specs/rtPanes.spec.ts`, `cases/rt/{pin,nopin,master}`):**
  every way an RTSTRUCT reaches a pane, on the committed branch (`pin`), on the branch
  without the pin and on `master` (port 3336, its own `e2e.js`). Grid type and
  orientation, then what the viewport mounts, before and after:

  | Way | Pane | With the pin | Without the pin | `master` |
  |---|---|---|---|---|
  | (a) hydration from a stack pane | the stack | stack, 262 slices: unchanged | the same | the same |
  | (b) hydration from the axial pane of an MPR | axial | stack, acquisition, 262 | volume, axial, 262 | volume, axial |
  | (b) from the sagittal pane | sagittal | stack, acquisition, 262 | volume, sagittal, 512 | volume, sagittal, 512 |
  | (b) from the coronal pane | coronal | stack, acquisition, 262 | volume, coronal, 512 | volume, coronal, 512 |
  | (c) hydration in the stack pane, then Axial Primary, MPR, the 1x1 grid (`RTHydrationThenMPR`) | all | stack, then volumes in their orientations, then the axial volume | the same | the same |
  | (d) the data overlay menu: stack then MPR, MPR then the sagittal pane (`RTDataOverlayNoHydrationThenMPR`, `MPRThenRTOverlayNoHydration`) | all | every pane keeps its type | the same | the same |
  | (d) an RTSTRUCT over a series it does not reference (`RTDataOverlayForUnreferencedDisplaySetNoHydration`) | the stack | becomes a volume (acquisition): the rule of the overlay menu, not the hydration | the same | the same |
  | (e) the segmentation mode, hydration | the stack | stays a stack | the same | the same |
  | (f) hydration, then maximize and restore (`RTContourViewportLayoutChange`) | the 4 stacks | stay stacks | the same | the same |
  | (g) the confirmation disabled (`RTHydrationDisableConfirmation`) | the stack | stays a stack | the same | the same |

  No way promotes a stack to a volume with the pin off. Scroll timing (40 steps of one
  slice, median time from the scroll to the next annotation render of the pane): a stack
  pane with the contours 144 ms with the pin, 156 ms without (the same pane, a stack in
  both), 33 ms on `master`; the MPR pane the RTSTRUCT was loaded from 149 to 151 ms with
  the pin (a stack), 33 ms without (a volume), 33 to 37 ms on `master`. So on 6.0 the
  stack is the slow side: M78.
- **Fix, in OHIF (task O11):** `getHydrationViewportTypeForModality`, its export from
  `@ohif/extension-cornerstone`, its call in `hydrateSecondaryDisplaySet` and the
  `viewportType` option of `loadSegmentationDisplaySetsForViewport` (with the merge of
  options that only it fed) are deleted: the command sets the display sets of each pane
  and nothing else, for an RTSTRUCT as for a SEG. `getUpdatedViewportsForSegmentation`
  (`utils/hydrationUtils.ts`) never read the option and is unchanged; the type of the grid
  it reads is the one of the customization of automatic hydration, which stays. The
  comments that named the pin are corrected (`isDisplaySetOverlayable.ts`, the header of
  `viewportPolicies.ts`, the README of the viewport service). The migration guide said
  that an RTSTRUCT pane becomes a stack: against 3.13 without the parameter nothing
  changes, so the line is gone from "What a user sees", and a note says that against
  3.13 with `?useNextViewports` the pane keeps its type now; the export and the option
  have rows in "Removed and renamed exports".
- **Fix, in cornerstone:** none.
- **Checks (task O11):**
  - `hydrateSecondaryDisplaySet.test.ts` (new, cornerstone extension, the real commands
    module over a grid that merges an update as the grid reducer does in a protocol
    layout): an RTSTRUCT hydrated in the axial, sagittal or coronal pane of an MPR leaves
    every pane a volume in its orientation; in a stack pane, a stack; a SEG in the sagittal
    pane, a sagittal volume. With the pin the three MPR cases failed (`stack` for
    `volume`; lane O11 `jest-pin-failfirst.log`). The jest config of the extension maps
    `@ohif/extension-default` to the stub of `cornerstone-dicom-seg` and
    `@cornerstonejs/tools/segmentation` to its file (the export map of the package), which
    the commands module needs to load.
  - `tests/RTHydrationFromMPRKeepsPaneOrientation.spec.ts` (new): the RTSTRUCT hydrated
    from the sagittal and from the coronal pane; every pane keeps its grid type, its
    orientation, its mount and its number of slices (262, 512, 512). Both tests failed on
    the committed `2e5ecdd662` (an export served on port 3335: `stack`, `acquisition`,
    262; lane O11 `pw-spec-pin-failfirst.log`) and pass on the change.
  - The 11 RTSTRUCT specs pass with the change (`pw-rt-specs.log`), the four pictures of
    `RTHydrationFromMPR.spec.ts` (made with the pin on the axial pane) among them: no
    baseline changed.
- **State:** fixed in task O11, committed in `2bbed3c040`.

## M78. A stack with the contours of an RTSTRUCT draws its annotations about 140 ms after each scroll

- **Seen (task O11, lane O11 `scratch/stackDelay.mjs`, `cases/stack-delay-*.json`):** the
  stack pane of the RTSTRUCT study of M77, one slice per scroll. On the branch the image
  renders 15 ms after the scroll and the annotations 159 to 164 ms after it with the
  hydrated RTSTRUCT (2,265 contour annotations), 17 to 18 ms with no annotation. On
  `master` the same pane renders the image at 14 to 16 ms and the annotations at 18 to
  22 ms, with the same RTSTRUCT. A pane of the branch in volume mode with the same contours:
  33 ms (M77).
- **Why (a CPU profile of ten scrolls, `cases/stack-profile-branch.txt`):** of 1,955 ms of
  samples the most self time is in metadata: OHIF's metadata provider `get` 223 ms,
  `imagePlaneModule` 175 ms, `combineFrameInstance` 158 ms,
  `_retrieveMultiframeMetadataImageURI` 76 ms, `_getCornerstoneDICOMImageLoaderTag` 61 ms,
  reached from `baseImageIdQueryFilter`, `isReferenceViewableInContext` and
  `isReferencedImageCompatible` of the core: in stack mode, each draw asks for each of the
  2,265 annotations whether its referenced image can be viewed, through the image plane
  metadata of that image.
- **Smallest case (Cornerstone calls only, not built):** a `PlanarViewport` in stack mode
  over a series of 262 images, 2,265 `PlanarFreehandContourSegmentationTool` annotations
  each with the `referencedImageId` of one image of the series; the time from
  `utilities.scroll(viewport, { delta: 1 })` to `ANNOTATION_RENDERED`, against the same
  viewport with no annotation and in volume mode.
- **Fix, in OHIF:** none (rule 3). The change of M77 keeps the panes of an MPR volumes,
  where this cost is not paid; a stack with many contours pays it, as before.
- **Fix, in cornerstone:** to do: the filter of the annotations of a stack should not read
  the metadata of the referenced image of every annotation on every draw.
- **Fixed in cornerstone (lane FX11, `472d908e8`):** `viewport.getReferenceViewableCheck()`
  (public, new) reads the facts of the view once and answers `isReferenceViewable` for
  many references; `filterAnnotationsForDisplay` makes one check per call, the image of a
  reference is found in an index of the image URIs, and the contour draw asks for the
  image data once per draw. In lane FX11 a stack with 2,265 contours made 96 metadata
  calls per draw, 63,844 before. The Cornerstone guide names it
  (`2-rendering-changes.md`, the annotation filter of the tools).
- **Checked (task O12, link at `472d908e8`, lane O12 `cases/m78/`):** `stackDelay.mjs` of
  lane O11 (label `after`, its `cases/stack-delay-after.json`, and two more runs): with
  the hydrated RTSTRUCT the stack draws its annotations 20 to 41 ms after a scroll of one
  slice and 6 to 9 ms after the image, where it drew them 159 to 164 ms after the scroll;
  `master` at the same time 21 to 42 ms, 4 to 6 ms after the image. The machine had other
  work: with no annotation both sides drew at 21 to 37 ms, where O11 measured 17 to 18. The
  method of O11's `rtPanes.spec.ts` (40 scrolls, the median from the scroll to the next
  annotation render): the stack 33.2 ms (155.7 ms in O11 without the pin), `master`
  33.3 ms; the three MPR panes the RTSTRUCT was loaded from 33.3 to 33.5 ms (33.2 to
  33.3 in O11), `master` 33.3 to 35.8 ms.
- **State:** fixed in cornerstone `472d908e8`, checked in task O12.

## M79. A sagittal or coronal pane draws no cut of the contours of an RTSTRUCT

- **Seen (task O11, `scratch/cutProbe.mjs`, `cases/cut-*.json`, the steps of M77 from the
  sagittal pane):** after the load and the hydration, `master` draws 51 SVG paths in the
  sagittal pane and none in the axial and coronal panes (from the coronal pane: 21 in the
  coronal pane); the 2,265 contour annotations have the view plane normal `[1, 0, 0]`. The
  branch, with or without the pin of M77, draws 13 paths in the axial pane (slice 131)
  and none in the sagittal and coronal panes; the annotations have `[0, 0, -1]`.
- **Why on `master`:** M31: 5.18.3 gives each contour annotation the normal of the pane
  that draws it first. The sagittal lines of `master` are the axial polygons seen edge
  on, not cuts, and its axial pane draws nothing. Cornerstone `1b3b2247e` takes the plane
  of a contour from its points.
- **Has Cornerstone3D 6 a way to draw the cut of a planar contour on another plane:** yes.
  `contourDisplay.render` of the tools, for a viewport whose plane does not match the
  contours (and whose status is `RENDERED`), asks the polySeg add-on for surfaces
  (`computeSurfaceData`), cuts them with the planes of the slices of the viewport
  (`clipAndCacheSurfacesForViewport`, worker task `cutSurfacesIntoPlanes`) and adds the
  cuts as contour annotations in the plane of the viewport
  (`createAndAddContourSegmentationsFromClippedSurfaces`). OHIF registers polySeg
  (`initCornerstoneTools.js`). On the branch the path runs: `polySeg.cutSurfacesIntoPlanes`
  runs once after the hydration from the sagittal pane (246 to 270 ms), but no surface is
  made: the cache holds the 31 `CONTOUR` geometries and no `SURFACE` one, the task
  `getSurfacesAABBs` that runs before a cut of new surfaces does not run, no annotation in
  the plane of the pane is added, and nothing is logged. So the cut is made over no
  surface. Where `computeSurfaceData` loses the surfaces of a contour segmentation was not
  looked for.
- **Fix, in OHIF:** none (rule 3).
- **Fix, in cornerstone:** `487285b21` (lane FX12). The cut was tried only while the
  viewport said `rendered`, which it never does when the representation is added, and the
  conversion read contour annotations that were not made yet. `contourCuts` now draws the
  contour set first, makes the surface of each segment once, cuts it by every slice of the
  plane in one worker task and shows the cut of the slice on display; a scroll swaps the
  cut with no new task.
- **State before task O13:** open, waits for cornerstone. A known difference from
  `master` that the user saw: the sagittal and coronal panes of an MPR showed no contour
  after an RTSTRUCT was hydrated; on `master` the pane it was loaded from showed flat
  lines and the axial pane nothing.
- **State:** fixed in cornerstone, checked in the viewer (task O13, link at `487285b21`,
  the probe of lane O11 `scratch/cutProbe.mjs` with `WAIT=45000`): after the hydration
  from the sagittal pane the axial pane draws 13 contour paths, the sagittal pane 21 cuts
  and the coronal pane 25, each structure in its colour; every pane stays a volume pane in
  its orientation; the cache holds 31 surfaces next to the 31 contour geometries. OHIF
  changed nothing: it registers the polySeg add-on already. On that link each structure
  was converted twice (62 `convertContourToSurface` tasks for 31 structures) and the first
  cut was drawn about 15 s after the hydration. `master` never drew a cut (its flat lines
  came from M31).
- **Seen again (26 November, link at `c2f202429`, lane FX13 of Cornerstone3D):** the same
  probe counts 31 conversions for 31 structures (the longest 4.1 s from its start to its
  end, about 13 s before), 31 surfaces, and the same 13, 21 and 25 paths. Each structure's
  cut is drawn when its surface is ready; in Cornerstone3D's own measure the first cut of
  this RTSTRUCT shows 3.0 s after the representation is added (18.6 s before) and the last
  after 13 s. The conversion runs in two polySeg workers by default; an application sets
  the number with `polySeg.init({ maxWorkerInstances })` before it registers the add-on.
  The wasm of the conversion still prints `Contour spacing is not consistent` for the five
  structures of this RTSTRUCT that have a gap between two parts; their cuts are right.
- **Seen again (task O12, link at `472d908e8`, lane O12 `cases/m78/rt/`):** the same
  counts: after the hydration from the axial, the sagittal or the coronal pane the branch
  draws 13 contour paths in the axial pane and none in the sagittal and coronal panes;
  `master` draws 13 in the axial pane, 51 in the sagittal pane or 21 in the coronal pane,
  each in the pane the RTSTRUCT was loaded from. Lane FX12 of Cornerstone3D works on it.

## M80. A PET added from the data overlay menu tints the pane more than on `master`

- **Seen (task O12, lane O12 `specs/flows.spec.ts`, `cases/flows/fusion/`):** the study
  "LUNG DELAYS" (`1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463`) in
  the basic viewer, the CT in the pane, its PT added with `addDisplaySetAsLayer` (the
  command of the data overlay menu). The PT gets the colormap `hsv`, red at its lowest
  value, so the whole extent of the volume takes a red tint: its mean colour in an empty
  part of the pane is (102, 0, 1) on the branch and (64, 0, 1) on `master`, the CT alone
  (0, 0, 0) on both; 88% of the pixels of the pane differ by more than 16. The picture
  after the CT background is removed, the 3D pane and the TMTV fusion are as on `master`.
- **Why (read in the code and measured):** the overlay menu gives the PT the opacity 0.9;
  OHIF starts an overlay on a live viewport at `OVERLAY_OPACITY` (0.4,
  `utils/viewportPolicies.ts`), which Cornerstone3D 6 blends flat: 0.4 of 255 is 102. The
  legacy volume viewport of `master` drew the nominal 0.9 at `1 - (1 - 0.9) ** 0.125`,
  0.25 (M57), 64 of 255. The constant came from the `?useNextViewports` path of 3.13
  (`NEXT_OVERLAY_OPACITY`, 0.4), whose comment says the legacy 0.9 "renders at ~40%
  effective"; measured, it is 25%. Not a change of the commits of the link: the value is
  OHIF's since 3.13 and the guide lists it ("`NEXT_OVERLAY_OPACITY` ->
  `OVERLAY_OPACITY`, the same value").
- **Fix, in OHIF (task O15, the owner's decision of 26 November, Vikunja 59):**
  `OVERLAY_OPACITY` is 0.25 (`extensions/cornerstone/src/utils/viewportPolicies.ts`), and
  its comment says what was measured: `master`'s legacy path drew the 0.9 of the menu as
  `1 - (1 - 0.9) ** 0.125`, 0.25 (a cold pixel 64 of 255), not "about 40%". The opacity
  slider of such an overlay starts there: it reads the effective `opacity` of the display
  set (M81). OHIF's migration guide gives the value.
- **Fix, in cornerstone:** none.
- **Checks (lane O15, `specs/slider.spec.ts` "overlay slider", `cases/slider/overlay/`,
  the steps above, the PET AC over the CT IMAGES of the basic viewer):**
  - the picture at rest against `master`: 0.08% of the pixels of the pane differ by more
    than 16, 0.31% by more than 3 (before: 88% by more than 16);
  - the slider at the start: 0.25 (`master`: 0.59, the 0.9 through its gamma of 1/5); the
    effect of the PET (the mean difference of the pane from the CT alone, of 255) at 0,
    25, 50, 75 and 100%: 0, 20.2, 40.4, 60.4, 80.6 on the branch, 0, 13.0, 18.3, 24.4,
    80.3 on `master` (flat from 59% to about 90%, then opaque at once); both draw the PET
    opaque at 100%;
  - jest: `extensions/default/src/utils/layerConfigurationUtils.test.ts` (new, failed
    first: 0.4); Playwright: `tests/FusionOpacitySlider.spec.ts`, "the opacity slider of a
    PET added from the data overlay menu starts at its opacity" (new, failed first: the
    slider at 0.4).
- **State:** fixed in task O15 (`3aee48d6fe`).

## M81. The opacity slider of a TMTV fusion starts at 100% while its PET is drawn at 25% at most

- **Seen (the owner, 26 November, Vikunja 56):** TMTV mode, the study "LUNG DELAYS"
  (`1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463`): the fusion looks as
  on `master`, but the opacity slider of a fusion pane (CT ---o PT, the opacity button of
  the controls at the bottom of the pane, which show once the colour bar is on) starts
  pinned at 100% PT, while the PET is drawn partly transparent.
- **Measured (lane O15, `specs/slider.spec.ts` "tmtv fusion slider", `cases/slider/tmtv/`;
  the axial fusion pane on its middle slice after both volumes loaded; the slider driven
  through its menu: Home, End and clicks on its track; the effect of the PET is the mean
  difference of the pane from the CT alone, of 255):**

  | | `master` (5.18.3) | branch before | branch now |
  |---|---|---|---|
  | the slider at the start | 100% | 100% | 25% (0.2501) |
  | what it sets at 25, 50, 75, 100% | the overall opacity 0.758, 0.871, 0.944, 1 (a gamma of 1/5) of a ramp of 0.9 at most, drawn as `1 - (1 - a) ** 0.125`: the strongest alpha 0.133, 0.174, 0.211, 0.250 | `opacity` 0.25 to 1 of a ramp of 0.2501 at most: 0.063 to 0.250 | `opacity` 0.25 to 1 of a ramp of 1 at most: 0.25 to 1 |
  | the effect of the PET at 0, 25, 50, 75, 100% | 0, 5.42, 6.93, 8.20, 9.45 | 0, 2.33, 4.68, 7.03, 9.46 | 0, 9.39, 18.83, 28.28, 37.87 |
  | the picture at rest against `master`: pixels more than 16 (3) away | | 0.00% (0.12%) | 0.00% (0.13%) |
  | one step (an arrow key) from the start | 1 to 0.9999, no visible change | the same | 0.2501 to 0.2500, no visible change |

  On `master` the slider also starts at 100%: its 100% is the look at rest, the PET can
  not be made stronger, and 57% of its effect is in the first quarter of the track.

  The three fusion panes at rest, each on its middle slice (lane O3's measure,
  `specs/fusionrest.spec.ts`, `cases/fusionrest/`), pixels more than 16 (3) away from
  `master`: axial 0.00% (0.13%), sagittal 0.24% (0.76%), coronal 0.39% (0.79%). With the
  old ramp on the same link: 0.00%, 0.28% and 0.46%, so the coronal pane was over the
  0.29% that task O3 measured before this task, and the split brings it closer. In one
  session the two ramps (the same product) give the same axial pane and differ in one row
  of the sagittal and the coronal pane, the bottom edge of the PET (row 297 of 314; 0.12%
  and 0.14% of the pixels, up to 32 levels; the new ramp leaves the grey of the CT there,
  the old one a tint): the planar slice path draws the edge row of an overlay a little
  differently when the level is in `opacity` rather than in the points.
- **Why:** task O3 (M57) gave the PET of the fusion panes the look of 3.13 in the ramp,
  points from 0 to 0.2501 (`FUSION_PT_OPACITY_MAPPING`), and left the `opacity` of the
  display set at 1. The slider reads and sets that `opacity` (the alpha of a pixel is
  `opacity * opacityMapping(value)`), so it said 100% of a PET that is drawn at 25% at most.
- **Fix, in OHIF (task O15):** the look at rest lives in one number. The ramp keeps the shape
  of the ramp of 3.13 with its highest point at 1 (each point divided by 0.2501), and the
  `opacity` of the PET of the three fusion panes is 0.2501 (`FUSION_PT_OPACITY`,
  `extensions/tmtv/src/utils/hpViewports.ts`), so `opacity * ramp` is the old ramp to 1e-4.
  The slider is not changed: it reads the effective `opacity`
  (`getEffectiveDisplaySetAppearance`) and sets it (`setDisplaySetAppearance`), linearly,
  so its position is the strongest alpha drawn, 100% covers the CT from SUV 1 on, and a
  step moves the picture by a step. `setViewportColormap` keeps the opacity of a display
  set whose protocol gives a ramp, so a change of the colour map keeps the slider where it
  is. A threshold still hides only what is below it (`colormap.threshold`, not changed).
  The guide of OHIF says it (`cornerstone3d-6.md`, the opacity of a colormap).
- **Fix, in cornerstone:** none.
- **Checks:** jest `extensions/tmtv/src/utils/hpViewports.test.ts` (new; the first jest
  test of the extension, with its `jest.config.js`; 6 tests failed first: the highest
  point 0.2501, the opacity undefined), `useViewportRendering.test.ts` "starts at the
  opacity that the PET is drawn with, and one step writes the next number" (new, pins the
  slider against the appearance); Playwright `tests/FusionOpacitySlider.spec.ts` "the
  opacity slider of a TMTV fusion pane starts at the opacity of its PET" (new, the
  uniformity phantom of the TMTV specs; failed first: the slider at 1); the numbers above.
- **State:** fixed in task O15 (`3aee48d6fe`).

## M82. The thumbnails of the CT and the SCOUT of the study browser are blown out

- **Seen (the owner, 26 November, Vikunja 57):** the study "LUNG DELAYS", `/viewer?StudyInstanceUIDs=...`:
  the thumbnails of "CT IMAGES" (S:2, 135 images) and "SCOUT" (S:1, 1 image) are clipped,
  the air solid white; the PET thumbnails look normal.
- **Measured (lane O15, `specs/thumbs.spec.ts`, `cases/thumbs/`; the luminance of each
  thumbnail as drawn):** with the URL of the owner the data source is `e2e`
  (`thumbnailRendering: 'thumbnail'`, `thumbnailRequestStrategy: 'fetch'`): each thumbnail
  is a JPEG file of the test data, `testdata/studies/<study>/series/<series>/instances/<sop>/thumbnail`
  (submodule `bd743ed7` in both checkouts), fetched as it is. The four servers give the same
  numbers, this branch (port 3335), `master` (3336) and the owner's two (3340 `master`, 3342
  the branch): CT IMAGES mean 244.5, 90.7% of the pixels 250 or more; SCOUT mean 197.7,
  48.2% white; PET NAC 3.0, PET AC 1.8. The files are blown out; nothing of the upgrade
  draws them, and `master` shows the same.
- **Found on the way: the thumbnails that Cornerstone3D draws are black.** With the `ohif`
  source (`/viewer/ohif?...`, `thumbnailRendering: 'wadors'`) the study browser draws each
  thumbnail with `getImageSrcFromImageId` -> `utilities.loadImageToCanvas({ canvas,
  imageId, thumbnail: true })` (the same OHIF code as `master`). The middle image of each
  series (`specs/thumbcalls.spec.ts`, `cases/thumbcalls/`): in the study browser the
  branch draws the CT as `master` (mean 23.1) and the PET NAC, the PET AC and the SCOUT all
  black (`master`: 2.8, 8.6, 92.8); one call at a time, every series of the four studies
  checked (LUNG DELAYS, an MR, the CR study of the remote data, a US study with
  multiframe YBR and RGB images, 20 series) gives an opaque black canvas, mean 0.
- **Why (Cornerstone3D, measured in the page, `specs/tiled.spec.ts`, `cases/tiled/`):**
  `renderToCanvasGPU` makes a `TiledRenderingEngine` (`_thumbnails`,
  `packages/core/src/utilities/renderToCanvasGPU.ts:93`) and a planar viewport on it. The tiled engine draws every viewport into one offscreen canvas and copies the
  tile of a viewport at `(viewport.sx, viewport.sy)`
  (`_renderViewportFromVtkCanvasToOnscreenCanvas`, `TiledRenderingEngine.ts:531`, the copy at
  `:551`). The constructors of `PlanarViewport`
  (`packages/core/src/RenderingEngine/Viewports/Planar/PlanarViewport.ts:553`) and of the
  3D viewport (`Viewports/Volume3D/viewport3D.ts:150`) copy `sWidth` and `sHeight` of their
  input and not `sx` and `sy`; the `Viewport` constructor of 5.18.3 copied all four
  (`RenderingEngine/Viewport.js:76`). Only `_resize` of the tiled engine
  (`TiledRenderingEngine.ts:643`) sets them, when another viewport is enabled on the same
  engine, so a lone viewport copies nothing, and in the study browser a thumbnail draws
  only when a later one was enabled before its frame. The same steps by hand: the tiled
  engine gives `sx` and `sy` undefined and a black canvas (mean 0, also after a second
  render, also with a visible element); with `sx = sy = 0` set, 23.1, as `master`; the
  default `RenderingEngine` 23.1; `useCPURendering: true` 23.3.
- **The smallest case, Cornerstone3D only:** `new TiledRenderingEngine('t')`,
  `enableElement({ viewportId: 'v', type: ViewportType.PLANAR, element })` on a 256 x 256
  element, `await viewport.renderImageObject(image)` of a cached CT image
  (`wadors:https://d14fa38qiwhyfd.cloudfront.net/dicomweb/studies/1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463/series/1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561/instances/1.3.6.1.4.1.14519.5.2.1.7009.2403.315877115167111853865432166987/frames/1`),
  `render()`, wait for `IMAGE_RENDERED`: `viewport.sx` is undefined and the canvas of the
  element is all black (red mean 0 of 255); 5.18.3 with a `STACK` viewport: the CT (23.1).
  Or `utilities.loadImageToCanvas({ canvas, imageId, thumbnail: true })` for that image:
  6.0 black, 5.18.3 the CT.
- **The other series, with `sx` and `sy` set in the page (as the fix would):** 17 of the
  20 series give exactly the histogram of `master` (CT, PET, SCOUT, MR, DR, US multiframe
  YBR and RGB). Three differ, and none for the thumbnail path: the two CR MONOCHROME1
  images (the branch's thumbnail is the picture that the main viewport of both sides
  draws, with metal and contrast white; `master`'s thumbnail of them was the wrong one),
  and a DS image whose geometry tags are broken (`PixelSpacing` `[0.26, -1]`,
  `PixelAspectRatio` `[266, 4294966272]`), which the two versions draw with another shape
  in the main viewport too (mean 171.9 against 56.4).
- **Fix, in OHIF:** none. The test data's thumbnails are data; the canvas path is a defect
  of Cornerstone3D (rule 3).
- **Fix, in cornerstone:** to do: a planar and a 3D viewport keep `sx` and `sy` of their
  input (or the tiled engine sets them at the enable), with a test that draws a CT image
  with `loadImageToCanvas` and reads the canvas. Row 210 of `v6-open-issues.md` (the first
  frame of a planar viewport on the tiled engine is not the frame after a resize) is
  probably the same cause.
- **State:** the owner's thumbnails: decided, the test data (the same on `master`); the
  black thumbnails of the canvas path: open, waits for cornerstone.
- **State today (task O16, the link `2810086ec`):** fixed in cornerstone `2810086ec` (lane
  FX14: the planar viewport keeps the `sx` and `sy` of its tile). The same 23 calls of
  `loadImageToCanvas` as above, one at a time (lane O16 `cases/thumbcalls`, the four studies,
  `master` on port 3336): every series gives the histogram of `master` but the three
  explained above (the two CR MONOCHROME1 images, 122.0 and 71.2 against 89.9 and 137.7,
  and the DS image, 165.4 against 41.0, the values of the branch with `sx` and `sy` set by
  hand); all at once the same. The study browser of `/viewer/ohif?...` ("LUNG DELAYS",
  `cases/thumbs/lung-ohif`): PET NAC 2.8, CT 23.1, SCOUT 92.8, PET AC 8.6 on both sides.
  Closed. (All the calls at once on "LUNG DELAYS" and the MR end the page on both sides;
  measured one at a time there.)

## M83. A PET added as a data overlay over a CT shows the wrong slice for about a second

- **Seen (the owner, 26 November, Vikunja 58):** the branch: a CT in a viewport, the PET of
  the same study added from the data overlay menu: the PET layer first draws a wrong slice
  for about one second, then the right one.
- **Recorded (lane O15, `specs/overlayslice.spec.ts`, `cases/overlayslice/`):** the basic
  viewer, "LUNG DELAYS", the CT IMAGES in the pane on its slice 40 (and on slice 0), the
  PET AC added with `addDisplaySetAsLayer` (the command of the menu); for 3 s, every 50 ms
  the viewport of the pane (render plan, display sets, slice, the PET frame on the plane
  of the source and its quality in the volume), its picture, and the events with their
  time; each picture against the settled one:

  | ms after the command | branch before | branch now | `master` |
  |---|---|---|---|
  | 90 | OHIF disables the viewport and enables a new one | the same | the same |
  | 107 to 466 | the CT volume mounted at its middle image (index 67, z -141.1) and drawn at 126 ms, the PET still mounting; at 194 ms the PET is mounted and OHIF applies the position (slice 40, z -52.8) | the CT mounted on slice 40 (110 ms), drawn at 129 ms, the PET mounted at 202 ms | the camera to the middle and to slice 40 at 161 to 166 ms; nothing drawn (the pane blank) until 504 to 559 ms |
  | from about 550 | the PET drawn from a copy of the frame 27 slices away (15.4% of the pixels from the settled picture), then of the frame 2 away (5.9%) | the same | the same |
  | the PET frame of the plane arrives | 1,373 ms (1,766 ms in another run) | 1,766 ms | 1,161 ms |
  | settled | 1,600 ms; in one of three runs the copy came back in 3 frames between 1,373 and 1,600 ms | about 1,860 ms | 1,161 to 1,219 ms |

- **Why, two things:**
  1. **OHIF (the branch only):** `mountVolumes` mounted the source volume without a start,
     so Cornerstone3D mounted it on its middle slice and drew it before `setDisplaySets`
     resolved (the PET's mount takes another 70 ms), and OHIF set the position of the pane
     (`setPresentations`) after the mount. The legacy `setVolumes` of `master` set the
     camera before its first frame.
  2. **Cornerstone3D (both sides):** the PET streams with the volume retrieve stages of
     OHIF (`coarseInterleavedRetrieveStages`, the default since 3.13: every 64th image
     first, each copied into the empty frames up to 32 away, `nearbyFrames`), and the
     planar viewport draws the overlay from those copies: until its own frame arrives the
     PET shows another slice. The branch's PET streams slower (the frame of the plane at
     1.4 to 1.8 s against 1.2 s; all 135 frames at 2.1 to 2.7 s against 1.8 to 2.5 s), so
     the wrong PET slice lasts about a second on the branch and about 0.6 s on `master`.
- **Fix, in OHIF (task O15):** a planar volume mount gives its source the image of the
  view that the pane had: `mountVolumes` takes `sourceImageId` and mounts the source with
  `initialImageIdIndex`, its index in the image ids of the display set
  (`services/ViewportService/viewportMounts.ts`). `sourceImageId` is the referenced image
  of the view reference of the position presentation when that reference names its frame
  of reference, as every view reference read from a viewport does
  (`getPositionImageId`, `CornerstoneViewportService.ts`). A reference that names only an
  image is not taken: the RT and SEG viewports store one for a stack (the first segmented
  slice, `viewportType: 'stack'`), which a volume pane never applied
  (`setPositionPresentation` asks `isReferenceViewable`, which needs the frame of
  reference). The first version of the fix took it, and the Playwright suite caught it:
  `RTHydrationFromMPR` (`mprAfterRT`, 9,517 pixels, the axial pane on slice 15 instead of
  131) and `SEGHydrationFrom3DFourUp` (`threeDFourUpAfterSEG`, 60,412 pixels) failed twice;
  with the rule both pass and no baseline changes. The first frame is the CT on its slice;
  no frame of another CT slice (above). Checks: jest `viewportMounts.test.ts` "mounts the
  source of a planar volume on the image of the position of the pane, an overlay on none"
  and "mounts the source on its default slice when the image of the position is not one of
  its images", `CornerstoneViewportService.test.ts` "a volume mount with a position
  presentation mounts its source on the image of that position" and "a volume mount does
  not start on an image that its position presentation names alone (the first segmented
  slice of an RT or SEG viewport)" (3 failed first: `jest-failfirst-D.log`,
  `jest-failfirst-D2.log`); the recording above (first image at slice 40, 109 ms).
- **Fix, in cornerstone:** to do. The rule: an overlay never draws a slice other than the
  one on the plane of the source; until it can, it draws nothing there.
  - **The smallest case, Cornerstone3D only:**
    `imageRetrieveMetadataProvider.add('volume', ProgressiveRetrieveImages.coarseInterleavedRetrieveStages)`;
    a planar viewport; `setDisplaySets({ displaySetId: ct, options: { mode: 'volume',
    role: 'source', initialImageIdIndex: 40 } }, { displaySetId: pt, options: { mode:
    'volume', role: 'overlay', appearance: { colormap: { name: 'hsv' }, opacity: 0.25 } } })`
    with the CT and the PET AC of "LUNG DELAYS", the PET not in the cache; draw each frame
    for 2 s: while `cachedFrames[94]` of the PET volume (the frame on the plane of slice
    40) is `FAR_REPLICATE + 1/27`, then `ADJACENT_REPLICATE`, the overlay draws the data of
    frame 67 then frame 92 or 96 (15.4% then 5.9% of the pixels from the settled frame);
    5.18.3 the same with a `VolumeViewport` and `setVolumes`. Where: the copies are made by
    the nearby fill of `BaseStreamingImageVolume` (`cachedFrames`, `ImageQualityStatus`,
    `packages/core/src/cache/classes/BaseStreamingImageVolume.ts:186` to `:202`), and the
    planar paths draw an overlay's volume without reading that quality (the CPU slice path
    `planarCpuSlice.ts` that the plan of this mount names, `overlay:cpu:gpu:slice`). A
    volume mounted as an overlay could draw nothing on a frame that holds a copy, or
    stream without copies.
  - The slower streaming of the PET on 6.0 (above) and the return of the copy after the
    right frame (one run in three) were seen, their cause not looked for.
  - A gap read in the code, not measured: `initialImageIdIndex` is taken only in the
    acquisition orientation (`createInitialVolumeSliceState`, `PlanarViewport.ts:3982`); a mount
    in another orientation (an overlay given to a sagittal pane of an MPR) has no start,
    so a position set after the mount shows one frame of the middle first. A mount option
    for a view reference would close it.
- **Fix, in cornerstone (done):** `9a329a5fa` (lane FX17): an overlay of a streaming
  volume draws nothing where its plane reads a frame that holds a copy of another frame,
  until the frame of its own position arrives; a source keeps the copies as its coarse
  preview (`2-rendering-changes.md`, "An overlay of a streaming volume shows no copy of
  another slice"). The same commit added the mount option `initialViewReference`, which
  now starts the source of OHIF's volume mounts in any orientation (M93).
- **Checked (lane O17, the link `610c47210`, O15's recording, `cases/overlayslice/jump40`,
  three runs on each side, `master` served on port 3336):**

  | | branch | `master` |
  |---|---|---|
  | the CT | on slice 40 in every state, never another slice | on slice 40; the pane blank at about 150 ms (the remount) |
  | the PET layer until its own frame | nothing: the picture is the CT alone until 673, 692, 694 ms | a copy of the frame 27 slices away from 558, 551, 526 ms (15.4% of the pixels off the settled picture), then of a frame 2 away (5.9%) |
  | first picture of the PET on the right slice | 991, 956, 984 ms (the settled picture; the page's poll is blocked between about 690 and 960 ms, so the moment lies in that span) | 1,552, 1,379, 997 ms |
  | pictures of another PET slice | 0 | 12, 11, 5 |
  | all 135 frames of the PET, as this overlay (the CT volume loads with it) | 2,084, 1,579, 1,894 ms | 2,226, 1,926, 1,519 ms |
  | all 135 frames of the PET as the source of a volume pane (`cases/petsource`) | first frame 188, 168, 190 ms; all 551, 553, 501 ms | 137, 138, 142 ms; all 851, 745, 809 ms |

  OHIF's interleaved retrieve stages still copy each loaded frame into its neighbours
  (lane FX18 measures that cost in Cornerstone3D); this task changed no stage.
- **State:** fixed: the Cornerstone part in `9a329a5fa` (FX17), checked in task O17; the
  OHIF part in task O15 (`3aee48d6fe`), its mount start moved to `initialViewReference` in
  task O17 (M93, `3728bdd459`). Vikunja 58: the overlay part is done; the mount at a
  stored position beyond the slices of the acquisition plane works since M91 (task O18).

## M84. The panes of a TMTV sync group open on the slice of the pane that mounts last

- **Seen (the owner, 26 November, Vikunja 55):** the TMTV mode, study "LUNG DELAYS" (CT
  512 x 512 x 135, PET 128 x 128 x 135): `master` opens the sagittal panes on 257/512 and
  the coronal on 256/512, the branch on 259 and 254.
- **Measured (lane O16, `specs/tmtvslices.spec.ts`, `cases/tmtv-before`, five loads on each
  side, the link `2810086ec`):** every load the same. The branch: every sagittal pane at
  x = 2.344 (the CT on index 258 of 512, the PET on 64 of 128), every coronal pane at
  y = -2.344 (CT 257, PET 64), the PET's default slice; the CT sagittal pane had 11
  `CAMERA_MODIFIED` events and 4 `setViewReference` calls during the load, the PET pane 5
  calls. `master` (port 3340): CT sagittal 256 (x = 0), coronal 255 (y = 0), PET sagittal
  63, coronal 64, every pane at the CT's position, 23 to 25 camera events per pane.
- **Why (OHIF):** the panes of one orientation share a `cameraPosition` synchronizer, and
  each pane joins it when its element is enabled, before its mount. A mount fires
  `CAMERA_MODIFIED` on the default slice of its own volume, so the synchronizer takes every
  pane of the group to the default slice of the pane that mounts last. On `master` the
  fusion pane mounted the CT and the PET in one `setVolumes`, reset last and so took the
  group to the CT's middle; on the branch the PET panes mount last (the PET needs its VOI
  first), so the group follows the PET, and a CT pane sits between two of its slices
  (258.4). Then `performResize` wrote each pane's stored view reference back: its focal
  point is the centre of the slice on display, of its own grid, so a pane between two of
  its slices moved to a centre and the synchronizer carried it to the others (the bounce
  of 1.953 and 2.344 that lane FX14 recorded on the earlier link; on `2810086ec` the
  resize came before the PET mounts in every load, so the end state was fixed). A 4D
  protocol does the same with its `'middle'` preset: each pane jumps to the middle of its
  own grid and the last jump wins.
- **Fix, in OHIF (task O16):**
  - `services/ViewportService/cameraPositionGroups.ts` (new) and `setVolumesForViewport`:
    a pane does not drive its camera position synchronizers while its volumes mount
    (`holdCameraPositionSync`: it stays a target), then goes to the one position of its
    group (`placeInCameraPositionGroups`) and drives it again. The group opens on the
    initial slice of the pane whose slice grid is the finest along the view (the step of
    `utilities.getTargetVolumeAndSpacingInNormalDir`: the CT of a PET/CT), the first in the
    layout among panes of one step; every other pane goes to the point of that slice as a
    view reference of a point and a plane (`FrameOfReferenceUID`, `viewPlaneNormal`,
    `cameraFocalPoint`), never a slice index of another grid, while it does not drive the
    group. A pane that ranks before the panes placed so far takes them to its slice, one
    move each; a pane restored from its own stored position keeps it. The order of the
    mounts does not change the result.
  - `performResize` writes back the framing of each pane (the zoom and the pan against the
    fit) and no longer its view reference: Cornerstone3D keeps the camera through a resize,
    so the slice needs nothing, and the view reference moved a pane that sits between two
    of its slices.
- **Checks:** jest `cameraPositionGroups.test.ts` (10 tests: four mount orders give every
  pane the CT's slice; a PET pane after the CT moves once, as a point and a plane; the
  panes placed before the CT move once and the CT not; a pane does not drive while it is
  moved; a restored pane keeps its position; the service holds a pane while it mounts:
  failed first, `jest-failfirst-camerasync.log`), `CornerstoneViewportService.test.ts` "a
  resize gives each viewport its framing back and leaves its slice to Cornerstone3D"
  (failed first, `jest-failfirst-resize.log`). Playwright `tests/TMTVCameraSyncPosition.spec.ts`
  (new, five loads of the TMTV phantom: the CT pane of each group on its first or middle
  slice and every other pane within half of its slice of the CT's slice; no picture):
  5 of 5 failed on the committed `3aee48d6fe` served on port 3335 (the CT sagittal pane on
  257 for 256, `pw-failfirst-tmtvsync.log`), 5 of 5 pass with the fix. In the viewer
  (`cases/tmtv-after`, five loads, all the same):

  | Pane | `master` | branch before | branch now |
  |---|---|---|---|
  | CT sagittal | 257/512 (x 0) | 259/512 (x 2.344) | 257/512 (x 0) |
  | CT coronal | 256/512 (y 0) | 258/512 (y -2.344) | 257/512 (y -0.977) |
  | PET sagittal | 64/128 | 65/128 | 64/128 |
  | PET coronal | 65/128 | 65/128 | 65/128 |
  | fusion sagittal, coronal | as the CT | as the PET | as the CT |
  | camera events, CT sagittal pane, load | 23 to 25 | 11 | 2 |
  | `setViewReference` calls, CT sagittal pane / PET sagittal pane | 1 / 1 | 4 / 5 | 0 / 2 (one placement, one from the synchronizer) |

  The CT coronal pane opens one slice further than on `master`: `master`'s TMTV coronal
  pane is the volume-order middle of 5.18.3's reset (j = 256); the branch opens on the
  middle counted along the view, `floor(N / 2)`, the default of Cornerstone3D since
  `2810086ec` (its row 260, the owner's decision of 26 November), which is also the slice
  that `master`'s own `'middle'` preset gives (`master`'s MPR layout opens the coronal pane
  of the same CT on 257/512). The PET panes show the PET slice nearest to the CT's point,
  the same slices as `master`. The TMTV phantom (`cases/tmtv-phantom*`): CT sagittal 257 on
  both sides, coronal 257 against `master`'s 256, PET sagittal 97/192 on both, coronal
  97 against 96. The viewer mode with a PET layer over a CT (one pane, no camera position
  group; `cases/overlaycount-*`): 3 camera events, 1 `setViewReference`, the pane stays on
  its slice 40, before and after. The 4D mode opens in its data preparation stage with one
  pane; its synced panes were not measured in the viewer (the jest cases cover its rule).
- **Fix, in cornerstone:** the default slice moved to the middle counted along the view in
  `2810086ec` (lane FX14, row 262 of `v6-open-issues.md` says the rest is OHIF's). What a
  camera change of a pane does to the others after the load is M85.
- **Since task O18 (link `c1dd07a1f`, `2746e912d9`):** a mount no longer moves the
  group (FX19), so OHIF no longer holds a pane out of the sources of its synchronizers
  while it mounts, nor while it moves it (`holdCameraPositionSync` and
  `driveCameraPositionSync` are gone). The panes of a group that mount together start at
  the position of the group before any of them mounts: `getCameraPositionGroupInitialStart`
  ranks the panes of the group that the viewport grid holds by the step of the slice grids
  of their volumes (`utilities.getVolumeSliceGrid` of Cornerstone3D, from the volume in the
  cache or the geometry of the images; the finest step, then the place in the layout) and
  gives the initial slice of the first (the index or the preset of its hanging protocol,
  else the default slice) as a point and a plane, the `initialViewReference` of every
  pane; `getMountSliceStep` is the step of that grid. A pane that joins a placed group
  (a series dropped later) still starts at the position of the placed panes, and a finer
  one still takes them to its slice. Measured (`cases/tmtvsync-after2`, five loads): the
  same slices as before (CT sagittal 256, coronal 256, PET 63 and 64, axial 0), each pane
  reports one `NEW_IMAGE` and draws one slice at the load (before: the three axial panes
  67 then 0, the PET sagittal 64 then 63), 2 or 3 `CAMERA_MODIFIED` per pane (before 4 to
  6; `master` 18 to 28), no `setViewReference`. `tests/TMTVCameraSyncPosition.spec.ts`
  checks one `NEW_IMAGE` slice per pane and one scale per group (5 of 5 failed on the
  committed sources, `pw-failfirst-tmtvsync.log`). A TMTV study scrolled, one pane one up
  and back: every pane comes back on its slice, together, on both sides
  (`cases/storedgroup`); leaving the mode clears the stored positions on both sides.
- **State:** fixed in task O16 (`080428db4f`).

## M85. A zoom or a resize of a PET pane moves the CT panes of its sync group to the centre of the PET slice

- **Seen (lane O16, `specs/synczoom.spec.ts`, `cases/synczoom`):** the TMTV mode after the
  load, Cornerstone3D calls only: the CT sagittal pane put on its slice 256 (x 0) with
  `utilities.jumpToSlice` (the PET sagittal pane follows to x 0, its slice 63), then
  `ptSAGITTAL.setZoom(ptSAGITTAL.getZoom() * 1.5)`: the CT sagittal and the fusion sagittal
  panes go to slice 254 (x -2.344, the centre of the PET's slice 63). `master` (3340): they
  stay on 256. A resize of the window after the load (OHIF writes the framing of each pane
  back, M84) does the same: the CT 256 -> 254 on the branch, 256 on `master`.
- **Why (Cornerstone3D):** `cameraSyncCallback` (`packages/tools/src/synchronizers/callbacks/cameraSyncCallback.ts`)
  gives the target `sViewport.getViewReference()`, whose `cameraFocalPoint` is the centre of
  the source's slice on display (`getPlanarViewReference`), not the focal point of its
  camera. A pane that sits between two of its slices, as a PET pane on the position of a
  CT, gives the centre of its nearest slice, up to half a PET slice (2.3 mm, two CT slices)
  away, at every camera change, also a zoom or a pan. 5.18.3's callback copied the camera
  (`setCamera`), so every pane kept one focal point.
- **The smallest case, Cornerstone3D only:** two planar viewports on one rendering engine,
  sagittal, one with a volume of 512 x 512 x N at 0.977 mm, one with a volume of 128 x 128
  x N at 4.69 mm, one frame of reference; `createCameraPositionSynchronizer('s')`, both
  added; `await utilities.jumpToSlice(ct.element, { imageIndex: 256 })` (the PET follows to
  x 0); `pt.setZoom(pt.getZoom() * 1.5)`: `ct.getSliceIndex()` is 254, 5.18.3 256.
- **Fix, in OHIF:** none (rule 3). OHIF's load does not trigger it any more (M84): no pane
  drives its group before it is placed, and the resize no longer writes a view reference;
  a zoom, a pan or a resize of a PET pane after the load still moves the CT panes.
- **Fix, in cornerstone:** `9642ce820` (lane FX19): a target takes the parallel scale of
  the source, its world point at the centre and its view up in one write; its slice moves
  only when the source moved along its normal, to the slice of its own grid nearest to
  the position of the source; an event that changes no camera (a mount, a resize that
  keeps the camera) writes no other pane.
- **Checked (task O18, `specs/tmtvsync.spec.ts`, five loads on each side):** on the new
  link with OHIF unchanged (`cases/tmtvsync-before`) and after the change of task O18
  (`cases/tmtvsync-after2`) the CT sagittal pane stays on 256 (257/512, x 0) after a zoom
  of 1.5 of the PET sagittal pane, after a pan, after a resize of the window (1,600 to
  1,400 pixels) and after a panel toggle, as on `master`. `tests/TMTVCameraSyncPosition.spec.ts`
  checks the CT slice after a zoom and after a resize of the PET pane at each of its five
  loads.
- **State:** fixed in cornerstone `9642ce820`, checked in task O18.

## M86. The panes of a camera position sync group show one zoom against the fit, not one scale

- **Seen (lane O16, `cases/synczoom`):** the TMTV mode after the load: the parallel scale of
  the CT sagittal pane is 246.07, of the fusion sagittal pane 246.86, of the PET sagittal
  pane 295.28, so the PET pane draws the body about 17% smaller than the CT pane next to
  it; after a zoom of 1.5 of the PET pane 164.05, 164.57, 196.86. `master`: 246.86 in every
  pane, 164.57 after the zoom.
- **Why (Cornerstone3D):** `cameraSyncCallback` copies the zoom and the pan against the fit
  (`getViewportFraming(sViewport, { pan: true, zoom: true })`); the fit of each pane is the
  extent of its own volume, so panes of volumes of other extents get other scales. Its
  comment says the copy keeps the panes "in lockstep like the legacy full-camera copy
  did"; 5.18.3 copied the parallel scale.
- **Fix, in OHIF:** none (rule 3).
- **Fix, in cornerstone:** `9642ce820` (lane FX19): the panes of a group take the parallel
  scale of the source, as 5.x did; a pane that joins takes the scale and the centre of
  the group.
- **Checked (task O18, five loads on each side, the scale of the sagittal group):**

  | Step | `master` | link `c1dd07a1f`, OHIF unchanged | task O18 |
  |---|---|---|---|
  | the load | 246.86 | 246.86 | 246.07 |
  | a zoom of 1.5 of the PET pane | 164.57 | 164.57 | 164.05 |
  | a resize of the window, 1,600 to 1,400 | 195.27 | 195.27 | 194.65 |
  | the right panel closed | 158.59 | 158.59 | 158.08 |

  Every pane of a group has the same scale at every step on all three. With OHIF
  unchanged the group ended on the fit of the fusion pane by the order of the replays of
  the resize after the load: each pane mounted on its own fit while OHIF held it out of
  the sources (CT 246.07, PET 295.28, fusion 246.86), and each replay of a framing gave
  the group that pane's scale, the fusion last (`cases/scalecam-before`). Since task O18
  no pane is held: the PET and the fusion pane take the scale of the CT pane, which mounts
  first, at their mount, and the replays write that scale again (`cases/scalecam-after`),
  0.3% from `master`'s number, which is the fit of the fusion pane that 5.18.3 reset last.
- **State:** fixed in cornerstone `9642ce820`, checked in task O18.

## M87. A click on a segment does not move a stack to it

- **Seen (lane O16, the Playwright suite on the link `2810086ec` before any change):** 21
  specs fail: the contour segment specs (`ContourSegmentColorChange` x3,
  `ContourSegmentDelete`, `ContourSegmentDuplicate` x2, `ContourSegmentToggleLock`,
  `ContourSegmentToggleVisibility` x3, `ContourSegNavigation`, `ContourSmoothOperation` x3,
  `ContourCombineOperations` x2), `ManuallyDrawnSegmentation` "should jump to the painted
  slice", `SegmentationPanel` "checks saved segmentations loads and jumps to slices",
  `LabelMapSegmentationColorChange` x2 and `SegAcrossViewportTypes` "keeps a changed
  segment color after switching to MPR": a click on a segment leaves the stack on its
  image, so no contour or the wrong labelmap slice shows.
- **Why:** `SegmentationService.jumpToSegmentCenter` called
  `viewport.setViewReference({ cameraFocalPoint: world })`. Since `2810086ec` (lane FX14,
  rows 191 and 248 of `v6-open-issues.md`, the guide `5-from-a-6-beta.md` item 16) a
  reference of only a point moves a stack nowhere, as on 5.18.3; `master` used the
  legacy `jumpToWorld`, which went to the image nearest to the point.
- **Fix, in OHIF (task O16):** `jumpToSegmentCenter` calls
  `utilities.navigatePlanarViewportToPoint(viewport, world)` of `@cornerstonejs/tools`
  (the helper the tools use: the index of the nearest image for a stack, the point for a
  volume). Check: `SegmentationService.test.ts` "moves a stack to the image nearest to the
  centre of the segment" (failed first, `jest-failfirst-segjump.log`); the 21 specs pass
  (`pw-segjump.log`, 83 passed). The other `setViewReference` calls of OHIF were read:
  each gives an image, a slice of its own display set, or a whole view reference, or is a
  stored presentation (`commandsModule.ts` jump to a measurement, `NavigationComponent`,
  `CornerstoneViewportDownloadForm`, `jumpToSegmentNext`); a jump to a measurement from
  the panel still lands on its slice, in a stack and in an MPR (`JumpToMeasurementMPR`,
  `MeasurementPanel`, `SRHydrationArrowNavigation` pass).
- **State:** fixed in task O16 (`080428db4f`).

## M88. The Reset button keeps the slice of a volume pane

- **Seen (lane O16, `specs/resets.spec.ts`, `cases/resets`):** the MPR layout of "LUNG
  DELAYS", each pane scrolled by 7 and zoomed, then Reset: `master` takes the pane back to
  its middle slice (axial 68/135, sagittal 257/512, coronal 256/512); the branch keeps the
  slice (75, 264, 264) and resets only the zoom. With the crosshairs on, every pane
  scrolled, Reset of one pane: `master` takes all three to their middle slices and the
  crosshairs to where they meet (`[0, 0, -141.09]`); the branch moves nothing.
- **Why:** OHIF's `resetViewport` calls `resetViewState()`, which keeps the slice in
  Cornerstone3D 6.0 (the owner's decision); 5.18.3's `resetCamera()` of a volume viewport
  went to the middle of the volume, and its crosshairs reset every view of their tool
  group the same way. The comment of `_getInitialImageIndex` still said that a reset goes
  to the middle slice.
- **Fix, in OHIF (task O16):** `resetViewport` takes a pane that shows a volume to its
  middle slice after the reset (`viewportOperations.jumpToMiddleSlice`,
  `floor(N / 2)` counted along the view, `getMiddleSliceIndex`, which the `'middle'` preset
  of `_getInitialImageIndex` now uses too); when the crosshairs of its tool group are
  active, passive or enabled (they reset every view of the group), every pane of the group
  goes to its middle slice, then `resetCrosshairs` puts the centre where those slices
  meet. A stack keeps its image, as on `master`. Check: `resetViewport.test.ts` (new, 7
  tests: 512, 135 and 20 slices to 256, 67 and 10; a stack keeps its image; only the active
  pane without crosshairs; with the crosshairs all panes and `resetCrosshairs`; disabled
  crosshairs: only the active pane; 6 failed first, `jest-failfirst-reset.log`). In the
  viewer (`cases/resets-after`, `cases/resets-liver`): Reset takes each pane back to 68/135,
  257/512, 257/512; with the crosshairs all three and the centre `[0, -0.977, -141.09]`.
  The middle is the mount's: the `'middle'` preset and the default slice of Cornerstone3D
  are both `floor(N / 2)` along the view, for an odd count (135, axial, the normal against
  the volume axis), an even count with the normal along the axis (512, sagittal) and
  against it (512, coronal; 20, axial of the liver CT). `master`'s Reset goes to the
  volume-order middle of 5.18.3, one slice before the mount for an even count against the
  axis: the coronal 256/512 (mounted on 257), the liver's axial 10/20 (mounted on 11/20);
  the branch comes back to the slice it opened on.
- **State:** fixed in task O16 (`080428db4f`).

## M89. Three pictures change on the link `2810086ec` for a reason not found

- **Seen (lane O16, the Playwright suite before any change and after the fixes of M84,
  M87 and M88):** three pictures differ from their baselines (made on `master`), each with
  one part that the slice grid explains and one that it does not:
  - `RTHydrationFromMPR.spec.ts` `mprAfterRTHydratedAfterLayoutChange` (35,583 pixels,
    7.6%): the axial pane keeps slice 131, where it was before the RTSTRUCT loaded, where
    `master` moves to 130 at the load (`cases/rtlayout`); the sagittal and coronal panes
    draw the cuts of the contours (M79; `master` draws none). It passed on `c2f202429`;
    the view state point of the axial pane is on its slice, so row 259 of FX14 does not
    explain it.
  - `SEGDataOverlayForUnreferencedDisplaySetNoHydration.spec.ts` `overlayMiddleImage`: the
    DWI pane opens one slice further (the default slice of an even count, as the replaced
    `overlayFirstImage`), and the ADC stack with the unreferenced SEG draws more of segment
    2 at the lower edge of the gland on image 12 (6,885 pixels).
  - `SEGHydrationFromMPR.spec.ts` `mprAfterSegHydratedAfterLayoutChange`: the axial and the
    coronal pane on the oblique grid (as the replaced pictures), and the sagittal pane,
    on the same slice 64 as `master`, brighter and smoother than in the baseline (2,405
    pixels).
- **Fix:** none; the baselines are not replaced. The new pictures, the old ones and the
  difference images are in lane O16's `cases/rt-candidate`, `cases/unrefseg-candidate` and
  `cases/seghydration-candidate`.
- **Every part named (lane O17, the link `610c47210`; the pictures of the branch are byte
  for byte those of O16's candidates):**
  - `RTHydrationFromMPR` (`cases/rtload`): the axial pane is 20,006 of the 24,538 pixels.
    At the RTSTRUCT load both sides mount the pane again without its position (M92: a pane
    scrolled to slice 100 jumps to the middle on both sides), so each lands on its library's
    default slice: `master` on the volume-order middle of 5.18.3 (z -52, view slice 130), the
    branch on the view-order middle of 6.0 (z -53, slice 131), the slice grid of FX14 (row
    260); the old link had the volume-order middle as its default, so its picture matched.
    The view reference of the pane named `.136` (z -53) before the load on both sides, so
    `master`'s move is no reference to a wrong image, and slices 130 and 131 hold contours of
    the same 10 structures, so it is no move to a slice with contours. The sagittal and
    coronal panes are the cuts of M79 (4,532 pixels, 1.0%, under the 2% of the compare: not
    why the spec failed; FX16's single worker changed nothing here). A test has nothing to
    wait on for the cuts: M90.
  - `SEGDataOverlayForUnreferencedDisplaySetNoHydration` (`cases/unrefframe`,
    `cases/unreflayers`): the top right pane (30,120 pixels) is the default slice of FX14;
    the top left (404 pixels at the threshold of the test, 4,469 with a channel off by more
    than 16) is no choice of a labelmap image: the ADC pane is a volume pane on both sides
    (the stack map of FX16 and the pairing of FX17 do not take part), and both draw the
    labelmap plane nearest to the ADC slice (k = 14 of the T2 grid, 1.30 mm from the focal
    point, within half of its 3.5 mm). On that plane segment 2 (peripheral zone) has 1,922
    voxels, 1,544 of them inside segment 4 (prostate): the branch keeps overlapping segments
    in three labelmap layers and draws all 1,922; `master` merges them into one labelmap
    volume in which segment 4 overwrote the overlap and draws 378. The branch is right.
  - `SEGHydrationFromMPR` (`cases/seghydr`, `cases/seghydr-baselines`): the axial and the
    coronal pane are the oblique grid of FX14. The old baseline was not `master`'s: it is
    the branch's own picture of 21 November (M36, package U4, `e5881fc1a7`), whose sagittal
    pane has a sampling artefact (dark speckles, mean 22.27). Today's sagittal pane matches
    `master`'s original baseline to 183 pixels (mean 24.19 against 24.16) and live `master`
    to 44; its render plan (the CPU cuts the slice, the GPU draws it, linear), its window
    ([-29.5, 658.5]) and its view (view up [0, 0, 1], rotation 0) do not change through the
    SEG hydration and the layout change. The branch is right.
- **Fix (task O17):** the three baselines are replaced under the owner's exception (lane
  O17 `baselines/LIST.md`, old, new, difference and side by side); the three specs pass
  twice each.
- **State:** closed in task O17 (`3728bdd459`): every part has a named cause.

## M90. A test cannot wait for the cuts of an RTSTRUCT in the other MPR planes

- **Seen (lane O17, Part 2 of its task):** `RTHydrationFromMPR.spec.ts` takes its last
  picture (`mprAfterRTHydratedAfterLayoutChange`) while the sagittal and the coronal panes
  may still be receiving the cuts of the contours (M79: one polySeg worker since FX16, the
  first cut about 2.6 s and the last about 6.3 s after the hydration in O16's measure). The
  spec waits for fixed times and for the retries of the picture compare.
- **Measured:** the cuts are not why the spec failed on the link `2810086ec`: in the failing
  picture they make 4,532 of its 24,538 differing pixels (sagittal 2,221, coronal 2,311,
  1.0% of the picture, under the 2% that the compare allows); the axial pane makes 20,006
  (M89). The picture of the last attempt of the compare has every cut: two runs of two
  lanes give the same 24,538 pixels, byte for byte.
- **What a test could wait on, read in Cornerstone3D (`610c47210`):** nothing.
  `updateContourCuts` (`tools/displayTools/Contour/contourCuts.ts`) returns a promise that
  resolves when the cut of the plane of a viewport is drawn, and `contourDisplay.ts`
  drops it (`updateContourCuts(viewport, segmentationId);`, line 114).
  `SEGMENTATION_RENDERED` fires when the render function of the representation resolves,
  before the cuts. `ANNOTATION_RENDERED` fires after each batch of cuts (FX16), so no one
  of them says that it is the last. The surfaces of the segments go into the cache of
  geometries only, not into the `representationData` of the segmentation, and the web
  worker manager has no state of its queue.
- **Fix, in OHIF:** none in task O17 (rule 3); the spec kept its waits.
- **Fix, in cornerstone (proposal):** `contourDisplay` keeps the promise of
  `updateContourCuts` and fires an event when the cut of the plane of a viewport has every
  segment, for example `SEGMENTATION_RENDERED` again with `{ viewportId, segmentationId,
  type: 'Contour', contourCutsComplete: true }`, or a new `CONTOUR_CUTS_RENDERED` with the
  same detail; or a public `segmentation.getContourCutsReady(viewportId, segmentationId):
  Promise<void>` over the same promise. A test (and an application that shows a progress
  bar) then waits for the state, not for a time.
- **Fix, in cornerstone:** `be7cbd1c8` (lane FX21): `Events.SEGMENTATION_CONTOUR_CUTS_COMPLETED`
  and `segmentation.getContourCutsState(viewportId, segmentationId)`, `'pending'` or
  `'complete'`.
- **Fix, in OHIF (task O18):** `tests/utils/waitForContourCuts.ts` waits until the state
  is `'complete'` for every Contour representation of every pane (the panes named, or at
  least a number of them, so that it does not end before the representation reaches a
  pane), then two animation frames. `RTHydrationFromMPR.spec.ts` waits on it after the
  hydration (the three `mpr-*` panes) and after the layout change (three panes: the new
  layout names them `default` and two generated ids) instead of 5 s and nothing;
  `RTHydrationThenMPR`, `RTDataOverlayNoHydrationThenMPR` and
  `MPRThenRTOverlayNoHydration` wait on it before their picture of the MPR: in each, three
  panes show the contours and their cuts complete 10 to 17 s after the step
  (`cases/cutsothers`), so their pictures were taken with cuts pending.
- **Checked:** five runs of the four specs: every picture byte for byte the same in the
  five (`snaps`, `snaps2`). `mprAfterRTHydrated` of `RTHydrationFromMPR` differs from its
  baseline (`master`'s) by 9,539 pixels (2.0%): the axial pane 4,987 (slice 131, where the
  pane was before the load, against `master`'s 130 after its reset at the load, M92) and
  the cuts of the sagittal (2,394) and coronal (2,158) panes, all of them (`master` draws
  none): the baseline is replaced (task O18 `baselines/LIST.md`). The other pictures pass
  their baselines (`mprAfterRTHydratedAfterLayoutChange` 3 pixels from O17's).
- **State:** fixed in cornerstone `be7cbd1c8`; the specs wait on it since task O18 (not
  committed yet).

## M91. A sagittal or coronal mount refuses an `initialViewReference` whose slice index is beyond the slices of the acquisition plane

- **Seen (lane O17, the state test of Part 3, `tests/MPRPaneMountsAtStoredPosition.spec.ts`):**
  the MPR layout of the CT of study `...1493322302363.3.0` (512 x 512 x 262, axial), the
  sagittal and the coronal pane put on a slice, the layout left (1 x 1) and taken again:
  each pane mounts with `initialViewReference` set to its stored view reference
  (M93). A sagittal pane stored on slice 100 and a coronal pane on slice 200 start there (one
  `NEW_IMAGE` of that slice, no other). A sagittal pane on slice 300 and a coronal pane on
  400 do not: Cornerstone3D logs `[PlanarViewport] The initialViewReference of the mount is
  not viewable in this viewport, so the mount shows its default slice`, the pane reports
  `NEW_IMAGE` of slice 256 and then OHIF's replay of the position after the mount takes it
  to 300 and 400 (`cases/storedmount/branch/run-after1.json`, `run-sag300cor200.json`). The
  same reference is viewable with navigation on the mounted pane
  (`isReferenceViewable(ref, { withNavigation: true })` is true on slices 100, 300 and 400,
  `cases/refviewable`).
- **Why (Cornerstone3D, read at `610c47210`):** `PlanarViewport.applyInitialViewReference`
  (`beforeFirstViewState`) asks `isReferenceViewable(viewRef, { withNavigation: true })`
  before the view state of the mount is in place; `isSliceIndexCompatible`
  (`viewReferenceCompatibility.ts`) then checks the `sliceIndex` of the reference against
  `context.numberOfSlices`, which at that moment counts the slices of the acquisition plane
  (262), not those of the orientation of the mount (512). Every view reference read from a
  volume pane carries its `sliceIndex`, so a stored position beyond slice 261 of a sagittal
  or coronal pane of this CT starts on the default slice first.
- **The smallest case, Cornerstone3D only:** a planar viewport, a CT volume of 512 x 512 x
  262 axial slices, mounted sagittal; `utilities.jumpToSlice(element, { imageIndex: 300 })`;
  `const ref = viewport.getViewReference()`; a second planar viewport:
  `setDisplaySets({ displaySetId: ct, options: { mode: 'volume', orientation: 'sagittal',
  initialViewReference: ref } })`. Expected: the first `NEW_IMAGE` and the first frame are
  of slice 300. Actual: the warning, `NEW_IMAGE` of 256. With slice 100 it starts on 100.
- **Fix, in OHIF:** none (rule 3); OHIF gives the stored reference as it is and, after the
  mount, sets it again only when the pane does not show it (so the pane still ends on its
  slice, one frame late). The case beyond the acquisition count is in the Playwright test
  as `test.fail` (`... beyond the slices of the acquisition plane (M91)`).
- **Fix, in cornerstone:** `be7cbd1c8` (lane FX21): the mount reads the view it is about
  to show.
- **Checked (task O18):** the first Playwright run on the link `c1dd07a1f` reported the
  `test.fail` case "Expected to fail, but passed"; the `test.fail` is removed and both
  cases pass (`pw-rtkeeps`).
- **State:** fixed in cornerstone `be7cbd1c8`, checked in task O18.

## M92. Loading an RTSTRUCT into an MPR pane takes the pane to its default slice, on `master` too

- **Seen (lane O17, Part 2, `cases/rtload`):** the MPR layout of study
  `...1493322302363.3.0`, the axial pane on slice 131 (the `'middle'` preset of OHIF's MPR
  protocol, z -53, image `.136`), the RTSTRUCT loaded from the study browser: `master` goes
  to slice 130 (z -52, image `.135`), the branch stays on 131. With the axial pane scrolled
  to slice 100 first (z -22), `master` goes to 130 and the branch to 131: both sides drop
  the slice the user was on (`run-scroll100.json`). Slices 130 and 131 hold contours of the
  same 10 structures (BODY, Brain, Brain Stem, EVAL50, INNER, MID, OUTER, PRV5mm-Neural,
  Skin, optBRAIN; the structures on z -50 to -55).
- **Why (OHIF, both sides):** the load mounts the pane again with the RTSTRUCT viewport,
  whose position presentation is `{ viewportType: 'stack', viewReference: {
  referencedImageId: <first segmented slice> } }` (`OHIFCornerstoneRTViewport.tsx`), meant
  for a stack. A volume pane does not take a reference that names only an image (M30, and
  O15's rule for the mount start), and the position of the pane before the load is stored
  under another presentation id (its display sets change), so the pane lands on the default
  slice of the library: on `master` the new `VolumeViewport` resets to the volume-order
  middle of 5.18.3 (k = 131 of 262, z -52, view slice 130; the hooks show `resetCamera` from
  `setVolumes` and no `setViewReference`), on the branch the view-order middle of 6.0 (131,
  z -53). The branch's 131 is the slice of the `'middle'` preset only by coincidence. The
  move on `master` is therefore neither a move to a slice with contours nor a reference to
  a wrong image: it is the reset of a re-created viewport.
- **Measured (task O18, `specs/m92.spec.ts`, `cases/m92-before`; each pane scrolled to
  30% of its slices, the RTSTRUCT or the SEG loaded into it, then hydrated):**

  | Pane | before | after the load, `master` | after the load, branch before | after the load and the hydration, task O18 |
  |---|---|---|---|---|
  | RTSTRUCT, MPR axial | 78/262 | 130 | 131 | 78 |
  | RTSTRUCT, MPR sagittal | 153/512 | 256 | 256 | 153 |
  | RTSTRUCT, MPR coronal | 153/512 | 255 | 256 | 153 |
  | RTSTRUCT, stack | 78/262 | 15 | 15 | 15 |
  | SEG (MR), MPR axial | 76/256 (`master` 91/305) | 152 | 128 | 76 |
  | SEG, MPR coronal | 76/256 (91/305) | 152 | 128 | 76 |
  | SEG, MPR sagittal | 38/128 | 63 | 64 | 38 |
  | SEG, stack | 38/128 | 14 | 14 | 14 |

  On both sides the hydration keeps the slice of the load (it stores the pane's position
  under the referenced display set, `updateStoredPositionPresentation`). A stack goes to
  the first segmented slice on both sides: the RT and SEG viewports store it for their
  pane when the object has loaded, before the mount reads its presentations; that is the
  loaded object asking for a position, and it stays. An MPR pane does not take it (a
  reference that names only an image is not a view of a volume pane), and `master` has no
  jump to a segment in an MPR pane.
- **Why, in full:** the RT and SEG viewport is another React component, so the load
  releases the element of the pane (`disableElement` drops its `viewportInfo` and its
  display sets) before the new mount; the position of the pane is stored under the
  presentation id of its CT, and the id of the new pane (with the RTSTRUCT) holds nothing
  or only the first segmented slice.
- **Fix, in OHIF (task O18):** `CornerstoneViewportService.storePresentation` keeps what
  each pane showed (`shownPositions`: its source display set, its orientation, the shape
  of its data and its position); `setViewportData` gives a mount that shows the same source
  display set in the same orientation and shape the position that the pane showed
  (`_withShownPosition`), unless the mount brings a position that the pane can start at
  (`isPositionForMount`: a stored view reference of its frame of reference for a volume,
  an image of the stack or an index for a stack). An MPR pane mounts at its slice
  (`initialViewReference`, no jump after the mount) and gets its zoom and pan back.
- **Checks:** jest `CornerstoneViewportService.test.ts`, "a pane that mounts again the
  display set that it shows": the three orientations, a released element, the first
  segmented slice on an MPR pane, a stored position wins, a stack without and with the
  first segmented slice, another display set or orientation (6 of 9 failed on the base,
  `jest-failfirst-m92b.log`). Playwright `tests/RTLoadKeepsMPRPanePosition.spec.ts` (new):
  the axial pane on 78, the sagittal on 153, the coronal on 400, the RTSTRUCT loaded from
  each and hydrated: the slices stay and the pane reports no `NEW_IMAGE` of another slice;
  3 of 3 failed on the committed sources served on port 3335, 3 of 3 pass. In the viewer
  `cases/m92-after2` gives the last column of the table.
- **State:** fixed in task O18 (`2746e912d9`).

## M93. A pane mounts at its position: `initialViewReference` in the mounts (task O17, Vikunja 58)

- **What:** Cornerstone3D `9a329a5fa` (lane FX17) added the planar mount option
  `initialViewReference`: the source starts at a view reference in any orientation, before
  its first frame and its first `NEW_IMAGE`. Task O15 had started the source of a volume
  mount at the image of the stored position with `initialImageIdIndex` (M83), which
  Cornerstone3D reads only in the acquisition plane, so a sagittal or coronal pane coming
  back to a stored position reported its middle slice first and was then moved there
  (`NEW_IMAGE` 256, then 100 and 400 in the state test below on the committed `080428db4f`).
- **Change, in OHIF:**
  - `viewportMounts.ts`: `VolumeMountContext.initialViewReference` replaces `sourceImageId`;
    `mountVolumes` gives it to the source entry as `initialViewReference` (no more
    `initialImageIdIndex` from the image ids), in every orientation; a 3D mount takes none.
  - `CornerstoneViewportService.ts`: `getPositionViewReference` (was
    `getPositionImageId`) gives the whole view reference of the position presentation, with
    O15's guard: only a reference that names its `FrameOfReferenceUID`. The guard stays
    needed: the bare `{ referencedImageId }` of the RT and SEG viewports names an image of
    the volume, which a mount with navigation would take (slice 15 of the RTSTRUCT's CT, as
    O15 saw); it is the stack hint of M92, not a view of the pane.
  - The replay after the mount: `withoutShownViewReference` (`viewportPresentations.ts`)
    drops the view reference of a stored position when the pane already shows it (the mount
    started at it), so only the framing (and the segmentation presentation) is given back;
    a reference the mount could not take is set as before. This holds for stack mounts too,
    whose start was already the image of the reference (OHIF's own index, kept: a stack
    has no orientation, and passing the reference as well would move the index lookup into
    Cornerstone3D and add its warning for references of other data).
  - Camera position groups (`cameraPositionGroups.ts`): a pane that mounts into a group
    whose panes are placed, and ranks after them, starts at the point and the plane of the
    group (`getCameraPositionGroupStart`, the step of its grid from its volumes before the
    mount, `getMountSliceStep`, the l1 voxel thickness of
    `utilities.voxelSlab.getVoxelThicknessAlongNormal`, Cornerstone3D's default
    `sliceStepMeasure`, which OHIF keeps) and skips the jump to the initial image of its
    hanging protocol; a placed pane already on the plane of the group is not moved again.
- **What the group start cannot do:** the load of a mode. The panes of a group mount at the
  same time: each `setVolumesForViewport` starts before any pane of its group is placed, so
  at the start of the PET's mount there is no position of the group yet (TMTV, three loads
  before and after, `cases/tmtvframes-{before,after}`: the same sequences, `ptSAGITTAL`
  reports its slice 64 and then 63, `fusionAXIAL` draws 67 and then 0, `ctAXIAL` and
  `ptAXIAL` report 67 before their `'first'` preset; 82 to 141 frames per pane, no
  difference). Starting every pane of a load at the position of its group would need the
  initial slice of the finest pane before its mount (its default slice point: the slice
  grid of `utilities/volumeSliceGrid.ts` is not exported, nor `getSliceStepAlongNormal`,
  which picks the configured measure), or mounts of a group in series. Where a pane mounts
  into a placed group (a PET NAC dropped into the PET sagittal pane after the load,
  `cases/tmtvdrop-{before,after}`, three runs each): before, `NEW_IMAGE` of 64 (x 2.344)
  then 63 (x 0); now only 63. A volume mount still jumps to the initial image of its hanging
  protocol after the mount when it does not start at a position (a slice index reference of
  a volume needs its volume id and the normal of its view, and `'last'` the slice count).
- **Checks:** jest: `viewportMounts.test.ts` (the source of an axial, a sagittal and a
  coronal mount starts at the reference, an overlay at none; no reference, no start; a 3D
  mount takes none), `CornerstoneViewportService.test.ts` (the mount gets the whole
  reference; not the bare image; no second `setViewReference` after a mount that started at
  it, the framing given back; a reference the mount could not take is set after it; the same
  for a stack), `cameraPositionGroups.test.ts` (the start of a coarser pane and of a pane of
  the same grid later in the layout is the CT's point and plane; none for the first pane or
  a finer one; four mount orders put every pane on the CT's slice with no move after the
  mount, except the PET placed before the CT; the service starts the PET at the group and
  neither jumps nor moves it): 15 failed on the base (`jest-failfirst-part3.log`), the 6
  suites of `ViewportService` pass after (96 tests). Playwright
  `tests/MPRPaneMountsAtStoredPosition.spec.ts` (new): every `NEW_IMAGE` and drawn frame of
  the sagittal and the coronal pane, from their mount at a stored position, is of the stored
  slice; it failed on the committed `080428db4f` served on port 3335 (`NEW_IMAGE` 256 first,
  `pw-failfirst-stored.log`) and passes now; its second case (slices beyond the axial count)
  is `test.fail` for M91.
- **State:** done in task O17 (`3728bdd459`).

## M94. The TMTV load takes about 2 s longer than on `master`

- **Seen (task O18, `specs/tmtvtime.spec.ts`, `cases/tmtvtime`, five loads on each side of
  "LUNG DELAYS"):** every volume has loaded 9.4 to 10.2 s after the navigation on the
  branch, 7.3 to 7.7 s on `master`. The requests of the 270 frames run from 1.6 s to 9.3
  to 10.0 s (`master`: 276 from 1.4 s to 7.5 s); the panes draw 870 to 947 frames during
  the load (`master` 645 to 666); `IMAGE_VOLUME_MODIFIED` fires 270 times on both sides,
  and its dispatch takes 14 to 16 ms in all (OHIF listens to none of them).
- **Where the time goes (CPU profile of the load):** the branch spends 4.5 to 5.0 s of the
  main thread in `copyWebGLCanvasToCanvas` (`ContextPoolRenderingEngine._copyToOnscreenCanvas`,
  once per frame drawn), `master` 3.3 s in its `_copyToOnscreenCanvas`; and 1.3 to 1.6 s in
  the sampling of the CPU slice path (`updateSlice` → `sampleVolumeSlice` →
  `sampleVolumeGrid` → `sampleCheckedPoint` → `VoxelManager.getAtIJK` → `getVoxelValue` →
  `resolveSliceVoxelManager`, 360 to 390 ms in the last alone: a voxel manager is resolved
  for each voxel), which `master` has not. The requests of the frames are spread over the
  load because the main thread is busy; the server answers as fast on both sides.
- **Not OHIF:** the PET of the study added to a CT pane alone is not slower than on
  `master` (`specs/petload.spec.ts`, `cases/petload`, three runs each): as a layer (the
  data overlay menu) all 135 frames in 807, 961, 1,190 ms against 1,345, 1,269, 1,233 ms,
  its first frame in 182 to 195 ms against 476 to 513 ms; as the source of the pane 645,
  560, 643 ms against 779, 833, 747 ms. One request per frame on both sides; 135 or 136
  `IMAGE_VOLUME_MODIFIED` (`master` 518 to 653), whose OHIF listeners take 0.3 ms or less
  in all; 11 to 21 frames drawn (`master` 24 to 26). The 2 s of O15 are gone on this link.
- **The smallest case, Cornerstone3D only (from the profile; not run outside OHIF):** a
  `ContextPoolRenderingEngine` with six planar viewports, a CT of 512 x 512 x 135 and a PET
  of 128 x 128 x 135 streaming with the interleaved stages, axial, sagittal and coronal,
  the PET as the source of three and as an overlay over the CT of three: count
  `IMAGE_RENDERED` during the load and profile it; the time in `copyWebGLCanvasToCanvas`
  and in `resolveSliceVoxelManager` under `sampleVolumeSlice` is the difference.
- **Fix, in OHIF:** none (rule 3).
- **Fixed in Cornerstone3D `8333d7dba` (lane FX23):** a pane draws during a load only when
  its own picture changed, at most once per 100 ms tick; a volume whose requests the
  application queued (OHIF's `interleaveTopToBottom`) loads once; the sampler resolves a
  frame once.
- **Measured again in task O20 (link `8333d7dba`, installed Chrome on the GPU, ANGLE Metal
  Renderer: Apple M2 Ultra; `lanes/O20/measure`, `bench`, `traces`):** with today's
  `config/e2e.js` (five loads each, alternating) every volume is loaded and every pane
  rendered 6,354 ms after the navigation on the branch, 5,951 ms on `master`. The 403 ms are
  54 ms of start (the dev build of the link evaluates more modules) and 355 ms of load,
  where every frame holds its request slot longer; the load itself, 4.7 to 5 s on both
  sides, is OHIF's configuration (M96). With M96 fixed: 1,995 ms on the branch, 2,019 ms on
  `master` with the same two settings, 5,985 ms on `master` as it is today (five rounds of
  the three); 58, 295 and 671 frames drawn; 8, 21 and 69 React commits during the load. A
  production build (`config/default.js`, which has the settings of M96 on both sides):
  1,605 ms against 1,634 ms, 63 frames against 278, main thread busy from the navigation
  to the end 1,063 ms against 1,216 ms.
- **What is left slower:** the first picture, the render that follows the mount of the
  ten panes (no frame has arrived yet): 1,067 against 1,019 ms in production (+48),
  1,428 against 1,344 ms in the dev build (+84). In production the Cornerstone3D module is
  evaluated 17 ms later (240 against 223 ms), the chain of the ten mounts starts 26 ms
  later and lasts as long (100 against 96 ms), and the first draw after it takes 39 against
  21 ms. In the dev build the start alone is 54 to 64 ms later (`__webpack_require__` of the
  link's modules 190 against 161 ms). And the first content of the sagittal and coronal
  panes (M97, M98). The panes of the branch mount in another order (the fusion panes after
  the MIP: `CornerstoneCacheService._getVolume` awaits `createAndCacheVolume` for a volume
  of the cache, `master` takes it without an await), which costs nothing: no pane draws
  before the chain of mounts ends.
- **State:** open, waits for cornerstone: the first picture (48 ms in production) and
  M97, M98. Every other number of the load is equal to or better than `master`'s.
- **Measured again in task O21 (link `bda7dafac`, lane FX24: the decode workers start when
  the page is idle, the first delivery into an empty pane draws at the next frame, rows
  340 to 342; installed Chrome on the GPU, ANGLE Metal Renderer: Apple M2 Ultra; lane O21
  `measure/`, `traces/`, `bench/`):** the orchestrator's benchmark on this link gave the
  first picture 1,446 ms against 1,337 ms in the dev build (+110), and lane O20 1,067
  against 1,019 ms in production. A timeline of five alternating loads per side, stage by
  stage (the init script marks `window.cornerstone`, `window.services`, the mode entry,
  the protocol run, each `enableViewport`, `setViewportData`, `VIEWPORT_DATA_CHANGED`, the
  first `IMAGE_RENDERED`; module evaluation through the module interceptor of the dev
  runtime; the DevTools traces with JS samples, read through the source maps):
  - the start (to `DOMContentLoaded`) was 51 ms later in the dev build and 13 ms in
    production: OHIF's bundle took a second copy of dcmjs and seven other libraries from
    the linked checkout (M101, OHIF, fixed); after the fix +19 ms in dev (the dev runtime,
    module evaluation +6.8 ms of which Cornerstone3D's modules +2.4 ms) and +2 ms in
    production, with the same JavaScript before the start (7.39 against 7.40 MB);
  - the dev server of the orchestrator's branch (port 3344) serves an export under `/tmp`,
    whose module ids are long relative paths (1.2 MB more of dev JavaScript before the
    first picture than from the checkout): about 40 ms of the 110 ms (the same loads from
    the checkout and from that export: 1,456 against 1,533 ms, `master` 1,372 against
    1,409 ms on its two servers), a property of that server, not of the code;
  - the Cornerstone3D init is 3 ms later in production (M100);
  - the ten mounts and the first draw are 25 to 33 ms later in both builds, and they are
    not the same work: at `master`'s first `IMAGE_RENDERED` only its three CT panes have
    a volume (`getActors()` of each pane at that event: 1, 1, 1 and seven 0), its PET,
    fusion and MIP panes mount 180 to 270 ms later in short tasks; at the branch's first
    picture all ten panes are mounted (the fusion panes with both volumes). Every pane
    mounted and drawn: 1,056 ms against 1,247 ms in production (191 ms sooner), 1,426
    against 1,680 ms in dev. In the mount Cornerstone3D's core takes 58.7 ms of main
    thread against 22.2 ms, 18.2 ms of it sampling the first slice of volumes that have
    no frame yet (M99); OHIF's own mount code is about 5 ms (its group start 3 to 4 ms,
    M102, fixed);
  - the study metadata, the hanging protocol, the React commits (16 or 17 before the
    first picture on both sides, the same render time) and the creation of the panes are
    equal within the noise of the CloudFront requests.
- **After task O21 (M101, M102; the orchestrator's script, six loads each, lane O21
  `bench/`):** production builds (`config/default.js`, static server): every volume
  loaded and every pane rendered at 1,531 ms against 1,658 ms (127 ms sooner), 61 frames
  drawn against 283, the first picture at 1,030 ms against 1,012 ms (18 ms later), long
  tasks 440 against 404 ms (the branch mounts its ten panes in one task; the main thread
  is busy 114 ms less than `master`'s to the end of the load, 1,091 against 1,205 ms, and
  49 ms more to the first picture, 689 against 640 ms). Dev servers (3335 from the
  checkout, 3336 `master` with the same two settings): 1,934 against 2,036 ms, 60 frames
  against 280, the first picture 1,397 against 1,358 ms (39 ms later), long tasks 762
  against 716 ms. The first render after the first frame arrived: 1,169 against 1,124
  ms in production (the first frame is in the cache 23 ms later, the branch draws it at
  the next frame).
- **State:** open, waits for cornerstone: the first picture is 18 ms later in production
  and 39 ms in dev, held by the mount of Cornerstone3D (M99) and its init (M100), and by
  `master` drawing before seven of its ten panes have a volume. Every other number of the
  load is equal to or better than `master`'s.

## M95. The resize keeps its replay of the framing (task O18)

- **What:** the "For OHIF" of lane FX19, and the brief of task O18, said to drop the replay
  of the framing in `performResize`, since Cornerstone3D keeps the camera through a resize
  and a replayed zoom sets the scale of the whole group.
- **Measured with the replay dropped (`cases/tmtvsync-after`, `pw-toggle-drop`):** a pane
  keeps its parallel scale through a resize of the window and a panel toggle, so a view
  that fit its pane no longer fits a pane of another size: `mpr2` `mprDisplayedCorrectly`
  differs from its baseline (`master`'s) by 182,572 pixels (39%), the images cropped at
  the sides of the narrower panes; the TMTV sagittal group keeps 164.05 after the resize
  where `master` refits to 195.27.
- **Measured with the replay kept (`cases/tmtvsync-before`, `cases/tmtvsync-after2`):**
  every group keeps one scale through the resize and the panel toggle (each pane writes
  back its zoom against its own fit, and the panes of a TMTV group have one size), the CT
  slice stays, and the scales are `master`'s within 0.3% (M86).
- **Decision:** the replay stays: `performResize` stores the framing of each pane (the
  zoom and the pan against the fit), resizes, writes the framings back and resizes and
  draws again; it writes no view reference (task O16). A group whose panes differ in size
  would end on the scale of the pane written back last; no such layout was met.
- **State:** decided in task O18; the owner may choose to drop the replay, at the cost of
  the refit of a view after a panel toggle or a resize.

## M96. The TMTV load from the `ohif` data source of `config/e2e.js` is paced at 5 frames per round trip and a preflight per frame, on `master` too

- **Seen (task O20, five loads each side, alternating, the installed Chrome on the GPU,
  `/tmtv/ohif?StudyInstanceUIDs=...7463`, lane O20 `measure/base`):** the requests of the
  270 frames run from 1.3 s to 6.0 s after the navigation on `master` and to 6.4 s on the
  branch, with 5 requests in flight the whole time (4.7 and 5.0 on average) and the main
  thread idle about 80% of the window (busy 1,026 and 1,046 ms of about 4,950 ms, CPU
  profiles `traces/prof-master.cpuprofile`, `prof-branch.cpuprofile`). Lane FX23 measured
  the same ten panes with OHIF's pool in a page without OHIF at about 0.5 s (its row 343
  says "about 4.4 s is OHIF's"): that page read the frames from a local static server,
  2 ms each.
- **Why:** the route `/tmtv/ohif` takes the frames from the CloudFront server
  (`d14fa38qiwhyfd.cloudfront.net`, HTTP/2, all cache hits, 23.4 MB on both sides). The
  DevTools trace of each frame (`traces/trace-*.trace.json`, `scratch/tracenet2.py`): 42 ms
  from the page's send to the start of the request in the network service, then 20 ms of
  network. The 42 ms are a CORS preflight: the `ohif` source of `config/e2e.js` sends
  `Accept: multipart/related; type="application/octet-stream"; transfer-syntax="*"`, whose
  `"` is not a CORS-safelisted byte, and a preflight is cached per URL, so every frame pays
  its own OPTIONS round trip. And `config/e2e.js` sets no `maxNumRequests`, so the pool
  keeps the fallback of `init.tsx`, 5 prefetch requests. 270 frames x about 90 ms / 5 =
  4.9 s. `config/default.js`, the deployed viewer, has both settings for the same server
  (`omitQuotationForMultipartRequest: true`, prefetch 25).
- **Measured with each setting (probe overrides, two or three loads each side):** prefetch
  25 alone, every volume at 2.50 s on both sides; the unquoted header alone, 2.90 s and
  2.93 s (20 ms per frame); both, 2.07 s on `master` and 2.02 s on the branch. The local
  source (`/tmtv/e2e`) is bound by the 3 decode workers: 1.96 s and 1.91 s with 5 or 25.
- **Fix, in OHIF (task O20):** `config/e2e.js` takes the deployed viewer's
  `maxNumRequests` (interaction 100, thumbnail 5, prefetch 25), and its `ohif` source
  `omitQuotationForMultipartRequest: true`, as `config/default.js` has. Test
  `platform/app/src/__tests__/remoteFrameRequests.test.js`: every remote DICOMweb source of
  `e2e.js` and `default.js` sends a CORS-safelisted `Accept` header, and `e2e.js` has the
  pool limits of `default.js`; it failed first (2 of 3) and passes. The Playwright
  fixtures load from the `ohif` source, so the whole suite loads its studies this way now.
- **After (five rounds of three, `measure/after1`):** every volume loaded and every pane
  rendered at 1,995 ms on the branch, 2,019 ms on `master` with the same two settings
  (`APP_CONFIG` copy in lane O20 `config/`), 5,985 ms on `master` as it is today. With the
  orchestrator's script (`bench/`): 2,025, 2,032 and 5,946 ms.
- **For a deployment (not changed here):** a DICOMweb server on another origin answers
  each frame twice when the `Accept` header is quoted; set
  `omitQuotationForMultipartRequest: true` when the server takes the unquoted form, and a
  prefetch limit above 5 over HTTP/2.
- **State:** fixed in task O20 (`7d7b04e53c`).

## M97. The decode workers start at the first frame the viewer decodes, not when it starts

- **Seen (task O20, production builds of both sides with `config/default.js`, five loads
  each, `measure/prod`):** the first frame of the TMTV study is in the cache 1,191 ms after
  the navigation on the branch, 1,111 ms on `master`, though its request starts only 16 ms
  later (988 against 972 ms): from the first request to the first `IMAGE_LOADED` 203 ms
  against 139 ms. The first three `decodeTask` calls of the worker manager take 110 ms each
  on the branch, 18 ms on `master`. On the branch the worker script, its codec chunk and the
  wasm are fetched at 1,067 ms, at the first decode; on `master` the three workers are made
  at 261 ms, when `dicomImageLoader.init` registers them.
- **Why:** Cornerstone3D 5.18.3 made every instance of a worker in `registerWorker`;
  6.0 makes an instance in `getNextWorkerAPI` when a task needs it ("registering several
  instances costs nothing until as many tasks run at once"). The start of three workers
  (about 90 ms) now lies on the first frames of the first load after the viewer starts
  (the workers stay up after it). It is likely the gap of
  Cornerstone3D's row 340 (the loader with no pane mounted takes 404 ms against 328 ms;
  `importScripts` in the workers).
- **The smallest case, Cornerstone3D only:** `init()`, `dicomImageLoader.init({
  maxWebWorkers: 3 })`, wait two seconds, then `imageLoader.loadAndCacheImage` of three
  `wadors:` frames at once and time `getWebWorkerManager().executeTask` of
  `dicomImageLoader` / `decodeTask`: about 110 ms each on 6.0, about 18 ms on 5.18.3.
- **Fix, in OHIF:** none (rule 3; a dummy task at the start would be a workaround).
- **State:** open, waits for cornerstone (lane FX24 works on row 340).
- **Fixed in Cornerstone3D `bda7dafac` (lane FX24):** the pool option `createInstances`;
  the DICOM image loader makes its workers `'whenIdle'`.
- **Checked in task O21 (five loads each side, production and dev, lane O21
  `measure/prod-final`, `dev-final`, traces of the worker threads):** the branch makes its
  three decode workers at 280 ms in production (614 ms in dev), when the page is idle
  after the start, and their scripts are evaluated in the worker threads by 380 ms, about
  700 ms before the first decode; `master` makes them at 228 ms. The worker handles the
  first task in about 6 ms on both sides. The first `decodeTask` still lasts 84 ms against
  28 ms seen from the main thread: its answer waits while the main thread runs the mount
  continuations and the first draw (M94, M99), not for the worker.
- **State:** fixed in cornerstone `bda7dafac`, checked in task O21.

## M98. A sagittal or coronal pane of TMTV shows its first rows on the next 100 ms tick

- **Seen (task O20, production builds, `measure/prod`):** the first draw with content of
  the sagittal and coronal panes (and of the fusion ones) comes at 1,327 ms on the branch,
  1,113 ms on `master` (medians of five loads); the axial panes 1,241 against 1,254 ms (the
  branch earlier), the MIP 1,228 against 1,113 ms.
- **Why:** of the 214 ms, about 80 ms are M97 (the first frame arrives later). The rest is
  the loading tick of Cornerstone3D `8333d7dba` (lane FX23, `PLANAR_LOADING_UPDATE_MS` =
  100): a pane draws what has arrived at the next tick, and the frames that waited for the
  workers arrive about 60 at once in the first 100 ms (`master`: about 17), which keeps
  the main thread busy over the first tick.
- **Proposal for Cornerstone3D:** draw the first delivery into a pane that shows nothing
  yet at once, and the next ones on the tick.
- **Fix, in OHIF:** none (rule 3).
- **State:** open, waits for cornerstone (small: a fifth of a second on the first rows).
- **Fixed in Cornerstone3D `bda7dafac` (lane FX24):** the first delivery into a pane that
  shows nothing draws at the next animation frame, the next ones on the tick.
- **Checked in task O21 (five loads each side, lane O21 `measure/prod-final`,
  `dev-final`):** every pane, the sagittal and coronal ones as the axial ones and the MIP,
  draws 26 ms after the first frame is in the cache in production (36 ms in dev); no pane
  waits for the 100 ms tick. `master` draws 3 ms after it (6 ms in dev): the branch waits
  for the next animation frame, which lane FX24 kept on purpose (an update in a microtask
  read a frame before its image replaced the copy).
- **State:** fixed in cornerstone `bda7dafac`, checked in task O21.

## M99. A planar pane of a volume samples its first slice at the mount, before any frame of the volume has arrived

- **Seen (task O21, production builds, the DevTools trace with JS samples of one load
  each side read through the source maps, lane O21 `scratch/attrib.mjs`, from the first
  `enableViewport` to the first `IMAGE_RENDERED`):** the main thread runs 58.7 ms of
  Cornerstone3D core against 22.2 ms on `master`; `utilities/sampleVolumeGrid.js` alone
  takes 18.2 ms, then `Planar/PlanarViewport.js` 5.0 ms and `helpers/getOrCreateCanvas.js`
  2.6 ms. The stack (dev profile): `addLoadedData` → `applyViewState` → `syncRenderCamera`
  → `updateSlice` → `sample` → `gatherVolumeSlice` → `sampleStraightCutGrid` →
  `sampleStraightCut`, once per planar pane. The first frame of the study arrives about
  90 ms later: every value that the mount gathers is a zero.
- **Why:** the CPU slice path gathers the slice of a pane from the frames of its volume at
  the mount, whether a frame has arrived or not. 5.18.3 makes the actor of a volume
  without reading its voxels.
- **The smallest case, Cornerstone3D only:** a streaming volume of the TMTV CT (512 x 512
  x 135) and one of its PET (128 x 128 x 135), not loaded; nine planar viewports on the
  CPU slice path (axial, sagittal and coronal of the CT, of the PET, and of the CT with
  the PET as an overlay); `setDisplaySets` on each and a profile of the mounts: the time
  under `sampleVolumeGrid` is about 2 ms per pane in a production build.
- **Proposal for Cornerstone3D:** skip the rows of frames that have not arrived at the
  mount (they are gathered when they arrive, `invalidateFrames`, lane FX24), so that a
  pane of a volume with no frame mounts without reading it.
- **Fix, in OHIF:** none (rule 3).
- **State:** open, waits for cornerstone.

## M100. `init()` of Cornerstone3D takes about 3 ms longer: the probe of the rendering capabilities

- **Seen (task O21, production builds, five loads each side and one profiled load):** the
  stage from the evaluation of the cornerstone extension to `window.services` (its
  `init`: `cornerstone.init`, `cornerstoneTools.init`, the DICOM image loader) is 42
  against 38 ms (+3 to +4 ms; +7 to +9 ms in dev); in it
  `utilities/renderingCapabilities.js` takes 4.0 ms against 1.0 ms on 5.18.3, and
  `utilities/textureSupport.js` 8.8 against 8.2 ms.
- **The smallest case, Cornerstone3D only:** time `init()` in OHIF's bundle on 6.0 and
  5.18.3 (lane FX24 `probe/bootTools.mjs`): 20 to 21 ms against 15 to 18 ms.
- **Proposal for Cornerstone3D:** run the probe at the first use of what it decides, or
  share the WebGL context of the texture support probe.
- **Fix, in OHIF:** none (rule 3).
- **State:** open, waits for cornerstone (small).

## M101. The viewer ships a second copy of dcmjs and seven other libraries with a linked Cornerstone3D

- **Seen (task O21, lane O21 `scratch/mapsize.mjs`, `modgroups.py`):** with
  `node_modules/@cornerstonejs/*` linked to a checkout of Cornerstone3D (`cs3d:link`, the
  setup of this branch), the bundle takes the dependencies of the linked packages from the
  checkout's own `node_modules`: dcmjs, dicom-parser, gl-matrix, comlink, d3-array,
  d3-interpolate, lodash.get and @kitware/vtk.js come twice, at the same versions. In
  production 1.03 MB more JavaScript is loaded before the first picture (11.97 against
  10.94 MB: dcmjs 704 kB, vtk.js 145 kB, dicom-parser 30 kB, gl-matrix 27 kB, ...;
  Cornerstone3D's core itself is 27 kB smaller than 5.18.3's), and the initial scripts are
  8.18 against 7.40 MB. In the dev build the modules evaluated before
  `DOMContentLoaded` take 51 ms more (three loads each side, the module interceptor of the
  dev runtime): dcmjs runs twice (18.5 and 16.6 ms against 22.8 ms).
- **Why:** `.rspack/resolveConfig.js` forces one copy (`dedupeAlias`) of React, of
  `@cornerstonejs/core` and `tools` and a few others for a linked build, but not of the
  libraries that OHIF and Cornerstone3D both import. An installed Cornerstone3D gets
  OHIF's copy from the hoisted `node_modules`.
- **Fix, in OHIF (task O21):** `dedupeAlias` has those eight (vtk.js as a prefix: it is
  imported by subpath only). Test `platform/app/src/__tests__/linkedCornerstoneSharedLibraries.test.js`:
  each library resolves to one file from OHIF's code and from the Cornerstone3D package
  that imports it, with OHIF's resolve settings; it failed first (8 of 8,
  `lanes/O21/failfirst-linkedSharedLibraries.log`) and passes.
- **After:** the production build has one dcmjs (dist 129.8 MB against 130.7 MB); the
  initial scripts 7.39 against 7.40 MB on `master`, 11.03 against 10.94 MB before the
  first picture; the stage to `DOMContentLoaded` +2 ms in production (was +13), +19 ms in
  dev (was +51; module evaluation +6.8 ms, was +51.1).
- **State:** fixed in task O21 (not committed yet).

## M102. The panes of a camera position group computed the slice grid of every member at each mount

- **Seen (task O21):** `getCameraPositionGroupInitialStart` asks
  `utilities.getVolumeSliceGrid` for the grid of every volume of every member of the
  groups of a pane, at the mount of each pane: 16 grids for the three panes of a TMTV
  sagittal group where 2 differ, about 50 for the ten panes where 6 differ. OHIF's group
  start (`_getCameraPositionGroupStart`) took 3 to 4 ms per load in production, about
  7 ms of a profiled dev load, half of it in the grids.
- **Fix, in OHIF (task O21):** the grid of a volume of the cache is computed once per
  orientation and `rendering.sliceStepMeasure` (the grid reads it), kept on the volume
  object, so a volume made again (M74) gets its own. Tests in `cameraPositionGroups.test.ts`:
  the grids of a group are computed once per volume and orientation whichever pane asks,
  and again for a volume made again and for another slice step measure; both failed first
  (16 and 32 calls, `lanes/O21/failfirst-sliceGridMemo.log`).
- **After:** the group start takes 1 to 3 ms per load in production.
- **State:** fixed in task O21 (not committed yet).
