import type { Types as csTypes } from '@cornerstonejs/core';
import type { Enums as csToolsEnums, Types as cstTypes } from '@cornerstonejs/tools';

/** A derived labelmap image produced by the SEG adapter (one per referenced image,
 *  per overlap group). `voxelManager.getScalarData()` yields the slice's label values. */
export interface SegLabelmapImage {
  imageId: string;
  voxelManager?: { getScalarData: () => ArrayLike<number> };
}

/** Inputs for assembling the cornerstone SegmentationPublicInput from a loaded SEG
 *  display set. `segDisplaySet.labelMapImages` is the adapter's array-of-groups (one
 *  conflict-free group per overlap layer); `overlappingSegments` flags whether the
 *  SEG actually has overlap. `derivedImageIds` is the flattened image-id list. */
export interface AssembleSegmentationForSEGParams {
  segmentationId: string;
  segDisplaySet: {
    labelMapImages?: SegLabelmapImage[][];
    overlappingSegments?: boolean;
    [key: string]: unknown;
  };
  derivedImageIds: string[];
  referencedImageIds: string[];
  label: string;
  fallbackLabel: string;
  segments: { [segmentIndex: string]: cstTypes.Segment };
}

/**
 * Result of classifying a labelmap add: the representation type to actually use,
 * and whether the viewport must show its data as a volume first.
 */
export interface LabelmapAddClassification {
  representationTypeToUse: csToolsEnums.SegmentationRepresentations;
  /**
   * True for a viewport that shows a stack and a labelmap of other images of
   * its frame of reference. Cornerstone draws a labelmap over a stack only when
   * the stack shows the images the labelmap was made for; over a volume it
   * draws any labelmap of the frame of reference.
   */
  needsVolumeViewport?: boolean;
}

/**
 * Segmentation backend (the counterpart of the viewport backend at
 * `ViewportService/backends/`). SegmentationBackend is the one
 * implementation: it renders the labelmap IN PLACE on the planar viewport.
 *
 * BOUNDARY: viewport (re)creation is NOT a segmentation concern: the backend
 * never recreates a viewport. It says when a stack must be shown as a volume
 * (`needsVolumeViewport`), and the service asks the viewport grid for it.
 */
export interface ISegmentationBackend {
  /**
   * Decide how a LABELMAP representation is added for `csViewport`. Called only
   * inside the LABELMAP gate of `addSegmentationRepresentation` (CONTOUR/SURFACE
   * never reach here). A 3D viewport gets a surface in its place.
   */
  classifyAndPrepareLabelmapAdd(
    csViewport: csTypes.IViewport,
    segmentation: cstTypes.Segmentation,
    viewportId: string,
    segmentationId: string,
    representationType: csToolsEnums.SegmentationRepresentations
  ): Promise<LabelmapAddClassification>;

  /**
   * Build the cornerstone SegmentationPublicInput for a loaded DICOM SEG display set.
   *
   * Called at SEG-load: no target viewport exists yet, and the data shape (single-
   * vs multi-layer) is fixed at creation.
   *
   * When the SEG has overlapping segments, each conflict-free group is registered as
   * its own labelmap layer under one segmentationId (+ segmentBindings) so cornerstone
   * renders all overlapping segments via the slice path; otherwise a single
   * flattened labelmap layer.
   */
  assembleSegmentationDataForSEG(
    params: AssembleSegmentationForSEGParams
  ): cstTypes.SegmentationPublicInput;

  /**
   * Recenter a viewport on a segment's world-space center point. Returns whether it
   * actually recentered, so the caller can skip the segment highlight when it did not.
   *
   * Navigates via a view reference centered on `world` (setViewReference).
   * (In-plane pan-to-center is a separate, deferred refinement.)
   */
  jumpToSegmentCenter(viewport: csTypes.IViewport, world: csTypes.Point3): boolean;
}
