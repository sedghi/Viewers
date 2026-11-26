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
has one viewport path, and it calls the viewports of Cornerstone3D directly.

What you change depends on what you maintain:

- **A deployment** (an app config, links into the viewer): the settings in
  [For a deployment](#for-a-deployment).
- **A mode or a hanging protocol**: the opacity of a colormap and the display
  area, in [For a mode or a hanging protocol](#for-a-mode-or-a-hanging-protocol).
- **An extension, or code that calls a viewport**: everything in
  [For an extension author](#for-an-extension-author), and the Cornerstone3D 6
  migration guide for the calls of Cornerstone3D itself.

## For a deployment

### Settings that are gone

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

### What a user sees

The viewer looks and behaves as in 3.13 without `?useNextViewports`, except
for these changes. They come from Cornerstone3D 6 and are named in its migration
guide.

- An ECG shows three rows of four leads and a rhythm strip (a record of eight
  leads or more and five seconds or more), where 3.13 showed twelve rows of one
  lead.
- A whole slide shows no window text (3.13 showed `W: 256 L: 128` for a slide).
- A segmentation drawn as a labelmap fills with the alpha that its
  configuration gives; an MPR pane with a labelmap is a little more opaque
  than in 3.13.
- A user zoom or pan of a pane with a display area (the mammography protocol)
  replaces the display area; Reset shows it again. 3.13 kept the display area
  under the zoom.
- A panned 3D view that moves to a pane of another size (a layout change)
  keeps the point at the centre of the pane; 3.13 kept the pan in pixels.
- The statistics of a segment over a series whose values pass 255 while its
  first image fits in 8 bits (an MR of 12 bits) are right: 3.13 read the values
  of such a volume modulo 256, and showed a window level range of 0 to 255.
- A threshold on the PET of a fusion keeps the ramp above the threshold, where
  3.13 hid the whole PET for a threshold above the last point of the ramp (see
  [The opacity of a colormap](#the-opacity-of-a-colormap-in-a-hanging-protocol)).
- Reset of a pane resets the invert too, and an MPR pane keeps its rotation
  through a layout change and back.
- A pane of a volume opens on the middle slice counted along its view,
  `floor(N / 2)`. With an even number of slices and a view whose normal points
  against the volume axis (the coronal view of an axial CT), that is one slice
  further than 3.13 showed where the protocol names no initial slice, as in the
  coronal panes of TMTV (257/512 where 3.13 showed 256/512); the `'middle'`
  preset of a protocol, as in the MPR layout, gives the same slice as in 3.13.
- Reset takes a pane of a volume back to that middle slice (3.13 went to the
  middle counted along the volume, one slice before it for such a view); with
  the crosshairs on, every pane of their group goes to its middle slice and the
  crosshairs to where those slices meet, as in 3.13.
- An oblique view steps by the thickness of one voxel along the view, on a
  grid centred on the volume, so it has fewer slices than in 3.13: the axial
  view of an MR acquired sagittally and turned 12.5 degrees in its plane has 256
  slices of 1.19 mm where 3.13 had 305, and its middle slice lies half a step
  from the centre. A view along a volume axis keeps its slices. A series tilted
  by less than half a slice shows its acquired images for its standard
  orientation; a larger tilt is shown on the true axes, as in 3.13.
- The panes of one camera position sync group (the axial, the sagittal and the
  coronal panes of TMTV) open on the slice of the CT, whatever the order in
  which their volumes load; a PET pane shows its slice nearest to it, as in
  3.13.
- A 3D point of an SR (`SCOORD3D`) shows on no image of a stack, as in 3.13; a
  jump to it from the measurement panel shows it in a volume.

Against 3.13 with `?useNextViewports`, one more change: a pane in which an
RTSTRUCT is hydrated keeps its viewport type and its orientation, as it does in
3.13 without the parameter. With the parameter, 3.13 made that pane a stack of the
referenced series, so the sagittal or the coronal pane of an MPR showed axial
images.

## For a mode or a hanging protocol

The words of hanging protocols, modes and `viewportOptions` stay as they are:
`viewportType: 'stack' | 'volume' | 'orthographic' | 'volume3d'` and the
others. In Cornerstone3D 6 a stack and a volume slice are both a `planar`
viewport. The viewer maps each word to its viewport type and mounts each
display set by its `displaySetInstanceUID`, with `mode: 'stack'` for a stack
viewport and `mode: 'volume'` for a volume, MPR or fusion pane; the display
set options (`voi`, `voiInverted`, `colormap`, `opacity`, `blendMode`,
`slabThickness`, `displayPreset`) draw the first picture. The keys that changed are the opacity
of a colormap and what a display area does after a zoom.

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
volumes of a PET/CT study. The TMTV mode keeps the look of 3.13 and splits it in
two: its ramp keeps the shape of the ramp of 3.13 with its highest point at 1
(`FUSION_PT_OPACITY_MAPPING` in `extensions/tmtv/src/utils/hpViewports.ts`), and
the `opacity` of the PET carries the level, 0.2501 (`FUSION_PT_OPACITY`), the
strongest alpha that 3.13 drew. A protocol of your own with a PET ramp over a CT
draws its PET stronger than in 3.13 unless it takes the weaker points the same
way. A threshold keeps the mapping above it: in 3.13 the opacity rose from 0 at
the threshold to the next point of the mapping, and a threshold above the last
point hid the whole PET.

The opacity slider of a viewport (CT ---o PT) reads and sets the `opacity` of the
display set and leaves its `opacityMapping`, linearly: its position is the
strongest alpha drawn. The PET of the TMTV fusion panes starts at 25%, and 100%
draws its ramp as it is, so the PET covers the CT from SUV 1 on. In 3.13 the
slider of the legacy path started at 100% for this PET, its 100% was the look at
rest, and it went through a gamma of 1/5 (its 50% wrote 0.87). The threshold
menu sets `colormap.threshold`.

A display set added over a live viewport from the data overlay menu (a PET over
a CT) starts at `OVERLAY_OPACITY`, 0.25: 3.13 drew the 0.9 of the menu as
`1 - (1 - 0.9) ** 0.125`, 0.25, so the first picture is the one of 3.13. Its
opacity slider starts at 25% (3.13: 59%, the 0.9 through the gamma of 1/5).

### The display area of a viewport

`viewportOptions.displayArea` of a protocol stays as it is (the mammography
protocol uses it). The viewer gives it to the viewport as the view to show
and as the view of a reset, so it shows at the first draw and Reset shows it
again. A zoom or a pan by the user starts from the display area and replaces
it; 3.13 kept the display area and zoomed inside it. See "Display area and
stretch" in the Cornerstone3D 6 guide.

## For an extension author

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

2. Replace the names of `@ohif/extension-cornerstone` that are gone: see
   [Removed and renamed exports](#removed-and-renamed-exports-of-ohifextension-cornerstone).
3. Call the viewport of Cornerstone3D. The viewer has no adapter between
   itself and a viewport any more: the view state, the appearance of each
   display set (window, colormap, opacity), the view reference with its view
   plane normal and focal point, the volume ids and what the viewport shows
   are members of the viewport. See
   [The viewport adapter is gone](#the-viewport-adapter-is-gone) for each
   method of the adapter and the call that replaces it.
4. Do not read `viewport.type` to tell a stack from a volume: both are
   `planar`. Ask `viewport.getCurrentMode()` (`'stack'`, `'volume'`,
   `'volume3d'`, `'geometry3d'`, `'video'`, `'wholeSlide'`, `'ecg'` or
   `'empty'`).
5. `Types.IViewport` of Cornerstone3D 6 has fewer members than in 5. Type a
   viewport with its class (`PlanarViewport`, `VolumeViewport3D`,
   `VideoViewport`, `WSIViewport`, `ECGViewport`) where you call a member of that
   class, and narrow it by its `type`, for example
   `viewport.type === Enums.ViewportType.PLANAR`. Each class has its own
   literal `type`, so a test of the type narrows a union of the classes.
6. Name a display set by its `displaySetInstanceUID`, and let the service
   register it: see [Display sets and mounts](#display-sets-and-mounts).
7. Read and write the appearance of a display set, the stored presentations
   and the events in their 3.14 form: see
   [The appearance of a display set](#the-appearance-of-a-display-set),
   [The position presentation](#the-position-presentation) and
   [The events of a viewport](#the-events-of-a-viewport).
8. Rebuild a runtime plugin that imports Cornerstone3D: see
   [Runtime plugins](#runtime-plugins-must-be-rebuilt-against-cornerstone3d-6).

### Removed and renamed exports of `@ohif/extension-cornerstone`

| 3.13 | 3.14 |
|---|---|
| `isNextViewportsEnabled()` | Removed. There is one path: keep the code of its `true` branch. |
| `isNextViewport(viewport)` | Removed. Every viewport is a Cornerstone3D 6 viewport: drop the test and keep its `true` branch. |
| `getViewportAdapter(viewport)` | Removed. Call the viewport: see [The viewport adapter is gone](#the-viewport-adapter-is-gone). |
| `isVolumeRenderingViewport(viewport)` | Removed: `viewport.getCurrentMode() === 'volume'`, a planar viewport that shows a volume (an MPR pane, a fusion): the viewports that take the threshold and the opacity of a layer. |
| `getViewportFocalPoint(viewport)` | Removed: `viewport.getViewReference()?.cameraFocalPoint`, the centre of the slice on display. |
| `NEXT_FUSION_PT_OPACITY` | Removed. Give a PET over a CT an opacity ramp by SUV in `colormap.opacityMapping` and its level in `opacity`, as the TMTV mode does (`FUSION_PT_OPACITY_MAPPING` and `FUSION_PT_OPACITY`, not exported); the opacity slider reads and sets `opacity`. |
| `NEXT_OVERLAY_OPACITY` | `OVERLAY_OPACITY`, 0.25 (was 0.4): the opacity that 3.13 drew the 0.9 of the data overlay menu with. |
| `getHydrationViewportTypeForModality(modality)` | Removed. Hydrating an RTSTRUCT or a SEG keeps the viewport type and the orientation of every pane: there is no type to pin. |
| The `viewportType` option of the command `loadSegmentationDisplaySetsForViewport` | Removed: the command keeps the type of each pane. To show a pane as a stack, give it `viewportOptions: { viewportType: 'stack' }` with `setDisplaySetsForViewports`. |
| `cornerstoneViewportService.EVENTS.VIEWPORT_VOLUMES_CHANGED` | Removed: `Enums.Events.DISPLAY_SETS_CHANGED` of `@cornerstonejs/core` on the element of the viewport, with `detail.viewportId` (see [The events of a viewport](#the-events-of-a-viewport)). |
| `Types.LutPresentation`: `{ viewportType, properties }` (the `ViewportProperties` of Cornerstone3D 5, or a map of them by volume id), the value of `useLutPresentationStore` | `{ viewportType, appearances }`: the overrides of each display set by its `displaySetInstanceUID`, each a `Types.DisplaySetAppearanceOverrides` (see [The appearance of a display set](#the-appearance-of-a-display-set)). |
| `Types.PositionPresentation`: `{ viewportType, viewReference, viewPresentation }`, the value of `usePositionPresentationStore` | `{ viewportType, viewReference, viewFraming }`, `viewFraming` from `viewport.getViewFraming()` (see [The position presentation](#the-position-presentation)). |
| `useViewportRendering(...).opacityLinear`, `.setOpacityLinear` | `.opacity`, `.setOpacity`: the opacity that is drawn. |
| `listeners: { [EVENTS.VIEWPORT_NEW_IMAGE_SET]: ... }` of a toolbar button | Removed: such an entry never ran (see [The events of a viewport](#the-events-of-a-viewport)). |

### The viewport adapter is gone

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
| `getPresentation(displaySetId?)` (later `getAppearance`) | `viewport.getDisplaySetAppearance(displaySetId?) ?? {}`: the overrides. Store or copy this. |
| (the presentation with `getDefaultVOIRange` as a fallback; later `getEffectiveAppearance`) | `viewport.getEffectiveDisplaySetAppearance(displaySetId?) ?? {}`: what is drawn. Show or compare this. |
| `setPresentation(props, displaySetId?)` (later `setAppearance`) | `viewport.setDisplaySetAppearance(displaySetId, props)`, or `viewport.setDisplaySetAppearance(props)` for the source |
| `getDefaultVOIRange(displaySetId?)`, `getColormap(displaySetInstanceUID)` | `viewport.getEffectiveDisplaySetAppearance(displaySetId).voiRange`, `.colormap` |
| `setLayerOpacity(displaySetInstanceUID, opacity)` | `viewport.setDisplaySetAppearance(displaySetInstanceUID, { opacity })` |
| `setLayerThreshold(displaySetInstanceUID, threshold)` | `viewport.setDisplaySetAppearance(displaySetInstanceUID, { colormap: { threshold } })`. The colormap keeps its name and its `opacityMapping`. |
| `getOpacityGamma()` | Nothing: the opacity slider sets the opacity that is drawn. |
| `getBlendMode(displaySetId?)` | `viewport.getDisplaySetAppearance(displaySetId?)?.blendMode` of a planar or 3D viewport |
| `getDataIdForDisplaySet(uid)` (later `getShownDisplaySetId`) | The viewer's own rule: the UID when `viewport.getDisplaySets()` lists it or is empty, else undefined (the source answers for an SR, SEG or RTSTRUCT viewport) |
| `getVolumeIds()` | `viewport.getVolumeIds()` of a planar or 3D viewport: the volumes, the source first, without the labelmap of a segmentation; `getVolumeIds({ includeSegmentations: true })` lists the labelmaps too |
| `getDataIdForVolumeId(volumeId)` | `viewport.getDisplaySetIdForVolumeId(volumeId)` of a planar or 3D viewport |
| `getVoxelManagerForDisplaySet(uid).getRange()` | `viewport.getScalarRange(uid)` |
| `copyDisplayedContentTo(target)` | Mount `viewport.getDisplaySets()` on the target, each with `appearance: viewport.getDisplaySetAppearance(displaySetId)` added to its options, then `target.setViewReference(viewport.getViewReference())` and `target.setViewFraming(viewport.getViewFraming())` |
| `isComputedVOI` of a presentation | Nothing: the overrides hold only what a caller set, so nothing guesses whether a window came from the user by comparing numbers. |

The adapter, the backends and the interfaces in front of them were not
exports of the extension. A fork that imports them from the sources of the
extension (`extensions/cornerstone/src/`) changes its imports:

| 3.13 | 3.14 |
|---|---|
| `NextViewportAdapter`, `IViewportAdapter`, `getViewportAdapter`, in `services/ViewportService/adapter/` | Removed: the members of the viewport (the table above) |
| The types `ViewportAppearance` (`ViewportPresentation` before it), `ViewportColormap`, `ViewportViewState`, `VOIRange` and `ViewportShape` of the adapter | `Types.DisplaySetAppearanceOverrides` of the extension; `PlanarDisplaySetAppearance`, `Volume3DDisplaySetAppearance`, `Types.AppearanceColormap` (with `opacityMapping`) and the view state type of each viewport class (`PlanarViewState`, `Volume3DCamera`, ...) of `@cornerstonejs/core`; `ViewportShape` stays in `utils/viewportDataShape.ts`, for the data of a hanging protocol before the mount |
| `NextViewportBackend` and `IViewportBackend`, in `services/ViewportService/backends/` | The mount of each family is `CornerstoneViewportService._setDisplaySets`; the mount options of a stack and of volumes are `mountStack` and `mountVolumes` of `services/ViewportService/viewportMounts.ts`; the presentations are `getPositionPresentation`, `setPositionPresentation`, `getLutPresentation` and `setLutPresentation` of `services/ViewportService/viewportPresentations.ts` |
| `IViewportServiceInternals` | Removed: `CornerstoneViewportService` implements `IViewportService` of `@ohif/core` only |
| `nextViewportOperations` and `IViewportOperations`, in `services/ViewportService/backends/` | `viewportOperations`, in `services/ViewportService/viewportOperations.ts`; its `getViewPlaneNormal(viewport)` is `viewport.getViewReference()?.viewPlaneNormal` |
| `NextSegmentationBackend` and `ISegmentationBackend`, in `services/SegmentationService/backends/` | The functions `classifyAndPrepareLabelmapAdd` and `assembleSegmentationDataForSEG`, in `services/SegmentationService/`; its `jumpToSegmentCenter(viewport, world)` is `viewport.setViewReference({ cameraFocalPoint: world })` |
| `LegacyViewportAdapter`, `LEGACY_OPACITY_GAMMA`, `LegacyViewportBackend`, `legacyViewportOperations`, `LegacySegmentationBackend` | Removed: their `next` counterparts above are the one path |
| `utils/nextViewports.ts` | `utils/viewportRendering.ts` (the render backend), without the switch |
| `utils/nextViewportPolicies.ts` | `utils/viewportPolicies.ts` |
| `utils/getPlanarOr3DViewport.ts` | `getPlanarOr3DViewport` and the type guards `isPlanarViewport`, `isVolumeViewport3D`, `isVideoViewport`, `isECGViewport` in `utils/viewportTypeGuards.ts` |

A renderer on a server is not a second implementation of these classes. It
is a render backend (`registerRenderBackend`) or a viewport type
(`registerViewportType`) of Cornerstone3D, which the viewer mounts as any
other, or an extension of its own that implements `IViewportService` of
`@ohif/core`.

### Display sets and mounts

A viewport names each display set that it shows by its
`displaySetInstanceUID` (`viewport.getDisplaySets()`,
`getSourceDisplaySetId()`, the `displaySetId` of a view reference and of the
metadata of an annotation), also when one series shows as a stack in one
viewport and as a volume in another. `DisplaySetService` registers each
display set once, when it is made, with `displaySetRegistry.add` of
`@cornerstonejs/metadata`, and the viewports read that object: do not
register a display set again, and do not add another object under its UID,
which would replace the display set itself. A mount says what the viewport
wants of it:

```js
await viewport.setDisplaySets({
  displaySetId: displaySet.displaySetInstanceUID,
  options: { mode: 'volume', orientation: Enums.OrientationAxis.AXIAL, volumeId },
});
```

A display set that a viewport mounts by a volume and not by images (a
parametric map) carries its `volumeId`. See
[Display set storage](./display-set-store.md#viewports-read-the-stored-display-set)
for what each viewport reads from a display set.

Whether a viewport shows a display set: `viewport.getDisplaySets()` lists the
UIDs. An SR, SEG or RTSTRUCT viewport shows the images that they reference and
not their own UID; the viewer then reads the source of the viewport (an
appearance call without a UID).

### The appearance of a display set

The look of each display set of a viewport (window, invert, colormap, opacity,
blend mode, the preset of a 3D viewport) is its appearance. Cornerstone3D 6
keeps two readings of it: what a caller set, the overrides
(`viewport.getDisplaySetAppearance(displaySetId?)`), and what is drawn, the
overrides over the defaults of the data
(`viewport.getEffectiveDisplaySetAppearance(displaySetId?)`: the window of the
image on display, the invert of a MONOCHROME1 image, opacity 1). Store or copy
the overrides; show or compare what is drawn. The invert button, for example,
reads the effective `invert`, so the first click on a MONOCHROME1 image shows
it as MONOCHROME2.

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
viewport, by its `displaySetInstanceUID`, typed
`Types.DisplaySetAppearanceOverrides`, where 3.13 held `properties`, the
`ViewportProperties` of the viewport or a map of them by volume id. A viewport
that comes back takes the stored appearance of each display set, the PET of a
fusion too, and the display set options of the hanging protocol for a display
set without one. A window that the user did not set is not stored, so the
viewport shows the window of its data again. Before:

```js
const { lutPresentationStore } = useLutPresentationStore.getState();
const { properties } = lutPresentationStore[presentationId];
const voiRange = (properties[ptVolumeId] ?? properties).voiRange;
```

After:

```js
const { lutPresentationStore } = useLutPresentationStore.getState();
const { appearances } = lutPresentationStore[presentationId];
const voiRange = appearances[ptDisplaySetInstanceUID]?.voiRange;
```

### The position presentation

The stored position presentation (`usePositionPresentationStore`) holds
`{ viewportType, viewReference, viewFraming }`. `viewFraming` is what
`viewport.getViewFraming()` gives: the zoom, pan, rotation, flips and display
area against the fit, with how the view fits (`scaleMode`, `fitScale`) for a
planar viewport, and the camera for a 3D viewport, each with `worldPan`, the
pan in world units. It replaces `viewPresentation`. A viewport that comes
back, also in a pane of another size after a layout change, shows the slice of
the view reference and then `viewport.setViewFraming(viewFraming)`: a view that
fit the width of its pane fits the width of the new pane, a zoomed view keeps
its zoom against the fit and the point at its centre, and a 3D viewport keeps
its direction, zoom and pan. The stores are kept in memory only; nothing
stored by 3.13 is read. Code that writes a position presentation, as the SEG,
RTSTRUCT and SR viewports do, gives `viewReference` and, if it wants a framing,
`viewFraming`; drop `viewPresentation`.

A resize (a panel that opens or closes, the window, a layout change of the
same viewport) writes back only the framing: the slice and the orientation
stay as they are, also for a pane that sits between two of its slices, such as
a PET pane of a sync group on the slice of a CT. A video and an ECG keep their
zoom and pan against the fit through it, an ECG keeps the layout of its traces,
and Reset fits either again.

### The events of a viewport

| 3.13 | 3.14 |
|---|---|
| `cornerstoneViewportService.EVENTS.VIEWPORT_VOLUMES_CHANGED` | Removed. Listen to `Enums.Events.DISPLAY_SETS_CHANGED` of `@cornerstonejs/core`, with `detail.viewportId`. |
| `Enums.Events.VIEWPORT_NEW_IMAGE_SET`, `VOLUME_VIEWPORT_NEW_VOLUME` | `Enums.Events.DISPLAY_SETS_CHANGED` (the codemod renames them). |
| `Enums.Events.VOI_MODIFIED`, `COLORMAP_MODIFIED` | `Enums.Events.DISPLAY_SET_APPEARANCE_CHANGED` (see [The appearance of a display set](#the-appearance-of-a-display-set)). |
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

The event fires when an overlay comes or goes too, as the labelmap of a
segmentation, with `detail.sourceChanged` false. A listener that cares for the
series of the viewport (a cine, a tracking state, a prefetch) returns early
then, or it starts again each time a segmentation is shown:

```js
element.addEventListener(Enums.Events.DISPLAY_SETS_CHANGED, evt => {
  if (!evt.detail.sourceChanged) {
    return;
  }

  restartCine();
});
```

A scroll fires no `DISPLAY_SETS_CHANGED`, also on a stack with a labelmap,
whose labelmap image follows the slice. A listener for every layer compares
what it shows before it does costly work: the window level panel recomputes
its histograms only when the source changed or `viewport.getVolumeIds()`
differs from its rows, so a labelmap shown on an MPR, which is no row, makes
no new histogram.

The `listeners` of a toolbar button run on the events of the viewport grid
only (`ACTIVE_VIEWPORT_ID_CHANGED` and `VIEWPORTS_READY`). An entry keyed by a
Cornerstone3D event never ran: the Image Slice Sync button of 3.13 had one
(`[EVENTS.VIEWPORT_NEW_IMAGE_SET]` with a command that did not exist), and it is
gone. A button of your own that copied it drops the entry.

### What the viewport answers

The window level panel, the range of the threshold menu and the capture of the
download dialog ask the viewport, where 3.13 read the cache, the actors or a
volume id built from the UID.

`viewport.getVolumeIds()` gives the volumes of a viewport, the source first,
without the labelmap of a segmentation: the window level panel has one row for
each, so a hydrated SEG adds no row, a PET/CT fusion has two and a stack none.
Each row shows the window, colormap and opacity that its display set is drawn
with, and its histogram spans `getScalarRange` of the display set (of the time
point on display for a dynamic volume). The range of the threshold menu is
`viewport.getScalarRange(displaySetInstanceUID)`.

The capture mounts every display set of the viewport that is not the labelmap
of a segmentation, each with the options of its mount (`getDisplaySets()` of
every viewport family gives them, with the `volumeId` of a 3D viewport, so no
volume is loaded again) and its overrides, and adds the segmentations of the
viewport once through their representations, so a fusion keeps its PET. Its
framing is relative to the fit, so a capture of another size shows the same
part of the image.

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
   and its codemod, as in [For an extension author](#for-an-extension-author).
3. Build it again and deploy the new bundle.

The other `@cornerstonejs` packages (`adapters`, the image loader and the rest)
are released together with the core. A plugin that bundles one of them moves it
to 6 too.

The versions of all shared packages are listed under
[Shared host packages](../../configuration/configurationFiles.md#shared-host-packages).
