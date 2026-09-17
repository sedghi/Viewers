/// <reference path="../env.d.ts" />

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';
const MAX_STUDIES = 25;
const ASK_TIMEOUT_MS = 15000;

type StudySnapshot = {
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

type HangingProtocolSnapshot = {
  id: string;
  name: string;
};

type SeriesSnapshot = {
  displaySetInstanceUID: string;
  seriesNumber: string;
  modality: string;
  description: string;
};

type AskRequest = {
  query?: unknown;
  context?: unknown;
  studies?: unknown;
  hangingProtocols?: unknown;
  series?: unknown;
};

type ChoiceAnswer = {
  type: 'choice';
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
};

type NoulAnswer = {
  type: 'noul';
  noul: number;
};

type TypeSafeResponse = {
  model: string;
  answers: Record<string, ChoiceAnswer | NoulAnswer>;
};

export type WorklistFilters = {
  modalities?: string[];
  mrn?: string;
  description?: string;
  patient?: string;
  startDate?: string;
  endDate?: string;
};

export type AskResponse = {
  model: string;
  action: {
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
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function snapshotStudy(value: Record<string, unknown>): StudySnapshot | null {
  const studyInstanceUid = String(value.studyInstanceUid ?? '').trim();
  if (!studyInstanceUid) {
    return null;
  }
  return {
    studyInstanceUid,
    patientName: String(value.patientName ?? ''),
    mrn: String(value.mrn ?? ''),
    date: String(value.date ?? ''),
    time: String(value.time ?? ''),
    modalities: String(value.modalities ?? ''),
    description: String(value.description ?? ''),
    accession: String(value.accession ?? ''),
    instances: Number(value.instances ?? 0) || 0,
  };
}

function parseStudies(input: unknown): StudySnapshot[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const studies: StudySnapshot[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const study = snapshotStudy(item as Record<string, unknown>);
    if (study) {
      studies.push(study);
    }
    if (studies.length >= MAX_STUDIES) {
      break;
    }
  }
  return studies;
}

function studyLabel(study: StudySnapshot): string {
  return [study.patientName, study.modalities, study.description, study.date]
    .filter(part => part.length > 0)
    .join(' | ');
}

function uniqueValues(values: string[], max = 20): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= max) {
      break;
    }
  }
  return out;
}

function tokenize(value: string): string[] {
  return String(value ?? '')
    .toUpperCase()
    .split(/[\s,^/\\_-]+/)
    .filter(token => token.length >= 2);
}

function formatYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function choiceOf(
  answer: unknown,
  fallback = 'none'
): { choice: string; confidence: number } {
  if (isChoice(answer)) {
    return { choice: answer.choice, confidence: answer.confidence };
  }
  return { choice: fallback, confidence: 0 };
}

function noulOf(answer: unknown): number {
  return isNoul(answer) ? answer.noul : 0;
}

function withNone(criteria: Record<string, string>): Record<string, string> {
  const next = {
    none: 'Do not use this field for the request.',
    ...criteria,
  };
  if (Object.keys(next).length < 2) {
    next.unspecified = 'No value is available on the current worklist.';
  }
  return next;
}

function isChoice(answer: unknown): answer is ChoiceAnswer {
  return Boolean(answer && typeof answer === 'object' && (answer as ChoiceAnswer).type === 'choice');
}

function isNoul(answer: unknown): answer is NoulAnswer {
  return Boolean(answer && typeof answer === 'object' && (answer as NoulAnswer).type === 'noul');
}

