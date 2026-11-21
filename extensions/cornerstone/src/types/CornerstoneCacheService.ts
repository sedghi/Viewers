import { Enums, Types } from '@cornerstonejs/core';
import type { ViewportShape } from '../utils/viewportDataShape';

type StackData = {
  StudyInstanceUID: string;
  displaySetInstanceUID: string;
  // A composite stack is one created from other display sets - kind of like
  // madeInClient, but specific to indicating that the imageIds can come from
  // different series or even studies.
  isCompositeStack?: boolean;
  imageIds: string[];
  frameRate?: number;
  initialImageIndex?: number | string | null;
};

type VolumeData = {
  studyInstanceUID: string;
  displaySetInstanceUID: string;
  volume?: Types.IVolume;
  imageIds?: string[];
};

type StackViewportData = {
  viewportType: Enums.ViewportType;
  // The shape of the data (a stack, a volume, a 3D volume or other). The planar
  // `viewportType` is the same for a stack and for a volume, so consumers that
  // must distinguish them (data re-build on invalidation, orientation markers)
  // read this instead, with `getViewportDataShape(viewportData)`.
  dataShapeType?: ViewportShape;
  data: StackData[];
};

type VolumeViewportData = {
  viewportType: Enums.ViewportType;
  /** See StackViewportData.dataShapeType. */
  dataShapeType?: ViewportShape;
  data: VolumeData[];
};

export type { StackViewportData, VolumeViewportData, StackData, VolumeData };
