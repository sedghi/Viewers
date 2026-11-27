import { cache, getConfiguration, utilities as csUtils } from '@cornerstonejs/core';
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

type VolumeSliceGrid = ReturnType<typeof csUtils.getVolumeSliceGrid>;
type VolumeSliceGridOrientation = Parameters<typeof csUtils.getVolumeSliceGrid>[0]['orientation'];

/**
 * A volume that a pane mounts, as `utilities.getVolumeSliceGrid` takes it:
 * its id when it is in the cache, else its image ids.
 */
export type MountVolume = { volumeId?: string; imageIds?: string[] };

/**
 * A pane of a camera position group as the viewport grid holds it, before
 * its mount: its place in the layout, the orientation of its view, the
 * volumes that it mounts (its source first) and the initial slice of its
 * hanging protocol on a grid of a number of slices (undefined: the default
 * slice of the view).
 */
export interface CameraPositionGroupMember {
  viewportId: string;
  layoutIndex: number;
  orientation?: VolumeSliceGridOrientation;
  volumes: MountVolume[];
  getInitialSliceIndex: (numberOfSlices: number) => number | undefined;
}

/**
 * The slice grids of the volumes of the cache, per orientation and slice step
 * measure: the panes of a group ask for the grids of every member at each
 * mount, about fifty grids for the ten panes of TMTV where six differ. A
 * volume made again is another object of the cache, so its grids are not
 * taken from the one before.
 */
const sliceGridsOfCachedVolumes = new WeakMap<object, Map<string, VolumeSliceGrid | undefined>>();

/**
 * The slice grid of the view of a volume in an orientation
 * (`utilities.getVolumeSliceGrid`), or undefined when it has none: a volume
 * that is not in the cache and whose images give no geometry, or an
 * orientation that depends on the view on display. The grid of a volume of
 * the cache in a named orientation is computed once.
 */
function getSliceGrid(
  volume: MountVolume,
  orientation?: VolumeSliceGridOrientation
): VolumeSliceGrid | undefined {
  const cachedVolume = volume.volumeId ? cache.getVolume(volume.volumeId) : undefined;
  const source = cachedVolume ? { volumeId: volume.volumeId } : { imageIds: volume.imageIds };
  const key =
    cachedVolume && typeof orientation !== 'object'
      ? `${orientation ?? ''}:${getConfiguration().rendering?.sliceStepMeasure ?? ''}`
      : undefined;
  let grids = key ? sliceGridsOfCachedVolumes.get(cachedVolume) : undefined;

  if (grids?.has(key)) {
    return grids.get(key);
  }

  let grid: VolumeSliceGrid | undefined;
  try {
    grid = csUtils.getVolumeSliceGrid({ ...source, orientation });
  } catch {
    grid = undefined;
  }

  if (key) {
    grids ??= new Map();
    grids.set(key, grid);
    sliceGridsOfCachedVolumes.set(cachedVolume, grids);
  }

  return grid;
}

/**
 * The step of the slice grid of a pane, from the volumes that it is about to
 * mount: the finest of their grids in its orientation
 * (`utilities.getVolumeSliceGrid`), the step that `getViewSliceStep` gives
 * once they are mounted.
 */
