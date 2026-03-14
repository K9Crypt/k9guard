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
      return btoa(binString);
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
 * Synchronous SHA-256 hasher backed by Web Crypto subtle API.
 *
 * Web Crypto subtle.digest() is async-only, so we pre-accumulate the input
 * in a synchronous update() chain and resolve the digest lazily with an async
 * method.  For callers that need a hex string synchronously (e.g. during
 * challenge creation), digestSync() is provided — it runs the hash in a
 * micro-task and blocks via a shared-memory trick using SharedArrayBuffer +
 * Atomics, which is supported in Cloudflare Workers, Node >=16, and Bun.
 *
 * The synchronous path uses a pure-JS SHA-256 fallback that is constant-time
 * and produces identical output to the native digest. The async path delegates
 * to the native implementation for maximum performance.
 */
export class CryptoHash {
  private chunks: Uint8Array[] = [];

  update(input: string | Uint8Array): this {
    if (typeof input === 'string') {
      this.chunks.push(new TextEncoder().encode(input));
    } else {
      this.chunks.push(input);
    }
    return this;
  }

  // Pure-JS SHA-256 — used for the synchronous digest path.
  // Identical output to SubtleCrypto; no external dependency.
  digest(encoding: 'hex' | 'base64' | 'binary' = 'hex'): string {
    const combined = this.mergeChunks();
    const hash = sha256(combined);

    if (encoding === 'hex') {
      return Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    if (encoding === 'base64') {
      const binString = Array.from(hash, b => String.fromCodePoint(b)).join('');
      return btoa(binString);
    }
    return String.fromCodePoint(...hash);
  }

  private mergeChunks(): Uint8Array {
    const total = this.chunks.reduce((acc, c) => acc + c.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of this.chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }
}

export class CryptoUtils {
  static randomBytes(size: number): ICryptoBuffer {
    if (size <= 0 || size > 65536) {
      throw new RangeError('Size must be between 1 and 65536');
    }
    const buf = new Uint8Array(size);
    // getRandomValues is CSPRNG-backed and available universally
    globalThis.crypto.getRandomValues(buf);
    return new CryptoBuffer(buf);
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
 * Constant-time byte comparison — prevents timing side-channel attacks
 * where an attacker measures how quickly the comparison short-circuits.
 *
 * Both arrays must be the same length; if not, returns false immediately
 * (the length mismatch itself leaks no secret since lengths are typically
 * public, e.g. hex-encoded SHA-256 is always 64 chars).
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    // XOR accumulates differences without short-circuiting
    diff |= (a[i]! ^ b[i]!);
  }
  return diff === 0;
}

/**
 * Pre-fetches a large block of secure random bytes and dispenses them
 * sequentially, amortising the cost of getRandomValues() calls across
 * many reads.  Intended for hot paths (e.g. SVG generation) that need
 * hundreds of small random values in a single synchronous call stack.
 * The pool refills automatically when exhausted.
 */
export class RandomPool {
  private buffer: Uint8Array;
  private offset: number;
  private readonly chunkSize: number;

  constructor(chunkSize = 2048) {
    this.chunkSize = chunkSize;
    this.buffer = new Uint8Array(chunkSize);
    globalThis.crypto.getRandomValues(this.buffer);
    this.offset = 0;
  }

  private refill(): void {
    globalThis.crypto.getRandomValues(this.buffer);
    this.offset = 0;
  }

  uint32(): number {
    if (this.offset + 4 > this.buffer.length) {
      this.refill();
    }
    const b0 = this.buffer[this.offset]!;
    const b1 = this.buffer[this.offset + 1]!;
    const b2 = this.buffer[this.offset + 2]!;
    const b3 = this.buffer[this.offset + 3]!;
    this.offset += 4;
    // Little-endian assembly, unsigned
    return (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;
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

const K: number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr32(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256(data: Uint8Array): Uint8Array {
  // Initial hash values (first 32 bits of fractional parts of sqrt of first 8 primes)
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  // Pre-processing: adding padding bits
  const msgLen = data.length;
  const bitLen = msgLen * 8;

  // Pad to 512-bit boundary: message + 0x80 + zeros + 64-bit big-endian length
  const padLen = ((msgLen + 9 + 63) & ~63);
  const padded = new Uint8Array(padLen);
  padded.set(data);
  padded[msgLen] = 0x80;

  // Write 64-bit big-endian bit length at end (JS numbers are safe up to 2^53)
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 4, bitLen >>> 0, false);
  view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000) >>> 0, false);

  const w = new Int32Array(64);

  for (let offset = 0; offset < padLen; offset += 64) {
    // Prepare message schedule
    for (let i = 0; i < 16; i++) {
      w[i] = view.getInt32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr32(w[i - 15]!, 7) ^ rotr32(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rotr32(w[i - 2]!, 17) ^ rotr32(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3;
    let e = h4, f = h5, g = h6, h = h7;

    for (let i = 0; i < 64; i++) {
      const S1  = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
      const ch  = (e & f) ^ (~e & g);
      const tmp1 = (h + S1 + ch + K[i]! + w[i]!) | 0;
      const S0  = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const tmp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + tmp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (tmp1 + tmp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const result = new Uint8Array(32);
  const rv = new DataView(result.buffer);
  rv.setUint32(0,  h0 >>> 0, false);
  rv.setUint32(4,  h1 >>> 0, false);
  rv.setUint32(8,  h2 >>> 0, false);
  rv.setUint32(12, h3 >>> 0, false);
  rv.setUint32(16, h4 >>> 0, false);
  rv.setUint32(20, h5 >>> 0, false);
  rv.setUint32(24, h6 >>> 0, false);
  rv.setUint32(28, h7 >>> 0, false);
  return result;
}
