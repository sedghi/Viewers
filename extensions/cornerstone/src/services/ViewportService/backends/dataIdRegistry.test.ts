import { utilities as csUtils } from '@cornerstonejs/core';
import { DataIdRegistry, type DataIdPayload } from './dataIdRegistry';

const provider = csUtils.genericViewportDisplaySetMetadataProvider;

const imageIds = ['image-0', 'image-1', 'image-2'];
const stack: DataIdPayload = { kind: 'planar', imageIds };
const volume: DataIdPayload = { kind: 'planar', imageIds, volumeId: 'volumeLoader:ct' };

/** The registration that cornerstone reads for a data id. */
const registered = (dataId: string) =>
  provider.get(provider.VIEWPORT_V2_DISPLAY_SET, dataId) as
    | { imageIds?: string[]; volumeId?: string }
    | undefined;

describe('DataIdRegistry', () => {
  let registry: DataIdRegistry;

  beforeEach(() => {
    registry = new DataIdRegistry();
  });

  afterEach(() => {
    registry.destroy();
  });

  it('gives a stack mount after a volume one a data id of its own', () => {
    expect(registry.register('mpr-axial', 'ct', volume)).toBe('ct');
    expect(registry.register('stack', 'ct', stack)).toBe('ct::stack');

    expect(registered('ct').volumeId).toBe('volumeLoader:ct');
    expect(registered('ct::stack').volumeId).toBeUndefined();
    expect(registered('ct::stack').imageIds).toEqual(imageIds);
  });

  it('gives a volume mount after a stack one a data id of its own', () => {
    expect(registry.register('stack', 'ct', stack)).toBe('ct');
    expect(registry.register('mpr-axial', 'ct', volume)).toBe('ct::volume');

    expect(registered('ct').volumeId).toBeUndefined();
    expect(registered('ct::volume').volumeId).toBe('volumeLoader:ct');
  });

  it('gives the panes of one shape the UID, until the last one is released', () => {
    for (const viewportId of ['mpr-axial', 'mpr-sagittal', 'mpr-coronal']) {
      expect(registry.register(viewportId, 'ct', volume)).toBe('ct');
    }

    registry.releaseViewport('mpr-axial');
    registry.releaseViewport('mpr-sagittal');
    expect(registered('ct').volumeId).toBe('volumeLoader:ct');

    registry.releaseViewport('mpr-coronal');
    expect(registered('ct')).toBeUndefined();
  });

  it('shows the same display set in both shapes at once', () => {
    registry.register('mpr-axial', 'ct', volume);
    registry.register('mpr-sagittal', 'ct', volume);
    registry.register('stack-1', 'ct', stack);
    registry.register('stack-2', 'ct', stack);

    expect(registered('ct').volumeId).toBe('volumeLoader:ct');
    expect(registered('ct::stack').volumeId).toBeUndefined();

    registry.releaseViewport('stack-1');
    expect(registry.register('stack-3', 'ct', stack)).toBe('ct::stack');
  });

  it('keeps the UID while the display set shows under its other data id', () => {
    registry.register('stack', 'ct', stack);
    registry.register('mpr-axial', 'ct', volume);

    registry.releaseViewport('stack');

    expect(registered('ct').imageIds).toEqual(imageIds);
  });

  it('keeps the data id of a second shape after its last viewport, until it is destroyed', () => {
    registry.register('mpr-axial', 'ct', volume);
    registry.register('stack', 'ct', stack);

    registry.releaseViewport('stack');
    registry.releaseViewport('mpr-axial');

    expect(registered('ct')).toBeUndefined();
    expect(registered('ct::stack').imageIds).toEqual(imageIds);

    registry.destroy();
    expect(registered('ct::stack')).toBeUndefined();
  });

  it('gives a remount of the same shape the same data id', () => {
    expect(registry.register('stack', 'ct', stack)).toBe('ct');
    expect(registry.register('stack', 'ct', stack)).toBe('ct');

    registry.releaseViewport('stack');
    expect(registered('ct')).toBeUndefined();
  });

  it('gives a remount in the other shape a data id of its own while the first is registered', () => {
    expect(registry.register('default', 'ct', stack)).toBe('ct');
    expect(registry.register('default', 'ct', volume)).toBe('ct::volume');
    expect(registry.register('default', 'ct', stack)).toBe('ct');
  });

  it('gives the UID to the next mount once the display set is released, in either shape', () => {
    registry.register('mpr-axial', 'ct', volume);
    registry.releaseViewport('mpr-axial');

    expect(registry.register('stack', 'ct', stack)).toBe('ct');
    expect(registered('ct').volumeId).toBeUndefined();
  });

  it('keeps the UID for video, ECG and slide registrations', () => {
    expect(registry.register('video', 'video-1', { kind: 'video', sourceDataId: 'v' })).toBe(
      'video-1'
    );
    expect(registry.register('ecg', 'ecg-1', { kind: 'ecg', sourceDataId: 'e' })).toBe('ecg-1');
    expect(
      registry.register('wsi', 'wsi-1', { kind: 'wsi', imageIds, options: { webClient: {} } })
    ).toBe('wsi-1');
  });
});
