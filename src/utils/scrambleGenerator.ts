import { randomBytes } from 'crypto';

export class ScrambleGenerator {
  private static words: string[] = [
    'apple', 'cat', 'dog', 'house', 'sun', 'moon', 'car', 'tree', 'book', 'water',
    'bread', 'milk', 'fish', 'bird', 'flower', 'star', 'hand', 'eye', 'nose', 'mouth'
  ];

  static generate(difficulty: 'easy' | 'medium' | 'hard'): { question: string; answer: string } {
    let word: string;
    const buffer = randomBytes(4);
    // convert crypto bytes to a float between 0 and 1
    const rand = buffer.readUInt32LE(0) / 0xFFFFFFFF;
    
    if (difficulty === 'easy') {
      word = this.words[Math.floor(rand * 10)]!;
    } else if (difficulty === 'medium') {
      word = this.words[Math.floor(rand * this.words.length)]!;
    } else {
      word = 'typescript';
    }
    
    const scrambled = this.scramble(word);
    return { question: scrambled, answer: word };
  }

  private static scramble(word: string): string {
    const arr = word.split('');
    // NOTE: fisher yates shuffle using crypto random for each swap
    for (let i = arr.length - 1; i > 0; i--) {
      const buffer = randomBytes(4);
      const j = buffer.readUInt32LE(0) % (i + 1);
      [arr[i]!, arr[j]!] = [arr[j]!, arr[i]!];
    }
    return arr.join('');
  }
}