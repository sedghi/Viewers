import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useSystem } from '@ohif/core';
import { useViewportDisplaySets } from './useViewportDisplaySets';
import { Types, utilities, Enums } from '@cornerstonejs/core';
import { getPlanarOr3DViewport, isVolumeViewport3D } from '../utils/viewportTypeGuards';
import { getShownDisplaySetId } from '../utils/getShownDisplaySetId';
import { WindowLevelPreset } from '../types/WindowLevel';
import { ColorbarPositionType, ColorbarOptions, ColorbarProperties } from '../types/Colorbar';
import { VolumeRenderingConfig } from '../types/VolumeRenderingConfig';
import { VolumeLightingParams } from '../types';
import { ButtonLocation } from '@ohif/core/src/services/ToolBarService/ToolbarService';

interface ViewportRenderingOptions {
  location?: number;
  displaySetInstanceUID?: string;
}

interface PixelValueRange {
  min: number;
  max: number;
}

interface WindowLevelHook {
  // Viewport information
  is3DVolume: boolean;
  isViewportBackgroundLight: boolean;
  viewportDisplaySets: AppTypes.DisplaySet[] | undefined;
  voiRange: { lower: number; upper: number } | undefined;
  windowLevel: { windowWidth: number; windowCenter: number } | undefined;

  // Window level functions
  setWindowLevel: (preset: {
    windowWidth: number;
    windowCenter: number;
    immediate?: boolean;
  }) => void;
  setVOIRange: (params: { lower: number; upper: number }) => void;
  windowLevelPresets: WindowLevelPreset[];
  allWindowLevelPresets: Array<{
    displaySetInstanceUID: string;
    modality: string;
    presets: WindowLevelPreset[];
  }>;

  // Colorbar functions
  hasColorbar: boolean;
  toggleColorbar: (options?: Partial<ColorbarOptions>) => void;
  colorbarProperties: ColorbarProperties;
  colorbarPosition: ColorbarPositionType;
  setColorbarPosition: React.Dispatch<React.SetStateAction<ColorbarPositionType>>;

  // Colormap functions
  setColormap: (params: { colormap: any; opacity?: number; immediate?: boolean }) => void;
  colormap: any;

  // Opacity functions
  opacity: number | undefined;
  setOpacity: (opacity: number) => void;

  // Threshold functions
  threshold: number | undefined;
  setThreshold: (threshold: number) => void;
  pixelValueRange: PixelValueRange;

  // 3D volume rendering functions
  setVolumeRenderingPreset: (preset: any) => void;
  setVolumeRenderingQuality: (quality: number) => void;
  setVolumeLighting: (params: { ambient: number; diffuse: number; specular: number }) => void;
  setVolumeShading: (enabled: boolean) => void;
  volumeRenderingPresets: Array<any>;
  volumeRenderingQualityRange: { min: number; max: number; step: number };
}

const getPosition = (location: number): ColorbarPositionType => {
  switch (location) {
    case ButtonLocation.LeftMiddle:
      return 'left';
    case ButtonLocation.RightMiddle:
      return 'right';
    case ButtonLocation.BottomMiddle:
      return 'bottom';
    case ButtonLocation.TopMiddle:
      return 'top';
    default:
      return 'bottom'; // Default to bottom if location doesn't match a middle position
  }
};

/**
 * Hook to access window level functionality for a specific viewport
 *
 * @param viewportId - The ID of the viewport to get window level functionality for
 * @param options - Options for the hook, including location and displaySetInstanceUID
 * @returns Window level API for the specified viewport
 */
/**
 * Resolves the colormap currently applied to the active display set, falling
 * back to Grayscale (or the first available colormap) when none is applied or
 * resolution fails.
 */
function resolveActiveColormap(
  viewport,
  activeDisplaySetInstanceUID,
  viewportDisplaySets,
  colormaps
) {
  if (!activeDisplaySetInstanceUID || !viewportDisplaySets?.length) {
    return null;
  }
  try {
    if (!viewport) {
      return null;
    }
    const { colormap } =
      viewport.getEffectiveDisplaySetAppearance(activeDisplaySetInstanceUID) ?? {};
    return colormap || colormaps?.find(c => c.Name === 'Grayscale') || colormaps?.[0];
  } catch (error) {
    console.error('Error getting viewport colormap:', error);
    return colormaps?.find(c => c.Name === 'Grayscale') || colormaps?.[0];
  }
}

