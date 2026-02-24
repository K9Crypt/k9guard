/**
 * Cryptographic primitives for k9guard.
 *
 * Uses the native `node:crypto` module (available in Bun and Node >=16) for
 * all hashing so that every digest is a real SHA-256 — not a custom mixing
 * function.  Random bytes are sourced from `crypto.getRandomValues()` via the
 * same module, which is CSPRNG-backed on all supported runtimes.
 *
 * Security guarantees:
 * - SHA-256 collision resistance: 2^128 operations
 * - CSPRNG random bytes: suitable for nonces, salts, and key material
 * - No sensitive data retained after digest() completes
 */

import { createHash as nodeCreateHash, randomBytes as nodeRandomBytes } from 'node:crypto';

export interface ICryptoBuffer {
  readUInt32LE(offset: number): number;
  toString(encoding?: string): string;
  length: number;
  [index: number]: number | undefined;
  [Symbol.iterator](): Iterator<number>;
}

export class CryptoBuffer implements ICryptoBuffer {
  private buffer: Uint8Array;
  [index: number]: number | undefined;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
    // Proxy enables numeric index access (buffer[0]) while keeping internal state private
    const proxy = new Proxy(this, {
      get(target, prop) {
        if (typeof prop === 'string' && !isNaN(Number(prop))) {
          return target.buffer[Number(prop)];
        }
        return (target as any)[prop];
      }
    });
    return proxy as any;
  }

  readUInt32LE(offset: number): number {
    if (offset < 0 || offset + 4 > this.buffer.length) {
      throw new RangeError('Offset out of bounds');
    }
    const b0 = this.buffer[offset];
    const b1 = this.buffer[offset + 1];
    const b2 = this.buffer[offset + 2];
    const b3 = this.buffer[offset + 3];

    if (b0 === undefined || b1 === undefined || b2 === undefined || b3 === undefined) {
      throw new RangeError('Buffer read error');
    }

    // Little-endian: b0 is LSB, unsigned right-shift keeps result in [0, 2^32)
    return (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;
  }

  toString(encoding?: string): string {
    if (encoding === 'hex') {
      return Array.from(this.buffer)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    if (encoding === 'base64') {
      const binString = Array.from(this.buffer, (byte: number) => String.fromCodePoint(byte)).join('');
      if (typeof btoa !== 'undefined') {
        return btoa(binString);
      }
      return binString;
    }
    return new TextDecoder().decode(this.buffer);
  }

  get length(): number {
    return this.buffer.length;
  }

  [Symbol.iterator](): Iterator<number> {
    let index = 0;
    const buffer = this.buffer;
    return {
      next(): IteratorResult<number> {
        if (index < buffer.length) {
          const val = buffer[index++];
          if (val === undefined) {
            return { value: 0, done: true };
          }
          return { value: val, done: false };
        }
        return { value: 0, done: true };
      }
    };
  }
}

/**
 * Thin wrapper around node:crypto Hash so callers keep the same chained API:
 *   createHash('sha256').update(data).digest('hex')
 *
 * Only SHA-256 is accepted; any other algorithm is rejected at construction
 * time to prevent accidental use of weaker primitives.
 */
export class CryptoHash {
  private hash: ReturnType<typeof nodeCreateHash>;

  constructor() {
    this.hash = nodeCreateHash('sha256');
  }

  update(input: string | Uint8Array): this {
    this.hash.update(typeof input === 'string' ? input : Buffer.from(input));
    return this;
  }

  digest(encoding: 'hex' | 'base64' | 'binary' = 'hex'): string {
    return this.hash.digest(encoding);
  }
}

export class CryptoUtils {
  static randomBytes(size: number): ICryptoBuffer {
    if (size <= 0 || size > 65536) {
      throw new RangeError('Size must be between 1 and 65536');
    }
    const buf = nodeRandomBytes(size);
    return new CryptoBuffer(new Uint8Array(buf));
  }

  static createHash(algorithm: string): CryptoHash {
    if (algorithm.toLowerCase() !== 'sha256') {
      throw new Error('Only SHA-256 is supported');
    }
    return new CryptoHash();
  }
}

export const randomBytes = (size: number): ICryptoBuffer => CryptoUtils.randomBytes(size);
export const createHash = (algorithm: string): CryptoHash => CryptoUtils.createHash(algorithm);

/**
 * Pre-fetches a large block of secure random bytes and dispenses them
 * sequentially, amortizing the cost of crypto API calls across many reads.
 *
 * Intended for hot paths (e.g. SVG generation) that need hundreds of small
 * random values in a single synchronous call stack.  The pool refills
 * automatically when exhausted using the same CSPRNG source.
 */
export class RandomPool {
  private buffer: Buffer;
  private offset: number;
  private readonly chunkSize: number;

  constructor(chunkSize = 2048) {
    this.chunkSize = chunkSize;
    this.buffer = nodeRandomBytes(chunkSize);
    this.offset = 0;
  }

  private refill(): void {
    this.buffer = nodeRandomBytes(this.chunkSize);
    this.offset = 0;
  }

  uint32(): number {
    if (this.offset + 4 > this.buffer.length) {
      this.refill();
    }
    const val = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    return val;
  }

  byte(): number {
    if (this.offset >= this.buffer.length) {
      this.refill();
    }
    const val = this.buffer[this.offset]!;
    this.offset += 1;
    return val;
  }

  // uniform float in [0, 1)
  float(): number {
    return this.uint32() / 0xffffffff;
  }

  // uniform integer in [min, max)
  int(min: number, max: number): number {
    return Math.floor(this.float() * (max - min)) + min;
  }
}
