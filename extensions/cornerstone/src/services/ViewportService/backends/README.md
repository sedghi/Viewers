# The viewport path: where each concern lives

OHIF drives the viewports of Cornerstone3D 6.0 (`PlanarViewport`,
`VolumeViewport3D`, `VideoViewport`, `WSIViewport`, `ECGViewport`) through one
path. There is no second path and no setting that picks one. This document
says where each concern of that path lives.

## The three homes

| Home | What belongs there |
|---|---|
| `../adapter/` (`IViewportAdapter`, `ViewportAdapter`) | Reads and writes on a live viewport: view state, per-display-set appearance keyed by display set UID, view reference, the shape of what the viewport shows. Code outside the viewport service asks the adapter (`getViewportAdapter(viewport)`) instead of the raw viewport. |
| `./` (`IViewportBackend` and `ViewportBackend`, `IViewportOperations` and `viewportOperations`, and the segmentation counterpart `ISegmentationBackend` and `SegmentationBackend` in `../../SegmentationService/backends/`) | Lifecycle and interaction bodies: mount and re-mount, presentation capture and restore, the operations of the commands (flip, rotate, window level and so on), labelmap add and assembly. |
| `../../../utils/viewportPolicies.ts` | Behavioral policy: appearance defaults and workflow rules (overlay opacity, the stack pin when an RTSTRUCT is hydrated). |

## One implementation behind each interface

`ViewportAdapter`, `ViewportBackend`, `viewportOperations` and
`SegmentationBackend` are the one implementation of their interface. The
interfaces stay: a server-side renderer is a later goal and would be a second
implementation, and the contract test of the adapter
(`../adapter/IViewportAdapter.contract.test.ts`) is written against
`IViewportAdapter`.

## The shape of the data

A planar viewport shows a stack and a volume alike, so the viewport type
(`PLANAR`) does not say which one. OHIF keeps the shape as a value of its own:
`ViewportShape`, one of `stack`, `volume`, `volume3d` and `other`
(`../../../utils/viewportDataShape.ts`).

| Question | Answer |
|---|---|
| Which Cornerstone3D type does a viewport type word of a hanging protocol give? | `getCornerstoneViewportType(word)` |
| Which shape does that word ask for? | `getDataShapeForViewportType(word)` |
| Which shape was a `viewportData` built for (before a viewport has it)? | `getViewportDataShape(viewportData)`: the `dataShapeType` that `CornerstoneCacheService` stores |
| Which shape does the viewport of a `ViewportInfo` have? | `viewportInfo.getDataShape()` |
| What does a live viewport show? | `getViewportAdapter(viewport).getShape()` |

The words of a hanging protocol, a mode and `viewportOptions` (`stack`,
`volume`, `orthographic`, `volume3d`, `video`, `wholeslide`, `ecg`) are OHIF's
own and stay as they are.

## The id of a display set

A viewport names each display set that it shows by its `displaySetInstanceUID`.
`DisplaySetService` registers each display set once, when it is made, with
`displaySetRegistry.add` of `@cornerstonejs/metadata`
(`platform/core/src/services/DisplaySetService/displaySetStore.ts`), and a
viewport reads that object when it mounts the display set. The backend
registers nothing: each mount says what its viewport wants of the display set
on its options (`mode: 'stack'` or `'volume'`, `orientation`, `volumeId`,
`initialImageIdIndex`, `appearance`), so one display set shows as a stack in
one viewport and as a volume in another under one id.
`getViewportAdapter(viewport).getShownDisplaySetId(displaySetInstanceUID)`
says whether the viewport shows a display set.
