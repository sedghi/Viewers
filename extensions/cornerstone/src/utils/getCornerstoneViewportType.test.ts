import type { Types } from '@ohif/core';
import { Enums } from '@cornerstonejs/core';
import getCornerstoneViewportType, {
  getDataShapeForViewportType,
} from './getCornerstoneViewportType';

const { ViewportType } = Enums;

describe('getCornerstoneViewportType', () => {
  it('should return PLANAR when viewportType is stack', () => {
    expect(getCornerstoneViewportType('stack')).toBe(ViewportType.PLANAR);
  });

  it('should return PLANAR when viewportType is STACK (uppercase)', () => {
    expect(getCornerstoneViewportType('STACK')).toBe(ViewportType.PLANAR);
  });

  it('should return VIDEO when viewportType is video', () => {
    expect(getCornerstoneViewportType('video')).toBe(ViewportType.VIDEO);
  });

  it('should return WHOLE_SLIDE when viewportType is wholeslide', () => {
    expect(getCornerstoneViewportType('wholeslide')).toBe(ViewportType.WHOLE_SLIDE);
  });

  it('should return PLANAR when viewportType is volume', () => {
    expect(getCornerstoneViewportType('volume')).toBe(ViewportType.PLANAR);
  });

  it('should return PLANAR when viewportType is orthographic', () => {
    expect(getCornerstoneViewportType('orthographic')).toBe(ViewportType.PLANAR);
  });

  it('should return VOLUME_3D when viewportType is volume3d', () => {
    expect(getCornerstoneViewportType('volume3d')).toBe(ViewportType.VOLUME_3D);
  });

  it('should return ECG when viewportType is ecg', () => {
    expect(getCornerstoneViewportType('ecg')).toBe(ViewportType.ECG);
  });

  it('should throw error for invalid viewport type', () => {
    expect(() => getCornerstoneViewportType('invalid')).toThrow(
      'Invalid viewport type: invalid. Valid types are: stack, volume, orthographic, volume3d, video, wholeslide, ecg'
    );
  });

  it('should use displaySet viewportType when provided', () => {
    const displaySets = [{ viewportType: 'video' }] as Types.DisplaySet[];
    expect(getCornerstoneViewportType('volume', displaySets)).toBe(ViewportType.VIDEO);
  });

  it('should use displaySet viewportType with case insensitive matching', () => {
    const displaySets = [{ viewportType: 'VIDEO' }] as Types.DisplaySet[];
    expect(getCornerstoneViewportType('stack', displaySets)).toBe(ViewportType.VIDEO);
  });

  it('should fallback to viewportType when displaySet has no viewportType', () => {
    const displaySets = [{}] as Types.DisplaySet[];
    expect(getCornerstoneViewportType('volume3d', displaySets)).toBe(ViewportType.VOLUME_3D);
  });

  it('should handle empty displaySets array', () => {
    expect(getCornerstoneViewportType('stack', [])).toBe(ViewportType.PLANAR);
  });

  it('should handle null displaySets', () => {
    expect(getCornerstoneViewportType('video', null)).toBe(ViewportType.VIDEO);
  });

  it('should handle undefined displaySets', () => {
    expect(getCornerstoneViewportType('wholeslide', undefined)).toBe(ViewportType.WHOLE_SLIDE);
  });

  it('should return only types that Cornerstone3D 6.0 has', () => {
    const words = ['stack', 'volume', 'orthographic', 'volume3d', 'video', 'wholeslide', 'ecg'];
    const types = Object.values(ViewportType);

    words.forEach(word => {
      expect(types).toContain(getCornerstoneViewportType(word));
    });
  });

  it.each([
    ViewportType.PLANAR,
    ViewportType.VOLUME_3D,
    ViewportType.VIDEO,
    ViewportType.WHOLE_SLIDE,
    ViewportType.ECG,
  ])('should give a stored Cornerstone3D type back: %s', type => {
    expect(getCornerstoneViewportType(type)).toBe(type);
  });

  it('should not throw for a stored planar type', () => {
    expect(() => getCornerstoneViewportType('planar')).not.toThrow();
    expect(() => getDataShapeForViewportType('planar')).not.toThrow();
  });
});

describe('getDataShapeForViewportType', () => {
  it.each([
    ['stack', 'stack'],
    ['STACK', 'stack'],
    ['volume', 'volume'],
    ['orthographic', 'volume'],
    ['volume3d', 'volume3d'],
    ['video', 'other'],
    ['wholeslide', 'other'],
    ['ecg', 'other'],
  ])('should give the shape of %s: %s', (word, shape) => {
    expect(getDataShapeForViewportType(word)).toBe(shape);
  });

  it('should take a planar type without a shape as a stack', () => {
    expect(getDataShapeForViewportType(ViewportType.PLANAR)).toBe('stack');
  });

  it('should throw error for invalid viewport type', () => {
    expect(() => getDataShapeForViewportType('invalid')).toThrow('Invalid viewport type: invalid');
  });

  it('should use displaySet viewportType when provided', () => {
    const stackDisplaySets = [{ viewportType: 'stack' }] as Types.DisplaySet[];
    const volumeDisplaySets = [{ viewportType: 'volume' }] as Types.DisplaySet[];

    expect(getDataShapeForViewportType('volume', stackDisplaySets)).toBe('stack');
    expect(getDataShapeForViewportType('stack', volumeDisplaySets)).toBe('volume');
  });

  it('should fallback to viewportType when displaySet has no viewportType', () => {
    const displaySets = [{}] as Types.DisplaySet[];
    expect(getDataShapeForViewportType('volume', displaySets)).toBe('volume');
  });

  it('should handle empty displaySets array', () => {
    expect(getDataShapeForViewportType('stack', [])).toBe('stack');
  });
});
