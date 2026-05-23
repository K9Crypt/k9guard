import { describe, test, expect } from 'bun:test';
import { CustomQuestionValidator } from '../../src/validators/customQuestionValidator';

describe('CustomQuestionValidator', () => {
  describe('validate()', () => {
    test('accepts valid questions array', () => {
      const result = CustomQuestionValidator.validate([
        { question: 'What is 2+2?', answer: '4', difficulty: 'easy' },
      ]);
      expect(result.valid).toBe(true);
    });

    test('accepts multiple valid questions', () => {
      const result = CustomQuestionValidator.validate([
        { question: 'What is 2+2?', answer: '4', difficulty: 'easy' },
        { question: 'Capital of France?', answer: 'paris', difficulty: 'medium' },
        { question: 'What color is the sky?', answer: 'blue', difficulty: 'hard' },
      ]);
      expect(result.valid).toBe(true);
    });

    test('rejects non-array input', () => {
      expect(CustomQuestionValidator.validate('not-an-array').valid).toBe(false);
      expect(CustomQuestionValidator.validate(123).valid).toBe(false);
      expect(CustomQuestionValidator.validate(null).valid).toBe(false);
      expect(CustomQuestionValidator.validate(undefined).valid).toBe(false);
    });

    test('rejects empty array', () => {
      expect(CustomQuestionValidator.validate([]).valid).toBe(false);
    });

    test('rejects array exceeding max questions', () => {
      const questions = Array.from({ length: 101 }, (_, i) => ({
        question: `Question ${i + 1}?`,
        answer: 'answer',
        difficulty: 'easy',
      }));
      expect(CustomQuestionValidator.validate(questions).valid).toBe(false);
    });

    test('rejects question with missing fields', () => {
      expect(CustomQuestionValidator.validate([{ question: 'Q?', answer: 'A' }]).valid).toBe(false);
      expect(CustomQuestionValidator.validate([{ question: 'Q?', difficulty: 'easy' }]).valid).toBe(false);
      expect(CustomQuestionValidator.validate([{ answer: 'A', difficulty: 'easy' }]).valid).toBe(false);
    });

    test('rejects invalid difficulty', () => {
      expect(CustomQuestionValidator.validate([
        { question: 'What is 2+2?', answer: '4', difficulty: 'extreme' },
      ]).valid).toBe(false);
    });

    test('rejects question too short', () => {
      expect(CustomQuestionValidator.validate([
        { question: 'Hi', answer: '4', difficulty: 'easy' },
      ]).valid).toBe(false);
    });

    test('rejects question too long', () => {
      expect(CustomQuestionValidator.validate([
        { question: 'A'.repeat(501), answer: '4', difficulty: 'easy' },
      ]).valid).toBe(false);
    });

    test('rejects empty answer', () => {
      expect(CustomQuestionValidator.validate([
        { question: 'What is 2+2?', answer: '', difficulty: 'easy' },
      ]).valid).toBe(false);
    });

    test('rejects answer too long', () => {
      expect(CustomQuestionValidator.validate([
        { question: 'What is 2+2?', answer: 'A'.repeat(201), difficulty: 'easy' },
      ]).valid).toBe(false);
    });

    test('rejects non-string question', () => {
      expect(CustomQuestionValidator.validate([
        { question: 123, answer: '4', difficulty: 'easy' },
      ]).valid).toBe(false);
    });

    test('rejects non-string answer', () => {
      expect(CustomQuestionValidator.validate([
        { question: 'What is 2+2?', answer: 4, difficulty: 'easy' },
      ]).valid).toBe(false);
    });

    test('error message includes question index', () => {
      const result = CustomQuestionValidator.validate([
        { question: 'Valid question?', answer: 'ok', difficulty: 'easy' },
        { question: 'Hi', answer: '4', difficulty: 'easy' },
      ]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Question 2');
    });
  });

  describe('sanitize()', () => {
    test('trims whitespace from question and answer', () => {
      const result = CustomQuestionValidator.sanitize([
        { question: '  What is 2+2?  ', answer: '  4  ', difficulty: 'easy' },
      ]);
      expect(result[0]!.question).toBe('What is 2+2?');
      expect(result[0]!.answer).toBe('4');
    });

    test('preserves difficulty', () => {
      const result = CustomQuestionValidator.sanitize([
        { question: 'Q?', answer: 'A', difficulty: 'hard' },
      ]);
      expect(result[0]!.difficulty).toBe('hard');
    });

    test('handles multiple questions', () => {
      const result = CustomQuestionValidator.sanitize([
        { question: '  Q1?  ', answer: '  A1  ', difficulty: 'easy' },
        { question: '  Q2?  ', answer: '  A2  ', difficulty: 'medium' },
      ]);
      expect(result.length).toBe(2);
      expect(result[0]!.question).toBe('Q1?');
      expect(result[1]!.question).toBe('Q2?');
    });
  });
});
