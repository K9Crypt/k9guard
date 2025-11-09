import { randomBytes } from 'crypto';

export class SequenceGenerator {
  static generate(difficulty: 'easy' | 'medium' | 'hard'): { question: string; answer: number | string } {
    if (difficulty === 'easy') {
      const buffer = randomBytes(4);
      // NOTE: generate random starting number and step size for arithmetic sequence
      const start = (buffer.readUInt32LE(0) % 5) + 1;
      const step = ((buffer.readUInt32LE(0) >> 8) % 3) + 1;
      const sequence = [start, start + step, start + 2 * step];
      const answer = start + 3 * step;
      return { question: `${sequence.join(', ')}, ?`, answer };
    }
    if (difficulty === 'medium') {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      const buffer = randomBytes(4);
      const start = buffer.readUInt32LE(0) % 4;
      const step = 2;
      const sequence = [letters[start], letters[start + step], letters[start + 2 * step]];
      const nextIndex = start + 3 * step;
      // check if next letter goes out of bounds
      if (nextIndex >= letters.length) {
        return { question: `${sequence.join(', ')}, ?`, answer: '?' };
      }
      const answer = letters[nextIndex]!;
      return { question: `${sequence.join(', ')}, ?`, answer };
    }
    // hard mode uses fibonacci sequence
    const sequence = [1, 1, 2, 3];
    const answer = 5;
    return { question: `${sequence.join(', ')}, ?`, answer };
  }
}