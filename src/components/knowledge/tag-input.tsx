'use client';

import { IconCornerDownLeft, IconPlus } from '@tabler/icons-react';
import { useId, useState } from 'react';

import { addTag, parentOf, SEPARATOR, suggestTags } from '@/lib/knowledge/tags';

import { TagChip } from './bits';

const small = {
  fontSize: 'var(--t-font-size-xs)',
  color: 'var(--t-font-color-tertiary)',
};

/**
 * The composer's tags: chosen ones as chips, then a field that suggests as
 * you type. `/` nests, Tab steps into the highlighted tag, and a path that
 * does not exist yet is offered for creation, parents and all.
 */
export function TagInput({
  tags,
  known,
  onChange,
}: {
  tags: string[];
  known: string[];
  onChange: (tags: string[]) => void;
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [note, setNote] = useState('');
  const listId = useId();

  const options = open ? suggestTags(known, tags, text) : [];
  const highlighted = options[Math.min(active, options.length - 1)];

  const choose = (path: string) => {
    const result = addTag(tags, path);
    onChange(result.tags);
    setNote(result.note);
    setText('');
    setActive(0);
    // Done for now; typing or ↓ opens the list again.
    setOpen(false);
  };

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.metaKey || event.ctrlKey) {
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) =>
        options.length ? (current + step + options.length) % options.length : 0,
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (highlighted) {
        choose(highlighted.path);
      }
    } else if (
      event.key === 'Tab' &&
      !event.shiftKey &&
      highlighted &&
      !highlighted.create &&
      highlighted.children > 0
    ) {
      event.preventDefault();
      setText(highlighted.path + SEPARATOR);
      setActive(0);
    } else if (event.key === 'Backspace' && !text && tags.length) {
      onChange(tags.slice(0, -1));
      setNote('');
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1" style={small}>
          Tags
        </span>
        {tags.map((path) => (
          <TagChip
            key={path}
            name={path}
            onRemove={() => {
              onChange(tags.filter((tag) => tag !== path));
              setNote('');
            }}
          />
        ))}
        <input
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder={tags.length ? '+ tag' : '+ tag, / to nest'}
          aria-label="Add tag"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={options.length > 0}
          aria-controls={listId}
          className="h-6 min-w-[120px] flex-1 border-none bg-transparent outline-none"
          style={{ fontSize: 'var(--t-font-size-sm)' }}
        />
      </div>
      {note && <span style={small}>{note}</span>}
      {/* In the flow rather than floating: the composer scrolls, and would
          clip anything that hangs out of it. */}
      {options.length > 0 && (
        <div
          id={listId}
          role="listbox"
          className="flex max-h-60 flex-col overflow-auto p-1"
          style={{
            background: 'var(--t-background-primary)',
            border: '1px solid var(--t-border-color-medium)',
            borderRadius: 8,
          }}
        >
          {options.map((option, index) => {
            const parent = parentOf(option.path);
            return (
              <button
                key={option.path}
                type="button"
                role="option"
                aria-selected={option === highlighted}
                // Keep focus in the field, so the list stays open.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option.path)}
                className="flex h-[30px] items-center gap-2 rounded-md px-2 text-left"
                style={{
                  background:
                    option === highlighted
                      ? 'var(--t-background-tertiary)'
                      : 'transparent',
                }}
              >
                {option.create && (
                  <IconPlus
                    size={12}
                    style={{ color: 'var(--t-font-color-tertiary)' }}
                  />
                )}
                <TagChip name={option.path} />
                <span className="ml-auto whitespace-nowrap" style={small}>
                  {option.create
                    ? parent
                      ? known.includes(parent)
                        ? `new, inside ${parent}`
                        : `new, creates ${parent} too`
                      : 'new tag'
                    : option.children > 0
                      ? `${option.children} inside · Tab to open`
                      : ''}
                </span>
                {option === highlighted && (
                  <IconCornerDownLeft
                    size={12}
                    style={{ color: 'var(--t-font-color-tertiary)' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
