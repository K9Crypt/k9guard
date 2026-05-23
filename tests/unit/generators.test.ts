import { describe, test, expect } from 'bun:test';
import { ImageGenerator } from '../../src/utils/imageGenerator';
import { EmojiGenerator } from '../../src/utils/emojiGenerator';
import { SequenceGenerator } from '../../src/utils/sequenceGenerator';
import { ScrambleGenerator } from '../../src/utils/scrambleGenerator';
import { ReverseGenerator } from '../../src/utils/reverseGenerator';

describe('ImageGenerator', () => {
  test('produces valid SVG data URI', () => {
    const result = ImageGenerator.generate('medium');
    expect(result.image).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  test('answer is lowercase alphanumeric', () => {
    for (let i = 0; i < 20; i++) {
      const result = ImageGenerator.generate('medium');
      expect(result.answer).toMatch(/^[a-z0-9]+$/);
    }
  });

  test('easy produces 4-char answer', () => {
    const result = ImageGenerator.generate('easy');
    expect(result.answer.length).toBe(4);
  });

  test('medium produces 5-char answer', () => {
    const result = ImageGenerator.generate('medium');
    expect(result.answer.length).toBe(5);
  });

  test('hard produces 6-char answer', () => {
    const result = ImageGenerator.generate('hard');
    expect(result.answer.length).toBe(6);
  });

  test('question is constant', () => {
    const result = ImageGenerator.generate('medium');
    expect(result.question).toBe('Type the characters shown in the image');
  });

  test('produces different images on each call', () => {
    const a = ImageGenerator.generate('medium');
    const b = ImageGenerator.generate('medium');
    expect(a.image).not.toBe(b.image);
  });
});

describe('EmojiGenerator', () => {
  test('easy produces 4 emojis with 2 correct', () => {
    const result = EmojiGenerator.generate('easy');
    expect(result.emojis.length).toBe(4);
    const indices = result.answer.split(',').map(Number);
    expect(indices.length).toBe(2);
  });

  test('medium produces 6 emojis with 3 correct', () => {
    const result = EmojiGenerator.generate('medium');
    expect(result.emojis.length).toBe(6);
    const indices = result.answer.split(',').map(Number);
    expect(indices.length).toBe(3);
  });

  test('hard produces 8 emojis with 4 correct', () => {
    const result = EmojiGenerator.generate('hard');
    expect(result.emojis.length).toBe(8);
    const indices = result.answer.split(',').map(Number);
    expect(indices.length).toBe(4);
  });

  test('category is a valid key', () => {
    const validCategories = ['animals', 'food', 'vehicles', 'nature', 'sports'];
    for (let i = 0; i < 20; i++) {
      const result = EmojiGenerator.generate('medium');
      expect(validCategories).toContain(result.category);
    }
  });

  test('answer indices are valid for emoji array', () => {
    for (let i = 0; i < 20; i++) {
      const result = EmojiGenerator.generate('medium');
      const indices = result.answer.split(',').map(Number);
      for (const idx of indices) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(result.emojis.length);
      }
    }
  });

  test('answer indices are sorted', () => {
    for (let i = 0; i < 20; i++) {
      const result = EmojiGenerator.generate('hard');
      const indices = result.answer.split(',').map(Number);
      const sorted = [...indices].sort((a, b) => a - b);
      expect(indices).toEqual(sorted);
    }
  });

  test('question contains category name', () => {
    const result = EmojiGenerator.generate('medium');
    expect(result.question).toContain(result.category);
  });
});

describe('SequenceGenerator', () => {
  test('easy produces arithmetic sequence', () => {
    const result = SequenceGenerator.generate('easy');
    expect(result.question).toContain('?');
    expect(typeof result.answer).toBe('number');
  });

  test('medium produces letter sequence', () => {
    const result = SequenceGenerator.generate('medium');
    expect(result.question).toContain('?');
    expect(typeof result.answer).toBe('string');
  });

  test('hard produces fibonacci sequence', () => {
    const result = SequenceGenerator.generate('hard');
    expect(result.question).toContain('?');
    expect(typeof result.answer).toBe('number');
  });

  test('easy sequence answer is positive integer', () => {
    for (let i = 0; i < 20; i++) {
      const result = SequenceGenerator.generate('easy');
      expect(typeof result.answer).toBe('number');
      expect(result.answer as number).toBeGreaterThan(0);
      expect(Number.isInteger(result.answer)).toBe(true);
    }
  });

  test('medium sequence answer is a single letter', () => {
    for (let i = 0; i < 20; i++) {
      const result = SequenceGenerator.generate('medium');
      expect(typeof result.answer).toBe('string');
      expect((result.answer as string).length).toBe(1);
      expect(result.answer).toMatch(/^[A-J]$/);
    }
  });
});

describe('ScrambleGenerator', () => {
  test('produces scrambled word', () => {
    const result = ScrambleGenerator.generate('easy');
    expect(result.question.length).toBeGreaterThan(0);
    expect(result.answer.length).toBeGreaterThan(0);
  });

  test('answer is a real word', () => {
    const easyWords = ['apple', 'cat', 'dog', 'house', 'sun', 'moon', 'car', 'tree', 'book', 'water'];
    for (let i = 0; i < 20; i++) {
      const result = ScrambleGenerator.generate('easy');
      expect(easyWords).toContain(result.answer);
    }
  });

  test('scrambled word has same length as answer', () => {
    for (let i = 0; i < 20; i++) {
      const result = ScrambleGenerator.generate('medium');
      expect(result.question.length).toBe(result.answer.length);
    }
  });

  test('scrambled word contains same characters as answer', () => {
    for (let i = 0; i < 20; i++) {
      const result = ScrambleGenerator.generate('easy');
      const sortedQuestion = result.question.split('').sort().join('');
      const sortedAnswer = result.answer.split('').sort().join('');
      expect(sortedQuestion).toBe(sortedAnswer);
    }
  });
});

describe('ReverseGenerator', () => {
  test('produces reversed word', () => {
    const result = ReverseGenerator.generate('easy');
    expect(result.question).toBe(result.answer.split('').reverse().join(''));
  });

  test('easy words are short', () => {
    for (let i = 0; i < 20; i++) {
      const result = ReverseGenerator.generate('easy');
      expect(result.answer.length).toBeLessThanOrEqual(4);
    }
  });

  test('hard words are longer', () => {
    for (let i = 0; i < 20; i++) {
      const result = ReverseGenerator.generate('hard');
      expect(result.answer.length).toBeGreaterThan(5);
    }
  });

  test('question is reverse of answer', () => {
    for (let i = 0; i < 20; i++) {
      const result = ReverseGenerator.generate('medium');
      const reversed = result.answer.split('').reverse().join('');
      expect(result.question).toBe(reversed);
    }
  });
});
