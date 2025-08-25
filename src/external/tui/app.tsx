import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import type { NodeType } from '../../domain/types.js';
import type { CreateNodeUseCase } from '../../application/use-cases/create-node.js';
import type { LinkNodesUseCase } from '../../application/use-cases/link-nodes.js';
import type { PublishSiteUseCase } from '../../application/use-cases/publish-site.js';
import type { SearchNodesUseCase } from '../../application/use-cases/search-nodes.js';
import type { GetNodeUseCase } from '../../application/use-cases/get-node.js';
import type { GenerateFlashcardsUseCase } from '../../application/use-cases/generate-flashcards.js';
import type { GetDueFlashcardsUseCase } from '../../application/use-cases/get-due-flashcards.js';
import type { ReviewFlashcardUseCase } from '../../application/use-cases/review-flashcard.js';
import type { Flashcard } from '../../application/ports/flashcard-generator.js';
import type { FlashcardNode } from '../../domain/flashcard-node.js';
import { MarkdownEditor } from './markdown-editor.js';

type Screen =
  | 'menu'
  | 'create'
  | 'search'
  | 'flashcards'
  | 'review'
  | 'publish'
  | 'exit';

export type AppProps = {
  createNodeUseCase: CreateNodeUseCase;
  linkNodesUseCase: LinkNodesUseCase;
  searchNodesUseCase: SearchNodesUseCase;
  getNodeUseCase: GetNodeUseCase;
  generateFlashcardsUseCase: GenerateFlashcardsUseCase;
  publishSiteUseCase: PublishSiteUseCase;
  getDueFlashcardsUseCase: GetDueFlashcardsUseCase;
  reviewFlashcardUseCase: ReviewFlashcardUseCase;
};

const Menu: React.FC<{ onSelect: (s: Screen) => void }> = ({ onSelect }) => {
  const items = [
    { label: 'Create Node', value: 'create' },
    { label: 'Search Nodes', value: 'search' },
    { label: 'Generate Flashcards', value: 'flashcards' },
    { label: 'Review Flashcards', value: 'review' },
    { label: 'Publish Site', value: 'publish' },
    { label: 'Exit', value: 'exit' },
  ];
  return <SelectInput items={items} onSelect={(i) => onSelect(i.value as Screen)} />;
};

export const App: React.FC<AppProps> = (props) => {
  const [screen, setScreen] = useState<Screen>('menu');
  const { exit } = useApp();
  useEffect(() => {
    if (screen === 'exit') exit();
  }, [screen, exit]);

  switch (screen) {
    case 'menu':
      return <Menu onSelect={setScreen} />;
    case 'create':
      return <CreateNode {...props} onDone={() => setScreen('menu')} />;
    case 'search':
      return <SearchNodes {...props} onDone={() => setScreen('menu')} />;
    case 'flashcards':
      return <GenerateFlashcards {...props} onDone={() => setScreen('menu')} />;
    case 'review':
      return <ReviewFlashcards {...props} onDone={() => setScreen('menu')} />;
    case 'publish':
      return <PublishSite {...props} onDone={() => setScreen('menu')} />;
    default:
      return <Text>Unknown screen</Text>;
  }
};

// ---------- Create Node ----------

type CreateNodeProps = AppProps & { onDone: () => void };

