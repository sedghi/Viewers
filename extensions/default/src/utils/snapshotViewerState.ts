import { useToggleOneUpViewportGridStore } from '../stores/useToggleOneUpViewportGridStore';
import type { LastViewerAction } from '../stores/useTypeSafeSessionStore';
import type { ViewerStateSnapshot } from './typesafeAsk';

function planeName(value: unknown): string {
  const text = String(value ?? '').toLowerCase();
  if (/sagg?itt?al|sagital/.test(text)) {
    return 'sagittal';
  }
  if (text.includes('coronal')) {
    return 'coronal';
  }
  if (text.includes('axial') || text.includes('transaxial')) {
    return 'axial';
  }
  return '';
}

/**
 * Captures the parts of viewer state the classifier needs to resolve contextual
 * phrases such as "toggle", "close it", "reset that", "bigger", and bare "next".
 */
export function snapshotViewerState(
  servicesManager: AppTypes.ServicesManager,
  lastAction: LastViewerAction | null,
  leftPanelClosed: boolean | null
): ViewerStateSnapshot {
  const {
    viewportGridService,
    displaySetService,
    cornerstoneViewportService,
    cineService,
    hangingProtocolService,
  } = servicesManager.services;

  const grid = viewportGridService.getState();
  const { layout, activeViewportId, viewports } = grid;
  const activeGridViewport = activeViewportId ? viewports.get(activeViewportId) : undefined;
  const uids: string[] = activeGridViewport?.displaySetInstanceUIDs || [];
  const sets = uids.map(uid => displaySetService.getDisplaySetByUID(uid)).filter(Boolean);
  const modalities = sets.map(displaySet => String(displaySet.Modality || '')).filter(Boolean);

  let orientation = '';
  try {
    orientation = planeName(cornerstoneViewportService?.getOrientation?.(activeViewportId));
  } catch {
    orientation = '';
  }
  if (!orientation) {
    orientation = planeName(activeGridViewport?.viewportOptions?.orientation);
  }

  const topLayer = sets.length > 1 ? sets[sets.length - 1] : null;
  const cineState = cineService?.getState?.() || {};
  const cine = cineState.cines?.[activeViewportId] || {};
  const { toggleOneUpViewportGridStore } = useToggleOneUpViewportGridStore.getState();
  const isSingle = layout.numRows === 1 && layout.numCols === 1;

  const activeProtocol = (hangingProtocolService.getActiveProtocol?.() || {}) as {
    protocol?: { id?: string; stages?: unknown[] };
    stageIndex?: number;
  };
  const protocolState = (hangingProtocolService.getState?.() || {}) as {
    protocolId?: string;
    stageIndex?: number;
  };

  return {
    layout: { numRows: layout.numRows, numCols: layout.numCols },
    isOneUp: isSingle && Boolean(toggleOneUpViewportGridStore),
    canRestoreLayout: Boolean(toggleOneUpViewportGridStore),
    activeViewport: activeViewportId
      ? {
          id: activeViewportId,
          orientation,
          modalities,
          layerCount: sets.length,
          viewportType: String(activeGridViewport?.viewportOptions?.viewportType || ''),
        }
      : null,
    overlay: topLayer
      ? {
          modality: String(topLayer.Modality || ''),
          description: String(topLayer.SeriesDescription || ''),
        }
      : null,
    cine: {
      enabled: Boolean(cineState.isCineEnabled),
      isPlaying: Boolean(cine.isPlaying),
      frameRate: Number(cine.frameRate) || 24,
    },
    leftPanelClosed,
    protocol: {
      id: String(protocolState.protocolId || activeProtocol.protocol?.id || ''),
      stageIndex: Number(protocolState.stageIndex ?? activeProtocol.stageIndex ?? 0) || 0,
      stageCount: Number(activeProtocol.protocol?.stages?.length) || 1,
    },
    seriesCount: (displaySetService.getActiveDisplaySets() || []).length,
    lastAction: lastAction
      ? {
          type: lastAction.type,
          control: lastAction.control,
          label: lastAction.label,
          secondsAgo: Math.max(0, Math.round((Date.now() - lastAction.at) / 1000)),
        }
      : null,
  };
}

/** Short human-readable line describing a snapshot, shown in the trace bar. */
export function summarizeViewerState(state?: ViewerStateSnapshot): string {
  if (!state) {
    return '';
  }
  const parts: string[] = [];
  parts.push(`${state.layout.numRows}x${state.layout.numCols}${state.isOneUp ? ' one-up' : ''}`);
  if (state.activeViewport) {
    const plane = state.activeViewport.orientation || state.activeViewport.viewportType;
    const modalities = state.activeViewport.modalities.join('+');
    parts.push([plane, modalities].filter(Boolean).join(' '));
  }
  if (state.overlay) {
    parts.push(`${state.overlay.modality} overlay`);
  }
  parts.push(
    `cine ${state.cine.enabled ? (state.cine.isPlaying ? `${state.cine.frameRate}fps` : 'paused') : 'off'}`
  );
  if (state.leftPanelClosed !== null) {
    parts.push(`panel ${state.leftPanelClosed ? 'closed' : 'open'}`);
  }
  if (state.protocol.id) {
    parts.push(
      state.protocol.stageCount > 1
        ? `${state.protocol.id} ${state.protocol.stageIndex + 1}/${state.protocol.stageCount}`
        : state.protocol.id
    );
  }
  return parts.filter(Boolean).join(' · ');
}
