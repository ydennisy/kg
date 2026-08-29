import { render, screen } from '@testing-library/react';
import { Plus } from 'lucide-react';
import { expect, test } from 'vitest';

import { Button } from '@/components/ui/button';

test('renders a shadcn Button with a lucide icon', () => {
  render(
    <Button>
      <Plus />
      Add card
    </Button>,
  );

  const button = screen.getByRole('button', { name: 'Add card' });
  expect(button).toBeDefined();
  expect(button.querySelector('svg.lucide-plus')).not.toBeNull();
});
