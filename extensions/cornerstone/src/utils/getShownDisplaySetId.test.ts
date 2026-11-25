import type { Types } from '@cornerstonejs/core';
import { getShownDisplaySetId } from './getShownDisplaySetId';

function viewportShowing(...displaySetIds: string[]): Types.IViewport {
  return {
    getDisplaySets: () => displaySetIds.map(displaySetId => ({ displaySetId })),
  } as Pick<Types.IViewport, 'getDisplaySets'> as Types.IViewport;
}

describe('getShownDisplaySetId', () => {
  it('gives the UID when the viewport shows nothing yet', () => {
    expect(getShownDisplaySetId(viewportShowing(), 'ct')).toBe('ct');
  });

  it('gives the UID of a display set that the viewport shows', () => {
    expect(getShownDisplaySetId(viewportShowing('ct', 'pt'), 'pt')).toBe('pt');
  });

  it('gives undefined for a display set that the viewport does not show, as an SR', () => {
    expect(getShownDisplaySetId(viewportShowing('mr'), 'sr')).toBeUndefined();
  });
});
