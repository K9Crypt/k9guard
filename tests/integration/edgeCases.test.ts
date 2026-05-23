import { describe, test, expect } from 'bun:test';
import { CaptchaGenerator } from '../../src/core/captchaGenerator';
import { CaptchaValidator } from '../../src/core/captchaValidator';
import K9Guard from '../../index';
import type { K9GuardOptions } from '../../src/types';

describe('Edge Cases', () => {
  describe('math captcha edge cases', () => {
    test('division by zero is prevented', () => {
      const gen = new CaptchaGenerator({ type: 'math', difficulty: 'easy' } as K9GuardOptions);
      // run many times to ensure no NaN/Infinity answers
      for (let i = 0; i < 100; i++) {
        const challenge = gen.generate();
        const stored = gen.consume(challenge.nonce)!;
        expect(stored.answer).not.toBe(NaN);
        expect(stored.answer).not.toBe(Infinity);
        expect(stored.answer).not.toBe(-Infinity);
      }
    });

    test('division results are rounded to 2 decimal places', () => {
      const gen = new CaptchaGenerator({ type: 'math', difficulty: 'easy' } as K9GuardOptions);
      for (let i = 0; i < 100; i++) {
        const challenge = gen.generate();
        const stored = gen.consume(challenge.nonce)!;
        if (typeof stored.answer === 'number' && !Number.isInteger(stored.answer)) {
          const decimalPlaces = stored.answer.toString().split('.')[1]?.length ?? 0;
          expect(decimalPlaces).toBeLessThanOrEqual(2);
        }
      }
    });

    test('negative results from subtraction are handled', () => {
      // subtraction can produce negative results
      const gen = new CaptchaGenerator({ type: 'math', difficulty: 'easy' } as K9GuardOptions);
      for (let i = 0; i < 100; i++) {
        const challenge = gen.generate();
        expect(challenge.question.length).toBeGreaterThan(0);
      }
    });
  });

  describe('text captcha edge cases', () => {
    test('generated strings contain only allowed characters', () => {
      const gen = new CaptchaGenerator({ type: 'text', difficulty: 'hard' } as K9GuardOptions);
      for (let i = 0; i < 50; i++) {
        const challenge = gen.generate();
        expect(challenge.question).toMatch(/^[A-Za-z0-9]+$/);
      }
    });
  });

  describe('sequence captcha edge cases', () => {
    test('easy sequence starts are always positive', () => {
      const gen = new CaptchaGenerator({ type: 'sequence', difficulty: 'easy' } as K9GuardOptions);
      for (let i = 0; i < 50; i++) {
        const challenge = gen.generate();
        const cleaned = challenge.question.replace(', ?', '').replace(' ?', '');
        const nums = cleaned.split(', ').map(Number);
        for (const n of nums) {
          expect(n).toBeGreaterThan(0);
          expect(Number.isNaN(n)).toBe(false);
        }
      }
    });

    test('medium sequence uses only valid letter indices', () => {
      const gen = new CaptchaGenerator({ type: 'sequence', difficulty: 'medium' } as K9GuardOptions);
      for (let i = 0; i < 50; i++) {
        const challenge = gen.generate();
        const cleaned = challenge.question.replace(', ?', '').replace(' ?', '');
        const letters = cleaned.split(', ');
        for (const l of letters) {
          expect(l).toMatch(/^[A-J]$/);
        }
      }
    });
  });

  describe('scramble captcha edge cases', () => {
    test('scrambled word is different from original (usually)', () => {
      const gen = new CaptchaGenerator({ type: 'scramble', difficulty: 'easy' } as K9GuardOptions);
      let differentCount = 0;
      for (let i = 0; i < 50; i++) {
        const challenge = gen.generate();
        const stored = gen.consume(challenge.nonce)!;
        if (challenge.question !== String(stored.answer)) {
          differentCount++;
        }
      }
      // at least some should be different (statistically almost all)
      expect(differentCount).toBeGreaterThan(20);
    });
  });

  describe('emoji captcha edge cases', () => {
    test('no duplicate emojis in the list', () => {
      const gen = new CaptchaGenerator({ type: 'emoji', difficulty: 'hard' } as K9GuardOptions);
      for (let i = 0; i < 50; i++) {
        const challenge = gen.generate();
        const emojis = challenge.emojis!;
        const unique = new Set(emojis);
        expect(unique.size).toBe(emojis.length);
      }
    });

    test('target indices point to valid emojis', () => {
      const gen = new CaptchaGenerator({ type: 'emoji', difficulty: 'medium' } as K9GuardOptions);
      for (let i = 0; i < 50; i++) {
        const challenge = gen.generate();
        const stored = gen.consume(challenge.nonce)!;
        const indices = String(stored.answer).split(',').map(Number);
        for (const idx of indices) {
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(challenge.emojis!.length);
        }
      }
    });
  });

  describe('custom question edge cases', () => {
    test('single custom question always returns that question', () => {
      const guard = new K9Guard({
        type: 'custom',
        questions: [
          { question: 'Only question?', answer: 'yes', difficulty: 'easy' },
        ],
      });
      for (let i = 0; i < 10; i++) {
        const challenge = guard.generate();
        expect(challenge.question).toBe('Only question?');
      }
    });

    test('custom question with special characters in answer', () => {
      const guard = new K9Guard({
        type: 'custom',
        questions: [
          { question: 'What is this?', answer: "it's fine", difficulty: 'easy' },
        ],
      });
      const challenge = guard.generate();
      expect(guard.validate(challenge, "it's fine")).toBe(true);
    });

    test('custom question with unicode characters', () => {
      const guard = new K9Guard({
        type: 'custom',
        questions: [
          { question: 'Türkçe karakter?', answer: 'çöğüşı', difficulty: 'easy' },
        ],
      });
      const challenge = guard.generate();
      expect(guard.validate(challenge, 'çöğüşı')).toBe(true);
    });
  });

  describe('concurrent generate calls', () => {
    test('multiple generators do not interfere', () => {
      const gen1 = new CaptchaGenerator({ type: 'math', difficulty: 'easy' } as K9GuardOptions);
      const gen2 = new CaptchaGenerator({ type: 'text', difficulty: 'hard' } as K9GuardOptions);

      const c1 = gen1.generate();
      const c2 = gen2.generate();

      expect(c1.type).toBe('math');
      expect(c2.type).toBe('text');
      expect(c1.nonce).not.toBe(c2.nonce);
    });

    test('rapid generation produces unique nonces', () => {
      const gen = new CaptchaGenerator({ type: 'math', difficulty: 'easy' } as K9GuardOptions);
      const nonces = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        nonces.add(gen.generate().nonce);
      }
      expect(nonces.size).toBe(1000);
    });
  });

  describe('validate with invalid challenge objects', () => {
    test('rejects null challenge', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'easy' });
      expect(guard.validate(null as any, '0')).toBe(false);
    });

    test('rejects undefined challenge', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'easy' });
      expect(guard.validate(undefined as any, '0')).toBe(false);
    });

    test('rejects string challenge', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'easy' });
      expect(guard.validate('invalid' as any, '0')).toBe(false);
    });

    test('rejects object with missing nonce', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'easy' });
      expect(guard.validate({ type: 'math', question: '1+1', expiry: Date.now() } as any, '0')).toBe(false);
    });

    test('rejects object with empty nonce', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'easy' });
      expect(guard.validate({ type: 'math', question: '1+1', nonce: '', expiry: Date.now() } as any, '0')).toBe(false);
    });

    test('rejects non-string userInput', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'easy' });
      const challenge = guard.generate();
      expect(guard.validate(challenge, 123 as any)).toBe(false);
      expect(guard.validate(challenge, null as any)).toBe(false);
      expect(guard.validate(challenge, undefined as any)).toBe(false);
    });
  });
});
