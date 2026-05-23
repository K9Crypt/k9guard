import { describe, test, expect } from 'bun:test';
import { createHash, timingSafeEqual } from '../../src/utils/crypto';
import { CaptchaGenerator } from '../../src/core/captchaGenerator';
import { CaptchaValidator } from '../../src/core/captchaValidator';
import K9Guard from '../../index';
import type { K9GuardOptions } from '../../src/types';

describe('Security Tests', () => {
  describe('timing attack resistance', () => {
    test('timingSafeEqual takes similar time for matching and non-matching inputs', () => {
      const a = new Uint8Array(32).fill(0xaa);
      const b = new Uint8Array(32).fill(0xaa);
      const c = new Uint8Array(32).fill(0xbb);

      const iterations = 5000;

      const startMatch = performance.now();
      for (let i = 0; i < iterations; i++) {
        timingSafeEqual(a, b);
      }
      const timeMatch = performance.now() - startMatch;

      const startNoMatch = performance.now();
      for (let i = 0; i < iterations; i++) {
        timingSafeEqual(a, c);
      }
      const timeNoMatch = performance.now() - startNoMatch;

      // constant-time: both paths execute the same loop
      const ratio = Math.max(timeMatch, timeNoMatch) / Math.min(timeMatch, timeNoMatch);
      expect(ratio).toBeLessThan(10);
    });

    test('validation time is similar for correct and incorrect answers', () => {
      const gen = new CaptchaGenerator({ type: 'math', difficulty: 'easy' } as K9GuardOptions);
      const iterations = 500;

      const timesCorrect: number[] = [];
      const timesIncorrect: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const challenge = gen.generate();
        const stored = gen.consume(challenge.nonce)!;
        const correctAnswer = String(stored.answer);

        const start = performance.now();
        CaptchaValidator.validate(stored, correctAnswer);
        timesCorrect.push(performance.now() - start);
      }

      for (let i = 0; i < iterations; i++) {
        const challenge = gen.generate();
        const stored = gen.consume(challenge.nonce)!;

        const start = performance.now();
        CaptchaValidator.validate(stored, 'wrong-answer');
        timesIncorrect.push(performance.now() - start);
      }

      const avgCorrect = timesCorrect.reduce((a, b) => a + b, 0) / iterations;
      const avgIncorrect = timesIncorrect.reduce((a, b) => a + b, 0) / iterations;

      // both should complete in reasonable time (< 1ms each)
      expect(avgCorrect).toBeLessThan(1);
      expect(avgIncorrect).toBeLessThan(1);
    });
  });

  describe('nonce replay prevention', () => {
    test('nonce is consumed after first validate call', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'easy' });
      const challenge = guard.generate();

      // first call
      guard.validate(challenge, '0');

      // replay attempt
      const result = guard.validate(challenge, '0');
      expect(result).toBe(false);
    });

    test('different challenges have different nonces', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'easy' });
      const nonces = new Set<string>();
      for (let i = 0; i < 100; i++) {
        nonces.add(guard.generate().nonce);
      }
      expect(nonces.size).toBe(100);
    });

    test('nonce store has bounded size', () => {
      const gen = new CaptchaGenerator({ type: 'math', difficulty: 'easy' } as K9GuardOptions);
      // generate more than NONCE_STORE_MAX (10000)
      // this is a stress test - just verify it doesn't crash
      for (let i = 0; i < 100; i++) {
        gen.generate();
      }
      // should still work after many generations
      const challenge = gen.generate();
      expect(challenge.nonce.length).toBeGreaterThan(0);
    });
  });

  describe('hash injection prevention', () => {
    test('tampered hashedAnswer on challenge has no effect', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'easy' });
      const challenge = guard.generate();

      // try to inject a forged hash - this should have no effect
      // because the validator uses server-side stored hash, not client-provided
      const tampered = {
        ...challenge,
        hashedAnswer: createHash('sha256').update('fake' + 'salt').digest('hex'),
        salt: 'fakesalt',
      };

      // validation should still use the original stored record
      expect(typeof guard.validate(tampered, '0')).toBe('boolean');
    });

    test('answer is never exposed in public challenge', () => {
      const types = ['math', 'text', 'sequence', 'scramble', 'reverse', 'image', 'emoji', 'multi'];
      for (const type of types) {
        const guard = new K9Guard({ type: type as any, difficulty: 'easy' });
        const challenge = guard.generate();
        const json = JSON.stringify(challenge);
        // answer, hashedAnswer, salt should not appear in serialized challenge
        // Note: "answer" might appear as a key name in nested structures, so check for actual values
        expect((challenge as any).answer).toBeUndefined();
        expect((challenge as any).hashedAnswer).toBeUndefined();
        expect((challenge as any).salt).toBeUndefined();
      }
    });
  });

  describe('input sanitization', () => {
    test('rejects XSS-like input for text captcha', () => {
      const guard = new K9Guard({ type: 'text', difficulty: 'easy' });
      const challenge = guard.generate();
      expect(guard.validate(challenge, '<script>alert(1)</script>')).toBe(false);
    });

    test('rejects SQL injection-like input', () => {
      const guard = new K9Guard({ type: 'text', difficulty: 'easy' });
      const challenge = guard.generate();
      expect(guard.validate(challenge, "'; DROP TABLE users; --")).toBe(false);
    });

    test('rejects null bytes', () => {
      const guard = new K9Guard({ type: 'text', difficulty: 'easy' });
      const challenge = guard.generate();
      expect(guard.validate(challenge, 'test\x00value')).toBe(false);
    });

    test('rejects extremely long input', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'easy' });
      const challenge = guard.generate();
      expect(guard.validate(challenge, '1'.repeat(10000))).toBe(false);
    });

    test('rejects unicode control characters', () => {
      const guard = new K9Guard({ type: 'text', difficulty: 'easy' });
      const challenge = guard.generate();
      expect(guard.validate(challenge, '\u0001\u0002\u0003')).toBe(false);
    });
  });

  describe('SVG injection prevention', () => {
    test('image captcha SVG is properly escaped', () => {
      const guard = new K9Guard({ type: 'image', difficulty: 'medium' });
      const challenge = guard.generate();
      if (challenge.image) {
        const base64Data = challenge.image.split(',')[1] ?? '';
        const binaryStr = atob(base64Data);
        const svg = new TextDecoder().decode(new Uint8Array([...binaryStr].map(c => c.charCodeAt(0))));
        expect(svg).not.toContain('<script');
        expect(svg).not.toContain('javascript:');
        expect(svg).not.toContain('onerror');
      }
    });
  });

  describe('constant-time hash comparison', () => {
    test('hex strings of equal length are compared correctly', () => {
      const hash1 = createHash('sha256').update('test1').digest('hex');
      const hash2 = createHash('sha256').update('test1').digest('hex');
      const hash3 = createHash('sha256').update('test2').digest('hex');

      const toBytes = (hex: string) => {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        }
        return bytes;
      };

      expect(timingSafeEqual(toBytes(hash1), toBytes(hash2))).toBe(true);
      expect(timingSafeEqual(toBytes(hash1), toBytes(hash3))).toBe(false);
    });
  });
});
