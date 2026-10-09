'use client';

import { useState } from 'react';

import { CardEditor } from '@/components/card-editor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

/**
 * The add and edit forms are the same two fields with a different action, so
 * they are the same component. `action` is a server action; the editors put
 * markdown into hidden `front`/`back` inputs and it validates them again.
 */
export function CardForm({
  action,
  fields,
  defaultFront = '',
  defaultBack = '',
  submitLabel,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string | number>;
  defaultFront?: string;
  defaultBack?: string;
  submitLabel: string;
  children?: React.ReactNode;
}) {
  const [front, setFront] = useState(defaultFront);
  const [back, setBack] = useState(defaultBack);
  const [ready, setReady] = useState(false);

  // A hidden input is exempt from browser validation, so once the editors have
  // taken over from the textareas the empty check has to be ours. Before that,
  // the textareas' own `required` is still doing the job — hence `ready &&`.
  const incomplete = !front.trim() || !back.trim();

  return (
    <form action={action} className="flex flex-col gap-4">
      {Object.entries(fields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      <div className="flex flex-col gap-2">
        <Label htmlFor="front">Front</Label>
        <CardEditor
          id="front"
          name="front"
          defaultValue={defaultFront}
          autoFocus
          onChange={setFront}
          onReady={() => setReady(true)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="back">Back</Label>
        <CardEditor
          id="back"
          name="back"
          defaultValue={defaultBack}
          onChange={setBack}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={ready && incomplete}>
          {submitLabel}
        </Button>
        {children}
      </div>
    </form>
  );
}