/**
 * Reads the appearance that a display set is drawn with (window, opacity,
 * colormap): the overrides over the defaults of its data, so a series without
 * a window set reads the window of its image. A viewport that shows other
 * display sets (an SR, SEG or RTSTRUCT viewport) reads its source. Kept at
 * module scope: a `??` inside the try/catch trips a React Compiler limitation
 * ("value blocks within a try/catch") that bails the whole hook when this
 * code is inlined.
 */
function readEffectiveAppearance(viewport, activeDisplaySetInstanceUID) {
  try {
    return (
      viewport.getEffectiveDisplaySetAppearance(
        getShownDisplaySetId(viewport, activeDisplaySetInstanceUID)
      ) ?? {}
    );
  } catch (error) {
    console.error('Error reading the appearance of the viewport:', error);
    return null;
  }
}

/**
 * Whether an appearance event is about the display set that the hook reads:
 * the display set itself when the viewport shows it, the source otherwise.
 * The readouts of the hook follow what is drawn for every cause of the event:
 * a mount, an edit, a reset, and a scroll to an image with another default
 * window.
 */
function isEventOfDisplaySet(
  viewport: Types.IViewport,
  activeDisplaySetInstanceUID: string,
  detail: Types.EventTypes.DisplaySetAppearanceChangedEventDetail
): boolean {
  const shownDisplaySetId = getShownDisplaySetId(viewport, activeDisplaySetInstanceUID);

  return shownDisplaySetId
    ? detail.displaySetId === shownDisplaySetId
    : detail.role === 'source';
}

