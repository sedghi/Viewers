import type { Types } from '@ohif/core';
import { Enums } from '@cornerstonejs/core';
import type { ViewportShape } from './viewportDataShape';

type ViewportTypeEntry = {
  type: Enums.ViewportType;
  shape: ViewportShape;
};

/**
 * The words that OHIF takes as a viewport type (in a hanging protocol, a mode
 * or `viewportOptions`), in lower case, with the Cornerstone3D viewport type
 * and the shape of the data that each one stands for.
 *
 * `stack`, `volume`, `orthographic`, `volume3d`, `video`, `wholeslide` and
 * `ecg` are OHIF's own words. `planar` is the Cornerstone3D type of a stack
 * and of a volume: it does not say the shape, and stands for a stack, which is
 * what OHIF shows when no viewport type is given. The other Cornerstone3D type
 * strings (`volume3d`, `video`, `wholeSlide`, `ecg`) are OHIF's words too.
 */
const VIEWPORT_TYPES: Record<string, ViewportTypeEntry> = {
  stack: { type: Enums.ViewportType.PLANAR, shape: 'stack' },
  volume: { type: Enums.ViewportType.PLANAR, shape: 'volume' },
  orthographic: { type: Enums.ViewportType.PLANAR, shape: 'volume' },
  volume3d: { type: Enums.ViewportType.VOLUME_3D, shape: 'volume3d' },
  video: { type: Enums.ViewportType.VIDEO, shape: 'other' },
  wholeslide: { type: Enums.ViewportType.WHOLE_SLIDE, shape: 'other' },
  ecg: { type: Enums.ViewportType.ECG, shape: 'other' },
  planar: { type: Enums.ViewportType.PLANAR, shape: 'stack' },
};

/**
 * The entry of a viewport type word. The viewport type of the first display
 * set, when it has one, wins over the word.
 */
function getViewportTypeEntry(
  viewportType: string,
  displaySets?: Types.DisplaySet[]
): ViewportTypeEntry {
  const lowerViewportType =
    displaySets?.[0]?.viewportType?.toLowerCase() || viewportType.toLowerCase();
  const entry = VIEWPORT_TYPES[lowerViewportType];

  if (!entry) {
    throw new Error(
      `Invalid viewport type: ${viewportType}. Valid types are: stack, volume, orthographic, volume3d, video, wholeslide, ecg`
    );
  }

  return entry;
}

/**
 * The Cornerstone3D viewport type (`PLANAR`, `VOLUME_3D`, `VIDEO`,
 * `WHOLE_SLIDE` or `ECG`) for a viewport type word of OHIF. A Cornerstone3D
 * type string gives the same type back, so a type that was stored can be
 * passed in again.
 */
export default function getCornerstoneViewportType(
  viewportType: string,
  displaySets?: Types.DisplaySet[]
): Enums.ViewportType {
  return getViewportTypeEntry(viewportType, displaySets).type;
}

/**
 * The shape of the data (a stack, a volume, a 3D volume or other) that a
 * viewport type word of OHIF asks for.
 */
export function getDataShapeForViewportType(
  viewportType: string,
  displaySets?: Types.DisplaySet[]
): ViewportShape {
  return getViewportTypeEntry(viewportType, displaySets).shape;
}
