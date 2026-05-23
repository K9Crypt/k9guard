import { describe, test, expect } from 'bun:test';
import { CaptchaGenerator } from '../../src/core/captchaGenerator';
import { CaptchaValidator } from '../../src/core/captchaValidator';
import { createHash } from '../../src/utils/crypto';
import K9Guard from '../../index';
import type { K9GuardOptions } from '../../src/types';

function measureMs(fn: () => void, iterations: number): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  return performance.now() - start;
}

describe('Performance Benchmarks', () => {
  const ITERATIONS = 1000;

  test('math captcha generation performance', () => {
    const gen = new CaptchaGenerator({ type: 'math', difficulty: 'medium' } as K9GuardOptions);
    const ms = measureMs(() => gen.generate(), ITERATIONS);
    const perOp = ms / ITERATIONS;
    // should generate a captcha in under 5ms on average
    expect(perOp).toBeLessThan(5);
  });

  test('text captcha generation performance', () => {
    const gen = new CaptchaGenerator({ type: 'text', difficulty: 'medium' } as K9GuardOptions);
    const ms = measureMs(() => gen.generate(), ITERATIONS);
    const perOp = ms / ITERATIONS;
    expect(perOp).toBeLessThan(5);
  });

  test('sequence captcha generation performance', () => {
    const gen = new CaptchaGenerator({ type: 'sequence', difficulty: 'medium' } as K9GuardOptions);
    const ms = measureMs(() => gen.generate(), ITERATIONS);
    const perOp = ms / ITERATIONS;
    expect(perOp).toBeLessThan(5);
  });

  test('scramble captcha generation performance', () => {
    const gen = new CaptchaGenerator({ type: 'scramble', difficulty: 'medium' } as K9GuardOptions);
    const ms = measureMs(() => gen.generate(), ITERATIONS);
    const perOp = ms / ITERATIONS;
    expect(perOp).toBeLessThan(5);
  });

  test('reverse captcha generation performance', () => {
    const gen = new CaptchaGenerator({ type: 'reverse', difficulty: 'medium' } as K9GuardOptions);
    const ms = measureMs(() => gen.generate(), ITERATIONS);
    const perOp = ms / ITERATIONS;
    expect(perOp).toBeLessThan(5);
  });

  test('image captcha generation performance', () => {
    const gen = new CaptchaGenerator({ type: 'image', difficulty: 'medium' } as K9GuardOptions);
    const ms = measureMs(() => gen.generate(), ITERATIONS);
    const perOp = ms / ITERATIONS;
    // image generation is heavier due to SVG rendering
    expect(perOp).toBeLessThan(20);
  });

  test('emoji captcha generation performance', () => {
    const gen = new CaptchaGenerator({ type: 'emoji', difficulty: 'medium' } as K9GuardOptions);
    const ms = measureMs(() => gen.generate(), ITERATIONS);
    const perOp = ms / ITERATIONS;
    expect(perOp).toBeLessThan(5);
  });

  test('mixed captcha generation performance', () => {
    const gen = new CaptchaGenerator({ type: 'mixed', difficulty: 'medium' } as K9GuardOptions);
    const ms = measureMs(() => gen.generate(), ITERATIONS);
    const perOp = ms / ITERATIONS;
    expect(perOp).toBeLessThan(10);
  });

  test('multi captcha generation performance', () => {
    const gen = new CaptchaGenerator({ type: 'multi', difficulty: 'medium' } as K9GuardOptions);
    const ms = measureMs(() => gen.generate(), ITERATIONS);
    const perOp = ms / ITERATIONS;
    expect(perOp).toBeLessThan(10);
  });

  test('validation performance', () => {
    const gen = new CaptchaGenerator({ type: 'math', difficulty: 'medium' } as K9GuardOptions);
    const challenges: Array<{ stored: any; answer: string }> = [];

    for (let i = 0; i < ITERATIONS; i++) {
      const c = gen.generate();
      const stored = gen.consume(c.nonce)!;
      challenges.push({ stored, answer: String(stored.answer) });
    }

    const ms = measureMs(() => {
      const item = challenges.pop()!;
      CaptchaValidator.validate(item.stored, item.answer);
    }, ITERATIONS);

    const perOp = ms / ITERATIONS;
    expect(perOp).toBeLessThan(5);
  });

  test('SHA-256 hash performance', () => {
    const ms = measureMs(() => {
      createHash('sha256').update('test-input-for-hashing').digest('hex');
    }, ITERATIONS);
    const perOp = ms / ITERATIONS;
    expect(perOp).toBeLessThan(1);
  });

  test('full generate-validate cycle performance', () => {
    const guard = new K9Guard({ type: 'math', difficulty: 'easy' });
    const ms = measureMs(() => {
      const challenge = guard.generate();
      // solve it
      const parts = challenge.question.split(' ');
      const a = parseInt(parts[0]!);
      const op = parts[1];
      const b = parseInt(parts[2]!);
      let answer: number;
      if (op === '+') answer = a + b;
      else if (op === '-') answer = a - b;
      else if (op === '*') answer = a * b;
      else answer = parseFloat((a / b).toFixed(2));
      guard.validate(challenge, answer.toString());
    }, ITERATIONS);
    const perOp = ms / ITERATIONS;
    expect(perOp).toBeLessThan(10);
  });
});
