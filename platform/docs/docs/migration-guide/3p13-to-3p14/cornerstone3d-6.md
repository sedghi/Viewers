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
| `useNextViewports` | URL parameter | Drop it from links and bookmarks. |

The viewer does not read these settings any more. Every viewport is a
Cornerstone3D 6 viewport, with or without them.

`genericViewports.viewportRendering` stays, with the URL parameters
`viewportRendering` and `<viewportType>.viewportRendering`. It picks the render
backend; see `genericViewports` in
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
   the presentation of each display set (window, colormap, opacity), the view
   plane normal and the focal point, the volume ids, and the shape of what the
   viewport shows.
3. Do not read `viewport.type` to tell a stack from a volume: both are
   `planar`. Ask `getViewportAdapter(viewport).getShape()` (`stack`, `volume`,
   `volume3d` or `other`), or `viewport.getCurrentMode()`.
4. `Types.IViewport` of Cornerstone3D 6 has fewer members than in 5. Type a
   viewport with its class (`PlanarViewport`, `VolumeViewport3D`,
   `VideoViewport`, `WSIViewport`, `ECGViewport`) where you call a member of that
   class, for example `renderingEngine.getViewport<PlanarViewport>(viewportId)`.
5. A viewport names each display set that it shows by a data id
   (`viewport.getDisplaySets()`, `getSourceDataId()`, the `dataId` of a view
   reference and of the metadata of an annotation). The viewer uses the display
   set UID, except while a series shows as a stack in one viewport and as a
   volume in another: the second of the two then has `<uid>::stack` or
   `<uid>::volume`. Do not take a data id for a display set UID. Give the
   adapter the display set UID (its presentation calls find the display set's
   data id), or ask it with `getDataIdForDisplaySet(displaySetInstanceUID)`.

## Removed and renamed exports of `@ohif/extension-cornerstone`

| 3.13 | 3.14 |
|---|---|
| `isNextViewportsEnabled()` | Removed. There is one path: keep the code of its `true` branch. |
| `isNextViewport(viewport)` | Removed. Every viewport is a Cornerstone3D 6 viewport. |
| `NEXT_FUSION_PT_OPACITY` | Removed. The PET of the TMTV fusion has its opacity ramp by SUV again, as in 3.13 without `?useNextViewports`, and the opacity slider scales the ramp. |
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
