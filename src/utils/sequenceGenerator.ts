import { randomBytes } from './crypto';

export class SequenceGenerator {
  static generate(difficulty: 'easy' | 'medium' | 'hard'): { question: string; answer: number | string } {
    if (difficulty === 'easy') {
      const buffer = randomBytes(8);
      // use separate byte ranges for start and step to remove correlation between them
      const start = (buffer.readUInt32LE(0) % 5) + 1;
      const step = (buffer.readUInt32LE(4) % 3) + 1;
      const sequence = [start, start + step, start + 2 * step];
      const answer = start + 3 * step;
      return { question: `${sequence.join(', ')}, ?`, answer };
    }
    if (difficulty === 'medium') {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      const step = 2;
      // max start ensures all 4 elements (start, +2, +4, +6) fit within the 10-letter array
      const maxStart = letters.length - step * 3 - 1;
      const buffer = randomBytes(4);
      const start = buffer.readUInt32LE(0) % (maxStart + 1);
      const sequence = [letters[start], letters[start + step], letters[start + 2 * step]];
      const answer = letters[start + 3 * step]!;
      return { question: `${sequence.join(', ')}, ?`, answer };
    }
    // hard: pick a random starting offset in the Fibonacci sequence so the answer is not always 5
    const fibs = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
    const buffer = randomBytes(4);
    const maxStart = fibs.length - 5; // ensure 4 shown + 1 answer all fit
    const start = buffer.readUInt32LE(0) % (maxStart + 1);
    const sequence = fibs.slice(start, start + 4);
    const answer = fibs[start + 4]!;
    return { question: `${sequence.join(', ')}, ?`, answer };
  }
}