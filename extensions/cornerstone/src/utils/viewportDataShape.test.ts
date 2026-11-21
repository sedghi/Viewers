import { Enums } from '@cornerstonejs/core';
import {
  getPrimaryViewportDatum,
  getSliceEventName,
  getViewportDataShape,
  getViewportSliceCount,
  isVolumeViewportData,
} from './viewportDataShape';

const { ViewportType, Events } = Enums;

const stackData = { viewportType: ViewportType.PLANAR, data: [{ imageIds: ['a', 'b', 'c'] }] };
const volumeData = {
  viewportType: ViewportType.PLANAR,
  data: [{ volumeId: 'volume-1', imageIds: ['a', 'b'] }],
};

describe('getViewportDataShape', () => {
  it('should give the stored shape', () => {
    expect(getViewportDataShape({ ...stackData, dataShapeType: 'stack' })).toBe('stack');
    expect(getViewportDataShape({ ...volumeData, dataShapeType: 'volume' })).toBe('volume');
    expect(getViewportDataShape({ ...volumeData, dataShapeType: 'volume3d' })).toBe('volume3d');
    expect(getViewportDataShape({ ...stackData, dataShapeType: 'other' })).toBe('other');
  });

  it('should give the stored shape before the data', () => {
    expect(getViewportDataShape({ ...volumeData, dataShapeType: 'stack' })).toBe('stack');
  });

  it('should read a planar viewportData without a stored shape from its data', () => {
    expect(getViewportDataShape(stackData)).toBe('stack');
    expect(getViewportDataShape(volumeData)).toBe('volume');
    expect(getViewportDataShape({ viewportType: ViewportType.PLANAR, data: [{}] })).toBe('other');
  });

  it('should read a viewportData without a viewport type from its data', () => {
    expect(getViewportDataShape({ data: [{ imageIds: ['a'] }] })).toBe('stack');
    expect(getViewportDataShape({ data: [{ volume: {} }] })).toBe('volume');
  });

  it('should read the other viewport types without a stored shape', () => {
    expect(getViewportDataShape({ ...volumeData, viewportType: ViewportType.VOLUME_3D })).toBe(
      'volume3d'
    );
    expect(getViewportDataShape({ ...stackData, viewportType: ViewportType.VIDEO })).toBe('other');
    expect(getViewportDataShape({ ...stackData, viewportType: ViewportType.WHOLE_SLIDE })).toBe(
      'other'
    );
    expect(getViewportDataShape({ ...stackData, viewportType: ViewportType.ECG })).toBe('other');
  });

  it('should give undefined without a viewportData', () => {
    expect(getViewportDataShape(undefined)).toBeUndefined();
    expect(getViewportDataShape(null)).toBeUndefined();
  });
});

describe('getPrimaryViewportDatum and isVolumeViewportData', () => {
  it('should give the first datum of an array and the datum of an object', () => {
    expect(getPrimaryViewportDatum(stackData)).toBe(stackData.data[0]);
    expect(getPrimaryViewportDatum({ data: { imageIds: ['a'] } })).toEqual({ imageIds: ['a'] });
  });

  it('should tell volume data from stack data', () => {
    expect(isVolumeViewportData(volumeData)).toBe(true);
    expect(isVolumeViewportData(stackData)).toBe(false);
  });
});

describe('getSliceEventName', () => {
  it('should give the new image event for a stack and for a volume', () => {
    expect(getSliceEventName({ ...stackData, dataShapeType: 'stack' })).toBe(Events.NEW_IMAGE);
    expect(getSliceEventName({ ...volumeData, dataShapeType: 'volume' })).toBe(Events.NEW_IMAGE);
    expect(getSliceEventName({ ...volumeData, dataShapeType: 'volume3d' })).toBe(Events.NEW_IMAGE);
  });

  it('should give the new image event for other data with image ids', () => {
    expect(
      getSliceEventName({ ...stackData, viewportType: ViewportType.VIDEO, dataShapeType: 'other' })
    ).toBe(Events.NEW_IMAGE);
  });

  it('should give the image rendered event for data without slices', () => {
    expect(
      getSliceEventName({ viewportType: ViewportType.ECG, dataShapeType: 'other', data: [{}] })
    ).toBe(Events.IMAGE_RENDERED);
  });
});

describe('getViewportSliceCount', () => {
  it('should count the image ids of a stack', () => {
    const viewport = { getNumberOfSlices: jest.fn().mockReturnValue(1) };

    expect(getViewportSliceCount(stackData, viewport)).toBe(3);
    expect(viewport.getNumberOfSlices).not.toHaveBeenCalled();
  });

  it('should ask the viewport for a volume', () => {
    const viewport = { getNumberOfSlices: jest.fn().mockReturnValue(40) };

    expect(getViewportSliceCount(volumeData, viewport)).toBe(40);
  });
});
