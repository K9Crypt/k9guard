import { describe, test, expect } from 'bun:test';
import { CryptoUtils, CryptoBuffer, CryptoHash, timingSafeEqual, RandomPool, createHash, randomBytes } from '../../src/utils/crypto';

describe('CryptoBuffer', () => {
  test('readUInt32LE returns correct little-endian value', () => {
    const buf = new CryptoBuffer(new Uint8Array([0x78, 0x56, 0x34, 0x12]));
    expect(buf.readUInt32LE(0)).toBe(0x12345678);
  });

  test('readUInt32LE throws on out-of-bounds offset', () => {
    const buf = new CryptoBuffer(new Uint8Array([1, 2, 3, 4]));
    expect(() => buf.readUInt32LE(2)).toThrow(RangeError);
  });

  test('readUInt32LE throws on negative offset', () => {
    const buf = new CryptoBuffer(new Uint8Array([1, 2, 3, 4]));
    expect(() => buf.readUInt32LE(-1)).toThrow(RangeError);
  });

  test('toString with hex encoding', () => {
    const buf = new CryptoBuffer(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    expect(buf.toString('hex')).toBe('deadbeef');
  });

  test('toString with base64 encoding', () => {
    const buf = new CryptoBuffer(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
    expect(buf.toString('base64')).toBe('SGVsbG8=');
  });

  test('toString with utf-8 encoding', () => {
    const buf = new CryptoBuffer(new TextEncoder().encode('test'));
    expect(buf.toString()).toBe('test');
  });

  test('length property returns correct value', () => {
    const buf = new CryptoBuffer(new Uint8Array([1, 2, 3]));
    expect(buf.length).toBe(3);
  });

  test('numeric index access works via proxy', () => {
    const buf = new CryptoBuffer(new Uint8Array([10, 20, 30]));
    expect(buf[0]).toBe(10);
    expect(buf[1]).toBe(20);
    expect(buf[2]).toBe(30);
  });

  test('iterator works correctly', () => {
    const buf = new CryptoBuffer(new Uint8Array([1, 2, 3]));
    const values = [...buf];
    expect(values).toEqual([1, 2, 3]);
  });
});

describe('CryptoUtils', () => {
  test('randomBytes returns correct size', () => {
    const buf = CryptoUtils.randomBytes(16);
    expect(buf.length).toBe(16);
  });

  test('randomBytes throws on zero size', () => {
    expect(() => CryptoUtils.randomBytes(0)).toThrow(RangeError);
  });

  test('randomBytes throws on negative size', () => {
    expect(() => CryptoUtils.randomBytes(-1)).toThrow(RangeError);
  });

  test('randomBytes throws on oversized request', () => {
    expect(() => CryptoUtils.randomBytes(100000)).toThrow(RangeError);
  });

  test('randomBytes produces different output on each call', () => {
    const a = CryptoUtils.randomBytes(32).toString('hex');
    const b = CryptoUtils.randomBytes(32).toString('hex');
    expect(a).not.toBe(b);
  });

  test('createHash throws for unsupported algorithm', () => {
    expect(() => CryptoUtils.createHash('md5')).toThrow('Only SHA-256 is supported');
  });

  test('createHash returns CryptoHash for sha256', () => {
    const hash = CryptoUtils.createHash('sha256');
    expect(hash).toBeInstanceOf(CryptoHash);
  });
});

describe('CryptoHash (SHA-256)', () => {
  test('produces correct SHA-256 hash for known input', () => {
    // SHA-256 of empty string
    const hash = createHash('sha256').update('').digest('hex');
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  test('produces correct SHA-256 hash for "hello"', () => {
    const hash = createHash('sha256').update('hello').digest('hex');
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  test('chain multiple update calls', () => {
    const hash = createHash('sha256').update('hel').update('lo').digest('hex');
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  test('digest with base64 encoding', () => {
    const hash = createHash('sha256').update('test').digest('base64');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  test('digest with Uint8Array input', () => {
    const input = new TextEncoder().encode('hello');
    const hash = createHash('sha256').update(input).digest('hex');
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  test('same input produces same hash (deterministic)', () => {
    const a = createHash('sha256').update('deterministic').digest('hex');
    const b = createHash('sha256').update('deterministic').digest('hex');
    expect(a).toBe(b);
  });

  test('different input produces different hash', () => {
    const a = createHash('sha256').update('input1').digest('hex');
    const b = createHash('sha256').update('input2').digest('hex');
    expect(a).not.toBe(b);
  });
});

describe('timingSafeEqual', () => {
  test('returns true for identical arrays', () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 4]);
    expect(timingSafeEqual(a, b)).toBe(true);
  });

  test('returns false for different arrays', () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 5]);
    expect(timingSafeEqual(a, b)).toBe(false);
  });

  test('returns false for different lengths', () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 3, 4]);
    expect(timingSafeEqual(a, b)).toBe(false);
  });

  test('returns true for empty arrays', () => {
    const a = new Uint8Array([]);
    const b = new Uint8Array([]);
    expect(timingSafeEqual(a, b)).toBe(true);
  });

  test('returns false for single byte difference', () => {
    const a = new Uint8Array([0xff]);
    const b = new Uint8Array([0xfe]);
    expect(timingSafeEqual(a, b)).toBe(false);
  });
});

describe('RandomPool', () => {
  test('uint32 returns number in valid range', () => {
    const pool = new RandomPool(256);
    for (let i = 0; i < 100; i++) {
      const val = pool.uint32();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(0x100000000);
    }
  });

  test('byte returns number in 0-255 range', () => {
    const pool = new RandomPool(256);
    for (let i = 0; i < 100; i++) {
      const val = pool.byte();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(255);
    }
  });

  test('float returns number in [0, 1) range', () => {
    const pool = new RandomPool(256);
    for (let i = 0; i < 100; i++) {
      const val = pool.float();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  test('int returns number in [min, max) range', () => {
    const pool = new RandomPool(256);
    for (let i = 0; i < 100; i++) {
      const val = pool.int(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThan(10);
    }
  });

  test('pool refills when exhausted', () => {
    const pool = new RandomPool(8); // very small pool
    const values = new Set<number>();
    for (let i = 0; i < 50; i++) {
      values.add(pool.byte());
    }
    // with 50 draws from an 8-byte pool, we should have refilled multiple times
    // and gotten more than 8 unique values
    expect(values.size).toBeGreaterThan(1);
  });
});

describe('randomBytes convenience export', () => {
  test('returns CryptoBuffer with correct length', () => {
    const buf = randomBytes(32);
    expect(buf.length).toBe(32);
  });

  test('output is hex-encodable', () => {
    const hex = randomBytes(16).toString('hex');
    expect(hex).toMatch(/^[0-9a-f]{32}$/);
  });
});
