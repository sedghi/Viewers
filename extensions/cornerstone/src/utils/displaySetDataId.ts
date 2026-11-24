/**
 * The shapes in which a planar viewport shows a display set: its images as a
 * stack, or a volume of them. Cornerstone draws a registration with a
 * `volumeId` as a volume, so each shape needs a registration, and so a data id,
 * of its own.
 */
export type DataIdShape = 'stack' | 'volume';

/** Between the display set UID and the shape in a data id that names a shape. */
const SHAPE_SEPARATOR = '::';

/**
 * The data id under which a display set is registered for a shape. A display
 * set keeps its UID as data id, so a series shown one way has one data id,
 * its UID. Only while the UID is registered for the other shape (a series
 * shown as a stack in one viewport and as a volume in another) does the
 * second shape get a data id of its own: the UID, `::` and the shape
 * (`<uid>::stack` or `<uid>::volume`).
 *
 * @param displaySetInstanceUID - The display set.
 * @param shape - The shape it is mounted in.
 * @param shapeOfUID - The shape the UID is registered for now, if it is.
 */
export function getDataIdForShape(
  displaySetInstanceUID: string,
  shape: DataIdShape,
  shapeOfUID?: DataIdShape
): string {
  if (!shapeOfUID || shapeOfUID === shape) {
    return displaySetInstanceUID;
  }

  return `${displaySetInstanceUID}${SHAPE_SEPARATOR}${shape}`;
}

/**
 * The display set UID of a data id: the data id up to `::`, or all of it when
 * it names no shape.
 */
export function getDisplaySetUIDForDataId(dataId: string): string {
  const end = dataId.indexOf(SHAPE_SEPARATOR);

  return end === -1 ? dataId : dataId.slice(0, end);
}
