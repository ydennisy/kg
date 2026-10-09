import { renderMarkdown } from '@/lib/markdown';
import { cn } from '@/lib/utils';

/**
 * Renders card markdown. A server component on purpose: the whole markdown
 * pipeline stays on the server, so the drill page ships none of it.
 */
export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn('card-prose', className)}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(children) }}
    />
  );
}
