import { randomBytes } from './crypto';

export class Random {
  static getRandomNumber(difficulty: 'easy' | 'medium' | 'hard'): number {
    const buffer = randomBytes(4);
    // NOTE: convert crypto bytes to a number between 0 and 1
    const rand = buffer.readUInt32LE(0) / 0xFFFFFFFF;
    if (difficulty === 'easy') {
      return Math.floor(rand * 10) + 1;
    }
    if (difficulty === 'medium') {
      return Math.floor(rand * 50) + 1;
    }
    return Math.floor(rand * 100) + 1;
  }

  static getRandomOperator(): string {
    const operators = ['+', '-', '*', '/'];
    const buffer = randomBytes(1) as any;
    const index = buffer[0]! % operators.length;
    return operators[index]!;
  }

  static generateRandomString(difficulty: 'easy' | 'medium' | 'hard'): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const length = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8;
    const buffer = randomBytes(length) as any;
    // pick random chars from the charset using crypto random bytes
    for (let i = 0; i < length; i++) {
      result += chars.charAt(buffer[i]! % chars.length);
    }
    return result;
  }

  static generateNonce(): string {
    return randomBytes(16).toString('hex');
  }

  static generateSalt(): string {
    return randomBytes(8).toString('hex');
  }
}
