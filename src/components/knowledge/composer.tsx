'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Button } from 'twenty-ui';

import { saveItem } from '@/app/actions';
import { CardEditor } from '@/components/card-editor';
import { draftProblem } from '@/lib/knowledge/draft';
import {
  ITEM_TYPES,
  type ItemDraft,
  type ItemType,
} from '@/lib/knowledge/types';

import { TYPES, TypeIcon } from './bits';
import { TagInput } from './tag-input';

const FIELDS: Record<
  ItemType,
  { a: string; b: string; aHint: string; bHint: string }
> = {
  card: {
    a: 'Front',
    b: 'Back',
    aHint: 'What do you want to remember?',
    bHint: 'The answer',
  },
  note: { a: 'Title', b: 'Body', aHint: 'Note title', bHint: 'Write anything' },
  link: {
    a: 'URL',
    b: 'Title',
    aHint: 'https://',
    bHint: 'Optional, defaults to the site name',
  },
};

const label = (text: string) => (
  <span
    style={{
      fontSize: 'var(--t-font-size-xs)',
      color: 'var(--t-font-color-tertiary)',
    }}
  >
    {text}
  </span>
);

const bare =
  'card-prose w-full min-h-[1.6em] outline-none [&_p]:my-0 text-[length:var(--t-font-size-lg)] leading-[1.6] text-[color:var(--t-font-color-secondary)]';
const bareLarge =
  'card-prose w-full min-h-[1.4em] outline-none [&_p]:my-0 text-[length:var(--t-font-size-xl)] leading-[1.4]';

const plainInput: React.CSSProperties = {
  border: 'none',
  outline: 'none',
  resize: 'none',
  background: 'transparent',
  font: 'inherit',
  color: 'inherit',
  width: '100%',
  padding: 0,
};

/**
 * The one place things get written: a card, note or link, new or edited.
 * Cards and note bodies are markdown, written in the same formatting-as-you-
 * type editor the rest of the app reads back.
 */
