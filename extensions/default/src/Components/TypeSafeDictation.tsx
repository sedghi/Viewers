import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  toast,
} from '@ohif/ui-next';
import { useSystem } from '@ohif/core';
import {
  snapshotStudies,
  splitSpokenCommands,
  typesafeAsk,
  type TypesafeAction,
} from '../utils/typesafeAsk';
import { runWorklistAction, useTypeSafeSessionStore } from '../stores/useTypeSafeSessionStore';
import './TypeSafeDictation.css';

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const speechWindow = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

let shiftIsDown = false;
let shiftTrackingStarted = false;

function isShiftDown(): boolean {
  return shiftIsDown;
}

function listHangingProtocolPresets(hangingProtocolService: {
  getProtocols?: () => Array<{ id?: string; name?: string; isPreset?: boolean }>;
  protocols?: { values?: () => Iterable<unknown> };
  getProtocolById?: (id: string) => { id?: string; name?: string } | undefined;
}): Array<{ id: string; name: string }> {
  const seen = new Set<string>();
  const list: Array<{ id: string; name: string }> = [];
  const add = (protocol: { id?: string; name?: string } | undefined) => {
    if (!protocol?.id || seen.has(protocol.id)) {
      return;
    }
    seen.add(protocol.id);
    list.push({ id: protocol.id, name: String(protocol.name || protocol.id) });
  };

  (hangingProtocolService.getProtocols?.() || []).forEach(add);
  if (typeof hangingProtocolService.protocols?.values === 'function') {
    for (const value of hangingProtocolService.protocols.values()) {
      const protocol = typeof value === 'function' ? value() : value;
      add(protocol as { id?: string; name?: string });
    }
  }
  add(hangingProtocolService.getProtocolById?.('mpr'));
  add(hangingProtocolService.getProtocolById?.('default'));
  return list;
}

function startShiftTracking() {
  if (shiftTrackingStarted || typeof window === 'undefined') {
    return;
  }
  shiftTrackingStarted = true;
  window.addEventListener('keydown', event => {
    if (event.key === 'Shift') {
      shiftIsDown = true;
    }
  });
  window.addEventListener('keyup', event => {
    if (event.key === 'Shift') {
      shiftIsDown = false;
    }
  });
  window.addEventListener('blur', () => {
    shiftIsDown = false;
  });
}

const VOICE_INTRO_KEY = 'ohif-jev-voice-intro-v3';

const WORKLIST_COMMANDS = [
  { phrase: 'Show MRI / only CT / CT and PET', does: 'Filter by one or more modalities' },
  { phrase: 'Filter by name Jane Doe', does: 'Filter by patient name' },
  { phrase: 'Filter yesterday / studies from today', does: 'Filter by date' },
  { phrase: 'Open the most recent chest CT', does: 'Open that study' },
  { phrase: 'Newest first / oldest first', does: 'Sort the worklist' },
  { phrase: 'Clear filters / show all studies', does: 'Reset worklist filters' },
];

const VIEWER_COMMANDS = [
  {
    phrase: 'MPR / multi planar reformatting / multiplanar reconstruction',
    does: 'Switch to the MPR hanging protocol',
  },
  { phrase: 'Open series 2 CT / hang the CT series', does: 'Hang that series in the viewport' },
  { phrase: 'Overlay PET AC / overlay PET attenuation corrected', does: 'Add PET as a foreground overlay' },
  { phrase: 'Maximize sagittal / maximize axial', does: 'One-up that orientation' },
  { phrase: 'Exit one up / restore MPR', does: 'Leave maximized view' },
  { phrase: 'Next series / previous series', does: 'Hang the next or previous series' },
  { phrase: 'Invert', does: 'Invert grayscale' },
  { phrase: 'Open the left panel / show thumbnails', does: 'Expand the study browser' },
  { phrase: 'Go to the middle / go to slice 145', does: 'Jump to a slice' },
  { phrase: 'Increase / decrease the opacity of PET', does: 'Change PET overlay opacity' },
  { phrase: 'Filter PT 5 SUV / PET threshold 5', does: 'Hide PET below that SUV' },
  { phrase: 'Reset the threshold / reset PET overlay', does: 'Clear SUV threshold' },
  { phrase: 'Play cine / close cine', does: 'Start or hide cine' },
  { phrase: 'Close the left panel / hide thumbnails', does: 'Collapse the study browser' },
  { phrase: 'Go back to worklist', does: 'Return to the study list' },
  { phrase: 'Two up / four up', does: 'Change viewport grid layout' },
];

const COMMAND_GROUPS = [
  { id: 'worklist' as const, label: 'Worklist', commands: WORKLIST_COMMANDS },
  { id: 'viewer' as const, label: 'Viewport', commands: VIEWER_COMMANDS },
];

