import React, { useEffect, useCallback, useState, ReactElement, useMemo, useRef } from 'react';
import debounce from 'lodash.debounce';
import { PanelSection, WindowLevel } from '@ohif/ui-next';
import { Enums, eventTarget, cache, utilities as csUtils } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
import { useActiveViewportDisplaySets } from '@ohif/core';
import { getWindowLevelsData, keepRowsWithoutRange } from './utils';
import { getPlanarOr3DViewport } from '../../utils/viewportTypeGuards';

const { Events } = Enums;

/**
 * True when every volume in the viewport has finished loading.
 *
 * A volume that completed before this panel mounted never fires
 * IMAGE_VOLUME_LOADING_COMPLETED, so seeding isLoading from the event alone
 * leaves it true forever and the histogram interval then runs for the life of
 * the panel. Asking the cache directly avoids depending on an announcement
 * that may already have happened.
 */
const areViewportVolumesLoaded = (viewport: Types.IViewport | null): boolean => {
  const volumeIds = getPlanarOr3DViewport(viewport)?.getVolumeIds() ?? [];
  if (!volumeIds.length) {
    return false;
  }

  return volumeIds.every(
    volumeId =>
      (cache.getVolume(volumeId)?.loadStatus as { loaded?: boolean } | undefined)?.loaded === true
  );
};

