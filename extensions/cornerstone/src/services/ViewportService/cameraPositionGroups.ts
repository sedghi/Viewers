import { cache, utilities as csUtils } from '@cornerstonejs/core';
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
 * The step of the slice grid of a pane along a view plane normal, from the
 * volumes that it is about to mount: the finest of them, as
 * `getViewSliceStep` gives it once they are mounted. It is the thickness of
 * one voxel along the normal (`utilities.voxelSlab.getVoxelThicknessAlongNormal`),
 * the step of Cornerstone3D's default `rendering.sliceStepMeasure` ('l1'),
 * which OHIF keeps.
 */
export function getMountSliceStep(volumeIds: string[], viewPlaneNormal: Types.Point3): number {
  const steps = volumeIds
    .map(volumeId => cache.getVolume(volumeId))
    .filter(Boolean)
    .map(volume => csUtils.voxelSlab.getVoxelThicknessAlongNormal(volume, viewPlaneNormal));

  return steps.length ? Math.min(...steps) : Infinity;
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

/** The point and the plane of a view reference, without its slice and its data. */
function toPointReference(reference: Types.ViewReference): Types.ViewReference {
  return {
    FrameOfReferenceUID: reference.FrameOfReferenceUID,
    viewPlaneNormal: reference.viewPlaneNormal,
    cameraFocalPoint: reference.cameraFocalPoint,
  };
}

/**
 * Whether the camera of a pane is on the plane through the point of a view
 * reference, as after a mount that started there or a move there.
 */
function isOnPlaneOf(viewport: Types.IViewport, reference: Types.ViewReference): boolean {
  const camera = (
    viewport as Types.IViewport & {
      getResolvedView?: () => { toICamera: () => Types.ICamera } | undefined;
    }
  )
    .getResolvedView?.()
    ?.toICamera();
  const { cameraFocalPoint: point, viewPlaneNormal: normal } = reference;

  if (!camera?.focalPoint || !camera.viewPlaneNormal || !point || !normal) {
    return false;
  }

  const alignment = Math.abs(
    camera.viewPlaneNormal[0] * normal[0] +
      camera.viewPlaneNormal[1] * normal[1] +
      camera.viewPlaneNormal[2] * normal[2]
  );
  const distance =
    (camera.focalPoint[0] - point[0]) * normal[0] +
    (camera.focalPoint[1] - point[1]) * normal[1] +
    (camera.focalPoint[2] - point[2]) * normal[2];

  return alignment > 1 - 1e-6 && Math.abs(distance) < 1e-6;
}

/**
 * Puts a pane on the slice through a point, as a view reference of a point
 * and a plane, without driving its synchronizers, so the move stays its own.
 * A pane that is on that plane already is not moved.
 */
function moveToPoint(
  viewport: Types.IViewport,
  reference: Types.ViewReference,
  synchronizers: Synchronizer[]
): void {
  if (isOnPlaneOf(viewport, reference)) {
    return;
  }

  const held = holdCameraPositionSync(viewport, synchronizers);
  viewport.setViewReference(toPointReference(reference));
  viewport.render();
  driveCameraPositionSync(viewport, held);
}

/** The panes of the groups of a pane, other than itself, that show a position. */
function getPlacedPanes(
  viewportId: string,
  { synchronizers, getViewport }: CameraPositionGroupContext
): Map<string, Types.IViewport> {
  const placed = new Map<string, Types.IViewport>();
  for (const synchronizer of synchronizers) {
    for (const { viewportId: memberId } of synchronizer.getSourceViewports()) {
      const member = memberId !== viewportId && getViewport(memberId);
      if (member && hasPosition(member)) {
        placed.set(memberId, member);
      }
    }
  }

  return placed;
}

type Rank = [number, number];

/** The rank of a pane in its groups: the step of its slice grid, then its place in the layout. */
function getRank(step: number, layoutIndex: number): Rank {
  return [Math.round(step * 1e4) / 1e4, layoutIndex];
}

function ranksBefore(a: Rank, b: Rank): boolean {
  return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
}

/** The placed pane of the finest slice grid, the first in the layout among panes of one step. */
function getAnchor(
  placed: Map<string, Types.IViewport>,
  { getLayoutIndex, getSliceStep = getViewSliceStep }: CameraPositionGroupContext
): { anchor: Types.IViewport; rank: Rank } {
  return [...placed.values()]
    .map(pane => ({ anchor: pane, rank: getRank(getSliceStep(pane), getLayoutIndex(pane.id)) }))
    .reduce((best, entry) => (ranksBefore(entry.rank, best.rank) ? entry : best));
}

/**
 * The position at which a volume pane of camera position sync groups starts,
 * as the `initialViewReference` of its mount, so that it draws no other
 * slice first: the point and the plane of the slice of its groups (the
 * placed pane of the finest slice grid, the first in the layout among panes
 * of one step), when the pane ranks after that pane. A pane that ranks
 * before it, or the first pane of its groups, starts on its own initial
 * slice and gets undefined; `placeInCameraPositionGroups` then takes the
 * others to it after its mount.
 *
 * @param viewportId - The pane that is about to mount.
 * @param getSliceStep - The step of the slice grid of the pane along a view
 * plane normal, from the volumes that it mounts (`getMountSliceStep`).
 * @param context - The groups and the panes.
 */
export function getCameraPositionGroupStart(
  viewportId: string,
  getSliceStep: (viewPlaneNormal: Types.Point3) => number,
  context: CameraPositionGroupContext
): Types.ViewReference | undefined {
  const placed = getPlacedPanes(viewportId, context);

  if (!placed.size) {
    return;
  }

  const { anchor, rank } = getAnchor(placed, context);
  const reference = anchor.getViewReference();
  const ownRank = getRank(
    getSliceStep(reference.viewPlaneNormal),
    context.getLayoutIndex(viewportId)
  );

  return ranksBefore(ownRank, rank) ? undefined : toPointReference(reference);
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
 * after them goes to their position. A pane on that position already, as one
 * that started there (`getCameraPositionGroupStart`), is not moved. A pane
 * restored from its own stored position (`keepOwnPosition`) keeps it.
 */
export function placeInCameraPositionGroups(
  viewport: Types.IViewport,
  held: Synchronizer[],
  context: CameraPositionGroupContext,
  keepOwnPosition = false
): void {
  const { synchronizers, getLayoutIndex, getSliceStep = getViewSliceStep } = context;
  const placed = getPlacedPanes(viewport.id, context);

  if (keepOwnPosition || !placed.size) {
    driveCameraPositionSync(viewport, held);
    return;
  }

  const { anchor, rank } = getAnchor(placed, context);

  if (ranksBefore(getRank(getSliceStep(viewport), getLayoutIndex(viewport.id)), rank)) {
    const reference = viewport.getViewReference();
    placed.forEach(member => moveToPoint(member, reference, synchronizers));
    driveCameraPositionSync(viewport, held);
    return;
  }

  moveToPoint(viewport, anchor.getViewReference(), []);
  driveCameraPositionSync(viewport, held);
}
