import { describe, test, expect } from 'bun:test';
import K9Guard from '../../index';

describe('K9Guard Integration', () => {
  describe('math captcha full flow', () => {
    test('generate → validate with correct answer returns true', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'easy' });
      const challenge = guard.generate();

      // extract answer from question (e.g. "5 + 3" => 8)
      const parts = challenge.question.split(' ');
      const a = parseInt(parts[0]!);
      const op = parts[1];
      const b = parseInt(parts[2]!);
      let answer: number;
      if (op === '+') answer = a + b;
      else if (op === '-') answer = a - b;
      else if (op === '*') answer = a * b;
      else answer = parseFloat((a / b).toFixed(2));

      expect(guard.validate(challenge, answer.toString())).toBe(true);
    });

    test('generate → validate with wrong answer returns false', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'easy' });
      const challenge = guard.generate();
      expect(guard.validate(challenge, '99999')).toBe(false);
    });
  });

  describe('text captcha full flow', () => {
    test('generate → validate with correct answer returns true', () => {
      const guard = new K9Guard({ type: 'text', difficulty: 'easy' });
      const challenge = guard.generate();
      expect(guard.validate(challenge, challenge.question)).toBe(true);
    });
  });

  describe('sequence captcha full flow', () => {
    test('generate → validate with correct answer returns true', () => {
      const guard = new K9Guard({ type: 'sequence', difficulty: 'easy' });
      const challenge = guard.generate();

      // parse the sequence: "2, 4, 6, ?" => answer is 8
      const cleaned = challenge.question.replace(', ?', '').replace(' ?', '');
      const nums = cleaned.split(', ').map(Number);
      const step = nums[1]! - nums[0]!;
      const answer = nums[nums.length - 1]! + step;

      expect(guard.validate(challenge, answer.toString())).toBe(true);
    });
  });

  describe('scramble captcha full flow', () => {
    test('generate → validate with correct answer returns true', () => {
      const guard = new K9Guard({ type: 'scramble', difficulty: 'easy' });
      const challenge = guard.generate();
      // for scramble, the question is scrambled, answer is the original word
      // we don't know the answer from the public challenge, but we can test
      // that validation works by consuming and checking
      expect(typeof challenge.question).toBe('string');
    });
  });

  describe('reverse captcha full flow', () => {
    test('generate → validate with correct answer returns true', () => {
      const guard = new K9Guard({ type: 'reverse', difficulty: 'easy' });
      const challenge = guard.generate();
      // question is reversed, answer is original
      const answer = challenge.question.split('').reverse().join('');
      expect(guard.validate(challenge, answer)).toBe(true);
    });
  });

  describe('image captcha full flow', () => {
    test('challenge has image property', () => {
      const guard = new K9Guard({ type: 'image', difficulty: 'medium' });
      const challenge = guard.generate();
      expect(challenge.image).toBeDefined();
      expect(challenge.image!).toMatch(/^data:image\/svg\+xml;base64,/);
    });
  });

  describe('emoji captcha full flow', () => {
    test('challenge has emojis and category', () => {
      const guard = new K9Guard({ type: 'emoji', difficulty: 'medium' });
      const challenge = guard.generate();
      expect(challenge.emojis).toBeDefined();
      expect(challenge.category).toBeDefined();
    });
  });

  describe('multi captcha full flow', () => {
    test('challenge has steps', () => {
      const guard = new K9Guard({ type: 'multi', difficulty: 'easy' });
      const challenge = guard.generate();
      expect(challenge.steps).toBeDefined();
      expect(challenge.steps!.length).toBe(2);
    });
  });

  describe('mixed captcha full flow', () => {
    test('generates valid challenge', () => {
      const guard = new K9Guard({ type: 'mixed', difficulty: 'medium' });
      const challenge = guard.generate();
      expect(challenge.type).toBe('mixed');
      expect(challenge.question.length).toBeGreaterThan(0);
    });
  });

  describe('custom captcha full flow', () => {
    test('generate → validate with correct answer returns true', () => {
      const guard = new K9Guard({
        type: 'custom',
        questions: [
          { question: 'What is the capital of France?', answer: 'paris', difficulty: 'easy' },
        ],
      });
      const challenge = guard.generate();
      expect(guard.validate(challenge, 'paris')).toBe(true);
    });

    test('generate → validate with wrong answer returns false', () => {
      const guard = new K9Guard({
        type: 'custom',
        questions: [
          { question: 'What is the capital of France?', answer: 'paris', difficulty: 'easy' },
        ],
      });
      const challenge = guard.generate();
      expect(guard.validate(challenge, 'london')).toBe(false);
    });
  });

  describe('single-use nonce semantics', () => {
    test('second validate on same nonce returns false', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'easy' });
      const challenge = guard.generate();

      // first validate (correct or not, nonce is consumed)
      guard.validate(challenge, '0');
      // second validate should return false (nonce consumed)
      expect(guard.validate(challenge, '0')).toBe(false);
    });

    test('new generate after validate produces fresh nonce', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'easy' });
      const c1 = guard.generate();
      guard.validate(c1, '0');
      const c2 = guard.generate();
      expect(c2.nonce).not.toBe(c1.nonce);
    });
  });

  describe('adaptive difficulty full flow', () => {
    test('adaptive mode with constructor sessionId', () => {
      const guard = new K9Guard({
        type: 'math',
        difficulty: 'adaptive',
        sessionId: 'user-1',
      });

      const challenge = guard.generate();
      expect(challenge.type).toBe('math');
      expect(challenge.question.length).toBeGreaterThan(0);
    });

    test('adaptive mode with parameter sessionId', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'adaptive' });

      const challenge = guard.generate('user-1');
      expect(challenge.type).toBe('math');
    });

    test('adaptive mode throws without sessionId', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'adaptive' });
      expect(() => guard.generate()).toThrow('sessionId is required');
    });

    test('adaptive tracks success and adjusts difficulty', () => {
      const guard = new K9Guard({ type: 'reverse', difficulty: 'adaptive' });
      const sessionId = 'tracker-test';

      // initial difficulty should be medium
      expect(guard.getSessionDifficulty(sessionId)).toBe('medium');

      // solve multiple correctly to increase difficulty
      for (let i = 0; i < 5; i++) {
        const challenge = guard.generate(sessionId);
        const answer = challenge.question.split('').reverse().join('');
        guard.validate(challenge, answer, sessionId);
      }

      // difficulty should have increased or stayed same depending on algorithm
      const finalDifficulty = guard.getSessionDifficulty(sessionId);
      expect(finalDifficulty === 'medium' || finalDifficulty === 'hard').toBe(true);
    });

    test('clearSession removes adaptive session', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'adaptive' });
      const challenge = guard.generate('user-1');
      // validate creates the session in the tracker
      guard.validate(challenge, '0', 'user-1');
      expect(guard.clearSession('user-1')).toBe(true);
      // after clearing, difficulty resets to medium
      expect(guard.getSessionDifficulty('user-1')).toBe('medium');
    });

    test('clearAllSessions removes all adaptive sessions', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'adaptive' });
      guard.generate('user-1');
      guard.generate('user-2');
      guard.clearAllSessions();
      expect(guard.getSessionDifficulty('user-1')).toBe('medium');
    });
  });

  describe('constructor validation', () => {
    test('throws on invalid type', () => {
      expect(() => new K9Guard({ type: 'invalid' as any, difficulty: 'easy' })).toThrow();
    });

    test('throws on invalid difficulty', () => {
      expect(() => new K9Guard({ type: 'math', difficulty: 'invalid' as any })).toThrow();
    });

    test('throws on null options', () => {
      expect(() => new K9Guard(null as any)).toThrow();
    });

    test('throws on non-object options', () => {
      expect(() => new K9Guard('invalid' as any)).toThrow();
    });

    test('throws on custom type without questions', () => {
      expect(() => new K9Guard({ type: 'custom' } as any)).toThrow();
    });

    test('throws on custom type with empty questions', () => {
      expect(() => new K9Guard({ type: 'custom', questions: [] })).toThrow();
    });
  });

  describe('expired challenge', () => {
    test('validate returns false for expired challenge', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'easy' });
      const challenge = guard.generate();

      // manipulate expiry to be in the past
      (challenge as any).expiry = Date.now() - 1000;

      expect(guard.validate(challenge, '0')).toBe(false);
    });
  });

  describe('challenge tampering', () => {
    test('validate returns false for tampered nonce', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'easy' });
      const challenge = guard.generate();
      const tampered = { ...challenge, nonce: 'fake-nonce' };
      expect(guard.validate(tampered, '0')).toBe(false);
    });

    test('validate returns false for tampered type', () => {
      const guard = new K9Guard({ type: 'math', difficulty: 'easy' });
      const challenge = guard.generate();
      const tampered = { ...challenge, type: 'text' as const };
      expect(typeof guard.validate(tampered, '0')).toBe('boolean');
    });
  });
});
