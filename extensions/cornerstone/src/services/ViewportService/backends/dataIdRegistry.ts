import { utilities as csUtils } from '@cornerstonejs/core';
import {
  getDataIdForShape,
  getDisplaySetUIDForDataId,
  type DataIdShape,
} from '../../../utils/displaySetDataId';

/**
 * Payload registered with cornerstone's global GenericViewport dataset metadata
 * provider. The shape is family-specific and mirrors what each native viewport's
 * data provider reads (see the cornerstone genericViewport examples):
 *   - planar : imageIds (+ optional volumeId) — stack / volume-slice / MPR / 3D
 *   - video  : sourceDataId (the video imageId)
 *   - ecg    : sourceDataId (the waveform imageId)
 *   - wsi    : imageIds + a DICOMweb webClient used to fetch tiles
 */
export type DataIdPayload =
  | { kind: 'planar'; imageIds: string[]; volumeId?: string; initialImageIdIndex?: number }
  | { kind: 'video' | 'ecg'; sourceDataId: string }
  | { kind: 'wsi'; imageIds: string[]; options: { webClient: unknown } };

/**
 * The shape of a payload: a planar payload that names a volume is a volume,
 * any other planar payload a stack. Video, ECG and slide payloads have none:
 * their display sets are shown one way only.
 */
function getPayloadShape(payload: DataIdPayload | undefined): DataIdShape | undefined {
  if (payload?.kind !== 'planar') {
    return undefined;
  }

  return payload.volumeId ? 'volume' : 'stack';
}

/**
 * Owns the lifecycle of OHIF's `dataId` registrations against cornerstone's
 * process-global `genericViewportDisplaySetMetadataProvider` (see migration plan §4.7).
 *
 * Why this exists: cornerstone's `removeData`/`setDisplaySets` do NOT garbage-collect
 * the global registration store (upstream blocker CS-18), so OHIF must own add/remove.
 * The MPR triptych mounts the SAME `dataId` (the displaySetInstanceUID-derived volume)
 * from N panes, so a naive add-on-every-mount / never-remove both over-registers and
 * leaks. This registry ref-counts per `dataId` and keeps a per-viewport ledger so:
 *   - `provider.add` fires only on the 0 -> 1 transition,
 *   - `provider.remove` fires only on the 1 -> 0 transition,
 *   - unmounting one pane of a shared-volume triptych does not unregister data the
 *     other panes still need.
 *
 * A display set shown as a stack in one viewport and as a volume in another
 * needs two registrations: cornerstone draws a registration with a `volumeId`
 * as a volume. The registry names the data id of each mount by its shape
 * (`getDataIdForShape`): the display set UID, and `<uid>::stack` or
 * `<uid>::volume` for the second shape while the UID is registered for the
 * first. A payload never replaces the registration of another shape: a mounted
 * viewport reads its registration again, so its stack would turn into a volume.
 *
 * Every annotation keeps the data id of the viewport it was drawn on, and
 * cornerstone takes it on the other shape by the image ids of that
 * registration. So the registry keeps the registrations that a reference can
 * name: the UID while any data id of its display set is registered, and a
 * data id of a second shape until the registry is destroyed.
 *
 * Used by the viewport backend for all families.
 */
export class DataIdRegistry {
  // Global ref-count keyed by dataId (the provider store is a single global namespace).
  private readonly refCounts = new Map<string, number>();
  /** The payload of every data id that the provider has from this registry. */
  private readonly payloads = new Map<string, DataIdPayload>();
  // Per-viewport ledger of the dataIds it registered, to drive release on unmount.
  private readonly byViewport = new Map<string, string[]>();

  /**
   * Registers (or ref-bumps) a display set for a viewport, and gives the data
   * id to mount it by: the display set UID, or a data id of its own for a
   * second shape (see the class). Adds to the cornerstone provider only on the
   * first reference of that data id. Panes that share a data id give the same
   * payload (same imageIds/volumeId), so the first writer wins.
   */
  register(viewportId: string, displaySetInstanceUID: string, payload: DataIdPayload): string {
    const shape = getPayloadShape(payload);
    const dataId = shape
      ? getDataIdForShape(
          displaySetInstanceUID,
          shape,
          this.getRegisteredShape(displaySetInstanceUID)
        )
      : displaySetInstanceUID;
    const prev = this.refCounts.get(dataId) ?? 0;

    if (prev === 0) {
      csUtils.genericViewportDisplaySetMetadataProvider.add(dataId, payload);
      this.payloads.set(dataId, payload);
    }
    this.refCounts.set(dataId, prev + 1);

    const list = this.byViewport.get(viewportId) ?? [];
    list.push(dataId);
    this.byViewport.set(viewportId, list);

    return dataId;
  }

  /**
   * Releases every dataId a viewport registered (called on element disable).
   * When no data id of a display set is registered any more, its UID leaves the
   * provider; the data ids of a second shape stay (see the class).
   */
  releaseViewport(viewportId: string): void {
    const dataIds = this.byViewport.get(viewportId);
    if (!dataIds) {
      return;
    }
    for (const dataId of dataIds) {
      const next = (this.refCounts.get(dataId) ?? 1) - 1;
      if (next <= 0) {
        this.refCounts.delete(dataId);
      } else {
        this.refCounts.set(dataId, next);
      }
    }
    this.byViewport.delete(viewportId);

    for (const displaySetInstanceUID of new Set(dataIds.map(getDisplaySetUIDForDataId))) {
      if (
        this.payloads.has(displaySetInstanceUID) &&
        !this.isDisplaySetRegistered(displaySetInstanceUID)
      ) {
        this.payloads.delete(displaySetInstanceUID);
        csUtils.genericViewportDisplaySetMetadataProvider.remove(displaySetInstanceUID);
      }
    }
  }

  /**
   * Flushes all remaining registrations (called on service destroy). Removes each
   * dataId individually rather than `provider.clear()`, which would wipe
   * registrations owned by other rendering contexts / service instances.
   */
  destroy(): void {
    for (const dataId of this.payloads.keys()) {
      csUtils.genericViewportDisplaySetMetadataProvider.remove(dataId);
    }
    this.refCounts.clear();
    this.payloads.clear();
    this.byViewport.clear();
  }

  /** The shape that the UID of a display set is registered for, if it is registered. */
  private getRegisteredShape(displaySetInstanceUID: string): DataIdShape | undefined {
    if (!this.refCounts.has(displaySetInstanceUID)) {
      return undefined;
    }

    return getPayloadShape(this.payloads.get(displaySetInstanceUID));
  }

  /** Whether any data id of a display set is registered. */
  private isDisplaySetRegistered(displaySetInstanceUID: string): boolean {
    for (const dataId of this.refCounts.keys()) {
      if (getDisplaySetUIDForDataId(dataId) === displaySetInstanceUID) {
        return true;
      }
    }

    return false;
  }
}
