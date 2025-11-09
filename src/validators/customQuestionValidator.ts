import type { CustomQuestion } from '../types';

export class CustomQuestionValidator {
  private static readonly MAX_QUESTIONS = 100;
  private static readonly MAX_QUESTION_LENGTH = 500;
  private static readonly MAX_ANSWER_LENGTH = 200;
  private static readonly MIN_QUESTION_LENGTH = 5;
  private static readonly MIN_ANSWER_LENGTH = 1;
  private static readonly VALID_DIFFICULTY = ['easy', 'medium', 'hard'];

  // validates the entire questions array structure and content
  static validate(questions: unknown): { valid: boolean; error?: string } {
    if (!Array.isArray(questions)) {
      return { valid: false, error: 'Questions must be an array' };
    }

    if (questions.length === 0) {
      return { valid: false, error: 'At least one question is required' };
    }

    if (questions.length > this.MAX_QUESTIONS) {
      return { valid: false, error: `Maximum ${this.MAX_QUESTIONS} questions allowed` };
    }

    // NOTE: validate each question individually and return detailed error if any fail
    for (let i = 0; i < questions.length; i++) {
      const questionItem = questions[i];
      const singleValidation = this.validateSingle(questionItem);
      
      if (!singleValidation.valid) {
        return { valid: false, error: `Question ${i + 1}: ${singleValidation.error}` };
      }
    }

    return { valid: true };
  }

  private static validateSingle(question: unknown): { valid: boolean; error?: string } {
    if (typeof question !== 'object' || question === null) {
      return { valid: false, error: 'Each question must be an object' };
    }

    const q = question as Record<string, unknown>;

    if (typeof q.question !== 'string') {
      return { valid: false, error: 'Question text must be a string' };
    }

    if (typeof q.answer !== 'string') {
      return { valid: false, error: 'Answer must be a string' };
    }

    if (typeof q.difficulty !== 'string') {
      return { valid: false, error: 'Difficulty must be specified' };
    }

    if (!this.VALID_DIFFICULTY.includes(q.difficulty)) {
      return { valid: false, error: `Difficulty must be one of: ${this.VALID_DIFFICULTY.join(', ')}` };
    }

    if (q.question.length < this.MIN_QUESTION_LENGTH) {
      return { valid: false, error: `Question must be at least ${this.MIN_QUESTION_LENGTH} characters` };
    }

    if (q.question.length > this.MAX_QUESTION_LENGTH) {
      return { valid: false, error: `Question must not exceed ${this.MAX_QUESTION_LENGTH} characters` };
    }

    if (q.answer.length < this.MIN_ANSWER_LENGTH) {
      return { valid: false, error: 'Answer cannot be empty' };
    }

    if (q.answer.length > this.MAX_ANSWER_LENGTH) {
      return { valid: false, error: `Answer must not exceed ${this.MAX_ANSWER_LENGTH} characters` };
    }

    return { valid: true };
  }

  // clean up whitespace from questions and answers
  static sanitize(questions: CustomQuestion[]): CustomQuestion[] {
    return questions.map(q => ({
      question: q.question.trim(),
      answer: q.answer.trim(),
      difficulty: q.difficulty
    }));
  }
}