function buildQuestions(studies: StudySnapshot[]) {
  const targetCriteria: Record<string, string> = {
    none: 'Do not open a study.',
  };
  for (const study of studies) {
    targetCriteria[study.studyInstanceUid] = studyLabel(study);
  }

  const modalityCriteria: Record<string, string> = {
    CT: 'Computed tomography (CT)',
    MR: 'Magnetic resonance (MR, MRI)',
    PT: 'Positron emission tomography (PT, PET)',
    CR: 'Computed radiography (CR)',
    DX: 'Digital radiography (DX)',
    US: 'Ultrasound (US)',
    XA: 'X-ray angiography (XA)',
    NM: 'Nuclear medicine (NM)',
    MG: 'Mammography (MG)',
  };
  for (const modality of uniqueValues(studies.flatMap(study => tokenize(study.modalities)))) {
    if (!modalityCriteria[modality]) {
      modalityCriteria[modality] = `Modality ${modality}`;
    }
  }

  const mrnCriteria: Record<string, string> = {};
  for (const mrn of uniqueValues(studies.map(study => study.mrn))) {
    mrnCriteria[mrn] = `Medical record number ${mrn}`;
  }

  const patientCriteria: Record<string, string> = {};
  for (const patient of uniqueValues(studies.map(study => study.patientName))) {
    patientCriteria[patient] = patient;
  }

  const descriptionCriteria: Record<string, string> = {};
  for (const token of uniqueValues(studies.flatMap(study => tokenize(study.description)), 15)) {
    descriptionCriteria[token] = `Description contains ${token}`;
  }

  const dateCriteria: Record<string, string> = {
    today: 'Studies from today only',
    yesterday: 'Studies from yesterday only',
    last_7_days: 'Studies from the last 7 days',
    last_30_days: 'Studies from the last 30 days',
    last_year: 'Studies from the last 12 months',
  };
  for (const year of uniqueValues(
    studies.map(study => study.date.slice(0, 4)).filter(year => /^\d{4}$/.test(year))
  )) {
    dateCriteria[`year_${year}`] = `Studies from calendar year ${year}`;
  }

  return {
    action: {
      type: 'choice',
      instructions: {
        question: 'Which worklist action should run for `query`?',
        focus: 'Pick one action the application can execute immediately.',
      },
      criteria: {
        open: {
          what: 'Open one study in the viewer, including by patient name',
          not_for: 'Only filtering the list without opening',
          examples: [
            'Open the most recent chest CT',
            'Show this patient prior',
            'Launch that study',
            'Open the latest MRI',
            'Take me into the chest CT',
            'Open patient name ACRIN',
            'Open patient ACRIN',
            'Open the ACRIN study',
          ],
        },
        filter: {
          what: 'Filter the worklist by modality, MRN, description, patient, or dates',
          not_for: 'Opening a named patient or study',
          examples: [
            'Show MRI studies',
            'Filter by MRN',
            'Studies from last year',
            'Only CT exams',
            'Filter yesterday',
            'Show studies from today',
            'Filter by name',
            'Filter by patient name John',
            'Show studies for Jane Doe',
            'Show all studies with CT and PET',
            'Filter CT and PT',
            'I want to see studies with CT and PET modalities',
          ],
        },
        sort: {
          what: 'Change the worklist sort order',
          not_for: 'Filtering rows or opening a study',
          examples: [
            'Newest first',
            'Sort by patient name',
            'Oldest first',
            'Sort by date descending',
            'Order by study date',
          ],
        },
        clear_sort: {
          what: 'Remove the current sort order',
          not_for: 'Changing filters',
          examples: ['Remove sorting', 'Clear sort', 'Undo the sort', 'No sort'],
        },
        clear_filters: {
          what: 'Clear all worklist filters',
          not_for: 'Clearing sort only',
          examples: [
            'Clear filters',
            'Reset the worklist filters',
            'Show all studies',
            'Remove filters',
            'Reset the list',
          ],
        },
        none: {
          what: 'No worklist action can be taken',
          not_for: 'A request that maps to open, filter, or sort',
          examples: ['What is TypeSafe?'],
        },
      },
    },
    target: {
      type: 'choice',
      instructions: {
        question: 'If `query` is asking to open a study, which study in `studies` should open?',
        focus: 'Pick one study, or none.',
      },
      criteria: targetCriteria,
    },
    modality: {
      type: 'choice',
      instructions:
        'If `query` names one imaging modality, which one is it? If the query names several (CT and PET), pick none; code will collect all of them.',
      criteria: withNone(modalityCriteria),
    },
    mrn: {
      type: 'choice',
      instructions: 'If `query` filters by MRN, which MRN from `studies` should be applied?',
      criteria: withNone(mrnCriteria),
    },
    patient: {
      type: 'choice',
      instructions: 'If `query` filters by patient name, which patient from `studies` should be applied?',
      criteria: withNone(patientCriteria),
    },
    description: {
      type: 'choice',
      instructions: 'If `query` filters by study description, which token from `studies` should be applied?',
      criteria: withNone(descriptionCriteria),
    },
    dateRange: {
      type: 'choice',
      instructions: 'If `query` filters by study date, which date range should be applied?',
      criteria: withNone(dateCriteria),
    },
    sortBy: {
      type: 'choice',
      instructions: 'If `query` changes sort order, which column should be sorted?',
      criteria: {
        none: 'Do not change sorting',
        studyDateTime: 'Study date and time',
        patient: 'Patient name',
        mrn: 'Medical record number',
      },
    },
    newestFirst: {
      type: 'noul',
      instructions: 'If sorting, should the worklist be ordered newest or largest first (descending)?',
      criteria: {
        true: 'Newest first, or descending order',
        false: 'Oldest first, or ascending order',
      },
    },
    applyModality: {
      type: 'noul',
      instructions: 'Does `query` ask to filter the worklist by imaging modality?',
    },
    applyMrn: {
      type: 'noul',
      instructions: 'Does `query` ask to filter the worklist by medical record number?',
    },
    applyPatient: {
      type: 'noul',
      instructions:
        'Does `query` ask to filter the worklist by patient name (for example "filter by name Jane")? This is not MRN, and not phrases like "new patient id".',
    },
    applyDescription: {
      type: 'noul',
      instructions: 'Does `query` ask to filter the worklist by study description or body part?',
    },
    applyDates: {
      type: 'noul',
      instructions: 'Does `query` ask to filter the worklist by study date or time range?',
    },
  };
}

function dateRangeFromChoice(choice: string): { startDate: string; endDate: string } | null {
  const today = new Date();
  if (choice === 'today') {
    return { startDate: formatYmd(today), endDate: formatYmd(today) };
  }
  if (choice === 'yesterday') {
    const yesterday = addDays(today, -1);
    return { startDate: formatYmd(yesterday), endDate: formatYmd(yesterday) };
  }
  if (choice === 'last_7_days') {
    return { startDate: formatYmd(addDays(today, -7)), endDate: formatYmd(today) };
  }
  if (choice === 'last_30_days') {
    return { startDate: formatYmd(addDays(today, -30)), endDate: formatYmd(today) };
  }
  if (choice === 'last_year') {
    return { startDate: formatYmd(addDays(today, -365)), endDate: formatYmd(today) };
  }
  const yearMatch = /^year_(\d{4})$/.exec(choice);
  if (yearMatch) {
    return { startDate: `${yearMatch[1]}0101`, endDate: `${yearMatch[1]}1231` };
  }
  return null;
}

