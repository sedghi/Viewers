import type { Types } from '@cornerstonejs/core';

/**
 * The UID of a display set when the viewport shows it, to address its
 * appearance; also when the viewport shows nothing yet. Undefined when the
 * viewport shows other display sets and not this one, as an SR, SEG or
 * RTSTRUCT viewport shows the images that they reference: a call without a
 * UID then addresses the source of the viewport.
 */
export function getShownDisplaySetId(
  viewport: Types.IViewport,
  displaySetInstanceUID: string
): string | undefined {
  const shown = viewport.getDisplaySets().map(({ displaySetId }) => displaySetId);

  if (!shown.length || shown.includes(displaySetInstanceUID)) {
    return displaySetInstanceUID;
  }

  return undefined;
}
