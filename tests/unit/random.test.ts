import { describe, test, expect } from 'bun:test';
import { Random } from '../../src/utils/random';

describe('Random', () => {
  describe('getRandomNumber', () => {
    test('easy returns number between 1 and 10', () => {
      for (let i = 0; i < 100; i++) {
        const num = Random.getRandomNumber('easy');
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(10);
      }
    });

    test('medium returns number between 1 and 50', () => {
      for (let i = 0; i < 100; i++) {
        const num = Random.getRandomNumber('medium');
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(50);
      }
    });

    test('hard returns number between 1 and 100', () => {
      for (let i = 0; i < 100; i++) {
        const num = Random.getRandomNumber('hard');
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(100);
      }
    });

    test('returns integer values', () => {
      for (let i = 0; i < 50; i++) {
        const num = Random.getRandomNumber('medium');
        expect(Number.isInteger(num)).toBe(true);
      }
    });
  });

  describe('getRandomOperator', () => {
    test('returns one of +, -, *, /', () => {
      const operators = new Set<string>();
      for (let i = 0; i < 100; i++) {
        operators.add(Random.getRandomOperator());
      }
      expect(operators.has('+')).toBe(true);
      expect(operators.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('generateRandomString', () => {
    test('easy produces 4-character string', () => {
      const str = Random.generateRandomString('easy');
      expect(str.length).toBe(4);
    });

    test('medium produces 6-character string', () => {
      const str = Random.generateRandomString('medium');
      expect(str.length).toBe(6);
    });

    test('hard produces 8-character string', () => {
      const str = Random.generateRandomString('hard');
      expect(str.length).toBe(8);
    });

    test('contains only alphanumeric characters', () => {
      for (let i = 0; i < 50; i++) {
        const str = Random.generateRandomString('medium');
        expect(str).toMatch(/^[A-Za-z0-9]+$/);
      }
    });

    test('produces different strings on each call', () => {
      const strings = new Set<string>();
      for (let i = 0; i < 50; i++) {
        strings.add(Random.generateRandomString('medium'));
      }
      expect(strings.size).toBeGreaterThan(1);
    });
  });

  describe('generateNonce', () => {
    test('returns 32-character hex string', () => {
      const nonce = Random.generateNonce();
      expect(nonce.length).toBe(32);
      expect(nonce).toMatch(/^[0-9a-f]+$/);
    });

    test('produces unique nonces', () => {
      const nonces = new Set<string>();
      for (let i = 0; i < 100; i++) {
        nonces.add(Random.generateNonce());
      }
      expect(nonces.size).toBe(100);
    });
  });

  describe('generateSalt', () => {
    test('returns 16-character hex string', () => {
      const salt = Random.generateSalt();
      expect(salt.length).toBe(16);
      expect(salt).toMatch(/^[0-9a-f]+$/);
    });

    test('produces unique salts', () => {
      const salts = new Set<string>();
      for (let i = 0; i < 100; i++) {
        salts.add(Random.generateSalt());
      }
      expect(salts.size).toBe(100);
    });
  });
});