function renderPhrase(phrase: string) {
  const parts = phrase.split(' / ');
  return parts.map((part, index) => (
    <React.Fragment key={`${index}-${part}`}>
      {index > 0 ? <span className="ts-intro-or">/</span> : null}
      {part}
    </React.Fragment>
  ));
}

type Props = {
  page: 'worklist' | 'viewer';
  children?: React.ReactNode;
};

export function TypeSafeDictation({ page, children }: Props) {
  const { commandsManager, servicesManager } = useSystem();
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return sessionStorage.getItem(VOICE_INTRO_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const [introTab, setIntroTab] = useState<'worklist' | 'viewer'>(page);
  const holdingShift = useRef(false);
  const startTimer = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const queueRef = useRef<string[]>([]);
  const busyRef = useRef(false);

  const runViewerAction = useCallback(
    (action: TypesafeAction): { ok: boolean; message: string } => {
      if (action.type === 'set_hanging_protocol' && action.protocolId) {
        const applied = commandsManager.run('applyHangingProtocolPreset', {
          protocolId: action.protocolId,
        });
        return { ok: applied !== false, message: action.label };
      }
      if (
        action.type === 'set_layout' &&
        typeof action.numRows === 'number' &&
        typeof action.numCols === 'number'
      ) {
        commandsManager.run('setViewportGridLayout', {
          numRows: action.numRows,
          numCols: action.numCols,
        });
        return { ok: true, message: action.label };
      }
      if (action.type === 'next_stage') {
        commandsManager.run('nextStage');
        return { ok: true, message: action.label };
      }
      if (action.type === 'previous_stage') {
        commandsManager.run('previousStage');
        return { ok: true, message: action.label };
      }
      if (action.type === 'open_series') {
        const hung = commandsManager.run('hangDisplaySetOnViewport', {
          displaySetInstanceUID: action.displaySetInstanceUID,
          seriesNumber: action.seriesNumber,
          modality: action.seriesModality,
        });
        return { ok: hung !== false, message: action.label };
      }
      if (action.type === 'play_cine') {
        const ok = commandsManager.run('controlCine', { mode: 'play' });
        return { ok: ok !== false, message: action.label };
      }
      if (action.type === 'pause_cine') {
        const ok = commandsManager.run('controlCine', { mode: 'pause' });
        return { ok: ok !== false, message: action.label };
      }
      if (action.type === 'cine_faster') {
        const fps = commandsManager.run('controlCine', { mode: 'faster' });
        return {
          ok: fps !== false,
          message: typeof fps === 'number' ? `Cine ${fps} FPS` : action.label,
        };
      }
      if (action.type === 'cine_slower') {
        const fps = commandsManager.run('controlCine', { mode: 'slower' });
        return {
          ok: fps !== false,
          message: typeof fps === 'number' ? `Cine ${fps} FPS` : action.label,
        };
      }
      if (action.type === 'close_cine') {
        const ok = commandsManager.run('controlCine', { mode: 'close' });
        return { ok: ok !== false, message: action.label };
      }
      if (action.type === 'close_left_panel') {
        const ok = commandsManager.run('closeLeftPanel');
        return { ok: ok !== false, message: action.label };
      }
      if (action.type === 'open_left_panel') {
        const ok = commandsManager.run('openLeftPanel');
        return { ok: ok !== false, message: action.label };
      }
      if (action.type === 'exit_one_up') {
        const ok = commandsManager.run('exitOneUp');
        return { ok: ok !== false, message: action.label };
      }
      if (action.type === 'next_series') {
        const ok = commandsManager.run('updateViewportDisplaySet', {
          direction: 1,
          excludeNonImageModalities: true,
        });
        return { ok: ok !== false, message: action.label };
      }
      if (action.type === 'previous_series') {
        const ok = commandsManager.run('updateViewportDisplaySet', {
          direction: -1,
          excludeNonImageModalities: true,
        });
        return { ok: ok !== false, message: action.label };
      }
      if (action.type === 'invert') {
        const ok = commandsManager.run('invertActiveViewport');
        return { ok: ok !== false, message: action.label };
      }
      if (action.type === 'maximize_viewport') {
        const ok = commandsManager.run('maximizeOrientation', {
          orientation: action.orientation,
        });
        return { ok: ok !== false, message: action.label };
      }
      if (action.type === 'go_to_worklist') {
        const rest = queueRef.current.splice(0);
        useTypeSafeSessionStore.getState().setPendingQueries(rest);
        const ok = commandsManager.run('goToWorklist');
        return { ok: ok !== false, message: action.label };
      }
      if (action.type === 'overlay_series') {
        const ok = commandsManager.run('overlayDisplaySetOnViewport', {
          displaySetInstanceUID: action.displaySetInstanceUID,
          seriesNumber: action.seriesNumber,
          modality: action.seriesModality,
          description: action.seriesDescription,
        });
        return { ok: ok !== false, message: action.label };
      }
      if (action.type === 'jump_slice') {
        const ok = commandsManager.run('jumpViewportSlice', {
          slicePreset: action.slicePreset,
          sliceNumber: action.sliceNumber,
        });
        return { ok: ok !== false, message: action.label };
      }
      if (action.type === 'set_opacity') {
        const ok = commandsManager.run('adjustOverlayAppearance', {
          opacity: action.opacity,
          opacityDelta: action.opacityDelta,
        });
        return { ok: ok !== false, message: action.label };
      }
      if (action.type === 'set_threshold') {
        const ok = commandsManager.run('adjustOverlayAppearance', {
          threshold: action.threshold,
        });
        return { ok: ok !== false, message: action.label };
      }
      if (action.type === 'reset_overlay') {
        const ok = commandsManager.run('adjustOverlayAppearance', { reset: true });
        return { ok: ok !== false, message: action.label };
      }
      return { ok: false, message: action.label };
    },
    [commandsManager]
  );

  const executeRef = useRef(async (_query: string) => ({ ok: false, message: '' }));
  executeRef.current = async (query: string) => {
    const hangingProtocols =
      page === 'viewer' ? listHangingProtocolPresets(servicesManager.services.hangingProtocolService) : [];
    const series =
      page === 'viewer'
        ? (servicesManager.services.displaySetService.getActiveDisplaySets() || []).map(
            displaySet => ({
              displaySetInstanceUID: String(displaySet.displaySetInstanceUID ?? ''),
              seriesNumber: String(displaySet.SeriesNumber ?? ''),
              modality: String(displaySet.Modality ?? ''),
              description: String(displaySet.SeriesDescription ?? ''),
            })
          )
        : [];
    const currentWorklist = useTypeSafeSessionStore.getState().worklist;
    const payload = await typesafeAsk({
      query,
      context: page,
      studies: page === 'worklist' && currentWorklist ? snapshotStudies(currentWorklist.studies) : [],
      hangingProtocols,
      series,
    });
    if (page === 'viewer') {
      return runViewerAction(payload.action);
    }
    if (!currentWorklist) {
      return { ok: false, message: 'Worklist is not ready' };
    }
    return runWorklistAction(payload.action, currentWorklist);
  };

  const drain = useCallback(async () => {
    if (busyRef.current) {
      return;
    }
    const next = queueRef.current.shift();
    if (!next) {
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      await executeRef.current(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Voice command failed';
      console.error(message);
    } finally {
      busyRef.current = false;
      setBusy(false);
      void drain();
    }
  }, []);

  const enqueue = useCallback((text: string) => {
    const commands = splitSpokenCommands(text);
    if (commands.length === 0) {
      return;
    }
    queueRef.current.push(...commands);
    void drain();
  }, [drain]);

  const enqueueRef = useRef(enqueue);
  enqueueRef.current = enqueue;

  const stopListening = useCallback(() => {
    holdingShift.current = false;
    if (startTimer.current != null) {
      window.clearTimeout(startTimer.current);
      startTimer.current = null;
    }
    setListening(false);
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // Already stopped.
      }
    }
  }, []);

  const startListening = useCallback(() => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      toast.error('Speech recognition is not available in this browser.');
      return;
    }
    if (recognitionRef.current) {
      return;
    }
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = event => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim();
        if (transcript && event.results[i].isFinal) {
          enqueueRef.current(transcript);
        }
      }
    };
    recognition.onerror = event => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      if (event.error === 'not-allowed') {
        toast.error('Microphone permission is required for dictation.');
        stopListening();
      }
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      if (!holdingShift.current && !isShiftDown()) {
        setListening(false);
        return;
      }
      holdingShift.current = true;
      window.setTimeout(() => {
        if (holdingShift.current || isShiftDown()) {
          startListening();
        }
      }, 50);
    };
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      toast.error('Could not start dictation.');
      stopListening();
    }
  }, [stopListening]);

  useEffect(() => {
    if (page !== 'worklist') {
      return;
    }
    const pending = useTypeSafeSessionStore.getState().takePendingQueries();
    if (pending.length) {
      queueRef.current.push(...pending);
      void drain();
    }
  }, [drain, page]);

  useEffect(() => {
    startShiftTracking();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Shift' || isTypingTarget(event.target)) {
        return;
      }
      holdingShift.current = true;
      if (recognitionRef.current || startTimer.current != null) {
        return;
      }
      startTimer.current = window.setTimeout(() => {
        startTimer.current = null;
        if (holdingShift.current || isShiftDown()) {
          startListening();
        }
      }, 180);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== 'Shift') {
        return;
      }
      stopListening();
    };
    const onBlur = () => stopListening();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    if (isShiftDown()) {
      holdingShift.current = true;
      startListening();
    }
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        try {
          recognition.stop();
        } catch {
          // Already stopped.
        }
      }
    };
  }, [startListening, stopListening]);

  const dismissIntro = useCallback(() => {
    try {
      sessionStorage.setItem(VOICE_INTRO_KEY, '1');
    } catch {
      // Ignore storage failures.
    }
    setShowIntro(false);
  }, []);

  const live = listening || busy;
  const commands = page === 'viewer' ? VIEWER_COMMANDS : WORKLIST_COMMANDS;

  return (
    <div className="ts-dictate">
      <div className={`ts-dictate-panel${live ? ' is-live' : ''}`}>
        {children ? <div className="ts-dictate-logo">{children}</div> : null}
        <div
          className="ts-dictate-orb"
          aria-hidden="true"
        >
          <span className="ts-dictate-ring" />
          <span className="ts-dictate-ring" />
          <span className="ts-dictate-ring" />
          <svg
            className="ts-dictate-mic"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="9"
              y="3"
              width="6"
              height="11"
              rx="3"
              fill="currentColor"
            />
            <path
              d="M7 11a5 5 0 0 0 10 0"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M12 16v3M9 19h6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <span className="ts-dictate-core">
            <span className="ts-dictate-bar" />
            <span className="ts-dictate-bar" />
            <span className="ts-dictate-bar" />
            <span className="ts-dictate-bar" />
            <span className="ts-dictate-bar" />
          </span>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="ts-dictate-help"
              aria-label="Voice commands"
              onClick={event => {
                event.stopPropagation();
              }}
              onPointerDown={event => event.stopPropagation()}
            >
              ?
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="bottom"
            className="w-80 p-3"
            onClick={event => event.stopPropagation()}
          >
            <div className="text-foreground mb-2 text-sm">Hold Shift and say</div>
            <div className="text-muted-foreground mb-2 text-xs">
              Pause between commands. Keep holding Shift to continue.
            </div>
            <ul className="flex flex-col gap-2">
              {commands.map(command => (
                <li
                  key={command.phrase}
                  className="flex flex-col gap-0.5"
                >
                  <span className="text-foreground text-sm">{command.phrase}</span>
                  <span className="text-muted-foreground text-xs">{command.does}</span>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      </div>
      <Dialog
        open={showIntro}
        onOpenChange={open => {
          if (!open) {
            dismissIntro();
          }
        }}
      >
        <DialogContent className="ts-intro max-w-[34rem] gap-0 p-0">
          <DialogHeader className="ts-intro-head space-y-0 text-left">
            <span
              className="ts-intro-keycap"
              aria-hidden="true"
            >
              <span className="ts-intro-keycap-glyph">&#8679;</span>
              Shift
            </span>
            <div className="ts-intro-heading">
              <DialogTitle className="ts-intro-title">Hold Shift to talk</DialogTitle>
              <DialogDescription className="ts-intro-sub">
                Hold Shift and speak. Keep holding, then pause or say &ldquo;then&rdquo; to chain
                commands.
              </DialogDescription>
            </div>
          </DialogHeader>

          <ol className="ts-intro-steps">
            <li>
              <span className="ts-intro-step-n">1</span>Hold Shift
            </li>
            <li>
              <span className="ts-intro-step-n">2</span>Speak
            </li>
            <li>
              <span className="ts-intro-step-n">3</span>Release
            </li>
            <li className="ts-intro-steps-note">Chrome or Edge</li>
          </ol>

          <div
            className="ts-intro-tabs"
            role="tablist"
            aria-label="Voice command groups"
          >
            {COMMAND_GROUPS.map(group => (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={introTab === group.id}
                className={`ts-intro-tab${introTab === group.id ? ' is-active' : ''}`}
                onClick={() => setIntroTab(group.id)}
              >
                {group.label}
                <span className="ts-intro-tab-count">
                  {group.commands.length}
                </span>
              </button>
            ))}
          </div>

          <div className="ts-intro-list">
            <ul>
              {(COMMAND_GROUPS.find(group => group.id === introTab)?.commands || []).map(command => (
                <li key={command.phrase}>
                  <span className="ts-intro-phrase">{renderPhrase(command.phrase)}</span>
                  <span className="ts-intro-does">{command.does}</span>
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter className="ts-intro-foot flex-row space-x-0">
            <span className="ts-intro-hint">
              Reopen this from the <span className="ts-intro-q">?</span> next to the mic
            </span>
            <Button
              type="button"
              className="ts-intro-btn"
              onClick={dismissIntro}
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TypeSafeDictation;
