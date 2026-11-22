import { cache, type Types as csTypes } from '@cornerstonejs/core';
import {
  Enums as csToolsEnums,
  segmentation as cstSegmentation,
  type Types as cstTypes,
} from '@cornerstonejs/tools';
import type {
  AssembleSegmentationForSEGParams,
  ISegmentationBackend,
  LabelmapAddClassification,
} from './ISegmentationBackend';
import { getViewportAdapter } from '../../ViewportService/adapter';

const { Labelmap: LABELMAP, Surface: SURFACE } = csToolsEnums.SegmentationRepresentations;
const {
  state: { updateLabelmapSegmentationImageReferences },
} = cstSegmentation;

/**
 * Whether a stack must be shown as a volume to draw this labelmap: the labelmap
 * is of the frame of reference of the stack, and the stack shows none of the
 * images that the labelmap was made for (a SEG of the CT over a stack of the
 * PT). `getLabelmapImageIds` of the tools gives the ids as an array; its
 * declared type says a string.
 */
function isLabelmapOfOtherImagesOfTheFrameOfReference(
  viewport: csTypes.IViewport,
  segmentation: cstTypes.Segmentation,
  segmentationId: string
): boolean {
  const labelmapImageIds = (cstSegmentation.getLabelmapImageIds(segmentationId) ??
    []) as unknown as string[];
  const labelmapImages = labelmapImageIds.map(imageId => cache.getImage(imageId));
  const labelmapFrameOfReferenceUID = labelmapImages[0]?.FrameOfReferenceUID;

  if (
    !labelmapFrameOfReferenceUID ||
    labelmapFrameOfReferenceUID !== viewport.getFrameOfReferenceUID?.()
  ) {
    return false;
  }

  const labelmapData = segmentation?.representationData?.[LABELMAP] as
    | { referencedImageIds?: string[] }
    | undefined;
  const referencedImageIds = new Set(
    labelmapData?.referencedImageIds?.length
      ? labelmapData.referencedImageIds
      : labelmapImages.map(image => image?.referencedImageId).filter(Boolean)
  );
  const shownImageIds = (viewport as { getImageIds?: () => string[] }).getImageIds?.() ?? [];

  return !shownImageIds.some(imageId => referencedImageIds.has(imageId));
}

/**
 * The segmentation backend.
 *
 * A PlanarViewport renders a labelmap IN PLACE: cornerstone's
 * `resolveLabelmapRenderPlan` picks the stack image plan for a stack labelmap (no
 * volumeId, no VTK_VOLUME_SLICE precondition) and the duck-typed image-reference
 * resolver maps it onto the viewport's current image. So the backend never
 * recreates the viewport as a volume viewport. A labelmap that is asked for on a
 * 3D viewport is added as a surface. The one case that a stack cannot
 * draw is a labelmap of other images of its frame of reference: the backend
 * reports it, and the service has the viewport show its data as a volume.
 *
 * Needs nothing from the host service (it never touches servicesManager).
 */
export class SegmentationBackend implements ISegmentationBackend {
  async classifyAndPrepareLabelmapAdd(
    csViewport: csTypes.IViewport,
    segmentation: cstTypes.Segmentation,
    viewportId: string,
    segmentationId: string,
    representationType: csToolsEnums.SegmentationRepresentations
  ): Promise<LabelmapAddClassification> {
    // A 3D viewport shows a segmentation as the surface of each segment, also
    // when the caller names a labelmap.
    if (getViewportAdapter(csViewport).getShape() === 'volume3d') {
      return { representationTypeToUse: SURFACE };
    }

    // Try the duck-typed in-place resolver so the labelmap's images map onto the
    // viewport's current image when the FrameOfReference matches. A stack that
    // the resolver cannot map yet (a mount-timing race) keeps its viewport.
    const mappedLabelmapImageId = updateLabelmapSegmentationImageReferences(
      viewportId,
      segmentationId
    );

    const needsVolumeViewport =
      !mappedLabelmapImageId &&
      getViewportAdapter(csViewport).getShape() === 'stack' &&
      isLabelmapOfOtherImagesOfTheFrameOfReference(csViewport, segmentation, segmentationId);

    return { representationTypeToUse: representationType, needsVolumeViewport };
  }

  assembleSegmentationDataForSEG(
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

  jumpToSegmentCenter(viewport: csTypes.IViewport, world: csTypes.Point3): boolean {
    // Navigate via a view reference centered on the segment's world point. This snaps to the slice containing
    // `world` along the viewport's current view normal (the core of jump-to-segment).
    // In-plane pan-to-center is a separate, deferred refinement.
    const nativeViewport = viewport as csTypes.IViewport & {
      setViewReference?: (ref: csTypes.ViewReference) => void;
    };
    if (typeof nativeViewport.setViewReference !== 'function') {
      return false;
    }
    nativeViewport.setViewReference({ cameraFocalPoint: world } as csTypes.ViewReference);
    viewport.render();
    return true;
  }
}