export function getMountSliceStep(
  volumes: MountVolume[],
  orientation?: VolumeSliceGridOrientation
): number {
  const steps = volumes
    .map(volume => getSliceGrid(volume, orientation)?.step)
    .filter(step => step > 0);

  return steps.length ? Math.min(...steps) : Infinity;
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
 * and a plane. A pane that is on that plane already is not moved. The pane
 * drives its synchronizers with the move: the camera position synchronizer
 * gives another pane a slice only when the source moved along its normal, the
 * slice of its own grid nearest to that point, so a pane on that point stays.
 */
function moveToPoint(viewport: Types.IViewport, reference: Types.ViewReference): void {
  if (isOnPlaneOf(viewport, reference)) {
    return;
  }

  viewport.setViewReference(toPointReference(reference));
  viewport.render();
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
 * The position at which a volume pane joins camera position sync groups whose
 * panes are placed, as the `initialViewReference` of its mount, so that it
 * draws no other slice first: the point and the plane of the slice of its
 * groups (the placed pane of the finest slice grid, the first in the layout
 * among panes of one step), when the pane ranks after that pane. A pane that
 * ranks before it, or a pane of groups with no placed pane, gets undefined.
 *
 * @param viewportId - The pane that is about to mount.
 * @param sliceStep - The step of the slice grid of the pane, from the
 * volumes that it mounts (`getMountSliceStep`).
 * @param context - The groups and the panes.
 */
export function getCameraPositionGroupStart(
  viewportId: string,
  sliceStep: number,
  context: CameraPositionGroupContext
): Types.ViewReference | undefined {
  const placed = getPlacedPanes(viewportId, context);

  if (!placed.size) {
    return;
  }

  const { anchor, rank } = getAnchor(placed, context);
  const ownRank = getRank(sliceStep, context.getLayoutIndex(viewportId));

  return ranksBefore(ownRank, rank) ? undefined : toPointReference(anchor.getViewReference());
}

/**
 * The position at which the panes of camera position sync groups start when
 * they mount together, before any of them mounts: the initial slice of the
 * member whose slice grid is the finest (the CT of a PET/CT), the first in the
 * layout among members of one step, as a point and a plane
 * (`getViewReference` of the slice grid of its source,
 * `utilities.getVolumeSliceGrid`). Its initial slice is that of its hanging
 * protocol (`'first'`, `'last'`, `'middle'`, an index), else the default
 * slice of its view. Every member mounts there and shows its own slice
 * nearest to that point, so no pane draws another slice first. Members of
 * another frame of reference than the pane that mounts are left out.
 *
 * @param viewportId - The pane that is about to mount, one of the members.
 * @param members - The panes of its groups, as the viewport grid holds them.
 */
export function getCameraPositionGroupInitialStart(
  viewportId: string,
  members: CameraPositionGroupMember[]
): Types.ViewReference | undefined {
  const ranked = members
    .map(member => {
      const grids = member.volumes.map(volume => getSliceGrid(volume, member.orientation));
      const steps = grids.map(grid => grid?.step).filter(step => step > 0);
      return { member, grid: grids[0], rank: getRank(Math.min(...steps), member.layoutIndex) };
    })
    .filter(({ grid }) => grid);
  const own = ranked.find(({ member }) => member.viewportId === viewportId);

  if (!own) {
    return;
  }

  const { member, grid } = ranked
    .filter(({ grid }) => grid.frameOfReferenceUID === own.grid.frameOfReferenceUID)
    .reduce((best, entry) => (ranksBefore(entry.rank, best.rank) ? entry : best));
  const sliceIndex = member.getInitialSliceIndex(grid.numberOfSlices) ?? grid.defaultSliceIndex;

  return grid.getViewReference(sliceIndex);
}

/**
 * Puts a volume pane that has just mounted on the one position of its camera
 * position sync groups.
 *
 * The panes of a group open on the initial slice of the pane whose slice grid
 * is the finest along the view (the CT of a PET/CT), the first in the layout
 * among panes of one step; every other pane goes to the point of that slice,
 * as a point and a plane, and shows its own slice nearest to it. The rank does
 * not depend on the order of the mounts: a pane that ranks before the panes
 * placed so far takes them to its slice, one move each, and a pane that ranks
 * after them goes to their position. A pane on that position already, as one
 * that started there (`getCameraPositionGroupStart`,
 * `getCameraPositionGroupInitialStart`), is not moved. A pane restored from
 * its own stored position (`keepOwnPosition`) keeps it. A pane stays a source
 * of its groups while it mounts: its mount changes no camera of the group.
 */
export function placeInCameraPositionGroups(
  viewport: Types.IViewport,
  context: CameraPositionGroupContext,
  keepOwnPosition = false
): void {
  const { getLayoutIndex, getSliceStep = getViewSliceStep } = context;
  const placed = getPlacedPanes(viewport.id, context);

  if (keepOwnPosition || !placed.size) {
    return;
  }

  const { anchor, rank } = getAnchor(placed, context);

  if (ranksBefore(getRank(getSliceStep(viewport), getLayoutIndex(viewport.id)), rank)) {
    const reference = viewport.getViewReference();
    placed.forEach(member => moveToPoint(member, reference));
    return;
  }

  moveToPoint(viewport, anchor.getViewReference());
}
