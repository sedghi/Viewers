import {
  Enums,
  metaData,
  displaySetRegistry,
  utilities as csMetadataUtilities,
} from '@cornerstonejs/metadata';
import * as displaySetStore from './displaySetStore';

const makeDisplaySet = (uid: string, extra: Record<string, unknown> = {}) =>
  ({ displaySetInstanceUID: uid, SeriesInstanceUID: `series-${uid}`, ...extra }) as any;

describe('displaySetStore', () => {
  beforeEach(() => {
    displaySetStore.clearDisplaySets();
  });

  it('round-trips set/get/has', () => {
    const displaySet = makeDisplaySet('uid-1');
    displaySetStore.setDisplaySet(displaySet);
    expect(displaySetStore.getDisplaySet('uid-1')).toBe(displaySet);
    expect(displaySetStore.hasDisplaySet('uid-1')).toBe(true);
    expect(displaySetStore.getDisplaySet('missing')).toBeUndefined();
  });

  it('overwrites silently on duplicate set (no console.warn)', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const first = makeDisplaySet('uid-1', { generation: 1 });
      const second = makeDisplaySet('uid-1', { generation: 2 });
      displaySetStore.setDisplaySet(first);
      displaySetStore.setDisplaySet(second);
      expect(displaySetStore.getDisplaySet('uid-1')).toBe(second);
      expect(displaySetStore.getAllDisplaySets()).toHaveLength(1);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('deletes display sets', () => {
    displaySetStore.setDisplaySet(makeDisplaySet('uid-1'));
    expect(displaySetStore.deleteDisplaySet('uid-1')).toBe(true);
    expect(displaySetStore.getDisplaySet('uid-1')).toBeUndefined();
    expect(displaySetStore.deleteDisplaySet('uid-1')).toBe(false);
  });

  it('clears all display sets', () => {
    displaySetStore.setDisplaySet(makeDisplaySet('uid-1'));
    displaySetStore.setDisplaySet(makeDisplaySet('uid-2'));
    displaySetStore.clearDisplaySets();
    expect(displaySetStore.getAllDisplaySets()).toEqual([]);
  });

  it('preserves insertion order in getAllDisplaySets', () => {
    const uids = ['b', 'a', 'c'];
    uids.forEach(uid => displaySetStore.setDisplaySet(makeDisplaySet(uid)));
    expect(displaySetStore.getAllDisplaySets().map(ds => ds.displaySetInstanceUID)).toEqual(uids);
  });

  it('returns an independent snapshot map', () => {
    displaySetStore.setDisplaySet(makeDisplaySet('uid-1'));
    const snapshot = displaySetStore.getDisplaySetSnapshot();
    expect(snapshot.get('uid-1')).toBeDefined();
    snapshot.clear();
    expect(displaySetStore.getDisplaySet('uid-1')).toBeDefined();
    expect(displaySetStore.getDisplaySetSnapshot()).not.toBe(snapshot);
  });

  it('interops with metaData.getTyped through the DISPLAY_SET module', () => {
    const displaySet = makeDisplaySet('uid-typed');
    displaySetStore.setDisplaySet(displaySet);
    expect(metaData.getTyped(Enums.MetadataModules.DISPLAY_SET, 'uid-typed')).toBe(displaySet);
  });

  it('registers the display set object itself in displaySetRegistry', () => {
    const displaySet = makeDisplaySet('uid-registered', { imageIds: ['a', 'b'] });
    displaySetStore.setDisplaySet(displaySet);
    expect(displaySetRegistry.has('uid-registered')).toBe(true);
    expect(displaySetRegistry.get('uid-registered')).toBe(displaySet);
    expect(displaySet).not.toHaveProperty('displaySetId');
  });

  it('gives the registry the images of a display set that grew', () => {
    const displaySet = makeDisplaySet('uid-grows', { imageIds: ['a'] });
    displaySetStore.setDisplaySet(displaySet);
    displaySet.imageIds = ['a', 'b'];
    expect(displaySetRegistry.get('uid-grows')?.imageIds).toEqual(['a', 'b']);
  });

  it('replaces the registration when a display set is stored again', () => {
    displaySetStore.setDisplaySet(makeDisplaySet('uid-1', { generation: 1 }));
    const second = makeDisplaySet('uid-1', { generation: 2 });
    displaySetStore.setDisplaySet(second);
    expect(displaySetRegistry.get('uid-1')).toBe(second);
  });

  it('removes the registration when a display set is deleted', () => {
    displaySetStore.setDisplaySet(makeDisplaySet('uid-1'));
    displaySetStore.deleteDisplaySet('uid-1');
    expect(displaySetRegistry.has('uid-1')).toBe(false);
  });

  it('removes its own registrations on clearDisplaySets and keeps the others', () => {
    displaySetRegistry.add('other-code', { imageIds: ['x'] });
    displaySetStore.setDisplaySet(makeDisplaySet('uid-1'));
    displaySetStore.setDisplaySet(makeDisplaySet('uid-2'));
    displaySetStore.clearDisplaySets();
    expect(displaySetRegistry.has('uid-1')).toBe(false);
    expect(displaySetRegistry.has('uid-2')).toBe(false);
    expect(displaySetRegistry.has('other-code')).toBe(true);
    displaySetRegistry.remove('other-code');
  });

  it('survives an external typed-cache wipe by pruning its index', () => {
    displaySetStore.setDisplaySet(makeDisplaySet('uid-1'));
    csMetadataUtilities.clearCacheData();
    expect(displaySetStore.getDisplaySet('uid-1')).toBeUndefined();
    expect(displaySetStore.getAllDisplaySets()).toEqual([]);
  });

  it('does not clear cs3d-native DISPLAY_SET entries on clearDisplaySets', () => {
    const nativeKey = 'wadors://example/native-image-id';
    csMetadataUtilities.setCacheData(Enums.MetadataModules.DISPLAY_SET, nativeKey, {
      displaySetId: 'native',
    });
    displaySetStore.setDisplaySet(makeDisplaySet('uid-1'));
    displaySetStore.clearDisplaySets();
    expect(csMetadataUtilities.getCacheData(Enums.MetadataModules.DISPLAY_SET, nativeKey)).toEqual({
      displaySetId: 'native',
    });
    csMetadataUtilities.clearTypedCacheData(Enums.MetadataModules.DISPLAY_SET, nativeKey);
  });
});
