import { create } from 'zustand';
import type { StudyRow } from '@ohif/ui-next';
import type { AskDebugAnswer, TypesafeAction, WorklistFilters } from '../utils/typesafeAsk';

type WorklistHandlers = {
  studies: StudyRow[];
  applyFilters: (filters: Array<{ id: string; value: unknown }>) => void;
  applySorting: (sorting: Array<{ id: string; desc: boolean }>) => void;
  openStudy: (studyInstanceUid: string) => boolean;
};

export type LastViewerAction = {
  type: string;
  control: string;
  label: string;
  at: number;
};

export type TraceState = {
  phase: 'idle' | 'listening' | 'thinking' | 'done' | 'error';
  listening: boolean;
  context: 'worklist' | 'viewer';
  transcript: string;
  interim: boolean;
  queued: number;
  stateSummary: string;
  model: {
    name: string;
    ms: number;
    questions: number;
    answers: AskDebugAnswer[];
    action: { type: string; label: string };
  } | null;
  result: { ok: boolean; did: string; to: string; api: string } | null;
};

const EMPTY_TRACE: TraceState = {
  phase: 'idle',
  listening: false,
  context: 'viewer',
  transcript: '',
  interim: false,
  queued: 0,
  stateSummary: '',
  model: null,
  result: null,
};

const TRACE_HIDDEN_KEY = 'ohif-jev-trace-hidden';

function readTraceHidden(): boolean {
  try {
    return localStorage.getItem(TRACE_HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

type TypeSafeSessionStore = {
  worklist: WorklistHandlers | null;
  pendingQueries: string[];
  lastViewerAction: LastViewerAction | null;
  leftPanelClosed: boolean | null;
  trace: TraceState;
  traceHidden: boolean;
  setWorklist: (worklist: WorklistHandlers) => void;
  clearWorklist: () => void;
  setPendingQueries: (queries: string[]) => void;
  takePendingQueries: () => string[];
  setLastViewerAction: (action: LastViewerAction | null) => void;
  setLeftPanelClosed: (closed: boolean | null) => void;
  setTrace: (patch: Partial<TraceState>) => void;
  setTraceHidden: (hidden: boolean) => void;
};

export const useTypeSafeSessionStore = create<TypeSafeSessionStore>((set, get) => ({
  worklist: null,
  pendingQueries: [],
  lastViewerAction: null,
  leftPanelClosed: null,
  trace: EMPTY_TRACE,
  traceHidden: readTraceHidden(),
  setWorklist: worklist => set({ worklist }),
  clearWorklist: () => set({ worklist: null }),
  setPendingQueries: queries => set({ pendingQueries: queries }),
  takePendingQueries: () => {
    const queries = get().pendingQueries;
    set({ pendingQueries: [] });
    return queries;
  },
  setLastViewerAction: action => set({ lastViewerAction: action }),
  setLeftPanelClosed: closed => set({ leftPanelClosed: closed }),
  setTrace: patch => set(state => ({ trace: { ...state.trace, ...patch } })),
  setTraceHidden: hidden => {
    try {
      localStorage.setItem(TRACE_HIDDEN_KEY, hidden ? '1' : '0');
    } catch {
      // Ignore storage failures.
    }
    set({ traceHidden: hidden });
  },
}));

export function applyWorklistFiltersFromAction(
  filters: WorklistFilters,
  applyFilters: WorklistHandlers['applyFilters']
) {
  const next: Array<{ id: string; value: unknown }> = [];
  if (filters.modalities?.length) {
    next.push({ id: 'modalities', value: filters.modalities });
  }
  if (filters.mrn) {
    next.push({ id: 'mrn', value: filters.mrn });
  }
  if (filters.patient) {
    next.push({ id: 'patient', value: filters.patient });
  }
  if (filters.description) {
    next.push({ id: 'description', value: filters.description });
  }
  if (filters.startDate || filters.endDate) {
    next.push({
      id: 'studyDateTime',
      value: {
        ...(filters.startDate ? { startDate: filters.startDate } : {}),
        ...(filters.endDate ? { endDate: filters.endDate } : {}),
      },
    });
  }
  applyFilters(next);
}

export function runWorklistAction(
  action: TypesafeAction,
  worklist: WorklistHandlers
): { ok: boolean; message: string } {
  if (action.type === 'open' && action.studyInstanceUid) {
    const opened = worklist.openStudy(action.studyInstanceUid);
    return { ok: opened, message: action.label };
  }
  if (action.type === 'filter' && action.filters) {
    applyWorklistFiltersFromAction(action.filters, worklist.applyFilters);
    return { ok: true, message: action.label };
  }
  if (action.type === 'sort' && action.sorting) {
    worklist.applySorting(action.sorting);
    return { ok: true, message: action.label };
  }
  if (action.type === 'clear_sort') {
    worklist.applySorting([]);
    return { ok: true, message: action.label };
  }
  if (action.type === 'clear_filters') {
    worklist.applyFilters([]);
    return { ok: true, message: action.label };
  }
  return { ok: false, message: action.label };
}
