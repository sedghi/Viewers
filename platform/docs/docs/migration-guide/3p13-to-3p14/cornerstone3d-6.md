---
sidebar_position: 17
sidebar_label: Cornerstone3D 6
title: Cornerstone3D 6
---

# Cornerstone3D 6

The viewer moves from `@cornerstonejs` 5 to 6. Cornerstone3D 6 keeps one kind
of viewport: the planar, 3D, video, whole slide and ECG viewports that OHIF 3.13
drew with `?useNextViewports=true`. The legacy viewport classes and their API
are gone, and so is the setting that picked between the two kinds. The viewer
has one viewport path now.

## Settings that are gone

| Setting | Where | What to do |
|---|---|---|
| `useGenericViewport` | app config | Delete it. |
| `genericViewports.enabled` | app config | Delete it. |
| `genericViewports.viewportRendering` | app config | Move it to the top level: `viewportRendering`. |
| `useNextViewports` | URL parameter | Drop it from links and bookmarks. |

The viewer does not read these settings any more. Every viewport is a
Cornerstone3D 6 viewport, with or without them.

The render backend setting is `viewportRendering` now, at the top level of the
app config, with the URL parameters `viewportRendering` and
`<viewportType>.viewportRendering` as before. Before:

```js
window.config = {
  genericViewports: { viewportRendering: { default: 'webgl', orthographic: 'cpu' } },
};
```

After:

```js
window.config = {
  viewportRendering: { default: 'webgl', orthographic: 'cpu' },
};
```

