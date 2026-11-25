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

2. Ask the viewport through the viewer's adapter where it has the call.
   `getViewportAdapter(viewport)` of `@ohif/extension-cornerstone` is the
   viewer's one door to a viewport, the same for every kind: the view state,
   the appearance of each display set (window, colormap, opacity), the view
   plane normal and the focal point, the volume ids, and the shape of what the
   viewport shows. See
   [The appearance of a display set](#the-appearance-of-a-display-set).
3. Do not read `viewport.type` to tell a stack from a volume: both are
   `planar`. Ask `getViewportAdapter(viewport).getShape()` (`stack`, `volume`,
   `volume3d` or `other`), or `viewport.getCurrentMode()`.
4. `Types.IViewport` of Cornerstone3D 6 has fewer members than in 5. Type a
   viewport with its class (`PlanarViewport`, `VolumeViewport3D`,
   `VideoViewport`, `WSIViewport`, `ECGViewport`) where you call a member of that
   class, for example `renderingEngine.getViewport<PlanarViewport>(viewportId)`.
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
   `getDataIdForDisplaySet` of the adapter is
   `getShownDisplaySetId(displaySetInstanceUID)`: the UID when the viewport
   shows that display set, else undefined.

## The appearance of a display set

The look of each display set of a viewport (window, invert, colormap, opacity,
blend mode, the preset of a 3D viewport) is its appearance. Cornerstone3D 6
keeps two readings of it: what a caller set, the overrides, and what is drawn,
the overrides over the defaults of the data (the window of the image on
display, the invert of a MONOCHROME1 image, opacity 1).

| 3.13 | 3.14 |
|---|---|
| `getViewportAdapter(viewport).getPresentation(displaySetId?)` | `getAppearance(displaySetId?)`: the overrides. Store or copy this. |
| (the presentation with `getDefaultVOIRange` as a fallback) | `getEffectiveAppearance(displaySetId?)`: what is drawn. Show or compare this. |
| `setPresentation(props, displaySetId?)` | `setAppearance(props, displaySetId?)` |
| `getDefaultVOIRange(displaySetId?)`, `getColormap(displaySetInstanceUID)` | Removed: `getEffectiveAppearance(displaySetId).voiRange`, `.colormap` |
| `setLayerOpacity(displaySetInstanceUID, opacity)` | Removed: `setAppearance({ opacity }, displaySetInstanceUID)` |
| `setLayerThreshold(displaySetInstanceUID, threshold)` | Removed: `setAppearance({ colormap: { threshold } }, displaySetInstanceUID)`. The colormap keeps its name and its `opacityMapping`. |
| `getOpacityGamma()` | Removed. The opacity slider sets the opacity that is drawn. |
| `isComputedVOI` of a presentation | Removed. The overrides hold only what a caller set, so nothing guesses whether a window came from the user by comparing numbers. |
| The types `ViewportPresentation`, `ViewportColormap` (with `opacity`) | `ViewportAppearance`, `ViewportColormap` (with `opacityMapping`) |
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

## Removed and renamed exports of `@ohif/extension-cornerstone`

| 3.13 | 3.14 |
|---|---|
| `isNextViewportsEnabled()` | Removed. There is one path: keep the code of its `true` branch. |
| `isNextViewport(viewport)` | Removed. Every viewport is a Cornerstone3D 6 viewport. |
| `NEXT_FUSION_PT_OPACITY` | Removed. The PET of the TMTV fusion has its opacity ramp by SUV again (`colormap.opacityMapping`), with the look of 3.13 without `?useNextViewports`, and the opacity slider scales the ramp. |
| `NEXT_OVERLAY_OPACITY` | `OVERLAY_OPACITY` |

The classes behind the adapter and the services have plain names now. The
extension does not export them. A fork that imports them from the sources of
the extension (`extensions/cornerstone/src/`) changes its imports:

| 3.13 | 3.14 |
|---|---|
| `NextViewportAdapter`, in `services/ViewportService/adapter/NextViewportAdapter.ts` | `ViewportAdapter`, in `services/ViewportService/adapter/ViewportAdapter.ts` |
| `NextViewportBackend`, in `services/ViewportService/backends/NextViewportBackend.ts` | `ViewportBackend`, in `services/ViewportService/backends/ViewportBackend.ts` |
| `nextViewportOperations`, in `services/ViewportService/backends/NextViewportOperations.ts` | `viewportOperations`, in `services/ViewportService/backends/viewportOperations.ts` |
| `NextSegmentationBackend`, in `services/SegmentationService/backends/NextSegmentationBackend.ts` | `SegmentationBackend`, in `services/SegmentationService/backends/SegmentationBackend.ts` |
| `LegacyViewportAdapter`, `LEGACY_OPACITY_GAMMA`, `LegacyViewportBackend`, `legacyViewportOperations`, `LegacySegmentationBackend` | Removed |
| `utils/nextViewports.ts` | `utils/viewportRendering.ts` (the render backend), without the switch |
| `utils/nextViewportPolicies.ts` | `utils/viewportPolicies.ts` |

The interfaces `IViewportAdapter`, `IViewportBackend`, `IViewportOperations` and
`ISegmentationBackend` keep their names.

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
