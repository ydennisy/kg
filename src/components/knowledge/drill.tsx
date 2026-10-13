'use client';

import { IconPencil, IconX } from '@tabler/icons-react';
import { useEffect } from 'react';
import { Button, IconButton } from 'twenty-ui';

import { gradeCard } from '@/app/actions';
import {
  answer,
  currentKey,
  isFinished,
  progress,
  restart,
  type Drill as DrillState,
} from '@/lib/knowledge/drill';
import { related } from '@/lib/knowledge/search';
import type { Item } from '@/lib/knowledge/types';
import type { Grade } from '@/lib/srs';

import { Html, Kbd, TagChip, TypeTile } from './bits';

/**
 * Full-screen review, graded on the scheduler's own four buttons. A card
 * answered "again" comes round again before the session ends.
 */
const GRADE_BUTTONS: {
  grade: Grade;
  label: string;
  variant: 'outline' | 'solid';
  color?: 'accent' | 'danger';
}[] = [
  { grade: 'again', label: 'Again', variant: 'outline', color: 'danger' },
  { grade: 'hard', label: 'Hard', variant: 'outline' },
  { grade: 'good', label: 'Good', variant: 'solid', color: 'accent' },
  { grade: 'easy', label: 'Easy', variant: 'outline' },
];

export function Drill({
  drill,
  items,
  showRelated,
  paused,
  onChange,
  onEnd,
  onOpen,
  onEdit,
}: {
  drill: DrillState;
  items: Item[];
  showRelated: boolean;
  /** Something is open on top; its keys are not ours. */
  paused: boolean;
  onChange: (drill: DrillState) => void;
  onEnd: () => void;
  onOpen: (key: string) => void;
  onEdit: (item: Item) => void;
}) {
  const finished = isFinished(drill);
  const key = currentKey(drill);
  const card = key ? items.find((item) => item.key === key) : undefined;
  const { total, fraction, label } = progress(drill);
  const nearby =
    card && showRelated ? related(card, items, { limit: 3, cards: false }) : [];

  function grade(value: Grade) {
    if (!card || !drill.shown) {
      return;
    }
    // Fire and forget: the session moves on at once, and the server refreshes
    // the page data behind it.
    void gradeCard(card.id, value);
    onChange(answer(drill, value));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (paused || event.defaultPrevented || event.metaKey || event.ctrlKey) {
        return;
      }
      if (event.key === 'Escape') {
        onEnd();
      } else if (finished) {
        return;
      } else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        onChange({ ...drill, shown: true });
      } else if (['1', '2', '3', '4'].includes(event.key)) {
        grade(GRADE_BUTTONS[Number(event.key) - 1].grade);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const muted = {
    fontSize: 'var(--t-font-size-xs)',
    color: 'var(--t-font-color-tertiary)',
  };

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col"
      style={{
        background: 'var(--t-background-primary)',
        animation: 'kfade 200ms ease-out',
      }}
    >
      <div
        className="flex items-center gap-4 px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--t-border-color-light)' }}
      >
        <span style={{ fontWeight: 'var(--t-font-weight-medium)' }}>Drill</span>
        <span
          className="hidden truncate sm:block"
          style={{ ...muted, fontSize: 'var(--t-font-size-sm)' }}
        >
          {drill.label}
        </span>
        <div className="mx-auto flex max-w-[320px] flex-1 items-center gap-2.5">
          <div
            className="h-1 flex-1 overflow-hidden rounded-sm"
            style={{ background: 'var(--t-background-tertiary)' }}
          >
            <div
              className="h-full"
              style={{
                width: `${Math.round(fraction * 100)}%`,
                background: 'var(--t-color-blue)',
                transition: 'width 300ms',
              }}
            />
          </div>
          <span style={muted}>{label}</span>
        </div>
        <span className="flex-none whitespace-nowrap" style={muted}>
          <span style={{ color: 'var(--t-color-green11)' }}>
            {drill.got} recalled
          </span>{' '}
          ·{' '}
          <span style={{ color: 'var(--t-font-color-danger)' }}>
            {drill.again} again
          </span>
        </span>
        <IconButton variant="ghost" size="sm" aria-label="End" onClick={onEnd}>
          <IconX size={16} />
        </IconButton>
      </div>

      {!finished && card ? (
        <>
          <div className="flex flex-1 flex-col items-center overflow-auto px-6 pt-14 pb-6">
            <div
              key={drill.position}
              className="flex w-full max-w-[620px] flex-col gap-6"
              style={{ animation: 'krise 260ms cubic-bezier(.2,.8,.2,1)' }}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {card.tags.map((tag) => (
                  <TagChip key={tag} name={tag} />
                ))}
                <span className="ml-auto">
                  <IconButton
                    variant="ghost"
                    size="sm"
                    aria-label="Edit this card"
                    onClick={() => onEdit(card)}
                  >
                    <IconPencil size={14} />
                  </IconButton>
                </span>
              </div>
              <Html
                html={card.titleHtml}
                className="text-[length:var(--t-font-size-xxl)] leading-[1.4] [text-wrap:pretty]"
              />
              <div
                className="h-px"
                style={{ background: 'var(--t-border-color-medium)' }}
              />
              {drill.shown ? (
                <>
                  <div style={{ animation: 'kfade 200ms ease-out' }}>
                    <Html
                      html={card.bodyHtml}
                      className="text-[length:var(--t-font-size-lg)] leading-[1.6]"
                    />
                  </div>
                  {nearby.length > 0 && (
                    <div
                      className="flex flex-col gap-1 rounded-lg p-3"
                      style={{
                        background: 'var(--t-background-secondary)',
                        animation: 'kfade 300ms ease-out',
                      }}
                    >
                      <div className="pb-1" style={muted}>
                        Related
                      </div>
                      {nearby.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => onOpen(item.key)}
                          className="flex h-[30px] items-center gap-2.5 rounded-md text-left hover:underline"
                        >
                          <TypeTile type={item.type} />
                          <span className="flex-1 truncate">{item.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onChange({ ...drill, shown: true })}
                  className="flex h-24 items-center justify-center gap-2 rounded-lg"
                  style={{
                    border: '1px dashed var(--t-border-color-strong)',
                    color: 'var(--t-font-color-tertiary)',
                  }}
                >
                  Show answer <Kbd>Space</Kbd>
                </button>
              )}
            </div>
          </div>
          <div
            className="flex justify-center gap-2 p-4"
            style={{ borderTop: '1px solid var(--t-border-color-light)' }}
          >
            {GRADE_BUTTONS.map(
              ({ grade: value, label, variant, color }, index) => (
                <Button
                  key={value}
                  variant={variant}
                  color={color}
                  shortcut={[String(index + 1)]}
                  disabled={!drill.shown}
                  onClick={() => grade(value)}
                >
                  {label}
                </Button>
              ),
            )}
          </div>
        </>
      ) : (
        <div
          className="flex flex-1 flex-col items-center justify-center gap-3"
          style={{ animation: 'krise 260ms cubic-bezier(.2,.8,.2,1)' }}
        >
          <div
            style={{
              fontSize: 'var(--t-font-size-xxl)',
              fontWeight: 'var(--t-font-weight-medium)',
            }}
          >
            Session done
          </div>
          <div style={{ color: 'var(--t-font-color-secondary)' }}>
            {total} {total === 1 ? 'card' : 'cards'} · {drill.again} needed
            another pass
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" onClick={() => onChange(restart(drill))}>
              Drill again
            </Button>
            <Button variant="solid" color="accent" onClick={onEnd}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
