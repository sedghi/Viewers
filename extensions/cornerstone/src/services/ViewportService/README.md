# The viewport path: where each concern lives

OHIF drives the viewports of Cornerstone3D 6.0 (`PlanarViewport`,
`VolumeViewport3D`, `VideoViewport`, `WSIViewport`, `ECGViewport`) through one
path, and calls them directly: there is no adapter and no interface between
OHIF and a viewport. Code that needs a member of one family narrows the
viewport by its `type` with the guards of `../../utils/viewportTypeGuards.ts`
(`isPlanarViewport`, `isVolumeViewport3D`, `getPlanarOr3DViewport`, ...).

## The modules

| Module | What belongs there |
|---|---|
| `CornerstoneViewportService.ts` | OHIF's service boundary: it implements `IViewportService` of `@ohif/core`. It enables and disables the viewports, routes a mount to its family (video, whole slide and ECG by the viewport type, a stack and a volume by the shape of the data), keeps which display sets a viewport shows, stores and restores the presentations, and fires `VIEWPORT_DATA_CHANGED`. |
| `viewportMounts.ts` | The translation of the viewport data of a hanging protocol into `setDisplaySets`: the mount options of a stack (`mode: 'stack'`, the first image, the appearance) and of the volumes of a planar or a 3D viewport (`mode: 'volume'`, the orientation, the volume id, the appearance of each display set, the slab of a projection). |
| `viewportPresentations.ts` | The position presentation (the view reference and `getViewFraming()`) and the LUT presentation (the appearance overrides of each display set): read from a viewport and given back to one. |
| `viewportOperations.ts` | The bodies of the viewport commands (flip, rotate, invert, window level, colormap, orientation, zoom, the 3D volume rendering settings). |
| `Viewport.ts` | `ViewportInfo`: the options of a viewport of the grid, before and after its mount. |
| `../../utils/viewportPolicies.ts` | Behavioral policy: appearance defaults (the overlay opacity). |
| `../SegmentationService/` | The labelmap add (`classifyAndPrepareLabelmapAdd.ts`) and the layers of an overlapping SEG (`assembleSegmentationDataForSEG.ts`). |

## A renderer on a server

A renderer that draws on a server does not go into this folder. It goes into
one of two places:

- Under `IViewport` in Cornerstone3D. `registerRenderBackend` adds a render
  backend that a planar viewport selects with its `renderBackend` mount option
  (OHIF passes `<viewportType>.viewportRendering` there), and
  `registerViewportType` adds a viewport family of its own. OHIF then mounts
  it as it mounts any other viewport.
- As an OHIF extension of its own that implements `IViewportService` of
  `@ohif/core` and is registered in place of `CornerstoneViewportService`.

## The shape of the data

A planar viewport shows a stack and a volume alike, so the viewport type
(`PLANAR`) does not say which one. Before a viewport has its data, OHIF keeps
the shape as a value of its own: `ViewportShape`, one of `stack`, `volume`,
`volume3d` and `other` (`../../utils/viewportDataShape.ts`).

| Question | Answer |
|---|---|
| Which Cornerstone3D type does a viewport type word of a hanging protocol give? | `getCornerstoneViewportType(word)` |
| Which shape does that word ask for? | `getDataShapeForViewportType(word)` |
| Which shape was a `viewportData` built for (before a viewport has it)? | `getViewportDataShape(viewportData)`: the `dataShapeType` that `CornerstoneCacheService` stores |
| Which shape does the viewport of a `ViewportInfo` have? | `viewportInfo.getDataShape()` |
| What does a live viewport show? | `viewport.getCurrentMode()` of Cornerstone3D (`'stack'`, `'volume'`, `'volume3d'`, `'geometry3d'`, `'video'`, `'wholeSlide'`, `'ecg'`, `'empty'`) |

The words of a hanging protocol, a mode and `viewportOptions` (`stack`,
`volume`, `orthographic`, `volume3d`, `video`, `wholeslide`, `ecg`) are OHIF's
own and stay as they are.

## The id of a display set

A viewport names each display set that it shows by its `displaySetInstanceUID`.
`DisplaySetService` registers each display set once, when it is made, with
`displaySetRegistry.add` of `@cornerstonejs/metadata`
(`platform/core/src/services/DisplaySetService/displaySetStore.ts`), and a
viewport reads that object when it mounts the display set. The service
registers nothing: each mount says what its viewport wants of the display set
on its options (`mode: 'stack'` or `'volume'`, `orientation`, `volumeId`,
`initialImageIdIndex`, `appearance`), so one display set shows as a stack in
one viewport and as a volume in another under one id.
`getShownDisplaySetId(viewport, displaySetInstanceUID)`
(`../../utils/getShownDisplaySetId.ts`) says whether the viewport shows a
display set: an SR, SEG or RTSTRUCT viewport shows the images that they
reference, and its source answers for it.
