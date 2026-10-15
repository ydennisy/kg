'use client';

import {
  IconBrain,
  IconFileText,
  IconLogout,
  IconPlayerPlay,
  IconPlus,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'twenty-ui';

import { signOut } from '@/app/sign-in/actions';
import { domain, draftFrom, guessType } from '@/lib/knowledge/draft';
import { startDrill, type Drill as DrillState } from '@/lib/knowledge/drill';
import {
  countByType,
  newestFirst,
  search,
  tagCounts,
} from '@/lib/knowledge/search';
import type { Item, ItemDraft, ItemType } from '@/lib/knowledge/types';

import { Highlighted, TagChip, TYPES, TypeIcon } from './bits';
import { Composer } from './composer';
import { Drill } from './drill';
import { ItemView } from './item-view';

type ComposerState = {
  /** Remounts the composer, so each opening starts from its own draft. */
  id: number;
  initial: ItemDraft;
  editing: { type: ItemType; id: number } | null;
};

const EASE = 'cubic-bezier(.2,.8,.2,1)';
const ANIM_MS = 520;

function draftOf(item: Item): ItemDraft {
  if (item.type === 'link') {
    return {
      type: 'link',
      a: item.url ?? '',
      b: item.title,
      c: item.bodyMarkdown,
      tags: item.tags,
    };
  }
  return {
    type: item.type,
    a: item.titleMarkdown,
    b: item.bodyMarkdown,
    c: '',
    tags: item.tags,
  };
}

/**
 * Search-first home. Typing narrows everything at once; what you find can be
 * opened, drilled, or — when nothing matches — added from what you typed.
 */
export function KnowledgeApp({ items }: { items: Item[] }) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [type, setType] = useState<ItemType | 'all'>('all');
  const [focused, setFocused] = useState(false);
  const [viewKey, setViewKey] = useState<string | null>(null);
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [drill, setDrill] = useState<DrillState | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const q = query.trim();
  const searching = !!(q || tag);
  const matches = useMemo(
    () => search(items, { query, tag }),
    [items, query, tag],
  );
  const results =
    type === 'all' ? matches : matches.filter((item) => item.type === type);
  const counts = countByType(matches);
  const allTags = useMemo(() => tagCounts(items), [items]);
  const resultTags = tagCounts(matches, tag).slice(0, 4);
  const recent = useMemo(() => newestFirst(items).slice(0, 5), [items]);
  const dueCards = useMemo(
    () => newestFirst(items).filter((item) => item.type === 'card' && item.due),
    [items],
  );
  const cardsInResults = matches.filter((item) => item.type === 'card');
  const viewed = viewKey
    ? items.find((item) => item.key === viewKey)
    : undefined;
  const short = q.length > 18 ? `${q.slice(0, 18)}…` : q;

  const focusSearch = useCallback(() => {
    setTimeout(() => input.current?.focus(), 0);
  }, []);

  const clearAll = () => {
    setQuery('');
    setTag(null);
    setType('all');
    focusSearch();
  };
  const pickTag = useCallback(
    (name: string) => {
      setTag(name);
      setType('all');
      setViewKey(null);
      setDrill(null);
      focusSearch();
    },
    [focusSearch],
  );
  const compose = (draftType: ItemType, text: string) =>
    setComposer({
      id: Date.now(),
      initial: draftFrom(draftType, text, tag ? [tag] : []),
      editing: null,
    });
  const edit = useCallback(
    (item: Item) =>
      setComposer({
        id: Date.now(),
        initial: draftOf(item),
        editing: { type: item.type, id: item.id },
      }),
    [],
  );
  const closeComposer = useCallback(() => {
    setComposer(null);
    if (!drill && !viewKey) {
      focusSearch();
    }
  }, [drill, viewKey, focusSearch]);
  // Back to search — unless a drill is still underneath, in which case the
  // search box must not take focus (and with it the drill's keys).
  const closeView = useCallback(() => {
    setViewKey(null);
    if (!drill) {
      focusSearch();
    }
  }, [drill, focusSearch]);
  const beginDrill = (cards: Item[], label: string) => {
    if (cards.length) {
      setDrill(
        startDrill(
          cards.map((card) => card.key),
          label,
        ),
      );
    }
  };

  useEffect(() => {
    setTimeout(() => input.current?.focus(), 300);
  }, []);

  // Whatever opens on top owns the keyboard; a focused search box underneath
  // would take Space and Escape for itself.
  const overlay = !!(viewKey || drill || composer);
  useEffect(() => {
    if (overlay) {
      input.current?.blur();
    }
  }, [overlay]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || viewKey || drill || composer) {
        return;
      }
      const typing = /INPUT|TEXTAREA/.test(
        (event.target as HTMLElement).tagName,
      );
      if (event.key === '/' && !typing) {
        event.preventDefault();
        focusSearch();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewKey, drill, composer, focusSearch]);

  function onInputKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (drill || viewKey || composer) {
      return;
    }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      compose(q ? guessType(q) : 'note', q);
    } else if (event.key === 'Enter' && results[0]) {
      event.preventDefault();
      setViewKey(results[0].key);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setQuery('');
      setTag(null);
      setType('all');
    } else if (event.key === 'Backspace' && !query && tag) {
      setTag(null);
    }
  }

  const muted = {
    fontSize: 'var(--t-font-size-xs)',
    color: 'var(--t-font-color-tertiary)',
  };

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        fontFamily: 'var(--t-font-family)',
        color: 'var(--t-font-color-primary)',
        background: 'var(--t-background-primary)',
      }}
    >
      <header className="flex items-center justify-between px-6 py-4">
        <button
          type="button"
          className="flex items-center gap-2"
          onClick={() => {
            setViewKey(null);
            clearAll();
          }}
        >
          <span
            className="flex size-5 items-center justify-center rounded"
            style={{
              background: 'var(--t-background-inverted-primary)',
              color: 'var(--t-font-color-inverted)',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            K
          </span>
          <span style={{ fontWeight: 'var(--t-font-weight-medium)' }}>
            Knowledge
          </span>
        </button>
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            startIcon={<IconPlayerPlay size={14} />}
            disabled={dueCards.length === 0}
            onClick={() => beginDrill(dueCards, 'Due today')}
          >
            Review {dueCards.length}
          </Button>
          <Button
            variant="outline"
            size="sm"
            startIcon={<IconPlus size={14} />}
            onClick={() => compose(q ? guessType(q) : 'card', q)}
          >
            New
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Sign out"
            startIcon={<IconLogout size={14} />}
            onClick={() => signOut()}
          />
        </div>
      </header>

      <main
        className="mx-auto box-border flex w-full max-w-[1120px] flex-col items-center px-4 sm:px-7"
        style={{
          paddingTop: searching ? 8 : 'calc(18vh + 40px)',
          transition: `padding-top ${ANIM_MS}ms ${EASE}`,
        }}
      >
        <div
          className="box-border flex h-12 w-full items-center gap-2.5 rounded-[10px] px-3.5"
          style={{
            maxWidth: searching ? 1064 : 560,
            border: `1px solid ${
              focused ? 'var(--t-color-blue)' : 'var(--t-border-color-strong)'
            }`,
            boxShadow: focused
              ? '0 0 0 3px var(--t-color-blue3)'
              : 'var(--t-box-shadow-light)',
            background: 'var(--t-background-primary)',
            color: 'var(--t-font-color-tertiary)',
            transition: `max-width ${ANIM_MS}ms ${EASE}, box-shadow 200ms, border-color 200ms`,
          }}
        >
          <IconSearch size={18} stroke={1.6} className="flex-none" />
          {tag && (
            <span
              className="flex h-[26px] flex-none items-center gap-1 rounded-md pr-1.5 pl-2.5"
              style={{
                background: 'var(--t-background-tertiary)',
                color: 'var(--t-font-color-primary)',
                fontSize: 'var(--t-font-size-sm)',
              }}
            >
              #{tag}
              <button
                type="button"
                aria-label="Clear tag"
                className="flex"
                style={{ color: 'var(--t-font-color-tertiary)' }}
                onClick={() => {
                  setTag(null);
                  focusSearch();
                }}
              >
                <IconX size={12} />
              </button>
            </span>
          )}
          <input
            ref={input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKey}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search cards, notes, links…"
            aria-label="Search"
            className="min-w-0 flex-1 border-none bg-transparent outline-none"
            style={{
              fontSize: 'var(--t-font-size-lg)',
              color: 'var(--t-font-color-primary)',
            }}
          />
          {searching ? (
            <>
              <span
                className="whitespace-nowrap"
                style={{ fontSize: 'var(--t-font-size-sm)' }}
              >
                {matches.length} {matches.length === 1 ? 'result' : 'results'}
              </span>
              <button
                type="button"
                aria-label="Clear search"
                className="flex"
                onClick={clearAll}
              >
                <IconX size={16} />
              </button>
            </>
          ) : (
            <span
              style={{
                fontSize: 'var(--t-font-size-xs)',
                border: '1px solid var(--t-border-color-medium)',
                borderRadius: 4,
                padding: '1px 6px',
              }}
            >
              /
            </span>
          )}
        </div>

        <div className="mt-4 grid w-full">
          {/* Home: tags, recent, shortcuts. Fades out as soon as you search. */}
          <div
            className="flex flex-col items-center gap-7 pt-3"
            style={{
              gridArea: '1 / 1',
              opacity: searching ? 0 : 1,
              pointerEvents: searching ? 'none' : 'auto',
              transform: `translateY(${searching ? -16 : 0}px)`,
              transition: `opacity 250ms, transform ${ANIM_MS}ms ${EASE}`,
            }}
            aria-hidden={searching}
          >
            <div className="flex max-w-[560px] flex-wrap justify-center gap-1.5">
              {allTags.map(({ name, count }) => (
                <TagChip
                  key={name}
                  name={name}
                  count={count}
                  onPick={pickTag}
                />
              ))}
            </div>
            <div className="mt-4 flex w-full max-w-[560px] flex-col">
              <div className="px-2 pb-1.5" style={muted}>
                {items.length
                  ? 'Recent'
                  : 'Nothing here yet — press ⌘↵ to add something'}
              </div>
              {recent.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  tabIndex={searching ? -1 : 0}
                  onClick={() => setViewKey(item.key)}
                  className="flex h-[34px] items-center gap-2.5 rounded-md px-2 text-left hover:bg-[var(--t-background-transparent-light)]"
                  style={{ color: TYPES[item.type].fg }}
                >
                  <span className="flex">
                    <TypeIcon type={item.type} size={12} />
                  </span>
                  <span
                    className="flex-1 truncate"
                    style={{ color: 'var(--t-font-color-primary)' }}
                  >
                    {item.title}
                  </span>
                  <span style={muted}>
                    {item.url ? domain(item.url) : item.date}
                  </span>
                </button>
              ))}
            </div>
            <div className="hidden gap-5 sm:flex" style={muted}>
              <span>↵ open top result</span>
              <span>⌘↵ add what you typed</span>
              <span>Esc clear</span>
            </div>
          </div>

          {/* Results. */}
          <div
            className="flex flex-col gap-4 pb-12"
            style={{
              gridArea: '1 / 1',
              opacity: searching ? 1 : 0,
              pointerEvents: searching ? 'auto' : 'none',
              transform: `translateY(${searching ? 0 : 24}px)`,
              transition: `opacity 300ms 120ms, transform ${ANIM_MS}ms ${EASE}`,
            }}
            aria-hidden={!searching}
          >
            <div
              className="flex flex-wrap items-center gap-1.5"
              style={{ fontSize: 'var(--t-font-size-sm)' }}
            >
              {(['all', 'card', 'note', 'link'] as const).map((key) => {
                const on = type === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className="flex h-[26px] items-center gap-1.5 rounded-[13px] px-2.5"
                    style={{
                      background: on
                        ? 'var(--t-background-inverted-primary)'
                        : 'var(--t-background-primary)',
                      color: on
                        ? 'var(--t-font-color-inverted)'
                        : 'var(--t-font-color-primary)',
                      border: `1px solid ${
                        on
                          ? 'var(--t-background-inverted-primary)'
                          : 'var(--t-border-color-medium)'
                      }`,
                    }}
                  >
                    {key !== 'all' && (
                      <span
                        className="flex"
                        style={{ color: on ? 'inherit' : TYPES[key].fg }}
                      >
                        <TypeIcon type={key} />
                      </span>
                    )}
                    {key === 'all' ? 'All' : TYPES[key].plural}{' '}
                    {key === 'all' ? matches.length : counts[key]}
                  </button>
                );
              })}
              {resultTags.length > 0 && (
                <>
                  <span
                    className="ml-3"
                    style={{ color: 'var(--t-font-color-tertiary)' }}
                  >
                    in
                  </span>
                  {resultTags.map(({ name, count }) => (
                    <TagChip
                      key={name}
                      name={name}
                      count={count}
                      variant="outline"
                      onPick={pickTag}
                    />
                  ))}
                </>
              )}
              <div className="ml-auto flex gap-1.5">
                {q && (
                  <Button
                    variant="ghost"
                    size="sm"
                    startIcon={<IconPlus size={14} />}
                    shortcut={['⌘', '↵']}
                    onClick={() => compose(guessType(q), q)}
                  >
                    Add “{short}”
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  startIcon={<IconPlayerPlay size={14} />}
                  disabled={cardsInResults.length === 0}
                  onClick={() =>
                    beginDrill(
                      cardsInResults,
                      [tag && `#${tag}`, q && `“${q}”`]
                        .filter(Boolean)
                        .join(' · '),
                    )
                  }
                >
                  Review {cardsInResults.length}{' '}
                  {cardsInResults.length === 1 ? 'card' : 'cards'}
                </Button>
              </div>
            </div>

            {searching && matches.length === 0 && (
              <div
                className="flex flex-col items-center gap-3.5 py-[72px]"
                style={{ color: 'var(--t-font-color-secondary)' }}
              >
                <span>Nothing matches. Add it instead?</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    startIcon={<IconBrain size={14} />}
                    onClick={() => compose('card', q)}
                  >
                    As a card
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    startIcon={<IconFileText size={14} />}
                    onClick={() => compose('note', q)}
                  >
                    As a note
                  </Button>
                </div>
              </div>
            )}

            <div className="columns-1 gap-3.5 md:columns-2 lg:columns-3">
              {results.map((item) => (
                <ResultCard
                  key={item.key}
                  item={item}
                  query={q}
                  onOpen={() => setViewKey(item.key)}
                  onPickTag={pickTag}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {drill && (
        <Drill
          drill={drill}
          items={items}
          showRelated
          paused={!!viewKey || !!composer}
          onChange={setDrill}
          onEnd={() => {
            setDrill(null);
            focusSearch();
          }}
          onOpen={setViewKey}
          onEdit={edit}
        />
      )}

      {viewed && (
        <ItemView
          key={viewed.key}
          item={viewed}
          items={items}
          paused={!!composer}
          onClose={closeView}
          onOpen={setViewKey}
          onPickTag={pickTag}
          onEdit={edit}
        />
      )}

      {composer && (
        <Composer
          key={composer.id}
          initial={composer.initial}
          editing={composer.editing}
          knownTags={allTags.map(({ name }) => name)}
          onClose={closeComposer}
          onSaved={closeComposer}
        />
      )}
    </div>
  );
}

function ResultCard({
  item,
  query,
  onOpen,
  onPickTag,
}: {
  item: Item;
  query: string;
  onOpen: () => void;
  onPickTag: (tag: string) => void;
}) {
  const meta = item.url ? domain(item.url) : item.date;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onOpen();
        }
      }}
      className="mb-3.5 cursor-pointer overflow-hidden rounded-[10px] break-inside-avoid transition-[box-shadow,border-color] duration-150 hover:border-[var(--t-border-color-strong)]! hover:shadow-[var(--t-box-shadow-light)]"
      style={{
        background: 'var(--t-background-primary)',
        border: '1px solid var(--t-border-color-medium)',
      }}
    >
      <div
        className="flex items-center gap-1.5 px-3.5 pt-3"
        style={{
          fontSize: 'var(--t-font-size-xs)',
          color: TYPES[item.type].fg,
        }}
      >
        <span
          className="flex size-[18px] items-center justify-center rounded"
          style={{ background: TYPES[item.type].bg }}
        >
          <TypeIcon type={item.type} size={12} />
        </span>
        {TYPES[item.type].label}
        <span
          className="ml-auto"
          style={{ color: 'var(--t-font-color-tertiary)' }}
        >
          {meta}
        </span>
      </div>
      <div
        className="px-3.5 pt-2.5 pb-3 leading-[1.45]"
        style={{ fontWeight: 'var(--t-font-weight-medium)' }}
      >
        <Highlighted text={item.title} query={query} />
      </div>
      {item.type !== 'card' && item.body && (
        <div
          className="line-clamp-5 px-3.5 pb-3 leading-[1.6]"
          style={{ color: 'var(--t-font-color-secondary)' }}
        >
          <Highlighted text={item.body} query={query} />
        </div>
      )}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3.5 pb-3.5">
          {item.tags.map((tag) => (
            <TagChip key={tag} name={tag} onPick={onPickTag} />
          ))}
        </div>
      )}
    </div>
  );
}
