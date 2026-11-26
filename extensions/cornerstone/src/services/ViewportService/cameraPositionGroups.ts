import { utilities as csUtils } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
import type { Synchronizer } from '@cornerstonejs/tools';

/** The sync group type that keeps the panes of one orientation on one position. */
export const CAMERA_POSITION_SYNC_TYPE = 'cameraposition';

type SyncGroupEntry = string | { type: string; id?: string; source?: boolean };

/** What the placement of a pane reads of the other panes of its groups. */
export interface CameraPositionGroupContext {
  /** The camera position synchronizers of the pane. */
  synchronizers: Synchronizer[];
  /** The viewport of a pane of the groups, by its id. */
  getViewport: (viewportId: string) => Types.IViewport | undefined;
  /** The place of a pane in the layout, to rank panes of one slice step. */
  getLayoutIndex: (viewportId: string) => number;
  /** The distance between two slices of the view of a pane. */
  getSliceStep?: (viewport: Types.IViewport) => number;
}

/**
 * The ids of the camera position sync groups that a pane drives: the groups
 * of type `cameraPosition` of its viewport options in which it is a source.
 */
export function getCameraPositionSyncGroupIds(syncGroups: SyncGroupEntry[] = []): string[] {
  return syncGroups
    .map(syncGroup => (typeof syncGroup === 'string' ? { type: syncGroup } : syncGroup))
    .filter(
      syncGroup =>
        syncGroup.type?.toLowerCase() === CAMERA_POSITION_SYNC_TYPE && syncGroup.source !== false
    )
    .map(syncGroup => syncGroup.id ?? syncGroup.type);
}

/**
 * The distance between two slices of the view of a planar volume pane, the
 * step of its slice grid along the view.
 */
export function getViewSliceStep(viewport: Types.IViewport): number {
  const camera = (
    viewport as Types.IViewport & {
      getResolvedView?: () => { toICamera: () => Types.ICamera };
    }
  )
    .getResolvedView?.()
    ?.toICamera();

  if (!camera) {
    return Infinity;
  }

  try {
    return csUtils.getTargetVolumeAndSpacingInNormalDir(viewport as never, camera)
      .spacingInNormalDirection;
  } catch {
    return Infinity;
  }
}

/**
 * Stops a pane from driving its camera position synchronizers while it
 * mounts, so its first slice, which is its own default, does not move the
 * panes of its groups. It stays a target. Returns the synchronizers to give
 * back with `drive`.
 */
export function holdCameraPositionSync(
  viewport: Types.IViewport,
  synchronizers: Synchronizer[]
): Synchronizer[] {
  const self = { renderingEngineId: viewport.renderingEngineId, viewportId: viewport.id };

  return synchronizers.filter(synchronizer => {
    if (!synchronizer.hasSourceViewport(self.renderingEngineId, self.viewportId)) {
      return false;
    }
    synchronizer.removeSource(self);
    return true;
  });
}

/** Lets a pane drive the synchronizers that `holdCameraPositionSync` took from it. */
export function driveCameraPositionSync(
  viewport: Types.IViewport,
  synchronizers: Synchronizer[]
): void {
  const self = { renderingEngineId: viewport.renderingEngineId, viewportId: viewport.id };

  synchronizers.forEach(synchronizer => synchronizer.addSource(self));
}

/** Whether a pane shows data, so it has a slice that the others can go to. */
function hasPosition(viewport: Types.IViewport): boolean {
  if ((viewport as { getCurrentMode?: () => string }).getCurrentMode?.() === 'empty') {
    return false;
  }

  try {
    return Boolean(viewport.getViewReference?.()?.cameraFocalPoint);
  } catch {
    return false;
  }
}

/**
 * Puts a pane on the slice through a point, as a view reference of a point
 * and a plane, without driving its synchronizers, so the move stays its own.
 */
function moveToPoint(
  viewport: Types.IViewport,
  reference: Types.ViewReference,
  synchronizers: Synchronizer[]
): void {
  const held = holdCameraPositionSync(viewport, synchronizers);
  viewport.setViewReference({
    FrameOfReferenceUID: reference.FrameOfReferenceUID,
    viewPlaneNormal: reference.viewPlaneNormal,
    cameraFocalPoint: reference.cameraFocalPoint,
  });
  viewport.render();
  driveCameraPositionSync(viewport, held);
}

/**
 * Puts a volume pane that has just mounted on the one position of its camera
 * position sync groups, and lets it drive them again (`held`: what
 * `holdCameraPositionSync` took from it before the mount).
 *
 * The panes of a group open on the initial slice of the pane whose slice grid
 * is the finest along the view (the CT of a PET/CT), the first in the layout
 * among panes of one step; every other pane goes to the point of that slice,
 * as a point and a plane, and shows its own slice nearest to it. The rank does
 * not depend on the order of the mounts: a pane that ranks before the panes
 * placed so far takes them to its slice, one move each, and a pane that ranks
 * after them goes to their position. A pane restored from its own stored
 * position (`keepOwnPosition`) keeps it.
 */
export function placeInCameraPositionGroups(
  viewport: Types.IViewport,
  held: Synchronizer[],
  context: CameraPositionGroupContext,
  keepOwnPosition = false
): void {
  const { synchronizers, getViewport, getLayoutIndex, getSliceStep = getViewSliceStep } = context;

  const placed = new Map<string, Types.IViewport>();
  for (const synchronizer of synchronizers) {
    for (const { viewportId } of synchronizer.getSourceViewports()) {
      const member = viewportId !== viewport.id && getViewport(viewportId);
      if (member && hasPosition(member)) {
        placed.set(viewportId, member);
      }
    }
  }

  if (keepOwnPosition || !placed.size) {
    driveCameraPositionSync(viewport, held);
    return;
  }

  const rank = (pane: Types.IViewport): [number, number] => [
    Math.round(getSliceStep(pane) * 1e4) / 1e4,
    getLayoutIndex(pane.id),
  ];
  const ranksBefore = (a: [number, number], b: [number, number]) =>
    a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);

  const anchor = [...placed.values()].reduce((best, pane) =>
    ranksBefore(rank(pane), rank(best)) ? pane : best
  );

  if (ranksBefore(rank(viewport), rank(anchor))) {
    const reference = viewport.getViewReference();
    placed.forEach(member => moveToPoint(member, reference, synchronizers));
    driveCameraPositionSync(viewport, held);
    return;
  }

  moveToPoint(viewport, anchor.getViewReference(), []);
  driveCameraPositionSync(viewport, held);
}