export function useViewportRendering(
  viewportId?: string,
  options?: ViewportRenderingOptions
): WindowLevelHook {
  const { servicesManager, commandsManager } = useSystem();
  const { cornerstoneViewportService, colorbarService, customizationService } =
    servicesManager.services;

  const [hasColorbar, setHasColorbar] = useState(colorbarService.hasColorbar(viewportId));
  const [colorbarPosition, setColorbarPosition] = useState<ColorbarPositionType>(
    options?.location ? getPosition(options.location) : 'bottom'
  );
  const [voiRange, setVoiRange] = useState<{ lower: number; upper: number } | undefined>();
  const voiRangeRef = React.useRef<{ lower: number; upper: number } | undefined>(undefined);
  // Viewport from service; kept in state so we can subscribe to VIEWPORT_DATA_CHANGED when null and re-run effects when it becomes available
  const [viewport, setViewport] = useState<Types.IViewport | null>(() =>
    viewportId ? (cornerstoneViewportService.getCornerstoneViewport(viewportId) ?? null) : null
  );
  const [is3DVolume, setIs3DVolume] = useState(isVolumeViewport3D(viewport));

  const [opacity, setOpacityState] = useState<number | undefined>();
  const [threshold, setThresholdState] = useState<number | undefined>();
  const [pixelValueRange, setPixelValueRange] = useState<PixelValueRange>({ min: 0, max: 255 });

  const { viewportDisplaySets, foregroundDisplaySets } = useViewportDisplaySets(viewportId);
  const { displaySetService } = servicesManager.services;

  // Determine the active display set instance UID (internal only, not exposed)
  const activeDisplaySetInstanceUID = useMemo(() => {
    if (options?.displaySetInstanceUID) {
      return options.displaySetInstanceUID;
    }

    // Window-level / colormap / threshold controls operate on the foreground
    // layer (e.g. the PT in a PET/CT fusion), not the grayscale background (CT).
    // Use the topmost foreground display set when present; otherwise fall back to
    // the (single) primary display set. SEG/derived overlays are already excluded
    // from foregroundDisplaySets.
    if (foregroundDisplaySets && foregroundDisplaySets.length > 0) {
      return foregroundDisplaySets[foregroundDisplaySets.length - 1].displaySetInstanceUID;
    }

    if (viewportDisplaySets && viewportDisplaySets.length > 0) {
      return viewportDisplaySets[0].displaySetInstanceUID;
    }

    return undefined;
  }, [options?.displaySetInstanceUID, viewportDisplaySets, foregroundDisplaySets]);

  const viewportInfo = viewportId ? cornerstoneViewportService.getViewportInfo(viewportId) : null;

  const { presets, colorbarProperties, volumeRenderingPresets, volumeRenderingQualityRange } =
    getCustomizationData(customizationService);

  const backgroundColor = viewportInfo?.getViewportOptions().background;
  const isViewportBackgroundLight = backgroundColor
    ? utilities.isEqual(backgroundColor, [1, 1, 1])
    : false;

  const allWindowLevelPresets = useMemo(() => {
    return (
      viewportDisplaySets
        ?.filter(displaySet => presets?.[displaySet.Modality as string])
        .map(displaySet => {
          return {
            displaySetInstanceUID: displaySet.displaySetInstanceUID,
            modality: displaySet.Modality as string,
            presets: presets[displaySet.Modality as string],
          };
        }) || []
    );
  }, [viewportDisplaySets, presets]);

  // Keep viewport in state; when not available, subscribe to VIEWPORT_DATA_CHANGED so we set it when the viewport is ready
  useEffect(() => {
    if (!viewportId) {
      setViewport(null);
      return;
    }
    const vp = cornerstoneViewportService.getCornerstoneViewport(viewportId);
    setViewport(vp ?? null);
    if (vp) {
      return;
    }
    const { unsubscribe } = cornerstoneViewportService.subscribe(
      cornerstoneViewportService.EVENTS.VIEWPORT_DATA_CHANGED,
      ({ viewportId: eventViewportId }) => {
        if (eventViewportId !== viewportId) {
          return;
        }
        const next = cornerstoneViewportService.getCornerstoneViewport(viewportId);
        if (next) {
          setViewport(next);
        }
      }
    );
    return () => {
      unsubscribe();
    };
  }, [viewportId, cornerstoneViewportService]);

  // Calculate pixel value range for the active display set
  useEffect(() => {
    if (!activeDisplaySetInstanceUID) {
      return;
    }

    const selectedDisplaySet = displaySetService.getDisplaySetByUID(activeDisplaySetInstanceUID);
    if (!selectedDisplaySet?.imageIds?.length) {
      return;
    }

    if (!viewport) {
      return;
    }

    const range = getPlanarOr3DViewport(viewport)?.getScalarRange(activeDisplaySetInstanceUID);

    if (!range) {
      return;
    }

    setPixelValueRange({ min: range[0], max: range[1] });
  }, [activeDisplaySetInstanceUID, displaySetService, viewport]);

  // Get the presets specifically for the active display set
  const activeDisplaySetPresets = useMemo(() => {
    if (!activeDisplaySetInstanceUID || allWindowLevelPresets.length === 0) {
      return [];
    }

    const activePresetData = allWindowLevelPresets.find(
      preset => preset.displaySetInstanceUID === activeDisplaySetInstanceUID
    );

    if (!activePresetData) {
      return [];
    }

    return activePresetData.presets;
  }, [allWindowLevelPresets, activeDisplaySetInstanceUID]);

  useEffect(() => {
    setIs3DVolume(isVolumeViewport3D(viewport));

    if (!viewport || !activeDisplaySetInstanceUID) {
      return;
    }
    const appearance = readEffectiveAppearance(viewport, activeDisplaySetInstanceUID);
    if (!appearance) {
      return;
    }

    if (appearance.voiRange) {
      setVoiRange(appearance.voiRange);
      voiRangeRef.current = appearance.voiRange;
    }

    setOpacityState(appearance.opacity);
    setThresholdState(appearance.colormap?.threshold ?? undefined);
  }, [activeDisplaySetInstanceUID, viewport]);

  useEffect(() => {
    if (!viewportId) {
      return;
    }

    const updateColorbarState = () => {
      const hasColorbarValue = colorbarService.hasColorbar(viewportId);
      setHasColorbar(hasColorbarValue);
    };

    updateColorbarState();

    const { unsubscribe } = colorbarService.subscribe(
      colorbarService.EVENTS.STATE_CHANGED,
      updateColorbarState
    );

    return () => {
      unsubscribe();
    };
  }, [colorbarService, viewportId]);

  useEffect(() => {
    if (!activeDisplaySetInstanceUID || !viewport?.element) {
      return;
    }

    const element = viewport.element;

    const onAppearanceChanged = (evt: Types.EventTypes.DisplaySetAppearanceChangedEvent) => {
      const { detail } = evt;

      if (!isEventOfDisplaySet(viewport, activeDisplaySetInstanceUID, detail)) {
        return;
      }

      const { changedKeys, effective } = detail;
      const range = effective.voiRange;

      if (changedKeys.includes('voiRange') && range) {
        const isInternalUpdate =
          voiRangeRef.current && areVoiRangesClose(voiRangeRef.current, range);

        if (!isInternalUpdate) {
          voiRangeRef.current = range;
          setVoiRange(range);
        }
      }

      if (changedKeys.includes('opacity')) {
        setOpacityState(effective.opacity);
      }

      if (changedKeys.includes('colormap')) {
        setThresholdState(effective.colormap?.threshold ?? undefined);
      }
    };

    element.addEventListener(Enums.Events.DISPLAY_SET_APPEARANCE_CHANGED, onAppearanceChanged);

    return () => {
      element.removeEventListener(
        Enums.Events.DISPLAY_SET_APPEARANCE_CHANGED,
        onAppearanceChanged
      );
    };
  }, [activeDisplaySetInstanceUID, viewport]);

  const validateActiveDisplaySet = useCallback(() => {
    if (!activeDisplaySetInstanceUID) {
      throw new Error('No active display set instance UID is available');
    }

    if (viewportDisplaySets?.length === 0) {
      throw new Error('No display sets are available for this viewport');
    }

    // Verify the active display set is in the viewport
    const isDisplaySetInViewport = viewportDisplaySets?.some(
      ds => ds.displaySetInstanceUID === activeDisplaySetInstanceUID
    );

    if (!isDisplaySetInViewport) {
      throw new Error(
        `Display set with UID ${activeDisplaySetInstanceUID} is not present in the viewport`
      );
    }

    return activeDisplaySetInstanceUID;
  }, [activeDisplaySetInstanceUID, viewportDisplaySets]);

  const setWindowLevel = useCallback(
    (preset: { windowWidth: number; windowCenter: number; immediate?: boolean }) => {
      if (!viewportId) {
        return;
      }

      const displaySetInstanceUID = validateActiveDisplaySet();

      // Update voiRange as well, to ensure immediate UI updates
      const { lower, upper } = utilities.windowLevel.toLowHighRange(
        preset.windowWidth,
        preset.windowCenter
      );

      const newVoiRange = { lower, upper };

      if (!voiRangeRef.current || !areVoiRangesClose(voiRangeRef.current, newVoiRange)) {
        voiRangeRef.current = newVoiRange;
        setVoiRange(newVoiRange);

        commandsManager.run({
          commandName: 'setViewportWindowLevel',
          commandOptions: {
            ...preset,
            viewportId,
            displaySetInstanceUID,
          },
          context: 'CORNERSTONE',
        });
      }
    },
    [commandsManager, viewportId, validateActiveDisplaySet]
  );

  const setVOIRange = useCallback(
    (params: { lower: number; upper: number }) => {
      if (!viewportId) {
        return;
      }

      // Only update if VOI values have actually changed
      if (!voiRangeRef.current || !areVoiRangesClose(voiRangeRef.current, params)) {
        // Update the ref and state immediately to avoid race conditions with the event listener
        voiRangeRef.current = params;
        setVoiRange(params);

        const windowLevel = utilities.windowLevel.toWindowLevel(params.lower, params.upper);

        // Set window level using the command manager directly to avoid circular calls
        const displaySetInstanceUID = validateActiveDisplaySet();
        commandsManager.run({
          commandName: 'setViewportWindowLevel',
          commandOptions: {
            ...windowLevel,
            viewportId,
            displaySetInstanceUID,
          },
          context: 'CORNERSTONE',
        });
      }
    },
    [viewportId, commandsManager, validateActiveDisplaySet]
  );

  const toggleColorbar = useCallback(
    (options?: Partial<ColorbarOptions>) => {
      if (!viewportId) {
        return;
      }

      if (viewportDisplaySets?.length === 0) {
        return;
      }

      if (!colorbarProperties) {
        return;
      }

      const {
        width: colorbarWidth,
        colorbarTickPosition,
        colorbarInitialColormap,
      } = colorbarProperties as ColorbarProperties;

      let appropriateTickPosition = colorbarTickPosition || 'top';

      if (colorbarPosition === 'left' || colorbarPosition === 'right') {
        appropriateTickPosition = colorbarPosition === 'left' ? 'right' : 'left';
      } else {
        appropriateTickPosition = colorbarPosition === 'top' ? 'bottom' : 'top';
      }

      const colorbarOptions = {
        viewportId,
        colormaps: colorbarProperties.colormaps || {},
        ticks: {
          position: appropriateTickPosition,
        },
        width: colorbarWidth,
        position: colorbarPosition,
        activeColormapName: colorbarInitialColormap || 'Grayscale',
        ...options,
      };

      // If light background, adjust tick style but keep the appropriate position
      if (isViewportBackgroundLight) {
        colorbarOptions.ticks = {
          position: appropriateTickPosition,
          style: {
            font: '13px Inter',
            color: '#000000',
            maxNumTicks: 8,
            tickSize: 5,
            tickWidth: 1,
            labelMargin: 3,
          },
        };
      }

      const displaySetInstanceUIDs = viewportDisplaySets.map(ds => ds.displaySetInstanceUID);

      try {
        commandsManager.run('toggleViewportColorbar', {
          viewportId,
          options: colorbarOptions,
          displaySetInstanceUIDs,
        });
      } catch (error) {
        console.error('Error toggling colorbar:', error);
      }
    },
    [
      commandsManager,
      viewportId,
      colorbarProperties,
      isViewportBackgroundLight,
      viewportDisplaySets,
      colorbarPosition,
    ]
  );

  const setColormap = useCallback(
    ({ colormap, opacity = 1, immediate = false }) => {
      if (!viewportId) {
        return;
      }

      const displaySetInstanceUID = validateActiveDisplaySet();

      commandsManager.run({
        commandName: 'setViewportColormap',
        commandOptions: {
          viewportId,
          colormap,
          displaySetInstanceUID,
          opacity,
          immediate,
        },
        context: 'CORNERSTONE',
      });
    },
    [commandsManager, validateActiveDisplaySet, viewport, viewportId]
  );

  const setOpacity = useCallback(
    (opacityValue: number) => {
      if (!viewport) {
        return;
      }

      setOpacityState(opacityValue);

      const displaySetInstanceUID = validateActiveDisplaySet();

      viewport.setDisplaySetAppearance(displaySetInstanceUID, { opacity: opacityValue });
      viewport.render();
    },
    [validateActiveDisplaySet, viewport]
  );

  const setThreshold = useCallback(
    (thresholdValue: number) => {
      if (!viewport) {
        return;
      }

      const displaySetInstanceUID = validateActiveDisplaySet();
      setThresholdState(thresholdValue);

      viewport.setDisplaySetAppearance(displaySetInstanceUID, {
        colormap: { threshold: thresholdValue },
      });
      viewport.render();
    },
    [validateActiveDisplaySet, viewport]
  );

  // Get the current colormap for the active display set. Deliberately not
  // memoized: resolveActiveColormap returns a reference that already exists —
  // the viewport presentation's colormap, or one of the `colormaps` presets —
  // rather than constructing one, so repeated calls hand back the same
  // identity and no consumer sees churn. The lookup is a WeakMap-cached
  // adapter fetch plus a property read, not worth a dependency comparison.
  // (It was a useMemo whose optional-chained deps tripped
  // preserve-manual-memoization.)
  const colormap = resolveActiveColormap(
    viewport,
    activeDisplaySetInstanceUID,
    viewportDisplaySets,
    colorbarProperties?.colormaps
  );

  // 3D volume rendering functions
  const setVolumeRenderingPreset = useCallback(
    (preset: any) => {
      if (!viewportId) {
        return;
      }

      const displaySetInstanceUID = validateActiveDisplaySet();

      commandsManager.run({
        commandName: 'setVolumesPreset',
        commandOptions: {
          preset,
          viewportId,
          displaySetInstanceUID,
        },
      });
    },
    [commandsManager, viewportId, validateActiveDisplaySet]
  );

  const setVolumeRenderingQuality = useCallback(
    (quality: number) => {
      if (!viewportId) {
        return;
      }

      commandsManager.run({
        commandName: 'setVolumeRenderingQuality',
        commandOptions: {
          quality,
          viewportId,
        },
      });
    },
    [commandsManager, viewportId]
  );

  const setVolumeLighting = useCallback(
    ({ ambient, diffuse, specular }: VolumeLightingParams) => {
      if (!viewportId) {
        return;
      }

      commandsManager.run({
        commandName: 'setVolumeLighting',
        commandOptions: {
          ambient,
          diffuse,
          specular,
          viewportId,
        },
      });
    },
    [commandsManager, viewportId]
  );

  const setVolumeShading = useCallback(
    (enabled: boolean) => {
      if (!viewportId) {
        return;
      }

      commandsManager.run({
        commandName: 'setVolumeShading',
        commandOptions: {
          enabled,
          viewportId,
        },
      });
    },
    [commandsManager, viewportId]
  );

  return {
    is3DVolume,
    isViewportBackgroundLight,

    // Window level functions
    setWindowLevel,
    setVOIRange,
    voiRange,
    windowLevel: voiRange
      ? utilities.windowLevel.toWindowLevel(voiRange?.lower, voiRange?.upper)
      : { windowCenter: null, windowWidth: null },

    // Colorbar functions
    hasColorbar,
    toggleColorbar,

    // Colormap functions
    setColormap,
    colormap,

    // Opacity functions
    opacity,
    setOpacity,

    // Threshold functions
    threshold,
    setThreshold,
    pixelValueRange,

    // 3D volume rendering functions
    setVolumeRenderingPreset,
    setVolumeRenderingQuality,
    setVolumeLighting,
    setVolumeShading,

    // Display sets
    viewportDisplaySets,

    // Colorbar properties
    colorbarProperties,
    colorbarPosition,
    setColorbarPosition,

    // Presets
    windowLevelPresets: activeDisplaySetPresets,
    allWindowLevelPresets,
    volumeRenderingPresets,
    volumeRenderingQualityRange,
  };
}

