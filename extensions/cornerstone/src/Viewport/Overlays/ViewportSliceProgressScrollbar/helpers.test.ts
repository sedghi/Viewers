import { getImageIndexFromEvent } from './helpers';

describe('getImageIndexFromEvent', () => {
  it('reads the slice index of a NEW_IMAGE event', () => {
    const event = { detail: { sliceIndex: 7, numberOfSlices: 52, displaySetId: 'ct' } };

    expect(getImageIndexFromEvent(event)).toBe(7);
  });

  it('reads slice 0, the first slice', () => {
    expect(getImageIndexFromEvent({ detail: { sliceIndex: 0 } })).toBe(0);
  });

  it('gives undefined for an event that names no slice, as IMAGE_RENDERED', () => {
    expect(getImageIndexFromEvent({ detail: {} })).toBeUndefined();
  });
});
