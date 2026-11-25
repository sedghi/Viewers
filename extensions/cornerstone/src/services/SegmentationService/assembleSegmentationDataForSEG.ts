import { Enums as csToolsEnums, type Types as cstTypes } from '@cornerstonejs/tools';

const { Labelmap: LABELMAP } = csToolsEnums.SegmentationRepresentations;

/** A derived labelmap image produced by the SEG adapter (one per referenced image,
 *  per overlap group). `voxelManager.getScalarData()` yields the slice's label values. */
interface SegLabelmapImage {
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
 * Builds the Cornerstone SegmentationPublicInput for a loaded DICOM SEG display
 * set. Called at SEG-load: no target viewport exists yet, and the data shape
 * (single- vs multi-layer) is fixed at creation. When the SEG has overlapping
 * segments, each conflict-free group is registered as its own labelmap layer
 * under one segmentationId (+ segmentBindings) so Cornerstone renders all
 * overlapping segments via the slice path; otherwise a single flattened
 * labelmap layer.
 */
export function assembleSegmentationDataForSEG(
  params: AssembleSegmentationForSEGParams
): cstTypes.SegmentationPublicInput {
  const {
    segmentationId,
    segDisplaySet,
    derivedImageIds,
    referencedImageIds,
    label,
    fallbackLabel,
    segments,
  } = params;

  const groups = segDisplaySet.labelMapImages ?? [];
  const config = { label, fallbackLabel, segments };

  // Non-overlapping (or a single group): a single flattened labelmap layer.
  if (!segDisplaySet.overlappingSegments || groups.length <= 1) {
    return {
      segmentationId,
      representation: {
        type: LABELMAP,
        data: { imageIds: derivedImageIds, referencedImageIds },
      },
      config,
    };
  }

  // Overlapping SEG: register each conflict-free group as its OWN labelmap layer
  // under one segmentationId. cornerstone's slice path auto-fires for >1 stack layer
  // (shouldUseSliceRendering) and stacks one depth-offset vtkImageSlice actor per
  // layer, so all overlapping segments stay simultaneously visible.
  // ensureLabelmapState preserves a supplied labelmaps/segmentBindings/
  // primaryLabelmapId map via its `||=` guards, so this needs NO cornerstone change.
  const labelmaps: Record<
    string,
    { labelmapId: string; storageKind: 'stack'; imageIds: string[]; referencedImageIds: string[] }
  > = {};
  const segmentBindings: Record<number, { labelmapId: string; labelValue: number }> = {};

  groups.forEach((group, index) => {
    const labelmapId = `${segmentationId}-storage-${index}`;
    labelmaps[labelmapId] = {
      labelmapId,
      storageKind: 'stack',
      imageIds: group.map(image => image.imageId),
      referencedImageIds,
    };

    // The adapter bin-packs non-overlapping segments into each group and writes each
    // segment's index as its label value (the colorLUT is segment-indexed, so
    // labelValue === segmentIndex). Group membership is implicit in the pixel data,
    // so recover it by collecting the distinct non-zero values present in the group;
    // those segment indices bind to this layer (so ensureLabelmapState does not
    // default them all onto the primary layer, which would hide layers 1..N-1).
    const valuesInGroup = new Set<number>();
    for (const image of group) {
      const scalarData = image.voxelManager?.getScalarData();
      if (!scalarData) {
        continue;
      }
      for (let i = 0; i < scalarData.length; i++) {
        const value = scalarData[i];
        if (value !== 0) {
          valuesInGroup.add(value);
        }
      }
    }
    valuesInGroup.forEach(value => {
      segmentBindings[value] = { labelmapId, labelValue: value };
    });
  });

  return {
    segmentationId,
    representation: {
      type: LABELMAP,
      data: {
        // Keep the flattened list for legacy singular readers (getLabelmapImageIds,
        // SEG export); the per-layer truth lives in `labelmaps`.
        imageIds: derivedImageIds,
        referencedImageIds,
        labelmaps,
        segmentBindings,
        primaryLabelmapId: `${segmentationId}-storage-0`,
      },
    },
    config,
  } as cstTypes.SegmentationPublicInput;
}