function composeAction(
  answers: TypeSafeResponse['answers'],
  studies: StudySnapshot[],
  query: string
): AskResponse['action'] {
  const action = choiceOf(answers.action).choice;
  const target = choiceOf(answers.target).choice;
  const modality = choiceOf(answers.modality).choice;
  const mrn = choiceOf(answers.mrn).choice;
  const patient = choiceOf(answers.patient).choice;
  const description = choiceOf(answers.description).choice;
  const dateRange = choiceOf(answers.dateRange).choice;
  const sortBy = choiceOf(answers.sortBy).choice;
  const newestFirst = noulOf(answers.newestFirst) >= 0.5;

  const namedModalities = modalitiesFromQuery(query);
  const wantsOpen =
    /\bopen\b/.test(query.toLowerCase()) &&
    !/\bfilter\b/.test(query.toLowerCase()) &&
    namedModalities.length < 2;

  if ((action === 'open' || wantsOpen) && namedModalities.length < 2) {
    const named = matchPatientFromQuery(query, studies);
    const study =
      (named ? newestStudyForPatient(studies, named) : undefined) ||
      studies.find(item => item.studyInstanceUid === target);
    if (!study) {
      return { type: 'none', label: 'No matching study to open' };
    }
    return {
      type: 'open',
      label: `Opening ${studyLabel(study)}`,
      studyInstanceUid: study.studyInstanceUid,
    };
  }

  if (action === 'filter' || namedModalities.length > 0) {
    const filters: WorklistFilters = {};
    if (namedModalities.length) {
      filters.modalities = namedModalities;
    } else if (noulOf(answers.applyModality) >= 0.7 && modality !== 'none') {
      filters.modalities = [normalizeSpokenModality(modality)].filter(Boolean) as string[];
    }
    const queryText = query.toLowerCase();
    const askedMrn = /\bmrn\b/.test(queryText) || noulOf(answers.applyMrn) >= 0.7;
    const askedPatientName =
      /\bpatient name\b/.test(queryText) ||
      /\bfilter by name\b/.test(queryText) ||
      (/\bname\b/.test(queryText) && !askedMrn);
    if (noulOf(answers.applyMrn) >= 0.7 && mrn !== 'none') {
      filters.mrn = mrn;
    }
    if (!askedMrn) {
      if (noulOf(answers.applyPatient) >= 0.7 && patient !== 'none') {
        filters.patient = patient;
      } else if (askedPatientName) {
        const named = matchPatientFromQuery(query, studies);
        if (named) {
          filters.patient = named;
        }
      }
    }
    if (noulOf(answers.applyDescription) >= 0.7 && description !== 'none') {
      filters.description = description;
    }
    const range =
      noulOf(answers.applyDates) >= 0.7 ? dateRangeFromChoice(dateRange) : null;
    if (range) {
      filters.startDate = range.startDate;
      filters.endDate = range.endDate;
    }
    if (Object.keys(filters).length === 0) {
      return { type: 'none', label: 'No worklist filter to apply' };
    }
    const parts = [
      filters.modalities?.join('+'),
      filters.mrn ? `MRN ${filters.mrn}` : null,
      filters.patient,
      filters.description,
      range ? `${range.startDate}-${range.endDate}` : null,
    ].filter(Boolean);
    return {
      type: 'filter',
      label: `Filtered worklist${parts.length ? `: ${parts.join(', ')}` : ''}`,
      filters,
    };
  }

  if (action === 'sort') {
    const id = sortBy === 'none' ? 'studyDateTime' : sortBy;
    return {
      type: 'sort',
      label: newestFirst ? `Sorted ${id}, newest first` : `Sorted ${id}, oldest first`,
      sorting: [{ id, desc: newestFirst }],
    };
  }

  if (action === 'clear_sort') {
    return { type: 'clear_sort', label: 'Cleared sorting', sorting: [] };
  }

  if (action === 'clear_filters') {
    return { type: 'clear_filters', label: 'Cleared filters' };
  }

  return { type: 'none', label: 'No worklist action for that request' };
}

function parseHangingProtocols(input: unknown): HangingProtocolSnapshot[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const protocols: HangingProtocolSnapshot[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const id = String((item as { id?: unknown }).id ?? '').trim();
    if (!id) {
      continue;
    }
    protocols.push({
      id,
      name: String((item as { name?: unknown }).name ?? id),
    });
    if (protocols.length >= 20) {
      break;
    }
  }
  return protocols;
}

function parseSeries(input: unknown): SeriesSnapshot[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const series: SeriesSnapshot[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const record = item as Record<string, unknown>;
    const displaySetInstanceUID = String(record.displaySetInstanceUID ?? '').trim();
    if (!displaySetInstanceUID) {
      continue;
    }
    series.push({
      displaySetInstanceUID,
      seriesNumber: String(record.seriesNumber ?? '').trim(),
      modality: String(record.modality ?? '').trim().toUpperCase(),
      description: String(record.description ?? '').trim(),
    });
    if (series.length >= 30) {
      break;
    }
  }
  return series;
}

