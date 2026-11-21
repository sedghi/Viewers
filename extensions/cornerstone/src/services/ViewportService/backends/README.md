# The viewport path: where each concern lives

OHIF drives the viewports of Cornerstone3D 6.0 (`PlanarViewport`,
`VolumeViewport3D`, `VideoViewport`, `WSIViewport`, `ECGViewport`) through one
path. There is no second path and no setting that picks one. This document
says where each concern of that path lives.

## The three homes

| Home | What belongs there |
|---|---|
| `../adapter/` (`IViewportAdapter`, `NextViewportAdapter`) | Reads and writes on a live viewport: view state, per-display-set presentation keyed by dataId, view reference, the shape of what the viewport shows. Code outside the viewport service asks the adapter (`getViewportAdapter(viewport)`) instead of the raw viewport. |
| `./` (`IViewportBackend`, `IViewportOperations`, and the segmentation counterpart in `../../SegmentationService/backends/`) | Lifecycle and interaction bodies: mount and re-mount, presentation capture and restore, dataId registration, the operations of the commands (flip, rotate, window level and so on), labelmap add and assembly. |
| `../../../utils/nextViewportPolicies.ts` | Behavioral policy: appearance defaults and workflow rules (fusion opacity, overlay opacity, the stack pin when an RTSTRUCT is hydrated). |

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