const ViewportWindowLevel = ({
  servicesManager,
  viewportId,
}: withAppTypes<{
  viewportId: string;
}>): ReactElement<any> => {
  const { cornerstoneViewportService } = servicesManager.services;
  const [windowLevels, setWindowLevels] = useState<any[]>([]);
  // Lazy initializer rather than an effect: this runs exactly once, so it needs
  // no setState-in-effect and cannot go stale.
  const [isLoading, setIsLoading] = useState(
    () => !areViewportVolumesLoaded(cornerstoneViewportService.getCornerstoneViewport(viewportId))
  );
  const displaySets = useActiveViewportDisplaySets();
  const rowVolumeIds = useRef<string[]>([]);

  const getViewportsWithVolumeIds = (volumeIds: string[]) => {
    const renderingEngine = cornerstoneViewportService.getRenderingEngine();
    // The viewports that show a volume now: a planar viewport can show a stack or
    // a volume, so its content mode says which.
    const viewports = renderingEngine
      .getViewports()
      .filter(viewport => csUtils.viewportIsInVolumeMode(viewport));

    return viewports.filter(vp => {
      const viewportVolumeIds = getPlanarOr3DViewport(vp)?.getVolumeIds() ?? [];
      return (
        volumeIds.length === viewportVolumeIds.length &&
        volumeIds.every(volumeId => viewportVolumeIds.includes(volumeId))
      );
    });
  };

  const updateViewportHistograms = useCallback(() => {
    const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
    const volumeIds = getPlanarOr3DViewport(viewport)?.getVolumeIds() ?? [];
    rowVolumeIds.current = volumeIds;

    getWindowLevelsData(viewport).then(data => {
      setWindowLevels(previous => keepRowsWithoutRange(volumeIds, data, previous));
    });
  }, [cornerstoneViewportService, viewportId]);

  const handleCornerstoneVOIModified = useCallback(
    (e: Types.EventTypes.DisplaySetAppearanceChangedEvent) => {
      const { volumeId, changedKeys, effective } = e.detail;
      const range = effective.voiRange;
      const oldWindowLevel = windowLevels.find(wl => wl.volumeId === volumeId);

      if (!oldWindowLevel || !range || !changedKeys.includes('voiRange')) {
        return;
      }

      const oldVOI = oldWindowLevel.voi;
      const windowWidth = range.upper - range.lower;
      const windowCenter = range.lower + windowWidth / 2;

      if (windowWidth === oldVOI.windowWidth && windowCenter === oldVOI.windowCenter) {
        return;
      }

      const newWindowLevel = {
        ...oldWindowLevel,
        voi: {
          windowWidth,
          windowCenter,
        },
      };

      setWindowLevels(
        windowLevels.map(windowLevel =>
          windowLevel === oldWindowLevel ? newWindowLevel : windowLevel
        )
      );
    },
    [windowLevels]
  );

  const debouncedHandleCornerstoneVOIModified = useMemo(
    () => debounce(handleCornerstoneVOIModified, 100),
    [handleCornerstoneVOIModified]
  );

  const handleVOIChange = (displaySetId: string, voi) => {
    const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

    const newRange = {
      lower: voi.windowCenter - voi.windowWidth / 2,
      upper: voi.windowCenter + voi.windowWidth / 2,
    };

    viewport.setDisplaySetAppearance(displaySetId, { voiRange: newRange });
    viewport.render();
  };

  const handleOpacityChange = (viewportId, _volumeIndex, volumeId, opacity) => {
    const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

    if (!viewport) {
      return;
    }

    const viewportVolumeIds = getPlanarOr3DViewport(viewport)?.getVolumeIds() ?? [];
    const viewports = getViewportsWithVolumeIds(viewportVolumeIds);

    viewports.forEach(vp => {
      const displaySetId = getPlanarOr3DViewport(vp)?.getDisplaySetIdForVolumeId(volumeId);

      if (displaySetId) {
        vp.setDisplaySetAppearance(displaySetId, { opacity });
        vp.render();
      }
    });
  };

  // Memoized so the effect below does not tear down and re-register its
  // listeners (and restart its interval) on every render.
  const handleImageVolumeLoadingCompleted = useCallback(() => {
    setIsLoading(false);
    updateViewportHistograms();
  }, [updateViewportHistograms]);

  // Listen to cornerstone events and set up interval for histogram updates
  useEffect(() => {
    document.addEventListener(
      Events.DISPLAY_SET_APPEARANCE_CHANGED,
      debouncedHandleCornerstoneVOIModified,
      true
    );
    eventTarget.addEventListener(
      Events.IMAGE_VOLUME_LOADING_COMPLETED,
      handleImageVolumeLoadingCompleted
    );

    const intervalId = isLoading ? setInterval(() => updateViewportHistograms(), 1000) : undefined;

    return () => {
      document.removeEventListener(
        Events.DISPLAY_SET_APPEARANCE_CHANGED,
        debouncedHandleCornerstoneVOIModified,
        true
      );
      eventTarget.removeEventListener(
        Events.IMAGE_VOLUME_LOADING_COMPLETED,
        handleImageVolumeLoadingCompleted
      );
      clearInterval(intervalId);
    };
  }, [
    updateViewportHistograms,
    debouncedHandleCornerstoneVOIModified,
    handleImageVolumeLoadingCompleted,
    isLoading,
  ]);

  // Create a memoized version of displaySet IDs for comparison
  const displaySetIds = displaySets?.map(ds => ds.displaySetInstanceUID).sort() || [];

  useEffect(() => {
    const handleDisplaySetsChanged = (evt: Types.EventTypes.DisplaySetsChangedEvent) => {
      if (evt.detail.viewportId !== viewportId) {
        return;
      }

      const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
      const volumeIds = getPlanarOr3DViewport(viewport)?.getVolumeIds() ?? [];

      if (!evt.detail.sourceChanged && volumeIds.join() === rowVolumeIds.current.join()) {
        return;
      }

      updateViewportHistograms();
    };

    document.addEventListener(Events.DISPLAY_SETS_CHANGED, handleDisplaySetsChanged, true);

    // Only update if displaySets actually changed and are loaded
    if (displaySetIds.length && !isLoading) {
      updateViewportHistograms();
    }

    return () => {
      document.removeEventListener(Events.DISPLAY_SETS_CHANGED, handleDisplaySetsChanged, true);
    };
  }, [viewportId, cornerstoneViewportService, updateViewportHistograms, displaySetIds, isLoading]);

  return (
    <PanelSection defaultOpen={true}>
      <PanelSection.Header>Window Level</PanelSection.Header>
      <PanelSection.Content className="bg-muted py-1">
        {windowLevels.map((windowLevel, i) => {
          if (!windowLevel.histogram) {
            return null;
          }

          return (
            <WindowLevel
              key={windowLevel.volumeId}
              histogram={windowLevel.histogram}
              voi={windowLevel.voi}
              step={windowLevel.step}
              showOpacitySlider={windowLevel.showOpacitySlider}
              colormap={windowLevel.colormap}
              onVOIChange={voi => handleVOIChange(windowLevel.displaySetId, voi)}
              opacity={windowLevel.opacity}
              onOpacityChange={opacity =>
                handleOpacityChange(windowLevel.viewportId, i, windowLevel.volumeId, opacity)
              }
            />
          );
        })}
        {windowLevels.length === 0 && !isLoading && (
          <div className="text-muted-foreground py-2 text-center text-sm">
            No window level data available
          </div>
        )}
      </PanelSection.Content>
    </PanelSection>
  );
};

export default ViewportWindowLevel;
