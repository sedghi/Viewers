import { create } from 'zustand';
import type { StudyRow } from '@ohif/ui-next';
import type { TypesafeAction, WorklistFilters } from '../utils/typesafeAsk';

type WorklistHandlers = {
  studies: StudyRow[];
  applyFilters: (filters: Array<{ id: string; value: unknown }>) => void;
  applySorting: (sorting: Array<{ id: string; desc: boolean }>) => void;
  openStudy: (studyInstanceUid: string) => boolean;
};

type TypeSafeSessionStore = {
  worklist: WorklistHandlers | null;
  pendingQueries: string[];
  setWorklist: (worklist: WorklistHandlers) => void;
  clearWorklist: () => void;
  setPendingQueries: (queries: string[]) => void;
  takePendingQueries: () => string[];
};

export const useTypeSafeSessionStore = create<TypeSafeSessionStore>((set, get) => ({
  worklist: null,
  pendingQueries: [],
  setWorklist: worklist => set({ worklist }),
  clearWorklist: () => set({ worklist: null }),
  setPendingQueries: queries => set({ pendingQueries: queries }),
  takePendingQueries: () => {
    const queries = get().pendingQueries;
    set({ pendingQueries: [] });
    return queries;
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
