import { Enums as csEnums, Types, isRegisteredRenderBackend } from '@cornerstonejs/core';
import type {
  PlanarMountOptions,
  PlanarViewState,
  RenderBackendValue,
  Volume3DMountOptions,
} from '@cornerstonejs/core';
import { utilities as csToolsUtils } from '@cornerstonejs/tools';
import { getViewportRenderingOverride } from '../../utils/viewportRendering';
import { isVolumeViewport3D } from '../../utils/viewportTypeGuards';
import type { DisplaySetAppearanceOverrides, LutPresentation } from '../../types/Presentation';

/**
 * Per-mount render backend override for a planar mount, resolved from the
 * `<viewportType>.viewportRendering` URL param / appConfig captured at init
 * (e.g. `?orthographic.viewportRendering=cpu`). Validated at mount time (not
 * init) because extension backends may call registerRenderBackend after the
 * cornerstone extension initializes; an unregistered value is dropped with a
 * warning rather than failing the mount.
 */
function getMountRenderBackend(viewportTypeKey: string): RenderBackendValue | undefined {
  const backend = getViewportRenderingOverride(viewportTypeKey);
  if (!backend) {
    return undefined;
  }
  if (backend !== 'auto' && !isRegisteredRenderBackend(backend)) {
    console.warn(
      `${viewportTypeKey}.viewportRendering: "${backend}" is not a registered render backend; ignoring.`
    );
    return undefined;
  }
  return backend as RenderBackendValue;
}

type AppearanceKey = keyof DisplaySetAppearanceOverrides;

/**
 * The keys of the display set options of a hanging protocol that a planar
 * mount gives as the first appearance of a display set.
 */
const PLANAR_APPEARANCE_KEYS: readonly AppearanceKey[] = [
  'voiRange',
  'invert',
  'colormap',
  'opacity',
];

/** The keys of the display set options that a 3D mount gives as its first appearance. */
const VOLUME_3D_APPEARANCE_KEYS: readonly AppearanceKey[] = ['voiRange', 'invert', 'preset'];

/**
 * Copies the keys that are set in `properties` out of it: the appearance that
 * a mount gives its display set from its first draw.
 */
function pickAppearance<K extends AppearanceKey>(
  properties: DisplaySetAppearanceOverrides | undefined,
  keys: readonly K[]
): Partial<Pick<DisplaySetAppearanceOverrides, K>> {
  const appearance: Partial<Pick<DisplaySetAppearanceOverrides, K>> = {};
  for (const key of keys) {
    if (properties?.[key] !== undefined) {
      appearance[key] = properties[key];
    }
  }
  return appearance;
}

/** What a stack mount gives the viewport: its display set, first image, appearance and view. */
export interface StackMountContext {
  /** The display set that the stack shows, the source of the viewport. */
  displaySetInstanceUID: string;
  /** Resolved initial slice (position presentation / view reference / HP options). */
  initialImageIndex: number;
  /** VOI/invert/colormap/opacity from the LUT presentation or the display set options. */
  appearance: DisplaySetAppearanceOverrides;
  displayArea?: Types.DisplayArea;
  rotation?: number;
  flipHorizontal?: boolean;
}

/** One display set of a volume mount, overlays already filtered out. */
export interface VolumeMountInput {
  volumeInput: {
    imageIds?: string[];
    volumeId: string;
    displaySetInstanceUID: string;
    blendMode?: csEnums.BlendModes;
    slabThickness?: number;
  };
  displaySetOptions?: unknown;
}

/** What a volume mount gives the viewport: its display sets, their appearance, the orientation. */
export interface VolumeMountContext {
  filteredVolumeInputArray: VolumeMountInput[];
  /** Per-volume VOI/invert/colormap/opacity/preset derived from the display set options. */
  volumesProperties: Array<{ properties: DisplaySetAppearanceOverrides; volumeId?: string }>;
  orientation?: csEnums.OrientationAxis;
  lutPresentation?: LutPresentation;
}

