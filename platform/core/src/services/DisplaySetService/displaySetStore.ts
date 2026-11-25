import { metaData, displaySetRegistry, registerDisplaySetProviders } from '@cornerstonejs/metadata';
import { DisplaySet } from '../../types';

/**
 * Storage adapter that keeps OHIF display sets in `displaySetRegistry` of
 * `@cornerstonejs/metadata`, the one store of display sets: its
 * `MetadataModules.DISPLAY_SET` typed cache, keyed by `displaySetInstanceUID`.
 * The registry keeps the display set object itself, so a viewport that mounts
 * a display set by its `displaySetInstanceUID` reads this object (its
 * `imageIds`, its `instance`, its `volumeId`), and
 * `metaData.getTyped(Enums.MetadataModules.DISPLAY_SET, uid)` gives it too.
 * Each display set is added once, when it is made or replaced (an
 * `addInstances` merge, an `extendInstances` growth, an SR re-hydration), and
 * removed when it is deleted; nothing is registered when a viewport mounts it.
 * A mount copies what it reads, so a display set that grew is seen with its new
 * images by the next mount.
 *
 * The registry has no enumeration API, so a module-level UID index is kept
 * for iteration.  The index is module-level (like the previous module-level
 * `displaySetCache` map) so all service instances share the same store.
 *
 * ### Lifetime
 *
 * Display sets live for the duration of a mode and are discarded on mode exit.
 * Two things clear them, and both are intended:
 *
 * - `DisplaySetService.onModeExit()` calls {@link clearDisplaySets}, which
 *   removes this store's own UIDs;
 * - `@ohif/extension-cornerstone`'s `onModeExit` calls
 *   `utilities.clearCacheData()`, releasing the whole typed metadata registry
 *   (naturalized instances hold Part 10 buffers outside the size-capped image
 *   cache). That takes the DISPLAY_SET module with it.
 *
 * The ordering is safe by construction: `mode.onModeExit` runs before either,
 * so a mode that wants to carry display sets across a mode change snapshots
 * them there and re-adds them with `addDisplaySets` on re-entry.
 *
 * A display set is therefore never expected to outlive its mode. Code that
 * needs one later must hold its own reference — not a `displaySetInstanceUID`
 * to look up afterwards.
 *
 * ### Planned: a true store
 *
 * This module is an adapter today, not a zustand store. The name is kept
 * because a later change replaces it with the vanilla zustand
 * `displaySetStore` of `@cornerstonejs/metadata` (cornerstonejs/cornerstone3D#3059).
 * That store keeps display sets as immutable records: changes go through
 * `update` / `modify` calls, and in-place writes to a display set stop
 * working.
 */
const displaySetUIDs = new Set<string>();

let providersRegistered = false;

/**
 * Registers the DISPLAY_SET typed providers plus the typed-provider bridge so
 * `metaData.getTyped(DISPLAY_SET, uid)` resolves even when
 * `registerDefaultProviders()` has not run (e.g. in tests).  Guarded so it
 * only runs once; `addProvider` dedupes the bridge by function identity, so
 * this cannot double-register relative to `registerDefaultProviders()`.
 */
export function ensureDisplaySetMetadataProviders(): void {
  if (providersRegistered) {
    return;
  }
  providersRegistered = true;
  metaData.addProvider(metaData.metadataModuleProvider, -1000);
  registerDisplaySetProviders();
}

/**
 * Registers a display set with `displaySetRegistry.add` under its
 * `displaySetInstanceUID`, replacing any previous value for the same UID
 * (matching `Map.set` semantics). The registry keeps this object: no copy.
 */
export function setDisplaySet(displaySet: DisplaySet): void {
  ensureDisplaySetMetadataProviders();
  const uid = displaySet.displaySetInstanceUID;
  displaySetRegistry.add(uid, displaySet);
  displaySetUIDs.add(uid);
}

/**
 * Retrieves a display set by UID.  Prunes the UID index when the underlying
 * typed cache entry has been cleared externally — by the cornerstone
 * extension's mode-exit `utilities.clearCacheData()`, or by a loader
 * re-initialization — so a wiped entry reads as absent rather than as a stale
 * UID this store still believes in.
 */
export function getDisplaySet(uid: string): DisplaySet | undefined {
  const value = displaySetRegistry.get(uid) as DisplaySet | undefined;
  if (value === undefined && displaySetUIDs.has(uid)) {
    displaySetUIDs.delete(uid);
  }
  return value;
}

export function hasDisplaySet(uid: string): boolean {
  return getDisplaySet(uid) !== undefined;
}

/** Removes a display set from the store. */
export function deleteDisplaySet(uid: string): boolean {
  const existed = displaySetUIDs.delete(uid);
  displaySetRegistry.remove(uid);
  return existed;
}

/**
 * Removes every display set owned by this store.  Removes per-UID rather than
 * clearing the whole registry so display sets that other code registered
 * survive.
 *
 * Called from `DisplaySetService.onModeExit()`.  The cornerstone extension's
 * own mode-exit `clearCacheData()` is broader and may get there first; either
 * order leaves the store empty, which is the intent.
 */
export function clearDisplaySets(): void {
  for (const uid of displaySetUIDs) {
    displaySetRegistry.remove(uid);
  }
  displaySetUIDs.clear();
}

/** All stored display sets in insertion order (matching Map iteration order). */
export function getAllDisplaySets(): DisplaySet[] {
  const result: DisplaySet[] = [];
  for (const uid of [...displaySetUIDs]) {
    const displaySet = getDisplaySet(uid);
    if (displaySet) {
      result.push(displaySet);
    }
  }
  return result;
}

/**
 * A snapshot map of the stored display sets, keyed by UID.  Returned by the
 * deprecated `DisplaySetService.getDisplaySetCache()` — mutating the snapshot
 * has no effect on the store.
 */
export function getDisplaySetSnapshot(): Map<string, DisplaySet> {
  return new Map(getAllDisplaySets().map(ds => [ds.displaySetInstanceUID, ds]));
}
