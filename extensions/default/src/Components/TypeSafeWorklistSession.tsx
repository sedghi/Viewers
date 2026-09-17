import { useCallback, useEffect } from 'react';
import { useWorkflows, type StudyRow } from '@ohif/ui-next';
import { useTypeSafeSessionStore } from '../stores/useTypeSafeSessionStore';

type WorklistFilter = { id: string; value: unknown };

type Props = {
  studies: StudyRow[];
  commandsManager: {
    run: (commandName: string, options?: Record<string, unknown>) => unknown;
  };
  onApplyFilters: (filters: WorklistFilter[]) => void;
  onApplySorting: (sorting: Array<{ id: string; desc: boolean }>) => void;
};

export function TypeSafeWorklistSession({
  studies,
  commandsManager,
  onApplyFilters,
  onApplySorting,
}: Props) {
  const { getWorkflowsForStudy, getDefaultWorkflowForStudy } = useWorkflows();

  const openStudy = useCallback(
    (studyInstanceUid: string) => {
      const row = studies.find(item => item.studyInstanceUid === studyInstanceUid);
      if (!row) {
        return false;
      }
      const workflows = getWorkflowsForStudy(row);
      const defaultWorkflow = getDefaultWorkflowForStudy(row);
      commandsManager.run('launchDefaultMode', { study: row, workflows, defaultWorkflow });
      return true;
    },
    [commandsManager, getDefaultWorkflowForStudy, getWorkflowsForStudy, studies]
  );

  useEffect(() => {
    useTypeSafeSessionStore.getState().setWorklist({
      studies,
      applyFilters: onApplyFilters,
      applySorting: onApplySorting,
      openStudy,
    });
  }, [onApplyFilters, onApplySorting, openStudy, studies]);

  useEffect(() => {
    return () => {
      useTypeSafeSessionStore.getState().clearWorklist();
    };
  }, []);

  return null;
}

export default TypeSafeWorklistSession;
