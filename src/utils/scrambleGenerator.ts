import { randomBytes } from './crypto';

export class ScrambleGenerator {
  private static readonly easyWords: string[] = [
    'apple', 'cat', 'dog', 'house', 'sun', 'moon', 'car', 'tree', 'book', 'water'
  ];

  private static readonly mediumWords: string[] = [
    'apple', 'cat', 'dog', 'house', 'sun', 'moon', 'car', 'tree', 'book', 'water',
    'bread', 'milk', 'fish', 'bird', 'flower', 'star', 'hand', 'eye', 'nose', 'mouth'
  ];

  // hard pool: longer words with uncommon letter patterns to resist guessing
  private static readonly hardWords: string[] = [
    'typescript', 'javascript', 'algorithm', 'encryption', 'blockchain',
    'metamorphosis', 'cryptography', 'synchronize', 'parallelism', 'obfuscation',
    'infrastructure', 'authentication', 'authorization', 'vulnerability', 'orchestration'
  ];

  static generate(difficulty: 'easy' | 'medium' | 'hard'): { question: string; answer: string } {
    let pool: string[];
    if (difficulty === 'easy') {
      pool = this.easyWords;
    } else if (difficulty === 'medium') {
      pool = this.mediumWords;
    } else {
      pool = this.hardWords;
    }

    const buffer = randomBytes(4);
    const rand = buffer.readUInt32LE(0) / 0xFFFFFFFF;
    const word = pool[Math.floor(rand * pool.length)]!;
    
    const scrambled = this.scramble(word);
    return { question: scrambled, answer: word };
  }

  private static scramble(word: string): string {
    const arr = word.split('');
    const n   = arr.length;
    // batch all uint32 values for Fisher-Yates in one crypto call (n-1 swaps × 4 bytes)
    const batchBuf = randomBytes(n * 4);
    for (let i = n - 1; i > 0; i--) {
      const j = batchBuf.readUInt32LE((n - 1 - i) * 4) % (i + 1);
      [arr[i]!, arr[j]!] = [arr[j]!, arr[i]!];
    }
    return arr.join('');
  }
}