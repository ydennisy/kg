import { describe, test, expect, vi, beforeEach } from 'vitest';
import { SearchNodesUseCase } from './search-nodes.js';
import { NoteNode } from '../../domain/note-node.js';
import type { NodeRepository, SearchResult } from '../ports/node-repository.js';
import { assertOk } from '../../../test/assert.js';

describe('SearchNodesUseCase', () => {
  let repository: NodeRepository;
  let useCase: SearchNodesUseCase;

  beforeEach(() => {
    repository = {
      search: vi.fn(),
    } as unknown as NodeRepository;
    useCase = new SearchNodesUseCase(repository);
  });

  test('returns empty results for blank query without calling repository', async () => {
    const result = await useCase.execute({ query: '   ' });
    assertOk(result);
    expect(result.result).toEqual([]);
    expect(repository.search).not.toHaveBeenCalled();
  });

  test('delegates search to repository', async () => {
    const note = NoteNode.create({
      title: 'Test',
      isPublic: false,
      data: { content: 'content' },
    });
    const mockResults: SearchResult[] = [
      { node: note, snippet: 'content', score: 1 },
    ];
    vi.mocked(repository.search).mockResolvedValue(mockResults);

    const result = await useCase.execute({ query: 'content' });
    assertOk(result);
    expect(result.result).toEqual(mockResults);
    expect(repository.search).toHaveBeenCalledWith('content', undefined);
  });

  test('passes relation flag to repository', async () => {
    vi.mocked(repository.search).mockResolvedValue([]);

    const result = await useCase.execute({ query: 'x', withRelations: true });
    assertOk(result);
    expect(repository.search).toHaveBeenCalledWith('x', true);
  });

  test('returns error when repository throws', async () => {
    vi.mocked(repository.search).mockRejectedValue(new Error('db error'));

    const result = await useCase.execute({ query: 'test' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('db error');
    }
  });
});