export default useViewportRendering;

/**
 * Helper function to compare two VOI ranges with a small tolerance.
 * @param rangeA - The first VOI range { lower, upper }.
 * @param rangeB - The second VOI range { lower, upper }.
 * @param epsilon - The tolerance for comparison.
 * @returns True if the ranges are considered close, false otherwise.
 */
function areVoiRangesClose(
  rangeA: { lower: number; upper: number },
  rangeB: { lower: number; upper: number },
  epsilon = 0.001
): boolean {
  if (!rangeA || !rangeB) {
    return false;
  }
  return (
    Math.abs(rangeA.lower - rangeB.lower) < epsilon &&
    Math.abs(rangeA.upper - rangeB.upper) < epsilon
  );
}

function getCustomizationData(customizationService) {
  const presets = customizationService.getCustomization('cornerstone.windowLevelPresets');
  const colorbarProperties = customizationService.getCustomization(
    'cornerstone.colorbar'
  ) as ColorbarProperties;

  const {
    volumeRenderingPresets = [],
    volumeRenderingQualityRange = { min: 0, max: 1, step: 0.1 },
  } =
    (customizationService.getCustomization(
      'cornerstone.3dVolumeRendering'
    ) as VolumeRenderingConfig) || {};

  return {
    presets,
    colorbarProperties,
    volumeRenderingPresets,
    volumeRenderingQualityRange,
  };
}
