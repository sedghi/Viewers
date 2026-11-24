import { getDataIdForShape, getDisplaySetUIDForDataId } from './displaySetDataId';

describe('getDataIdForShape', () => {
  it('gives the UID when the UID is not registered', () => {
    expect(getDataIdForShape('ct', 'stack')).toBe('ct');
    expect(getDataIdForShape('ct', 'volume')).toBe('ct');
  });

  it('gives the UID for the shape that the UID is registered for', () => {
    expect(getDataIdForShape('ct', 'stack', 'stack')).toBe('ct');
    expect(getDataIdForShape('ct', 'volume', 'volume')).toBe('ct');
  });

  it('names the shape when the UID is registered for the other shape', () => {
    expect(getDataIdForShape('ct', 'stack', 'volume')).toBe('ct::stack');
    expect(getDataIdForShape('ct', 'volume', 'stack')).toBe('ct::volume');
  });
});

describe('getDisplaySetUIDForDataId', () => {
  it('gives the UID back from each data id of a display set', () => {
    expect(getDisplaySetUIDForDataId('ct')).toBe('ct');
    expect(getDisplaySetUIDForDataId('ct::stack')).toBe('ct');
    expect(getDisplaySetUIDForDataId('ct::volume')).toBe('ct');
    expect(getDisplaySetUIDForDataId('ct::overlay')).toBe('ct');
  });

  it('gives back a data id that names no shape as it is', () => {
    const uid = '1.2.840.113619.2.5.1762583153';

    expect(getDisplaySetUIDForDataId(uid)).toBe(uid);
  });
});