const CreateNode: React.FC<CreateNodeProps> = ({
  createNodeUseCase,
  linkNodesUseCase,
  onDone,
}) => {
  type Step =
    | 'type'
    | 'title'
    | 'content'
    | 'url'
    | 'tag'
    | 'flashcardFront'
    | 'flashcardBack'
    | 'isPublic'
    | 'link'
    | 'done';
  const [step, setStep] = useState<Step>('type');
  const [nodeType, setNodeType] = useState<NodeType>('note');
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [data, setData] = useState<any>({});
  const [isPublic, setIsPublic] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [newId, setNewId] = useState<string | null>(null);
  const [linkIds, setLinkIds] = useState('');

  useEffect(() => {
    const run = async () => {
      if (step === 'done') {
        onDone();
      }
      if (step === 'link' && newId) {
        const ids = linkIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        for (const id of ids) {
          await linkNodesUseCase.execute({
            fromId: newId,
            toId: id,
            type: 'related_to',
            isBidirectional: true,
          });
        }
        setStatus(`Linked ${ids.length} nodes.`);
        setStep('done');
      }
      if (step === 'isPublic') {
        const res = await createNodeUseCase.execute({
          type: nodeType,
          title,
          data,
          isPublic,
        });
        if (res.ok) {
          setStatus(`Created node ${res.result.id}`);
          setNewId(res.result.id);
          setStep('link');
        } else {
          setStatus(`Error: ${res.error}`);
          setStep('done');
        }
      }
    };
    run();
  }, [step, createNodeUseCase, linkNodesUseCase, nodeType, title, data, isPublic, linkIds, newId, onDone]);

  if (step === 'type') {
    return (
      <Box flexDirection="column">
        <Text>Select node type:</Text>
        <SelectInput
          items={[
            { label: 'Note', value: 'note' },
            { label: 'Link', value: 'link' },
            { label: 'Tag', value: 'tag' },
            { label: 'Flashcard', value: 'flashcard' },
          ]}
          onSelect={(i) => {
            setNodeType(i.value as NodeType);
            switch (i.value) {
              case 'note':
                setStep('title');
                break;
              case 'link':
                setStep('url');
                break;
              case 'tag':
                setStep('tag');
                break;
              case 'flashcard':
                setStep('flashcardFront');
                break;
            }
          }}
        />
      </Box>
    );
  }
  if (step === 'title') {
    return (
      <Box flexDirection="column">
        <Text>Enter note title:</Text>
        <TextInput
          value={title || ''}
          onChange={(v) => setTitle(v)}
          onSubmit={(v) => {
            setTitle(v);
            setStep('content');
          }}
        />
      </Box>
    );
  }
  if (step === 'content') {
    return (
      <MarkdownEditor
        initialValue={data.content}
        onSubmit={(v) => {
          setData({ ...data, content: v });
          setStep('isPublic');
        }}
      />
    );
  }
  if (step === 'url') {
    return (
      <Box flexDirection="column">
        <Text>Enter URL:</Text>
        <TextInput
          value={data.url || ''}
          onChange={(v) => setData({ ...data, url: v })}
          onSubmit={() => setStep('title')}
        />
      </Box>
    );
  }
  if (step === 'tag') {
    return (
      <Box flexDirection="column">
        <Text>Enter tag name:</Text>
        <TextInput
          value={data.name || ''}
          onChange={(v) => setData({ name: v })}
          onSubmit={(v) => {
            setData({ name: v });
            setStep('isPublic');
          }}
        />
      </Box>
    );
  }
  if (step === 'flashcardFront') {
    return (
      <Box flexDirection="column">
        <Text>Enter flashcard front:</Text>
        <TextInput
          value={data.front || ''}
          onChange={(v) => setData({ ...data, front: v })}
          onSubmit={(v) => {
            setData({ ...data, front: v });
            setStep('flashcardBack');
          }}
        />
      </Box>
    );
  }
  if (step === 'flashcardBack') {
    return (
      <Box flexDirection="column">
        <Text>Enter flashcard back:</Text>
        <TextInput
          value={data.back || ''}
          onChange={(v) => setData({ ...data, back: v })}
          onSubmit={(v) => {
            setData({ ...data, back: v });
            setStep('isPublic');
          }}
        />
      </Box>
    );
  }
  if (step === 'isPublic') {
    return (
      <Box flexDirection="column">
        <Text>Make this node public?</Text>
        <SelectInput
          items={[
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' },
          ]}
          onSelect={(i) => {
            setIsPublic(i.value === 'yes');
            setStep('isPublic'); // trigger useEffect to create
          }}
        />
      </Box>
    );
  }
  if (step === 'link') {
    return (
      <Box flexDirection="column">
        <Text>{status}</Text>
        <Text>Enter node IDs to link (comma separated) or press enter to skip:</Text>
        <TextInput
          value={linkIds}
          onChange={setLinkIds}
          onSubmit={(v) => {
            setLinkIds(v);
            setStep('link');
          }}
        />
      </Box>
    );
  }
  if (step === 'done') {
    return (
      <Box flexDirection="column">
        <Text>{status}</Text>
        <Text>Press enter to return to menu.</Text>
        <TextInput value="" onSubmit={() => onDone()} />
      </Box>
    );
  }
  return <Text>{status}</Text>;
};

