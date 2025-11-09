import { randomBytes } from 'crypto';
import type { CustomQuestion } from '../types';

export class CustomQuestionGenerator {
  private questions: CustomQuestion[];

  constructor(questions: CustomQuestion[]) {
    this.questions = questions;
  }

  generate(difficulty?: 'easy' | 'medium' | 'hard'): { question: string; answer: string } {
    // filter questions by difficulty if specified
    const candidates = difficulty
      ? this.questions.filter(q => q.difficulty === difficulty)
      : this.questions;

    // NOTE: fallback to all questions if no match found for difficulty
    if (candidates.length === 0) {
      return this.selectRandom(this.questions);
    }

    return this.selectRandom(candidates);
  }

  private selectRandom(questions: CustomQuestion[]): { question: string; answer: string } {
    if (questions.length === 0) {
      return { question: '', answer: '' };
    }

    // use crypto random to pick a question securely
    const buffer = randomBytes(4);
    const index = buffer.readUInt32LE(0) % questions.length;
    const selected = questions[index]!;

    return {
      question: selected.question,
      answer: selected.answer
    };
  }
}