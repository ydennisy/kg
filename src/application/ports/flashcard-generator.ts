type Flashcard = {
  front: string;
  back: string;
};

interface FlashcardGenerator {
  generate(text: string): Promise<Array<Flashcard>>;
}

export type { FlashcardGenerator, Flashcard };
