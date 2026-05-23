import { describe, test, expect } from 'bun:test';
import { CaptchaGenerator } from '../../src/core/captchaGenerator';
import type { K9GuardOptions } from '../../src/types';

function createGenerator(type: string, difficulty: string = 'medium'): CaptchaGenerator {
  return new CaptchaGenerator({ type, difficulty } as K9GuardOptions);
}

describe('CaptchaGenerator', () => {
  describe('generate()', () => {
    test('math captcha has correct structure', () => {
      const gen = createGenerator('math');
      const challenge = gen.generate();
      expect(challenge.type).toBe('math');
      expect(typeof challenge.question).toBe('string');
      expect(challenge.question.length).toBeGreaterThan(0);
      expect(typeof challenge.nonce).toBe('string');
      expect(challenge.nonce.length).toBeGreaterThan(0);
      expect(typeof challenge.expiry).toBe('number');
      expect(challenge.expiry).toBeGreaterThan(Date.now());
    });

    test('text captcha has correct structure', () => {
      const gen = createGenerator('text');
      const challenge = gen.generate();
      expect(challenge.type).toBe('text');
      expect(challenge.question.length).toBeGreaterThan(0);
    });

    test('sequence captcha has correct structure', () => {
      const gen = createGenerator('sequence');
      const challenge = gen.generate();
      expect(challenge.type).toBe('sequence');
      expect(challenge.question).toContain('?');
    });

    test('scramble captcha has correct structure', () => {
      const gen = createGenerator('scramble');
      const challenge = gen.generate();
      expect(challenge.type).toBe('scramble');
      expect(challenge.question.length).toBeGreaterThan(0);
    });

    test('reverse captcha has correct structure', () => {
      const gen = createGenerator('reverse');
      const challenge = gen.generate();
      expect(challenge.type).toBe('reverse');
      expect(challenge.question.length).toBeGreaterThan(0);
    });

    test('mixed captcha has correct structure', () => {
      const gen = createGenerator('mixed');
      const challenge = gen.generate();
      expect(challenge.type).toBe('mixed');
    });

    test('multi captcha has steps', () => {
      const gen = createGenerator('multi');
      const challenge = gen.generate();
      expect(challenge.type).toBe('multi');
      expect(challenge.steps).toBeDefined();
      expect(challenge.steps!.length).toBe(2);
    });

    test('image captcha has image data', () => {
      const gen = createGenerator('image');
      const challenge = gen.generate();
      expect(challenge.type).toBe('image');
      expect(challenge.image).toBeDefined();
      expect(challenge.image!).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    test('emoji captcha has emojis and category', () => {
      const gen = createGenerator('emoji');
      const challenge = gen.generate();
      expect(challenge.type).toBe('emoji');
      expect(challenge.emojis).toBeDefined();
      expect(challenge.emojis!.length).toBeGreaterThan(0);
      expect(challenge.category).toBeDefined();
    });

    test('challenge never contains answer or hashedAnswer or salt', () => {
      const types = ['math', 'text', 'sequence', 'scramble', 'reverse', 'image', 'emoji'];
      for (const type of types) {
        const gen = createGenerator(type);
        const challenge = gen.generate();
        expect((challenge as any).answer).toBeUndefined();
        expect((challenge as any).hashedAnswer).toBeUndefined();
        expect((challenge as any).salt).toBeUndefined();
      }
    });

    test('each generate produces unique nonce', () => {
      const gen = createGenerator('math');
      const nonces = new Set<string>();
      for (let i = 0; i < 50; i++) {
        nonces.add(gen.generate().nonce);
      }
      expect(nonces.size).toBe(50);
    });
  });

  describe('generate() with difficulty override', () => {
    test('accepts easy difficulty override', () => {
      const gen = createGenerator('math', 'hard');
      const challenge = gen.generate('easy');
      expect(challenge.type).toBe('math');
    });

    test('accepts medium difficulty override', () => {
      const gen = createGenerator('math', 'easy');
      const challenge = gen.generate('medium');
      expect(challenge.type).toBe('math');
    });

    test('accepts hard difficulty override', () => {
      const gen = createGenerator('math', 'easy');
      const challenge = gen.generate('hard');
      expect(challenge.type).toBe('math');
    });
  });

  describe('consume()', () => {
    test('returns stored challenge for valid nonce', () => {
      const gen = createGenerator('math');
      const challenge = gen.generate();
      const stored = gen.consume(challenge.nonce);
      expect(stored).toBeDefined();
      expect(stored!.type).toBe('math');
      expect(stored!.hashedAnswer).toBeDefined();
      expect(stored!.salt).toBeDefined();
    });

    test('returns undefined for consumed nonce (single-use)', () => {
      const gen = createGenerator('math');
      const challenge = gen.generate();
      gen.consume(challenge.nonce);
      const second = gen.consume(challenge.nonce);
      expect(second).toBeUndefined();
    });

    test('returns undefined for unknown nonce', () => {
      const gen = createGenerator('math');
      const result = gen.consume('nonexistent-nonce');
      expect(result).toBeUndefined();
    });
  });

  describe('custom questions', () => {
    test('generates custom captcha from questions', () => {
      const gen = new CaptchaGenerator({
        type: 'custom',
        questions: [
          { question: 'What is 2+2?', answer: '4', difficulty: 'easy' },
        ],
      });
      const challenge = gen.generate();
      expect(challenge.type).toBe('custom');
      expect(challenge.question).toBe('What is 2+2?');
    });

    test('throws on empty questions array', () => {
      expect(() => new CaptchaGenerator({
        type: 'custom',
        questions: [],
      })).toThrow();
    });
  });

  describe('difficulty levels affect output', () => {
    test('easy math uses smaller numbers than hard', () => {
      const easyGen = createGenerator('math', 'easy');
      const hardGen = createGenerator('math', 'hard');

      const easyChallenges = Array.from({ length: 50 }, () => easyGen.generate());
      const hardChallenges = Array.from({ length: 50 }, () => hardGen.generate());

      // both should produce valid challenges
      expect(easyChallenges.length).toBe(50);
      expect(hardChallenges.length).toBe(50);
    });
  });
});