// ---------- Search Nodes ----------

type SearchProps = AppProps & { onDone: () => void };

const SearchNodes: React.FC<SearchProps> = ({
  searchNodesUseCase,
  getNodeUseCase,
  onDone,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [display, setDisplay] = useState<any | null>(null);

  useEffect(() => {
    const run = async () => {
      if (query && results.length === 0 && display === null) {
        const res = await searchNodesUseCase.execute({ query });
        if (res.ok) {
          setResults(
            res.result.map(({ node, score }) => ({
              label: `[${node.type.toUpperCase()}] ${node.title} (${score.toFixed(
                2
              )})`,
              value: node.id,
            }))
          );
        }
      }
    };
    run();
  }, [query, results, display, searchNodesUseCase]);

  if (display) {
    return (
      <Box flexDirection="column">
        <Text>{JSON.stringify(display, null, 2)}</Text>
        <Text>Press enter to return.</Text>
        <TextInput value="" onSubmit={() => onDone()} />
      </Box>
    );
  }

  if (results.length > 0) {
    return (
      <Box flexDirection="column">
        <SelectInput
          items={results}
          onSelect={async (item) => {
            const res = await getNodeUseCase.execute({ id: item.value });
            if (res.ok) {
              setDisplay(res.result);
            } else {
              setDisplay({ error: res.error });
            }
          }}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>Search query:</Text>
      <TextInput
        value={query}
        onChange={setQuery}
        onSubmit={setQuery}
      />
    </Box>
  );
};

// ---------- Generate Flashcards ----------

type FlashcardProps = AppProps & { onDone: () => void };

const GenerateFlashcards: React.FC<FlashcardProps> = ({
  searchNodesUseCase,
  getNodeUseCase,
  generateFlashcardsUseCase,
  createNodeUseCase,
  linkNodesUseCase,
  onDone,
}) => {
  type Step = 'query' | 'select' | 'review' | 'public' | 'saving' | 'done';
  const [step, setStep] = useState<Step>('query');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [nodeId, setNodeId] = useState<string>('');
  const [cards, setCards] = useState<Array<Flashcard>>([]);
  const [kept, setKept] = useState<Array<Flashcard>>([]);
  const [index, setIndex] = useState(0);
  const [makePublic, setMakePublic] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const run = async () => {
      if (step === 'select' && results.length === 0) {
        const res = await searchNodesUseCase.execute({ query });
        if (res.ok) {
          setResults(
            res.result.map(({ node, score }) => ({
              label: `[${node.type.toUpperCase()}] ${node.title} (${score.toFixed(
                2
              )})`,
              value: node.id,
            }))
          );
        } else {
          setStatus(res.error);
          setStep('done');
        }
      }
      if (step === 'review') {
        const res = await generateFlashcardsUseCase.execute({ id: nodeId });
        if (res.ok) {
          setCards(res.result);
        } else {
          setStatus(res.error);
          setStep('done');
        }
      }
      if (step === 'saving') {
        for (const card of kept) {
          const save = await createNodeUseCase.execute({
            type: 'flashcard',
            data: { front: card.front, back: card.back },
            isPublic: makePublic,
          });
          if (save.ok) {
            await linkNodesUseCase.execute({
              fromId: nodeId,
              toId: save.result.id,
              type: 'related_to',
              isBidirectional: true,
            });
          }
        }
        setStatus(`Saved ${kept.length} cards.`);
        setStep('done');
      }
    };
    run();
  }, [step, query, results, nodeId, kept, makePublic, searchNodesUseCase, generateFlashcardsUseCase, createNodeUseCase, linkNodesUseCase]);

  if (step === 'query') {
    return (
      <Box flexDirection="column">
        <Text>Search for source node:</Text>
        <TextInput value={query} onChange={setQuery} onSubmit={() => setStep('select')} />
      </Box>
    );
  }
  if (step === 'select') {
    return (
      <SelectInput
        items={results}
        onSelect={(item) => {
          setNodeId(item.value);
          setStep('review');
        }}
      />
    );
  }
  if (step === 'review') {
    if (cards.length === 0) {
      return <Text>Generating flashcards...</Text>;
    }
    const card = cards[index];
    if (!card) {
      setStep('public');
      return null;
    }
    return (
      <Box flexDirection="column">
        <Text>Card {index + 1} of {cards.length}</Text>
        <Text>Front: {card.front}</Text>
        <Text>Back: {card.back}</Text>
        <SelectInput
          items={[
            { label: 'Keep', value: 'keep' },
            { label: 'Discard', value: 'discard' },
          ]}
          onSelect={(item) => {
            if (item.value === 'keep') {
              setKept([...kept, card]);
            }
            setIndex(index + 1);
          }}
        />
      </Box>
    );
  }
  if (step === 'public') {
    return (
      <Box flexDirection="column">
        <Text>Make kept cards public?</Text>
        <SelectInput
          items={[
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' },
          ]}
          onSelect={(i) => {
            setMakePublic(i.value === 'yes');
            setStep('saving');
          }}
        />
      </Box>
    );
  }
  if (step === 'saving') {
    return <Text>Saving cards...</Text>;
  }
  if (step === 'done') {
    return (
      <Box flexDirection="column">
        <Text>{status}</Text>
        <Text>Press enter to return.</Text>
        <TextInput value="" onSubmit={() => onDone()} />
      </Box>
    );
  }
  return null;
};

