import { describe, test, expect } from 'bun:test';
import { CaptchaGenerator } from '../../src/core/captchaGenerator';
import { CaptchaValidator } from '../../src/core/captchaValidator';
import type { K9GuardOptions, StoredChallenge } from '../../src/types';

function generateStored(type: string, difficulty: string = 'medium'): StoredChallenge {
  const gen = new CaptchaGenerator({ type, difficulty } as K9GuardOptions);
  const challenge = gen.generate();
  return gen.consume(challenge.nonce)!;
}

describe('CaptchaValidator', () => {
  describe('validate()', () => {
    test('validates correct math answer', () => {
      const stored = generateStored('math');
      const answer = typeof stored.answer === 'number'
        ? stored.answer.toString()
        : String(stored.answer);
      expect(CaptchaValidator.validate(stored, answer)).toBe(true);
    });

    test('rejects incorrect math answer', () => {
      const stored = generateStored('math');
      expect(CaptchaValidator.validate(stored, '99999')).toBe(false);
    });

    test('validates correct text answer', () => {
      const stored = generateStored('text');
      const answer = String(stored.answer);
      expect(CaptchaValidator.validate(stored, answer)).toBe(true);
    });

    test('validates correct sequence answer', () => {
      const stored = generateStored('sequence');
      const answer = String(stored.answer);
      expect(CaptchaValidator.validate(stored, answer)).toBe(true);
    });

    test('validates correct scramble answer', () => {
      const stored = generateStored('scramble');
      const answer = String(stored.answer);
      expect(CaptchaValidator.validate(stored, answer)).toBe(true);
    });

    test('validates correct reverse answer', () => {
      const stored = generateStored('reverse');
      const answer = String(stored.answer);
      expect(CaptchaValidator.validate(stored, answer)).toBe(true);
    });

    test('validates correct image answer (case-insensitive)', () => {
      const stored = generateStored('image');
      const answer = String(stored.answer);
      // image answers are stored lowercase
      expect(CaptchaValidator.validate(stored, answer.toUpperCase())).toBe(true);
      expect(CaptchaValidator.validate(stored, answer.toLowerCase())).toBe(true);
    });

    test('validates correct emoji answer', () => {
      const stored = generateStored('emoji');
      const answer = String(stored.answer);
      expect(CaptchaValidator.validate(stored, answer)).toBe(true);
    });

    test('validates multi-step captcha', () => {
      const gen = new CaptchaGenerator({ type: 'multi', difficulty: 'easy' } as K9GuardOptions);
      const challenge = gen.generate();
      const stored = gen.consume(challenge.nonce)!;

      // extract answers from steps
      const answers = stored.steps!.map(step => String(step.answer));
      const userInput = JSON.stringify(answers);

      expect(CaptchaValidator.validate(stored, userInput)).toBe(true);
    });
  });

  describe('input validation', () => {
    test('rejects empty string input', () => {
      const stored = generateStored('math');
      expect(CaptchaValidator.validate(stored, '')).toBe(false);
    });

    test('rejects non-string input', () => {
      const stored = generateStored('math');
      expect(CaptchaValidator.validate(stored, null as any)).toBe(false);
      expect(CaptchaValidator.validate(stored, 123 as any)).toBe(false);
      expect(CaptchaValidator.validate(stored, undefined as any)).toBe(false);
    });

    test('rejects input exceeding max length', () => {
      const stored = generateStored('math');
      const longInput = 'a'.repeat(1001);
      expect(CaptchaValidator.validate(stored, longInput)).toBe(false);
    });
  });

  describe('numeric validation', () => {
    test('rejects scientific notation for numeric answers', () => {
      const stored = generateStored('math');
      expect(CaptchaValidator.validate(stored, '1e5')).toBe(false);
    });

    test('rejects leading zeros for numeric answers', () => {
      const stored = generateStored('math');
      // "08" should be rejected by the strict numeric regex
      // but "0" alone or "0.5" should work
      expect(CaptchaValidator.validate(stored, '08')).toBe(false);
    });

    test('handles negative numbers', () => {
      // generate a math captcha that might produce negative result (subtraction)
      const stored = generateStored('math');
      // just verify it doesn't crash on negative-looking input
      expect(typeof CaptchaValidator.validate(stored, '-5')).toBe('boolean');
    });

    test('handles decimal numbers for division results', () => {
      const stored = generateStored('math');
      expect(typeof CaptchaValidator.validate(stored, '3.14')).toBe('boolean');
    });
  });

  describe('text validation', () => {
    test('rejects text with special characters', () => {
      const stored = generateStored('text');
      expect(CaptchaValidator.validate(stored, 'test<script>')).toBe(false);
    });

    test('trims whitespace from text input', () => {
      const stored = generateStored('text');
      const answer = String(stored.answer);
      expect(CaptchaValidator.validate(stored, `  ${answer}  `)).toBe(true);
    });
  });

  describe('image validation', () => {
    test('rejects non-alphanumeric input for image captcha', () => {
      const stored = generateStored('image');
      expect(CaptchaValidator.validate(stored, 'ab!@#')).toBe(false);
    });

    test('rejects empty string for image captcha', () => {
      const stored = generateStored('image');
      expect(CaptchaValidator.validate(stored, '')).toBe(false);
    });
  });

  describe('emoji validation', () => {
    test('rejects non-numeric input for emoji captcha', () => {
      const stored = generateStored('emoji');
      expect(CaptchaValidator.validate(stored, 'abc')).toBe(false);
    });

    test('rejects negative indices', () => {
      const stored = generateStored('emoji');
      expect(CaptchaValidator.validate(stored, '-1,0')).toBe(false);
    });

    test('accepts properly formatted indices', () => {
      const stored = generateStored('emoji');
      const answer = String(stored.answer);
      expect(CaptchaValidator.validate(stored, answer)).toBe(true);
    });
  });

  describe('multi-step validation', () => {
    test('rejects non-JSON input for multi captcha', () => {
      const gen = new CaptchaGenerator({ type: 'multi', difficulty: 'easy' } as K9GuardOptions);
      const challenge = gen.generate();
      const stored = gen.consume(challenge.nonce)!;
      expect(CaptchaValidator.validate(stored, 'not-json')).toBe(false);
    });

    test('rejects wrong number of answers', () => {
      const gen = new CaptchaGenerator({ type: 'multi', difficulty: 'easy' } as K9GuardOptions);
      const challenge = gen.generate();
      const stored = gen.consume(challenge.nonce)!;
      expect(CaptchaValidator.validate(stored, '["only-one"]')).toBe(false);
    });

    test('rejects non-array JSON for multi captcha', () => {
      const gen = new CaptchaGenerator({ type: 'multi', difficulty: 'easy' } as K9GuardOptions);
      const challenge = gen.generate();
      const stored = gen.consume(challenge.nonce)!;
      expect(CaptchaValidator.validate(stored, '{"key":"value"}')).toBe(false);
    });
  });
});