function buildViewerQuestions(
  protocols: HangingProtocolSnapshot[],
  series: SeriesSnapshot[]
) {
  const protocolAliases: Record<string, string> = {
    mpr: [
      'MPR',
      'MPR HP',
      'multiplanar',
      'multi planar',
      'multiplanar reconstruction',
      'multi planar reconstruction',
      'multiplanar reformatting',
      'multi planar reformatting',
      'multi-planar reformatting',
      'axial sagittal coronal',
    ].join(', '),
  };
  const protocolCriteria: Record<string, string> = {
    none: 'Do not change the hanging protocol.',
  };
  for (const protocol of protocols) {
    const aliases = protocolAliases[protocol.id];
    protocolCriteria[protocol.id] = aliases
      ? `${protocol.name} hanging protocol (${protocol.id}; also: ${aliases})`
      : `${protocol.name} hanging protocol (${protocol.id})`;
  }
  if (!protocolCriteria.mpr) {
    protocolCriteria.mpr = `MPR hanging protocol (${protocolAliases.mpr})`;
  }

  return {
    action: {
      type: 'choice',
      instructions: {
        question: 'Which viewer action should run for `query`?',
        focus: 'Pick one action the application can execute immediately.',
      },
      criteria: {
        set_hanging_protocol: {
          what: 'Switch to a hanging protocol or layout preset such as MPR / multiplanar reformatting',
          not_for: 'A grid layout change that is not a named protocol',
          examples: [
            'Move to MPR HP',
            'Switch to MPR',
            'MPR',
            'Multiplanar reconstruction',
            'Multi planar reconstruction',
            'Multiplanar reformatting',
            'Multi planar reformatting',
            'Go to MPR',
            'Use the default hanging protocol',
          ],
        },
        set_layout: {
          what: 'Change the viewport grid layout (1x1, 1x2, 2x2)',
          not_for: 'Named hanging protocols like MPR',
          examples: [
            'Two up',
            'Four up',
            'Single viewport',
            'One up',
            'Side by side',
            '2 by 2',
            '1 by 2 layout',
          ],
        },
        next_stage: {
          what: 'Go to the next hanging protocol stage',
          not_for: 'Next series in the study browser',
          examples: ['Next stage', 'Next hanging protocol stage', 'Advance stage', 'Next layout stage'],
        },
        previous_stage: {
          what: 'Go to the previous hanging protocol stage',
          not_for: 'Previous series in the study browser',
          examples: ['Previous stage', 'Go back a stage', 'Last stage', 'Prior hanging protocol stage'],
        },
        open_series: {
          what: 'Open or hang a series in the active viewport by series number and/or modality',
          not_for: 'Changing hanging protocol or grid layout',
          examples: [
            'Open series 2 CT',
            'Show series 5 MR',
            'Hang the CT series',
            'Display series 3',
            'Put series 1 in the viewport',
          ],
        },
        play_cine: {
          what: 'Start cine playback on the active viewport',
          not_for: 'Changing speed, pausing, or closing cine',
          examples: ['Play cine', 'Start cine', 'Play the clip', 'Start movie mode', 'Run cine'],
        },
        pause_cine: {
          what: 'Pause cine playback but leave the cine player open',
          not_for: 'Closing or hiding the cine player',
          examples: ['Pause cine', 'Pause the clip', 'Hold cine'],
        },
        cine_faster: {
          what: 'Increase cine frame rate / play faster, including from the default 24 FPS',
          not_for: 'Starting cine from stopped without a speed change',
          examples: [
            'Increase cine speed',
            'Make it faster',
            'Cine faster',
            'Speed up cine',
            'Faster FPS',
            'Play cine faster',
            'Bump the frame rate',
          ],
        },
        cine_slower: {
          what: 'Decrease cine frame rate / play slower',
          not_for: 'Pausing or closing cine',
          examples: [
            'Decrease cine speed',
            'Make it slower',
            'Cine slower',
            'Slow down cine',
            'Slower FPS',
            'Play cine slower',
            'Lower the frame rate',
          ],
        },
        close_cine: {
          what: 'Close or hide the cine player entirely',
          not_for: 'Pausing playback while leaving cine visible',
          examples: [
            'Close cine',
            'Hide cine',
            'Dismiss cine',
            'Turn off cine',
            'Exit cine',
            'Get rid of cine',
          ],
        },
        close_left_panel: {
          what: 'Close or collapse the left side panel (study browser / thumbnails)',
          not_for: 'Closing cine, opening the left panel, or changing layout',
          examples: [
            'Close the left panel',
            'Hide the left panel',
            'Collapse the series list',
            'Close study browser',
            'Hide thumbnails',
          ],
        },
        open_left_panel: {
          what: 'Open or expand the left side panel (study browser / thumbnails)',
          not_for: 'Closing the left panel',
          examples: [
            'Open the left panel',
            'Show the left panel',
            'Show thumbnails',
            'Show the study browser',
            'Open series list',
          ],
        },
        exit_one_up: {
          what: 'Leave one-up / maximized view and restore the previous layout (usually MPR)',
          not_for: 'Maximizing a single orientation',
          examples: [
            'Exit one up',
            'Restore MPR',
            'Go back to MPR',
            'Unmaximize',
            'Restore the layout',
            'Exit maximized view',
          ],
        },
        next_series: {
          what: 'Hang the next image series in the active viewport',
          not_for: 'Next hanging protocol stage or next slice',
          examples: [
            'Next series',
            'Show the next series',
            'Go to the next series',
            'Advance series',
          ],
        },
        previous_series: {
          what: 'Hang the previous image series in the active viewport',
          not_for: 'Previous hanging protocol stage or previous slice',
          examples: [
            'Previous series',
            'Last series',
            'Go to the previous series',
            'Prior series',
          ],
        },
        invert: {
          what: 'Invert grayscale of the active viewport',
          not_for: 'Inverting layout or overlay opacity',
          examples: ['Invert', 'Invert the image', 'Invert grayscale', 'Invert the viewport'],
        },
        maximize_viewport: {
          what: 'Maximize one orientation or viewport to fill the viewer (one-up)',
          not_for: 'Changing hanging protocol or overlaying a series',
          examples: [
            'Maximize sagittal view',
            'Maximize sagital',
            'See sagittal completely',
            'Show saggital completely',
            'I want to see sagittal completely',
            'Maximize axial',
            'Maximize coronal',
            'One up sagittal',
            'Full screen sagittal',
          ],
        },
        go_to_worklist: {
          what: 'Leave the viewer and return to the study worklist',
          not_for: 'Filtering studies while already on the worklist',
          examples: [
            'Go back to worklist',
            'Return to the study list',
            'Back to worklist',
            'Go to the worklist',
            'Leave the viewer',
          ],
        },
        overlay_series: {
          what: 'Add a series as a foreground overlay on the current viewport, such as PET AC on CT',
          not_for: 'Replacing the background series (that is open_series)',
          examples: [
            'Overlay the PET attenuation corrected on top',
            'Overlay PET AC',
            'Add PET as foreground',
            'Fusion the PET on the CT',
            'Put PET NAC on top',
          ],
        },
        jump_slice: {
          what: 'Jump the active viewport to a slice index, the middle, first, or last slice',
          not_for: 'PET SUV threshold (for example filter PT 5 SUV) or cine speed',
          examples: [
            'Go to the middle',
            'Go to slice 145',
            'Jump to slice number 80',
            'First slice',
            'Last slice',
            'Center slice',
          ],
        },
        set_opacity: {
          what: 'Increase, decrease, or set overlay (usually PET) opacity',
          not_for: 'PET SUV threshold (filter PT 5 SUV) or jumping slices',
          examples: [
            'Increase the opacity of PET',
            'Decrease PET opacity',
            'Make the overlay more opaque',
            'Make PET more transparent',
            'Set PET opacity to 50 percent',
          ],
        },
        set_threshold: {
          what: 'Set the PET overlay lower SUV threshold so voxels below that SUV are hidden. "Filter PT 5 SUV" means threshold 5, not a worklist filter and not a slice jump.',
          not_for: 'Worklist filters, jumping to a slice number, or changing opacity',
          examples: [
            'Filter PT 5 SUV',
            'Filter PET 5 SUV',
            'Filter the PET threshold to be from 5 SUV',
            'Set PET threshold to 5',
            'Threshold PET at 2 SUV',
            'SUV threshold 4',
            'Show PET above 5 SUV',
            '5 SUV',
          ],
        },
        reset_overlay: {
          what: 'Reset PET overlay threshold and/or opacity to defaults',
          not_for: 'Closing cine or clearing worklist filters',
          examples: [
            'Reset that',
            'Reset the threshold',
            'Reset PET overlay',
            'Clear the SUV filter',
            'Reset opacity',
          ],
        },
        none: {
          what: 'No viewer action can be taken',
          not_for: 'A request that maps to protocol, layout, overlay, slice, cine, or panels',
          examples: ['What is TypeSafe?'],
        },
      },
    },
    hangingProtocol: {
      type: 'choice',
      instructions:
        'If `query` asks for a hanging protocol, which protocol in `hangingProtocols` should be applied? MPR includes multiplanar / multi planar reconstruction or reformatting.',
      criteria: protocolCriteria,
    },
    wantsMpr: {
      type: 'noul',
      instructions:
        'Does `query` ask to switch to MPR, multiplanar reconstruction, multi planar reconstruction, multiplanar reformatting, or multi planar reformatting?',
    },
    layout: {
      type: 'choice',
      instructions: 'If `query` asks for a viewport grid, which layout should be applied?',
      criteria: {
        none: 'Do not change the grid layout',
        '1x1': 'Single viewport',
        '1x2': 'Side by side, one row two columns',
        '2x2': 'Four up, two rows two columns',
        '3x1': 'Three rows, one column',
      },
    },
    series: {
      type: 'choice',
      instructions:
        'If `query` asks to open a series, which series in `series` should hang in the viewport?',
      criteria: withNone(
        Object.fromEntries(
          series.map(item => [
            item.displaySetInstanceUID,
            `Series ${item.seriesNumber || '?'} ${item.modality || ''} ${item.description}`.trim(),
          ])
        )
      ),
    },
    seriesNumber: {
      type: 'choice',
      instructions: 'If `query` names a series number, which series number from `series` is it?',
      criteria: withNone(
        Object.fromEntries(
          uniqueValues(series.map(item => item.seriesNumber).filter(Boolean)).map(value => [
            value,
            `Series number ${value}`,
          ])
        )
      ),
    },
    orientation: {
      type: 'choice',
      instructions: 'If `query` names an image plane to maximize or focus, which orientation is it?',
      criteria: {
        none: 'No orientation named',
        axial: 'Axial / transaxial',
        sagittal: 'Sagittal / sagital',
        coronal: 'Coronal',
      },
    },
    seriesModality: {
      type: 'choice',
      instructions: 'If `query` names a modality for the series, which modality from `series` is it?',
      criteria: withNone({
        CT: 'Computed tomography (CT)',
        MR: 'Magnetic resonance (MR, MRI)',
        PT: 'Positron emission tomography (PT, PET)',
        CR: 'Computed radiography (CR)',
        DX: 'Digital radiography (DX)',
        US: 'Ultrasound (US)',
        XA: 'X-ray angiography (XA)',
        NM: 'Nuclear medicine (NM)',
        MG: 'Mammography (MG)',
        ...Object.fromEntries(
          uniqueValues(series.map(item => item.modality).filter(Boolean)).map(value => [
            value,
            `Modality ${value}`,
          ])
        ),
      }),
    },
  };
}

