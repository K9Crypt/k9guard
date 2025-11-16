import { randomBytes } from './crypto';
import enData from '../locale/en.json';
import trData from '../locale/tr.json';

export class RiddleBank {
  private static data: Record<'en' | 'tr', { question: string; answer: string }[]> = {
    en: enData.riddles,
    tr: trData.riddles
  };

  static getRandom(locale: 'en' | 'tr' = 'en', difficulty: 'easy' | 'medium' | 'hard' = 'easy'): { question: string; answer: string } {
    const riddles = this.data[locale];
    // use crypto random to select a riddle securely
    const buffer = randomBytes(4);
    const index = buffer.readUInt32LE(0) % riddles.length;
    return riddles[index]!;
  }
}