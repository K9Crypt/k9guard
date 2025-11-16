import { randomBytes } from './crypto';
import enData from '../locale/en.json';
import trData from '../locale/tr.json';

export class LogicGenerator {
  private static data: Record<'en' | 'tr', { question: string; answer: string }[]> = {
    en: enData.logics,
    tr: trData.logics
  };

  static getRandom(locale: 'en' | 'tr' = 'en', difficulty: 'easy' | 'medium' | 'hard' = 'easy'): { question: string; answer: string } {
    const logics = this.data[locale];
    // use crypto random to select a logic puzzle securely
    const buffer = randomBytes(4);
    const index = buffer.readUInt32LE(0) % logics.length;
    return logics[index]!;
  }
}