function normalizeSpokenModality(token: string): string | undefined {
  const value = token.trim().toUpperCase();
  if (!value) {
    return undefined;
  }
  if (value === 'PET' || value === 'PT') {
    return 'PT';
  }
  if (value === 'MRI' || value === 'MR') {
    return 'MR';
  }
  return value;
}

function modalitiesFromQuery(query: string): string[] {
  const q = query.toLowerCase();
  const found: string[] = [];
  const add = (code: string, pattern: RegExp) => {
    if (pattern.test(q) && !found.includes(code)) {
      found.push(code);
    }
  };
  add('CT', /\bct\b|computed tomography/);
  add('PT', /\bpet\b|\bpt\b|positron/);
  add('MR', /\bmri\b|\bmr\b|magnetic resonance/);
  add('US', /\bultrasound\b|\bus\b/);
  add('CR', /\bcomputed radiography\b|\bcr\b/);
  add('DX', /\bx-?ray\b|\bdx\b/);
  add('MG', /\bmammo/);
  add('NM', /\bnuclear/);
  add('XA', /\bangiograph/);
  return found;
}

function firstNumber(query: string): number | undefined {
  const match = query.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : undefined;
}

function suvThresholdFromQuery(query: string): number | undefined {
  const q = query.toLowerCase();
  const withUnit = q.match(/(\d+(?:\.\d+)?)\s*suv\b/);
  if (withUnit) {
    return Number(withUnit[1]);
  }
  if (/\b(threshold|suv)\b/.test(q) || (/\bfilter\b/.test(q) && /\b(pt|pet)\b/.test(q))) {
    const value = firstNumber(query);
    if (value != null && value > 0 && value <= 50) {
      return value;
    }
  }
  return undefined;
}

