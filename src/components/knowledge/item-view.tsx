'use client';

import {
  IconArrowLeft,
  IconExternalLink,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react';
import { useEffect, useState, useTransition } from 'react';
import { Button } from 'twenty-ui';

import { deleteItem } from '@/app/actions';
import { domain } from '@/lib/knowledge/draft';
import { related } from '@/lib/knowledge/search';
import type { Item } from '@/lib/knowledge/types';

import { Html, Kbd, TagChip, TYPES, TypeIcon, TypeTile } from './bits';

/**
 * One item, full page. A card keeps its answer behind "Show answer" here too,
 * so opening one from search is not a spoiler.
 */
export function ItemView({
  item,
  items,
  paused,
  onClose,
  onOpen,
  onPickTag,
  onEdit,
}: {
  item: Item;
  items: Item[];
  /** The composer is open on top; its keys are not ours. */
  paused: boolean;
  onClose: () => void;
  onOpen: (key: string) => void;
  onPickTag: (tag: string) => void;
  onEdit: (item: Item) => void;
}) {
  const [shown, setShown] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDeleting] = useTransition();
  const nearby = related(item, items, { limit: 6 });
  const hidden = item.type === 'card' && !shown;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (paused || event.defaultPrevented) {
        return;
      }
      const typing = /INPUT|TEXTAREA/.test(
        (event.target as HTMLElement).tagName,
      );
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === ' ' && !typing) {
        event.preventDefault();
        setShown(true);
      } else if (event.key === 'e' && !typing && !event.metaKey) {
        event.preventDefault();
        onEdit(item);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item, paused, onClose, onEdit]);

  const muted = {
    fontSize: 'var(--t-font-size-xs)',
    color: 'var(--t-font-color-tertiary)',
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-auto"
      style={{
        background: 'var(--t-background-primary)',
        animation: 'kfade 180ms ease-out',
      }}
    >
      <div
        className="sticky top-0 flex items-center justify-between px-6 py-4"
        style={{ ...muted, background: 'var(--t-background-primary)' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5"
        >
          <IconArrowLeft size={14} />
          Esc back
        </button>
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            startIcon={<IconPencil size={14} />}
            shortcut={['E']}
            onClick={() => onEdit(item)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            color="danger"
            startIcon={<IconTrash size={14} />}
            loading={deleting}
            onBlur={() => setConfirming(false)}
            onClick={() => {
              if (!confirming) {
                setConfirming(true);
                return;
              }
              startDeleting(async () => {
                await deleteItem(item.type, item.id);
                onClose();
              });
            }}
          >
            {confirming ? 'Click again to delete' : 'Delete'}
          </Button>
        </div>
      </div>

      <div
        key={item.key}
        className="mx-auto flex max-w-[640px] flex-col gap-[22px] px-6 pt-12 pb-24"
        style={{ animation: 'krise 260ms cubic-bezier(.2,.8,.2,1)' }}
      >
        <div
          className="flex items-center gap-1.5"
          style={{
            fontSize: 'var(--t-font-size-xs)',
            color: TYPES[item.type].fg,
          }}
        >
          <TypeIcon type={item.type} />
          {TYPES[item.type].label} · {item.date}
        </div>

        {item.type === 'card' ? (
          <Html
            html={item.titleHtml}
            className="text-[30px] leading-[1.3] font-medium [text-wrap:pretty]"
          />
        ) : (
          <div
            className="[text-wrap:pretty]"
            style={{
              fontSize: 30,
              lineHeight: 1.3,
              fontWeight: 'var(--t-font-weight-medium)',
            }}
          >
            {item.title}
          </div>
        )}

        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:underline"
            style={{ color: 'var(--t-color-green11)' }}
          >
            <IconExternalLink size={14} />
            {domain(item.url)}
          </a>
        )}

        {item.type === 'card' && (
          <div
            className="h-px"
            style={{ background: 'var(--t-border-color-medium)' }}
          />
        )}

        {item.type === 'link' && item.summary && (
          <div style={{ color: 'var(--t-font-color-secondary)' }}>
            <p
              className="mb-1 text-xs"
              style={{ color: 'var(--t-font-color-tertiary)' }}
            >
              Summary
            </p>
            <p className="leading-relaxed">{item.summary}</p>
          </div>
        )}

        {item.bodyHtml &&
          (hidden ? (
            <button
              type="button"
              onClick={() => setShown(true)}
              className="flex h-24 items-center justify-center gap-2 rounded-lg"
              style={{
                border: '1px dashed var(--t-border-color-strong)',
                color: 'var(--t-font-color-tertiary)',
              }}
            >
              Show answer <Kbd>Space</Kbd>
            </button>
          ) : (
            <div style={{ animation: 'kfade 200ms ease-out' }}>
              <Html
                html={item.bodyHtml}
                className="text-[length:var(--t-font-size-lg)] leading-[1.75] text-[color:var(--t-font-color-secondary)] [text-wrap:pretty]"
              />
            </div>
          ))}

        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <TagChip key={tag} name={tag} onPick={onPickTag} />
          ))}
        </div>

        {nearby.length > 0 && (
          <div className="mt-10 flex flex-col gap-0.5">
            <div className="px-2 pb-1.5" style={muted}>
              Related
            </div>
            {nearby.map((other) => (
              <button
                key={other.key}
                type="button"
                onClick={() => onOpen(other.key)}
                className="flex h-[34px] items-center gap-2.5 rounded-md px-2 text-left hover:bg-[var(--t-background-transparent-light)]"
              >
                <TypeTile type={other.type} />
                <span className="flex-1 truncate">{other.title}</span>
                <span style={muted}>
                  {other.url ? domain(other.url) : other.date}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
