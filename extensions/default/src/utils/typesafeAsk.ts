export type StudySnapshot = {
  studyInstanceUid: string;
  patientName: string;
  mrn: string;
  date: string;
  time: string;
  modalities: string;
  description: string;
  accession: string;
  instances: number;
};

export type WorklistFilters = {
  modalities?: string[];
  mrn?: string;
  description?: string;
  patient?: string;
  startDate?: string;
  endDate?: string;
};

export type TypesafeAction = {
  type:
    | 'open'
    | 'filter'
    | 'sort'
    | 'clear_sort'
    | 'clear_filters'
    | 'set_hanging_protocol'
    | 'set_layout'
    | 'next_stage'
    | 'previous_stage'
    | 'open_series'
    | 'play_cine'
    | 'pause_cine'
    | 'cine_faster'
    | 'cine_slower'
    | 'close_cine'
    | 'close_left_panel'
    | 'open_left_panel'
    | 'exit_one_up'
    | 'next_series'
    | 'previous_series'
    | 'invert'
    | 'maximize_viewport'
    | 'go_to_worklist'
    | 'overlay_series'
    | 'jump_slice'
    | 'set_opacity'
    | 'set_threshold'
    | 'reset_overlay'
    | 'none';
  label: string;
  studyInstanceUid?: string;
  filters?: WorklistFilters;
  sorting?: Array<{ id: string; desc: boolean }>;
  protocolId?: string;
  numRows?: number;
  numCols?: number;
  displaySetInstanceUID?: string;
  seriesNumber?: string;
  seriesModality?: string;
  seriesDescription?: string;
  orientation?: 'axial' | 'sagittal' | 'coronal';
  slicePreset?: 'first' | 'middle' | 'last';
  sliceNumber?: number;
  opacityDelta?: number;
  opacity?: number;
  threshold?: number;
};

export type AskResponse = {
  model: string;
  action: TypesafeAction;
  error?: string;
  message?: string;
};

export function snapshotStudies(
  studies: Array<{
    studyInstanceUid?: unknown;
    patientName?: unknown;
    mrn?: unknown;
    date?: unknown;
    time?: unknown;
    modalities?: unknown;
    description?: unknown;
    accession?: unknown;
    instances?: unknown;
  }>
): StudySnapshot[] {
  return studies.slice(0, 25).map(study => ({
    studyInstanceUid: String(study.studyInstanceUid ?? ''),
    patientName: String(study.patientName ?? ''),
    mrn: String(study.mrn ?? ''),
    date: String(study.date ?? ''),
    time: String(study.time ?? ''),
    modalities: String(study.modalities ?? ''),
    description: String(study.description ?? ''),
    accession: String(study.accession ?? ''),
    instances: Number(study.instances ?? 0) || 0,
  }));
}

export function splitSpokenCommands(text: string): string[] {
  return text
    .split(/\s*(?:,|;|\.|then|and then|after that)\s+/i)
    .map(part => part.trim())
    .filter(part => part.length > 1);
}

export async function typesafeAsk(body: {
  query: string;
  context: 'worklist' | 'viewer';
  studies?: StudySnapshot[];
  hangingProtocols?: Array<{ id: string; name: string }>;
  series?: Array<{
    displaySetInstanceUID: string;
    seriesNumber: string;
    modality: string;
    description: string;
  }>;
}): Promise<AskResponse> {
  const response = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  let payload: AskResponse | null = null;
  try {
    payload = JSON.parse(raw) as AskResponse;
  } catch {
    payload = null;
  }
  if (!response.ok || !payload || payload.error) {
    if (payload?.error === 'typesafe_unconfigured') {
      throw new Error(
        payload.message || 'Set TYPESAFE_API_KEY in worker/.dev.vars and restart wrangler.'
      );
    }
    if (!payload || response.status === 404 || response.status === 502 || response.status === 504) {
      throw new Error('TypeSafe worker is not running. Start it with pnpm dev:typesafe.');
    }
    throw new Error(payload.message || payload.error || `Ask failed (${response.status})`);
  }
  return payload;
}
