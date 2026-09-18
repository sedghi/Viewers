import React from 'react';
import { useTypeSafeSessionStore } from '../stores/useTypeSafeSessionStore';
import type { AskDebugAnswer } from '../utils/typesafeAsk';
import './TypeSafeTraceBar.css';

type Props = {
  page: 'worklist' | 'viewer';
};

/** Joins class names without relying on leading spaces, which formatters may strip. */
function cls(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function pct(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

const EMPTY_CHOICES = new Set(['', 'none', 'no', 'unspecified']);

/** Two most informative slot answers: chosen slots first, then the rest by confidence. */
function pickSlots(answers: AskDebugAnswer[]): AskDebugAnswer[] {
  const slots = answers.filter(answer => answer.id !== 'action');
  const chosen = slots
    .filter(answer => !EMPTY_CHOICES.has(answer.choice))
    .sort((a, b) => b.confidence - a.confidence);
  const rest = slots
    .filter(answer => !chosen.includes(answer))
    .sort((a, b) => b.confidence - a.confidence);
  return [...chosen, ...rest].slice(0, 2);
}

export function TypeSafeTraceBar({ page }: Props) {
  const trace = useTypeSafeSessionStore(state => state.trace);
  const hidden = useTypeSafeSessionStore(state => state.traceHidden);
  const setTraceHidden = useTypeSafeSessionStore(state => state.setTraceHidden);
  const lastAction = useTypeSafeSessionStore(state => state.lastViewerAction);

  if (hidden) {
    return null;
  }

  const { phase, listening, transcript, interim, queued, stateSummary, model, result } = trace;
  const action = model?.answers.find(answer => answer.id === 'action');
  const slots = model ? pickSlots(model.answers) : [];
  const live = listening || phase === 'thinking';
  const outcome = result
    ? result.ok
      ? 'ok'
      : model?.action.type === 'none' && phase !== 'error'
        ? 'no action'
        : 'failed'
    : '';
  const secondsAgo = lastAction ? Math.max(0, Math.round((Date.now() - lastAction.at) / 1000)) : 0;

  return (
    <div
      className="ts-trace"
      role="status"
      aria-live="polite"
    >
      <div className="ts-trace-row">
        <section className={cls('ts-trace-card', listening && 'is-active')}>
          <header className="ts-trace-head">
            <span>Inputs</span>
            <strong>
              {model ? `${model.questions} questions` : queued ? `${queued} queued` : 'hold Shift'}
            </strong>
          </header>
          <div className="ts-trace-line">
            <span className="ts-trace-key">speech</span>
            <span className={cls('ts-trace-val', (interim || !transcript) && 'is-muted')}>
              {transcript || 'hold Shift and speak'}
              {interim ? '...' : ''}
            </span>
          </div>
          <div className="ts-trace-line">
            <span className="ts-trace-key">{page}</span>
            <span
              className={cls('ts-trace-val', !stateSummary && 'is-muted')}
              title={stateSummary}
            >
              {stateSummary || 'no snapshot yet'}
            </span>
          </div>
          <div className="ts-trace-line">
            <span className="ts-trace-key">last</span>
            <span className="ts-trace-val is-muted">
              {lastAction ? `${lastAction.label} · ${secondsAgo}s ago` : 'none'}
            </span>
          </div>
        </section>

        <div
          className="ts-trace-arrow"
          aria-hidden="true"
        >
          &rarr;
        </div>

        <section className={cls('ts-trace-card', phase === 'thinking' && 'is-active')}>
          <header className="ts-trace-head">
            <span>JEV</span>
            <strong>{phase === 'thinking' ? 'thinking' : model ? `${model.ms} ms` : 'idle'}</strong>
          </header>
          <div className="ts-trace-line">
            <span className="ts-trace-key">action</span>
            <span className="ts-trace-val">
              {action && model ? (
                <>
                  <em>{action.choice}</em> {pct(action.confidence)} · {model.action.label}
                </>
              ) : (
                <span className="is-muted">{phase === 'thinking' ? 'classifying' : 'waiting'}</span>
              )}
            </span>
          </div>
          {slots.map(slot => (
            <div
              className="ts-trace-line"
              key={slot.id}
            >
              <span className="ts-trace-key">{slot.id}</span>
              <span
                className="ts-trace-val"
                title={slot.choiceLabel || slot.choice}
              >
                <em>
                  {EMPTY_CHOICES.has(slot.choice)
                    ? slot.choice || 'none'
                    : slot.choiceLabel || slot.choice}
                </em>{' '}
                {pct(slot.confidence)}
              </span>
            </div>
          ))}
        </section>

        <div
          className="ts-trace-arrow"
          aria-hidden="true"
        >
          &rarr;
        </div>

        <section
          className={cls(
            'ts-trace-card',
            phase === 'done' && result?.ok && 'is-active',
            outcome === 'failed' && 'is-failed'
          )}
        >
          <header className="ts-trace-head">
            <span>{page}</span>
            <strong className={outcome === 'failed' ? 'is-failed' : ''}>{outcome}</strong>
          </header>
          <div className="ts-trace-line">
            <span className="ts-trace-key">did</span>
            <span className={cls('ts-trace-val', !result && 'is-muted')}>
              {result?.did || 'nothing yet'}
            </span>
          </div>
          <div className="ts-trace-line">
            <span className="ts-trace-key">to</span>
            <span className="ts-trace-val">{result?.to || ''}</span>
          </div>
          <div className="ts-trace-line">
            <span className="ts-trace-key">api</span>
            <span
              className="ts-trace-val"
              title={result?.api}
            >
              {result?.api || ''}
            </span>
          </div>
        </section>
      </div>

      <footer className="ts-trace-foot">
        <span className={cls('ts-trace-pill', live && 'is-live')}>
          {listening ? 'Listening' : phase === 'thinking' ? 'Thinking' : 'Idle'}
        </span>
        <span className="ts-trace-meta">
          hold Shift to talk{model ? ` · ${model.name}` : ''}
          <button
            type="button"
            className="ts-trace-hide"
            onClick={() => setTraceHidden(true)}
          >
            hide
          </button>
        </span>
      </footer>
    </div>
  );
}

export default TypeSafeTraceBar;
