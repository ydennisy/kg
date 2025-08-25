import { describe, test, expect, vi, beforeEach } from 'vitest';
import { GetNodeUseCase } from './get-node.js';
import { NoteNode } from '../../domain/note-node.js';
import type { NodeRepository } from '../ports/node-repository.js';

function assertOk<T>(
  result: { ok: true; result: T } | { ok: false; error: string }
): asserts result is { ok: true; result: T } {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
}

describe('GetNodeUseCase', () => {
  let repository: NodeRepository;
  let useCase: GetNodeUseCase;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
    } as unknown as NodeRepository;
    useCase = new GetNodeUseCase(repository);
  });

  test('returns node when found', async () => {
    const note = NoteNode.create({
      title: 'Test',
      isPublic: false,
      data: { content: 'content' },
    });
    vi.mocked(repository.findById).mockResolvedValue(note);

    const result = await useCase.execute({ id: note.id });
    assertOk(result);
    expect(result.result).toBe(note);
    expect(repository.findById).toHaveBeenCalledWith(note.id, false);
  });

  test('returns error when node not found', async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);

    const result = await useCase.execute({ id: 'missing' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Node not found');
    }
  });

  test('returns error when repository throws', async () => {
    vi.mocked(repository.findById).mockRejectedValue(new Error('db error'));

    const result = await useCase.execute({ id: 'x' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('db error');
    }
  });
});