function matchSeriesFromAnswers(
  series: SeriesSnapshot[],
  answers: TypeSafeResponse['answers'],
  query: string
): SeriesSnapshot | undefined {
  const seriesUid = choiceOf(answers.series).choice;
  const seriesNumber = choiceOf(answers.seriesNumber).choice;
  const seriesModality = choiceOf(answers.seriesModality).choice;
  const byUid =
    seriesUid !== 'none' ? series.find(item => item.displaySetInstanceUID === seriesUid) : undefined;
  if (byUid) {
    return byUid;
  }
  const byNumberAndModality = series.find(item => {
    const numberOk = seriesNumber === 'none' || item.seriesNumber === seriesNumber;
    const modalityOk = seriesModality === 'none' || item.modality === seriesModality.toUpperCase();
    return numberOk && modalityOk && (seriesNumber !== 'none' || seriesModality !== 'none');
  });
  if (byNumberAndModality) {
    return byNumberAndModality;
  }
  const q = query.toLowerCase();
  const scored = series
    .map(item => {
      const desc = item.description.toLowerCase();
      let score = 0;
      if (q.includes('attenuation') && (/\bac\b/.test(desc) || desc.includes('attenuation'))) {
        score += 3;
      }
      if (/\bnac\b/.test(q) && /\bnac\b/.test(desc)) {
        score += 3;
      }
      if (q.includes('scout') && desc.includes('scout')) {
        score += 3;
      }
      if ((q.includes('pet') || q.includes('pt')) && item.modality === 'PT') {
        score += 1;
      }
      if (q.includes('ct') && item.modality === 'CT') {
        score += 1;
      }
      if (item.description && q.includes(item.description.toLowerCase())) {
        score += 4;
      }
      return { item, score };
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.item;
}

function orientationFromQuery(
  choice: string,
  query: string
): 'axial' | 'sagittal' | 'coronal' | undefined {
  const q = query.toLowerCase();
  if (/sagg?itt?al|sagital/.test(q)) {
    return 'sagittal';
  }
  if (q.includes('coronal')) {
    return 'coronal';
  }
  if (q.includes('axial') || q.includes('transaxial')) {
    return 'axial';
  }
  if (choice === 'axial' || choice === 'sagittal' || choice === 'coronal') {
    return choice;
  }
  return undefined;
}

function spokenNameToken(query: string): string | undefined {
  const match = query.match(
    /(?:patient\s+name|filter\s+by\s+name|named|called|name)\s+([A-Za-z0-9][A-Za-z0-9 .'-]{0,40})/i
  );
  if (!match) {
    return undefined;
  }
  return match[1].replace(/^(name|patient)\s+/i, '').trim();
}

function namesLookAlike(spoken: string, actual: string): boolean {
  const a = spoken.toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = actual.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!a || !b || a.length < 3) {
    return false;
  }
  if (b.includes(a) || a.includes(b)) {
    return true;
  }
  const window = b.slice(0, Math.max(a.length, 4));
  if (window.startsWith(a.slice(0, 4)) && a.length >= 4) {
    return true;
  }
  const n = Math.max(a.length, window.length);
  if (n < 4) {
    return false;
  }
  let distance = 0;
  for (let i = 0; i < n; i++) {
    if (a[i] !== window[i]) {
      distance += 1;
    }
  }
  return distance <= 2;
}

function matchPatientFromQuery(query: string, studies: StudySnapshot[]): string | undefined {
  const q = query.toLowerCase();
  const exact = studies.find(
    study => study.patientName && q.includes(study.patientName.toLowerCase())
  );
  if (exact) {
    return exact.patientName;
  }
  const token = spokenNameToken(query);
  if (!token) {
    return undefined;
  }
  const hit = studies.find(study => namesLookAlike(token, study.patientName));
  return hit?.patientName;
}

function newestStudyForPatient(studies: StudySnapshot[], patientName: string): StudySnapshot | undefined {
  return studies
    .filter(study => study.patientName === patientName)
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))[0];
}

function composeViewerAction(
  answers: TypeSafeResponse['answers'],
  series: SeriesSnapshot[],
  query: string
): AskResponse['action'] {
  const action = choiceOf(answers.action).choice;
  const protocolId = choiceOf(answers.hangingProtocol).choice;
  const layout = choiceOf(answers.layout).choice;
  const orientationChoice = choiceOf(answers.orientation).choice;
  const wantsMpr = noulOf(answers.wantsMpr) >= 0.55;
  const suvThreshold = suvThresholdFromQuery(query);

  if (suvThreshold != null && action !== 'reset_overlay') {
    return {
      type: 'set_threshold',
      label: `PET threshold ${suvThreshold} SUV`,
      threshold: suvThreshold,
    };
  }

  const spoken = query.toLowerCase();
  if (/\binvert\b/.test(spoken)) {
    return { type: 'invert', label: 'Inverting viewport' };
  }
  if (
    /\b(exit one[- ]up|unmaximize|restore (the )?layout|restore mpr|go back to mpr|exit maximized)\b/.test(
      spoken
    )
  ) {
    return { type: 'exit_one_up', label: 'Restoring layout' };
  }
  if (/\b(open|show).*(left panel|thumbnails|study browser|series list)\b/.test(spoken)) {
    return { type: 'open_left_panel', label: 'Opening left panel' };
  }
  if (/\bnext series\b/.test(spoken) && !/\bstage\b/.test(spoken)) {
    return { type: 'next_series', label: 'Next series' };
  }
  if (/\b(previous|prior|last) series\b/.test(spoken) && !/\bstage\b/.test(spoken)) {
    return { type: 'previous_series', label: 'Previous series' };
  }

  if (action === 'set_hanging_protocol' || (wantsMpr && action === 'none')) {
    const nextProtocolId = wantsMpr ? 'mpr' : protocolId;
    if (!nextProtocolId || nextProtocolId === 'none') {
      return { type: 'none', label: 'No hanging protocol to apply' };
    }
    return {
      type: 'set_hanging_protocol',
      label: `Hanging protocol: ${nextProtocolId}`,
      protocolId: nextProtocolId,
    };
  }

  if (action === 'set_layout') {
    const layouts: Record<string, { numRows: number; numCols: number }> = {
      '1x1': { numRows: 1, numCols: 1 },
      '1x2': { numRows: 1, numCols: 2 },
      '2x2': { numRows: 2, numCols: 2 },
      '3x1': { numRows: 3, numCols: 1 },
    };
    const next = layouts[layout];
    if (!next) {
      return { type: 'none', label: 'No layout to apply' };
    }
    return {
      type: 'set_layout',
      label: `Layout ${layout}`,
      ...next,
    };
  }

  if (action === 'next_stage') {
    return { type: 'next_stage', label: 'Next hanging protocol stage' };
  }

  if (action === 'previous_stage') {
    return { type: 'previous_stage', label: 'Previous hanging protocol stage' };
  }

  if (action === 'play_cine') {
    return { type: 'play_cine', label: 'Playing cine' };
  }
  if (action === 'pause_cine') {
    return { type: 'pause_cine', label: 'Paused cine' };
  }
  if (action === 'cine_faster') {
    return { type: 'cine_faster', label: 'Increasing cine speed' };
  }
  if (action === 'cine_slower') {
    return { type: 'cine_slower', label: 'Decreasing cine speed' };
  }
  if (action === 'close_cine') {
    return { type: 'close_cine', label: 'Closing cine' };
  }
  if (action === 'close_left_panel') {
    return { type: 'close_left_panel', label: 'Closing left panel' };
  }
  if (action === 'open_left_panel') {
    return { type: 'open_left_panel', label: 'Opening left panel' };
  }
  if (action === 'exit_one_up') {
    return { type: 'exit_one_up', label: 'Restoring layout' };
  }
  if (action === 'next_series') {
    return { type: 'next_series', label: 'Next series' };
  }
  if (action === 'previous_series') {
    return { type: 'previous_series', label: 'Previous series' };
  }
  if (action === 'invert') {
    return { type: 'invert', label: 'Inverting viewport' };
  }

  if (action === 'open_series' || action === 'overlay_series') {
    const match = matchSeriesFromAnswers(series, answers, query);
    if (!match) {
      return { type: 'none', label: 'No matching series to open' };
    }
    return {
      type: action,
      label:
        action === 'overlay_series'
          ? `Overlay ${match.description || `${match.seriesNumber} ${match.modality}`}`.trim()
          : `Opening series ${match.seriesNumber} ${match.modality}`.trim(),
      displaySetInstanceUID: match.displaySetInstanceUID,
      seriesNumber: match.seriesNumber,
      seriesModality: match.modality,
      seriesDescription: match.description,
    };
  }

  if (action === 'maximize_viewport') {
    const orientation = orientationFromQuery(orientationChoice, query) || 'sagittal';
    return {
      type: 'maximize_viewport',
      label: `Maximize ${orientation}`,
      orientation,
    };
  }

  if (action === 'go_to_worklist') {
    return { type: 'go_to_worklist', label: 'Returning to worklist' };
  }

  if (action === 'jump_slice') {
    const q = query.toLowerCase();
    if (/middle|center|centre/.test(q)) {
      return { type: 'jump_slice', label: 'Jump to middle slice', slicePreset: 'middle' };
    }
    if (/first|start/.test(q)) {
      return { type: 'jump_slice', label: 'Jump to first slice', slicePreset: 'first' };
    }
    if (/last|end/.test(q)) {
      return { type: 'jump_slice', label: 'Jump to last slice', slicePreset: 'last' };
    }
    const sliceNumber = firstNumber(query);
    if (sliceNumber == null) {
      return { type: 'jump_slice', label: 'Jump to middle slice', slicePreset: 'middle' };
    }
    return {
      type: 'jump_slice',
      label: `Jump to slice ${sliceNumber}`,
      sliceNumber,
    };
  }

  if (action === 'set_opacity') {
    const q = query.toLowerCase();
    const numeric = firstNumber(query);
    if (numeric != null && !/increase|decrease|more|less/.test(q)) {
      const opacity = numeric > 1 ? numeric / 100 : numeric;
      return {
        type: 'set_opacity',
        label: `PET opacity ${Math.round(opacity * 100)}%`,
        opacity,
      };
    }
    const opacityDelta = /increase|more opaque|higher/.test(q)
      ? 0.2
      : /decrease|less opaque|transparent|lower|more transparent/.test(q)
        ? -0.2
        : 0.2;
    return {
      type: 'set_opacity',
      label: opacityDelta > 0 ? 'Increasing PET opacity' : 'Decreasing PET opacity',
      opacityDelta,
    };
  }

  if (action === 'set_threshold') {
    const threshold = firstNumber(query);
    if (threshold == null) {
      return { type: 'none', label: 'No SUV threshold given' };
    }
    return {
      type: 'set_threshold',
      label: `PET threshold ${threshold} SUV`,
      threshold,
    };
  }

  if (action === 'reset_overlay') {
    return { type: 'reset_overlay', label: 'Reset overlay' };
  }

  return { type: 'none', label: 'No viewer action for that request' };
}

async function handleAsk(request: Request, env: Env): Promise<Response> {
  if (!env.TYPESAFE_API_KEY) {
    return json(
      {
        error: 'typesafe_unconfigured',
        message: 'Set TYPESAFE_API_KEY in worker/.dev.vars and restart wrangler.',
      },
      503
    );
  }

  let body: AskRequest;
  try {
    body = (await request.json()) as AskRequest;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const query = typeof body.query === 'string' ? body.query.trim() : '';
  if (!query) {
    return json({ error: 'query_required' }, 400);
  }

  const context = body.context === 'viewer' ? 'viewer' : 'worklist';
  const studies = parseStudies(body.studies);
  const hangingProtocols = parseHangingProtocols(body.hangingProtocols);
  const series = parseSeries(body.series);
  const questions =
    context === 'viewer'
      ? buildViewerQuestions(hangingProtocols, series)
      : buildQuestions(studies);
  const state =
    context === 'viewer' ? { query, hangingProtocols, series } : { query, studies };

  const tsResponse = await fetch(TYPESAFE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.TYPESAFE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      state,
      questions,
    }),
    signal: AbortSignal.timeout(ASK_TIMEOUT_MS),
  });

  if (!tsResponse.ok) {
    const detail = await tsResponse.text();
    console.error(
      JSON.stringify({
        message: 'typesafe_failed',
        status: tsResponse.status,
        detail: detail.slice(0, 500),
      })
    );
    return json(
      {
        error: 'typesafe_failed',
        status: tsResponse.status,
      },
      502
    );
  }

  const payload = (await tsResponse.json()) as TypeSafeResponse;
  const result: AskResponse = {
    model: payload.model,
    action:
      context === 'viewer'
        ? composeViewerAction(payload.answers, series, query)
        : composeAction(payload.answers, studies, query),
  };

  return json(result);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/health' && request.method === 'GET') {
        return json({
          ok: true,
          configured: Boolean(env.TYPESAFE_API_KEY),
        });
      }

      if (url.pathname === '/api/ask' && request.method === 'POST') {
        return await handleAsk(request, env);
      }

      return json({ error: 'not_found' }, 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(JSON.stringify({ message: 'unhandled error', error: message, path: url.pathname }));
      return json({ error: 'internal_error' }, 500);
    }
  },
};