export function Composer({
  initial,
  editing,
  knownTags,
  onClose,
  onSaved,
}: {
  initial: ItemDraft;
  editing: { type: ItemType; id: number } | null;
  knownTags: string[];
  onClose: () => void;
  onSaved: (key: string) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const firstField = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  const problem = draftProblem(draft);
  const set = (patch: Partial<ItemDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  // A card has a review history a note cannot hold, so an edit can move
  // between note and link but never in or out of being a card.
  const canBecome = (type: ItemType) =>
    !editing || (type === 'card') === (editing.type === 'card');

  function save() {
    if (problem || saving) {
      return;
    }
    startSaving(async () => {
      const result = await saveItem(draft, editing);
      if (result.ok) {
        onSaved(result.key);
      } else {
        setError(result.error);
      }
    });
  }

  // Capture phase: the editor binds Mod-Enter to a line break and would
  // otherwise swallow the shortcut before it got here. Re-registered each
  // render so `save` always sees the current draft.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (mod && event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        save();
      } else if (mod && ['1', '2', '3'].includes(event.key)) {
        event.preventDefault();
        const type = ITEM_TYPES[Number(event.key) - 1];
        if (canBecome(type)) {
          set({ type });
        }
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  });

  useEffect(() => {
    const field = firstField.current;
    if (field) {
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
    }
  }, [draft.type]);

  const fields = FIELDS[draft.type];

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-60"
        style={{
          background: 'var(--t-background-overlay-secondary, rgba(0,0,0,0.25))',
          animation: 'kfade 160ms ease-out',
        }}
      />
      <div
        role="dialog"
        aria-label={editing ? 'Edit' : 'Add'}
        className="fixed top-[10vh] left-1/2 z-61 max-h-[80vh] w-[min(640px,calc(100vw-32px))] -translate-x-1/2 overflow-auto"
        style={{
          background: 'var(--t-background-primary)',
          border: '1px solid var(--t-border-color-medium)',
          borderRadius: 14,
          boxShadow: 'var(--t-box-shadow-super-heavy)',
          animation: 'krise 220ms cubic-bezier(.2,.8,.2,1)',
        }}
      >
        <div
          className="flex items-center gap-1 px-3 py-2.5"
          style={{ borderBottom: '1px solid var(--t-border-color-light)' }}
        >
          {ITEM_TYPES.map((type, index) => {
            const on = draft.type === type;
            const allowed = canBecome(type);
            return (
              <button
                key={type}
                type="button"
                disabled={!allowed}
                onClick={() => set({ type })}
                className="flex h-7 items-center gap-1.5 rounded-md px-2.5 disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  fontSize: 'var(--t-font-size-sm)',
                  background: on ? TYPES[type].bg : 'transparent',
                  color: on ? TYPES[type].fg : 'var(--t-font-color-secondary)',
                }}
              >
                <TypeIcon type={type} />
                {TYPES[type].label}
                <span
                  style={{
                    fontSize: 'var(--t-font-size-xs)',
                    color: 'var(--t-font-color-tertiary)',
                  }}
                >
                  ⌘{index + 1}
                </span>
              </button>
            );
          })}
          <span
            className="ml-auto pr-1.5"
            style={{
              fontSize: 'var(--t-font-size-xs)',
              color: 'var(--t-font-color-tertiary)',
            }}
          >
            Esc close
          </span>
        </div>

        <div className="flex flex-col gap-1 px-5 pt-[18px] pb-1.5">
          {label(fields.a)}
          {draft.type === 'card' ? (
            <CardEditor
              key="card-a"
              id="composer-a"
              name="a"
              defaultValue={draft.a}
              autoFocus
              placeholder={fields.aHint}
              className={bareLarge}
              onChange={(a) => set({ a })}
            />
          ) : draft.type === 'note' ? (
            <textarea
              ref={firstField}
              value={draft.a}
              onChange={(event) => set({ a: event.target.value })}
              placeholder={fields.aHint}
              rows={1}
              style={
                {
                  ...plainInput,
                  fontSize: 'var(--t-font-size-xl)',
                  lineHeight: 1.4,
                  fieldSizing: 'content',
                } as React.CSSProperties
              }
            />
          ) : (
            <input
              ref={firstField}
              value={draft.a}
              onChange={(event) => set({ a: event.target.value })}
              placeholder={fields.aHint}
              style={{ ...plainInput, fontSize: 'var(--t-font-size-xl)' }}
            />
          )}
        </div>

        <div
          className="mx-5 h-0"
          style={{ borderTop: '1px dashed var(--t-border-color-strong)' }}
        />

        <div className="flex flex-col gap-1 px-5 pt-3.5 pb-2.5">
          {label(fields.b)}
          {draft.type === 'link' ? (
            <input
              value={draft.b}
              onChange={(event) => set({ b: event.target.value })}
              placeholder={fields.bHint}
              style={{
                ...plainInput,
                fontSize: 'var(--t-font-size-lg)',
                color: 'var(--t-font-color-secondary)',
              }}
            />
          ) : (
            <CardEditor
              key={`${draft.type}-b`}
              id="composer-b"
              name="b"
              defaultValue={draft.b}
              placeholder={fields.bHint}
              className={`${bare} min-h-[4.8em]`}
              onChange={(b) => set({ b })}
            />
          )}
        </div>

        {draft.type === 'link' && (
          <div className="flex flex-col gap-1 px-5 pb-2.5">
            {label('Note')}
            <CardEditor
              key="link-c"
              id="composer-c"
              name="c"
              defaultValue={draft.c}
              placeholder="Why it is worth keeping (optional)"
              className={bare}
              onChange={(c) => set({ c })}
            />
          </div>
        )}

        <div className="px-5 pt-1 pb-4">
          <TagInput
            tags={draft.tags}
            known={knownTags}
            onChange={(tags) => set({ tags })}
          />
        </div>

        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{
            borderTop: '1px solid var(--t-border-color-light)',
            background: 'var(--t-background-secondary)',
            fontSize: 'var(--t-font-size-xs)',
            color: error
              ? 'var(--t-font-color-danger)'
              : 'var(--t-font-color-tertiary)',
          }}
        >
          <span>
            {error ??
              (draft.type === 'card' && !editing
                ? 'Saved cards are due for review right away'
                : 'Esc to cancel')}
          </span>
          <Button
            variant="solid"
            color="accent"
            size="sm"
            shortcut={['⌘', '↵']}
            disabled={!!problem || saving}
            loading={saving}
            onClick={save}
          >
            {editing ? 'Save' : `Add ${TYPES[draft.type].label.toLowerCase()}`}
          </Button>
        </div>
      </div>
    </>
  );
}
