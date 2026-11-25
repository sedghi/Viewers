import { cache, type Types as csTypes } from '@cornerstonejs/core';
import {
  Enums as csToolsEnums,
  segmentation as cstSegmentation,
  type Types as cstTypes,
} from '@cornerstonejs/tools';
import { isPlanarViewport, isVolumeViewport3D } from '../../utils/viewportTypeGuards';

const { Labelmap: LABELMAP, Surface: SURFACE } = csToolsEnums.SegmentationRepresentations;
const {
  state: { updateLabelmapSegmentationImageReferences },
} = cstSegmentation;

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
    labelmapFrameOfReferenceUID !== viewport.getFrameOfReferenceUID()
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
  const shownImageIds = isPlanarViewport(viewport) ? viewport.getImageIds() : [];

  return !shownImageIds.some(imageId => referencedImageIds.has(imageId));
}

/**
 * Decides how a LABELMAP representation is added to a viewport. Called only
 * inside the LABELMAP gate of `addSegmentationRepresentation` (CONTOUR and
 * SURFACE never reach here).
 *
 * A planar viewport renders a labelmap IN PLACE: Cornerstone's
 * `resolveLabelmapRenderPlan` picks the stack image plan for a stack labelmap
 * and the image-reference resolver maps it onto the image on display, so the
 * viewport is never recreated as a volume viewport. A labelmap that is asked
 * for on a 3D viewport is added as a surface. The one case that a stack cannot
 * draw is a labelmap of other images of its frame of reference: it is
 * reported (`needsVolumeViewport`), and the service has the viewport show its
 * data as a volume. A stack that the resolver cannot map yet (a mount-timing
 * race) keeps its viewport.
 */
export async function classifyAndPrepareLabelmapAdd(
  csViewport: csTypes.IViewport,
  segmentation: cstTypes.Segmentation,
  viewportId: string,
  segmentationId: string,
  representationType: csToolsEnums.SegmentationRepresentations
): Promise<LabelmapAddClassification> {
  if (isVolumeViewport3D(csViewport)) {
    return { representationTypeToUse: SURFACE };
  }

  const mappedLabelmapImageId = updateLabelmapSegmentationImageReferences(
    viewportId,
    segmentationId
  );

  const needsVolumeViewport =
    !mappedLabelmapImageId &&
    csViewport.getCurrentMode() === 'stack' &&
    isLabelmapOfOtherImagesOfTheFrameOfReference(csViewport, segmentation, segmentationId);

  return { representationTypeToUse: representationType, needsVolumeViewport };
}