/**
 * Stack mount: mounts the display set by its UID as a stack, on its first
 * image and with the appearance of the first draw (the stored LUT
 * presentation of the display set, or the VOI/invert/colormap/opacity of the
 * hanging protocol), then applies rotate/flip/displayArea via setViewState,
 * and enables the stack context prefetch, which reads the stack that
 * setDisplaySets mounted; a scroll prefetches again at NEW_IMAGE. A window is
 * set only when the appearance gives one: without it the viewport shows each
 * image of the stack with the window of its own metadata.
 */
export async function mountStack(
  viewport: Types.IViewport,
  context: StackMountContext
): Promise<void> {
  const {
    displaySetInstanceUID,
    initialImageIndex,
    appearance,
    displayArea,
    rotation,
    flipHorizontal,
  } = context;

  const stackRenderBackend = getMountRenderBackend('stack');
  const options: PlanarMountOptions = {
    mode: 'stack',
    orientation: csEnums.OrientationAxis.ACQUISITION,
    role: 'source',
    initialImageIdIndex: initialImageIndex,
    appearance,
    ...(stackRenderBackend ? { renderBackend: stackRenderBackend } : {}),
  };
  await viewport.setDisplaySets({ displaySetId: displaySetInstanceUID, options });

  const viewStatePatch: Partial<PlanarViewState> = {};
  if (displayArea) {
    viewStatePatch.displayArea = displayArea;
  }
  if (rotation) {
    viewStatePatch.rotation = rotation;
  }
  if (flipHorizontal) {
    viewStatePatch.flipHorizontal = true;
  }
  if (Object.keys(viewStatePatch).length > 0) {
    viewport.setViewState(viewStatePatch);
  }

  csToolsUtils.stackContextPrefetch.enable(viewport.element);
}

/**
 * Mounts the volumes of a planar or a 3D viewport in one setDisplaySets
 * call: a planar viewport replaces its display sets, so the first entry is
 * the source (the CT of a fusion) and the others are overlays, and a call per
 * volume would drop the source. Each display set is mounted by its UID with
 * the id of its cached volume, a planar one with mode 'volume' and the
 * orientation of the viewport. The appearance of each entry is the stored LUT
 * presentation of its display set (what a user set on it), or else the
 * VOI/invert/colormap/opacity of its display set options, with the blend mode
 * and the slab of a projection (the TMTV MIP) for a planar viewport and the
 * preset for a 3D one.
 */
export async function mountVolumes(
  viewport: Types.IViewport,
  context: VolumeMountContext
): Promise<void> {
  const { filteredVolumeInputArray, volumesProperties, orientation, lutPresentation } = context;
  const is3D = isVolumeViewport3D(viewport);
  const volumeRenderBackend = is3D ? undefined : getMountRenderBackend('orthographic');

  const entries = filteredVolumeInputArray.map(({ volumeInput }, index) => {
    const { volumeId, displaySetInstanceUID, blendMode, slabThickness } = volumeInput;
    const properties = volumesProperties[index]?.properties;
    const role = index === 0 ? 'source' : 'overlay';
    const appearance: DisplaySetAppearanceOverrides = lutPresentation?.appearances?.[
      displaySetInstanceUID
    ] ?? {
      ...pickAppearance(properties, is3D ? VOLUME_3D_APPEARANCE_KEYS : PLANAR_APPEARANCE_KEYS),
      ...(!is3D && properties
        ? pickAppearance({ blendMode, slabThickness }, ['blendMode', 'slabThickness'])
        : {}),
    };
    const options: PlanarMountOptions | Volume3DMountOptions = is3D
      ? { role, volumeId, appearance }
      : {
          mode: 'volume',
          orientation,
          role,
          volumeId,
          appearance,
          ...(volumeRenderBackend ? { renderBackend: volumeRenderBackend } : {}),
        };

    return { displaySetId: displaySetInstanceUID, options };
  });

  await viewport.setDisplaySets(...entries);
}