See `viewportRendering` in
[Configuration Options](../../configuration/configurationFiles.md#configuration-options).

The words of hanging protocols, modes and `viewportOptions` stay as they are:
`viewportType: 'stack' | 'volume' | 'orthographic' | 'volume3d'` and the
others. In Cornerstone3D 6 a stack and a volume slice are both a `planar`
viewport. The viewer maps each word to its viewport type and keeps the shape
of the data (a stack or a volume) itself.

## Extensions and modes that call a viewport

1. Update the Cornerstone3D calls with the Cornerstone3D 6 migration guide:
   [The upgrade, step by step](https://www.cornerstonejs.org/docs/migration-guides/6x/upgrade-step-by-step)
   and
   [Every legacy call and what replaces it](https://www.cornerstonejs.org/docs/migration-guides/6x/api-map).
   Its codemod, `@cornerstonejs/cornerstone3d-6`, does the mechanical part and
   lists the sites that it leaves to you:

   ```sh
   npx codemod @cornerstonejs/cornerstone3d-6 --dry-run
   npx codemod @cornerstonejs/cornerstone3d-6
   ```

2. Call the viewport of Cornerstone3D. The viewer has no adapter between
   itself and a viewport any more: the view state, the appearance of each
   display set (window, colormap, opacity), the view reference with its view
   plane normal and focal point, the volume ids and what the viewport shows
   are members of the viewport. See
   [The viewport adapter is gone](#the-viewport-adapter-is-gone) for each
   method of the adapter and the call that replaces it, and
   [The appearance of a display set](#the-appearance-of-a-display-set).
3. Do not read `viewport.type` to tell a stack from a volume: both are
   `planar`. Ask `viewport.getCurrentMode()` (`'stack'`, `'volume'`,
   `'volume3d'`, `'geometry3d'`, `'video'`, `'wholeSlide'`, `'ecg'` or
   `'empty'`).
4. `Types.IViewport` of Cornerstone3D 6 has fewer members than in 5. Type a
   viewport with its class (`PlanarViewport`, `VolumeViewport3D`,
   `VideoViewport`, `WSIViewport`, `ECGViewport`) where you call a member of that
   class, and narrow it by its `type`, for example
   `viewport.type === Enums.ViewportType.PLANAR`. Each class has its own
   literal `type`, so a test of the type narrows a union of the classes.
5. A viewport names each display set that it shows by its
   `displaySetInstanceUID` (`viewport.getDisplaySets()`,
   `getSourceDisplaySetId()`, the `displaySetId` of a view reference and of the
   metadata of an annotation), also when one series shows as a stack in one
   viewport and as a volume in another. `DisplaySetService` registers each
   display set once, when it is made, with `displaySetRegistry.add` of
   `@cornerstonejs/metadata`, and the viewports read that object: do not
   register a display set again, and do not add another object under its UID,
   which would replace the display set itself. A mount says what the viewport
   wants of it: `setDisplaySets({ displaySetId: displaySetInstanceUID, options:
   { mode: 'volume', orientation, volumeId } })`. See
   [Display set storage](./display-set-store.md#viewports-read-the-stored-display-set).
   Whether a viewport shows a display set: `viewport.getDisplaySets()` lists
   the UIDs. An SR, SEG or RTSTRUCT viewport shows the images that they
   reference and not their own UID; the viewer then reads the source of the
   viewport (an appearance call without a UID).

## The appearance of a display set

The look of each display set of a viewport (window, invert, colormap, opacity,
blend mode, the preset of a 3D viewport) is its appearance. Cornerstone3D 6
keeps two readings of it: what a caller set, the overrides, and what is drawn,
the overrides over the defaults of the data (the window of the image on
display, the invert of a MONOCHROME1 image, opacity 1).

| 3.13 | 3.14 |
|---|---|
| `getViewportAdapter(viewport).getPresentation(displaySetId?)` | `viewport.getDisplaySetAppearance(displaySetId?)`: the overrides. Store or copy this. |
| (the presentation with `getDefaultVOIRange` as a fallback) | `viewport.getEffectiveDisplaySetAppearance(displaySetId?)`: what is drawn. Show or compare this. |
| `setPresentation(props, displaySetId?)` | `viewport.setDisplaySetAppearance(displaySetId, props)`; `viewport.setDisplaySetAppearance(props)` for the source |
| `getDefaultVOIRange(displaySetId?)`, `getColormap(displaySetInstanceUID)` | Removed: `viewport.getEffectiveDisplaySetAppearance(displaySetId).voiRange`, `.colormap` |
| `setLayerOpacity(displaySetInstanceUID, opacity)` | Removed: `viewport.setDisplaySetAppearance(displaySetInstanceUID, { opacity })` |
| `setLayerThreshold(displaySetInstanceUID, threshold)` | Removed: `viewport.setDisplaySetAppearance(displaySetInstanceUID, { colormap: { threshold } })`. The colormap keeps its name and its `opacityMapping`. |
| `getOpacityGamma()` | Removed. The opacity slider sets the opacity that is drawn. |
| `isComputedVOI` of a presentation | Removed. The overrides hold only what a caller set, so nothing guesses whether a window came from the user by comparing numbers. |
| The types `ViewportPresentation`, `ViewportColormap` (with `opacity`) | `PlanarDisplaySetAppearance`, `Volume3DDisplaySetAppearance` and `Types.AppearanceColormap` (with `opacityMapping`) of `@cornerstonejs/core`; the stored appearance of a display set is `Types.DisplaySetAppearanceOverrides` of `@ohif/extension-cornerstone` |
| `useViewportRendering(...).opacityLinear`, `.setOpacityLinear` | Removed: `.opacity`, `.setOpacity`. |

A viewport fires `Enums.Events.DISPLAY_SET_APPEARANCE_CHANGED` where it fired
`VOI_MODIFIED` and `COLORMAP_MODIFIED`, once for each change of the appearance
of one display set. Its detail names the display set (`displaySetId`, `role`,
`volumeId`), says why it changed (`cause`: `'mount'`, `'edit'`, `'reset'` or
`'default'`, the last for a scroll to an image with another default window)
and which keys changed (`changedKeys`), and holds the `overrides` and the
`effective` appearance. A readout shows `detail.effective` for every cause and
tests that the event is about the display set it shows; code that stores or
copies what the user set reads `detail.overrides` and acts on `'edit'` and
`'reset'` only, or it stores the defaults of the data as settings. Before:

```js
element.addEventListener(Enums.Events.VOI_MODIFIED, evt => {
  showWindow(evt.detail.range);
});
```

After:

```js
element.addEventListener(Enums.Events.DISPLAY_SET_APPEARANCE_CHANGED, evt => {
  const { displaySetId, changedKeys, effective } = evt.detail;
  if (displaySetId === shownDisplaySetId && changedKeys.includes('voiRange')) {
    showWindow(effective.voiRange);
  }
});
```

The stored LUT presentation (`useLutPresentationStore`) holds
`{ viewportType, appearances }`: the overrides of each display set of the
viewport, by its `displaySetInstanceUID`, where 3.13 held the presentation of
the source in `properties`. A viewport that comes back takes the stored
appearance of each display set, the PET of a fusion too, and the display set
options of the hanging protocol for a display set without one. A window that
the user did not set is not stored, so the viewport shows the window of its
data again.

### The opacity of a colormap in a hanging protocol

`colormap.opacity` is gone. A display set has one opacity, the `opacity` of
its display set options (0 to 1), and its colormap has `opacityMapping`, the
opacities by value of the data (an SUV for a PET), and `threshold`. The alpha
of a pixel is `opacity * opacityMapping(value)`, and 0 below the threshold.

| 3.13 | 3.14 |
|---|---|
| `colormap: { name, opacity: [{ value, opacity }, ...] }` | `colormap: { name, opacityMapping: [{ value, opacity }, ...] }` |
| `colormap: { name, opacity: 0.5 }` | `colormap: { name }, opacity: 0.5` |

Before:

```js
displaySets: [
  {
    id: 'ptDisplaySet',
    options: {
      colormap: {
        name: 'hsv',
        opacity: [
          { value: 0, opacity: 0 },
          { value: 0.1, opacity: 0.8 },
        ],
      },
    },
  },
],
```

After:

```js
displaySets: [
  {
    id: 'ptDisplaySet',
    options: {
      colormap: {
        name: 'hsv',
        opacityMapping: [
          { value: 0, opacity: 0 },
          { value: 0.1, opacity: 0.8 },
        ],
      },
    },
  },
],
```

A protocol that still gives `colormap.opacity` gets an error in the console of
a development build, and the key is left out: the viewer does not guess
whether a number meant the opacity of the display set or a list meant the
mapping.

Cornerstone3D 6 draws an opacity as it is given. The legacy volume viewport of
3.13 drew an opacity `a` of a fusion weaker, as `1 - (1 - a) ** 0.125` for the
volumes of a PET/CT study. The TMTV mode gives its PET these weaker points
(`FUSION_PT_OPACITY_MAPPING` in `extensions/tmtv/src/utils/hpViewports.ts`),
so its fusion looks as in 3.13. A protocol of your own with a PET ramp over a
CT draws its PET stronger than in 3.13 unless it takes the weaker points the
same way. A threshold keeps the mapping above it: in 3.13 the opacity rose
from 0 at the threshold to the next point of the mapping, and a threshold
above the last point hid the whole PET.

## The position presentation

The stored position presentation (`usePositionPresentationStore`) holds the
view reference and `viewFraming`, what `viewport.getViewFraming()` gives: the
zoom, pan, rotation, flips and display area against the fit, with how the view
fits (`scaleMode`, `fitScale`) for a planar viewport, and the camera for a 3D
viewport. It replaces `viewPresentation`. A viewport that comes back, also in
a pane of another size after a layout change, shows the slice of the view
reference and then `viewport.setViewFraming(viewFraming)`: a view that fit the
width of its pane fits the width of the new pane, a zoomed and panned view
keeps its zoom and pan against the fit, and a 3D viewport keeps its direction,
zoom and pan. The stores are kept in memory only; nothing stored by 3.13 is
read. Code that writes a position presentation, as the SEG, RTSTRUCT and SR
viewports do, gives `viewReference` and, if it wants a framing,
`viewFraming`; drop `viewPresentation`.

## The events of a viewport

| 3.13 | 3.14 |
|---|---|
| `cornerstoneViewportService.EVENTS.VIEWPORT_VOLUMES_CHANGED` | Removed. Listen to `Enums.Events.DISPLAY_SETS_CHANGED` of `@cornerstonejs/core`, with `detail.viewportId`. |
| `Enums.Events.VIEWPORT_NEW_IMAGE_SET`, `VOLUME_VIEWPORT_NEW_VOLUME` | `Enums.Events.DISPLAY_SETS_CHANGED` (the codemod renames them). |
| `detail.imageIdIndex` of `NEW_IMAGE` | `detail.sliceIndex`, with `detail.displaySetId` |
| `STACK_VIEWPORT_SCROLL` | Removed: `CAMERA_MODIFIED` when an index is asked for, `NEW_IMAGE` when it shows, `SCROLL_OUT_OF_BOUNDS` when a scroll stops at an end. |

A viewport of every kind fires `DISPLAY_SETS_CHANGED` on its element once for
each `setDisplaySets`, `addDisplaySet` and `removeDisplaySet` that completes. The
detail has `viewportId`, `displaySets` (each `{ displaySetId, role }`),
`sourceDisplaySetId`, `added`, `removed` and `sourceChanged`. An event of
Cornerstone3D does not bubble: listen on the element of the viewport, or on
`document` in the capture phase to hear every viewport. Before:

```js
const { unsubscribe } = cornerstoneViewportService.subscribe(
  cornerstoneViewportService.EVENTS.VIEWPORT_VOLUMES_CHANGED,
  ({ viewportInfo }) => {
    if (viewportInfo.viewportId === viewportId) {
      updateRows();
    }
  }
);
```

After:

```js
const onDisplaySetsChanged = evt => {
  if (evt.detail.viewportId === viewportId) {
    updateRows();
  }
};

document.addEventListener(Enums.Events.DISPLAY_SETS_CHANGED, onDisplaySetsChanged, true);
```

The event fires when an overlay comes or goes too, as a labelmap that a
segmentation shows, with `detail.sourceChanged` false. A listener that cares for
the series of the viewport (a cine, a tracking state, a prefetch) returns early
then, or it starts again each time a segmentation is shown:

```js
element.addEventListener(Enums.Events.DISPLAY_SETS_CHANGED, evt => {
  if (!evt.detail.sourceChanged) {
    return;
  }

  restartCine();
});
```

A stack with a labelmap fires it twice for each image that it shows (the
labelmap of the image is mounted again). A listener for every layer compares
what it shows before it does costly work: the window level panel recomputes
its histograms only when the source changed or `viewport.getVolumeIds()`
differs from its rows.

The `listeners` of a toolbar button run on the events of the viewport grid
only (`ACTIVE_VIEWPORT_ID_CHANGED` and `VIEWPORTS_READY`). An entry keyed by a
Cornerstone3D event never ran: the Image Slice Sync button of 3.13 had one
(`[EVENTS.VIEWPORT_NEW_IMAGE_SET]` with a command that did not exist), and it is
gone. A button of your own that copied it drops the entry.

## What the viewport answers

The window level panel, the range of the threshold menu and the capture of the
download dialog ask the viewport, where 3.13 read the cache, the actors or a
volume id built from the UID:

| 3.13 | 3.14 |
|---|---|
| `getViewportAdapter(viewport).getDataIdForVolumeId(volumeId)` | Removed: `viewport.getDisplaySetIdForVolumeId(volumeId)` of a planar or 3D viewport |
| `getViewportAdapter(viewport).getVoxelManagerForDisplaySet(uid).getRange()` | Removed: `viewport.getScalarRange(uid)` |
| `getViewportAdapter(viewport).copyDisplayedContentTo(target)` | Removed: mount `viewport.getDisplaySets()` on the target, each with `appearance: viewport.getDisplaySetAppearance(displaySetId)`, then `target.setViewReference(viewport.getViewReference())` and `target.setViewFraming(viewport.getViewFraming())` |

`viewport.getVolumeIds()` gives the volumes of a viewport, the source first,
without the labelmap of a segmentation: the window level panel has one row for
each, so a hydrated SEG adds no row, a PET/CT fusion has two and a stack none.
Each row shows the window, colormap and opacity that its display set is drawn
with, and its histogram spans `getScalarRange` of the display set (of the time
point on display for a dynamic volume).

The capture mounts every display set of the viewport that is not the labelmap
of a segmentation, so a fusion keeps its PET, and adds the segmentations of
the viewport once through their representations. Its framing is relative to
the fit, so a capture of another size shows the same part of the image.

## Removed and renamed exports of `@ohif/extension-cornerstone`

| 3.13 | 3.14 |
|---|---|
| `isNextViewportsEnabled()` | Removed. There is one path: keep the code of its `true` branch. |
| `isNextViewport(viewport)` | Removed. Every viewport is a Cornerstone3D 6 viewport. |
| `NEXT_FUSION_PT_OPACITY` | Removed. The PET of the TMTV fusion has its opacity ramp by SUV again (`colormap.opacityMapping`), with the look of 3.13 without `?useNextViewports`, and the opacity slider scales the ramp. |
| `NEXT_OVERLAY_OPACITY` | `OVERLAY_OPACITY` |
| `getViewportAdapter(viewport)` | Removed. Call the viewport: see [The viewport adapter is gone](#the-viewport-adapter-is-gone). |
| `isVolumeRenderingViewport(viewport)` | Removed: `viewport.getCurrentMode() === 'volume'`, a planar viewport that shows a volume (an MPR pane, a fusion), the viewports that take the threshold and the opacity of a layer. Public in 3.13, nothing in 3.14. |
| `getViewportFocalPoint(viewport)` | Removed: `viewport.getViewReference()?.cameraFocalPoint`, the centre of the slice on display. Public in 3.13, nothing in 3.14. |

The adapter, the backends and the interfaces in front of them are gone. The
extension did not export them. A fork that imports them from the sources of
the extension (`extensions/cornerstone/src/`) changes its imports:

| 3.13 | 3.14 |
|---|---|
| `NextViewportAdapter`, `IViewportAdapter`, `getViewportAdapter`, in `services/ViewportService/adapter/` | Removed: the members of the viewport (see [The viewport adapter is gone](#the-viewport-adapter-is-gone)) |
| The types `ViewportAppearance`, `ViewportColormap`, `ViewportViewState`, `ViewportShape` of the adapter | `Types.DisplaySetAppearanceOverrides` of the extension; `Types.AppearanceColormap` and the view state type of each viewport class (`PlanarViewState`, `Volume3DCamera`, ...) of `@cornerstonejs/core`; `ViewportShape` stays in `utils/viewportDataShape.ts`, for the data of a hanging protocol before the mount |
| `NextViewportBackend` and `IViewportBackend`, in `services/ViewportService/backends/` | The mount of each family is `CornerstoneViewportService._setDisplaySets`; the mount options of a stack and of volumes are `mountStack` and `mountVolumes` of `services/ViewportService/viewportMounts.ts`; the presentations are `getPositionPresentation`, `setPositionPresentation`, `getLutPresentation` and `setLutPresentation` of `services/ViewportService/viewportPresentations.ts` |
| `IViewportServiceInternals` | Removed: `CornerstoneViewportService` implements `IViewportService` of `@ohif/core` only |
| `nextViewportOperations` and `IViewportOperations`, in `services/ViewportService/backends/` | `viewportOperations`, in `services/ViewportService/viewportOperations.ts`; its `getViewPlaneNormal(viewport)` is `viewport.getViewReference()?.viewPlaneNormal` |
| `NextSegmentationBackend` and `ISegmentationBackend`, in `services/SegmentationService/backends/` | The functions `classifyAndPrepareLabelmapAdd` and `assembleSegmentationDataForSEG`, in `services/SegmentationService/`; its `jumpToSegmentCenter(viewport, world)` is `viewport.setViewReference({ cameraFocalPoint: world })` |
| `LegacyViewportAdapter`, `LEGACY_OPACITY_GAMMA`, `LegacyViewportBackend`, `legacyViewportOperations`, `LegacySegmentationBackend` | Removed |
| `utils/nextViewports.ts` | `utils/viewportRendering.ts` (the render backend), without the switch |
| `utils/nextViewportPolicies.ts` | `utils/viewportPolicies.ts` |

A renderer on a server is not a second implementation of these classes. It
is a render backend (`registerRenderBackend`) or a viewport type
(`registerViewportType`) of Cornerstone3D, which the viewer mounts as any
other, or an extension of its own that implements `IViewportService` of
`@ohif/core`.

## The viewport adapter is gone

`getViewportAdapter(viewport)` gave an adapter over the viewport, with one
member for each question the viewer asked. Each question is a member of the
viewport of Cornerstone3D 6 now; call the viewport. A planar and a 3D viewport
have `getVolumeIds`, `getDisplaySetIdForVolumeId` and `getScalarRange`; a
planar viewport has `isInAcquisitionPlane`.

| Adapter member (3.13) | 3.14 |
|---|---|
| `getShape()` | `viewport.getCurrentMode()` for what the viewport shows (`'stack'`, `'volume'`, `'volume3d'`, `'geometry3d'`, ...); `viewport.type === Enums.ViewportType.VOLUME_3D` for a 3D viewport, also an empty one |
| `isVolumeRendering()` | `viewport.getCurrentMode() === 'volume'` |
| `canReorientInPlace()` | `viewport.getCurrentMode()` is `'volume'` or `'volume3d'` |
| `isInAcquisitionPlane()` | `viewport.isInAcquisitionPlane()` of a planar viewport: true for a stack, and for a volume whose view plane normal is the scan axis of its source |
| `hasContent()` | `viewport.getCurrentMode()` is not `'empty'` (nor `'unknown'`) |
| `getViewState()`, `setViewState(patch)` | `viewport.getViewState()`, `viewport.setViewState(patch)`; the keys are those of the view state of its class (`PlanarViewState`, `Volume3DCamera`, ...) |
| `getViewPlaneNormal()` | `viewport.getViewReference()?.viewPlaneNormal` |
| `getFocalPoint()` | `viewport.getViewReference()?.cameraFocalPoint` |
| `getAppearance(displaySetId?)` | `viewport.getDisplaySetAppearance(displaySetId?) ?? {}` |
| `getEffectiveAppearance(displaySetId?)` | `viewport.getEffectiveDisplaySetAppearance(displaySetId?) ?? {}` |
| `setAppearance(props, displaySetId?)` | `viewport.setDisplaySetAppearance(displaySetId, props)`, or `viewport.setDisplaySetAppearance(props)` for the source |
| `getBlendMode(displaySetId?)` | `viewport.getDisplaySetAppearance(displaySetId?)?.blendMode` of a planar or 3D viewport |
| `getShownDisplaySetId(displaySetInstanceUID)` | The viewer's own rule: the UID when `viewport.getDisplaySets()` lists it or is empty, else undefined (the source answers for an SR, SEG or RTSTRUCT viewport) |
| `getVolumeIds()` | `viewport.getVolumeIds()` of a planar or 3D viewport: the volumes, the source first, without the labelmap of a segmentation; `getVolumeIds({ includeSegmentations: true })` lists the labelmaps too |

## Runtime plugins must be rebuilt against Cornerstone3D 6

The viewer shares its own copies of `@cornerstonejs/core` and
`@cornerstonejs/tools` with runtime plugins, and they are on major version 6
now. A runtime plugin that was built against Cornerstone3D 5 gets the viewer's
copy of 6 when it loads, and a call of an API that 6 removed fails at run time.

If your plugin imports `@cornerstonejs/core` or `@cornerstonejs/tools`:

1. Set its peer ranges to `^6.0.0`, and its dev copies to a 6.x release.
   `create-ohif migrate` does the first and flags the second.
2. Update its code with the
   [Cornerstone3D 6 migration guide](https://www.cornerstonejs.org/docs/migration-guides/6x/)
   and its codemod, as in [Extensions and modes that call a viewport](#extensions-and-modes-that-call-a-viewport).
3. Build it again and deploy the new bundle.

The other `@cornerstonejs` packages (`adapters`, the image loader and the rest)
are released together with the core. A plugin that bundles one of them moves it
to 6 too.

The versions of all shared packages are listed under
[Shared host packages](../../configuration/configurationFiles.md#shared-host-packages).