// ---------- Review Flashcards ----------

type ReviewProps = AppProps & { onDone: () => void };

const ReviewFlashcards: React.FC<ReviewProps> = ({
  getDueFlashcardsUseCase,
  reviewFlashcardUseCase,
  onDone,
}) => {
  const [cards, setCards] = useState<FlashcardNode[]>([]);
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const run = async () => {
      if (cards.length === 0 && status === '') {
        const res = await getDueFlashcardsUseCase.execute({ limit: 20 });
        if (res.ok) {
          setCards(res.result);
        } else {
          setStatus(res.error);
        }
      }
    };
    run();
  }, [cards, status, getDueFlashcardsUseCase]);

  if (status && cards.length === 0) {
    return (
      <Box flexDirection="column">
        <Text>{status}</Text>
        <Text>Press enter to return.</Text>
        <TextInput value="" onSubmit={() => onDone()} />
      </Box>
    );
  }

  if (cards.length === 0) {
    return (
      <Box flexDirection="column">
        <Text>No flashcards due.</Text>
        <Text>Press enter to return.</Text>
        <TextInput value="" onSubmit={() => onDone()} />
      </Box>
    );
  }

  const card = cards[index];
  if (!card) {
    return (
      <Box flexDirection="column">
        <Text>Review session complete.</Text>
        <Text>Press enter to return.</Text>
        <TextInput value="" onSubmit={() => onDone()} />
      </Box>
    );
  }

  if (!showBack) {
    return (
      <Box flexDirection="column">
        <Text>
          Card {index + 1} of {cards.length}
        </Text>
        <Text>Front: {card.data.front}</Text>
        <Text>Press enter to reveal the back.</Text>
        <TextInput value="" onSubmit={() => setShowBack(true)} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>
        Card {index + 1} of {cards.length}
      </Text>
      <Text>Front: {card.data.front}</Text>
      <Text>Back: {card.data.back}</Text>
      <SelectInput
        items={[
          { label: 'Again', value: 0 },
          { label: 'Hard', value: 3 },
          { label: 'Good', value: 4 },
          { label: 'Easy', value: 5 },
        ]}
        onSelect={async (item) => {
          await reviewFlashcardUseCase.execute({
            flashcard: card,
            quality: item.value as number,
          });
          setIndex(index + 1);
          setShowBack(false);
        }}
      />
    </Box>
  );
};

// ---------- Publish Site ----------

type PublishProps = AppProps & { onDone: () => void };

const PublishSite: React.FC<PublishProps> = ({ publishSiteUseCase, onDone }) => {
  const [status, setStatus] = useState('Publishing...');
  useEffect(() => {
    const run = async () => {
      const res = await publishSiteUseCase.execute();
      if (res.ok) {
        setStatus(
          `Published ${res.result.filesGenerated} files to ${res.result.outputDir}`
        );
      } else {
        setStatus(`Error: ${res.error}`);
      }
    };
    run();
  }, [publishSiteUseCase]);

  return (
    <Box flexDirection="column">
      <Text>{status}</Text>
      <Text>Press enter to return.</Text>
      <TextInput value="" onSubmit={() => onDone()} />
    </Box>
  );
};

