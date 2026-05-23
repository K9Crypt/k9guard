import { randomBytes } from './crypto';
import type { Difficulty } from '../types';

export interface EmojiGeneratorResult {
  emojis: string[];
  category: string;
  answer: string;
  question: string;
}

// each category has >= 20 entries to ensure unique sampling without replacement
const CATEGORIES: Record<string, string[]> = {
  animals:  ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🦒','🦓','🐘','🐧','🦅'],
  food:     ['🍎','🍊','🍋','🍇','🍓','🍔','🍕','🍜','🍣','🍩','🎂','🥦','🥕','🥑','🧀','🍦','🍫','🥐','🌮','🍱'],
  vehicles: ['🚗','🚕','🚙','🚌','🚑','🚒','🚓','🚜','🏎','🚂','🚁','🛩','🚀','🛸','🚢','⛵','🚲','🛵','🏍','🚛'],
  nature:   ['🌸','🌺','🌻','🌹','🌷','🍀','🌿','🌱','🌲','🌳','🍁','🍂','🌊','🌙','⭐','🌈','🌞','🌋','🏔','🌾'],
  sports:   ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥊','🎿','🛷','⛷','🤸','🚴','🏊','🤺','🥋','🎯'],
};

const CATEGORY_KEYS = Object.keys(CATEGORIES);

// crypto-safe index in [0, max)
function secureIndex(max: number): number {
  const buf = randomBytes(4);
  return buf.readUInt32LE(0) % max;
}

// pick `count` unique items from pool without replacement
function pickUnique(pool: string[], count: number): string[] {
  const available = pool.slice();
  const result: string[] = [];
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = secureIndex(available.length);
    result.push(available.splice(idx, 1)[0]!);
  }
  return result;
}

// Fisher-Yates in-place shuffle with crypto random
function shuffleInPlace(arr: string[]): void {
  const batchBuf = randomBytes(arr.length * 4);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = batchBuf.readUInt32LE((arr.length - 1 - i) * 4) % (i + 1);
    [arr[i]!, arr[j]!] = [arr[j]!, arr[i]!];
  }
}

export class EmojiGenerator {
  static generate(difficulty: Difficulty): EmojiGeneratorResult {
    const targetCount     = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
    const distractorCount = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
    const totalCount      = targetCount + distractorCount;

    const categoryKey = CATEGORY_KEYS[secureIndex(CATEGORY_KEYS.length)]!;
    const targetPool  = CATEGORIES[categoryKey]!;

    // collect distractor emojis from all categories except the target
    const distractorPool: string[] = [];
    for (const key of CATEGORY_KEYS) {
      if (key !== categoryKey) {
        distractorPool.push(...CATEGORIES[key]!);
      }
    }

    const targets     = pickUnique(targetPool, targetCount);
    const distractors = pickUnique(distractorPool, distractorCount);

    // combine then shuffle; track indices after shuffle
    const combined = [...targets, ...distractors];
    shuffleInPlace(combined);

    // mark which positions ended up containing target emojis
    const targetSet = new Set(targets);
    const targetIndices = combined
      .map((e, i) => (targetSet.has(e) ? i : -1))
      .filter(i => i !== -1)
      .sort((a, b) => a - b);

    // canonical answer: sorted comma-separated zero-based indices e.g. "0,2,4"
    const answer = targetIndices.join(',');

    return {
      emojis: combined,
      category: categoryKey,
      answer,
      question: `Select all ${categoryKey} from the list (${totalCount} emojis, ${targetCount} correct)`
    };
  }
}
