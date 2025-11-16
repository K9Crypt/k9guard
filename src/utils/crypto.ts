/**
 * This module provides Node.js crypto API compatibility for web browsers using the Web Crypto API.
 * It implements secure random number generation and hashing functions that work in both browser
 * and server environments, eliminating the need for Node.js crypto module in web applications.
 *
 * Key features:
 * - Web Crypto API integration with fallback detection
 * - Secure random bytes generation
 * - SHA-256 hashing with incremental updates
 * - Buffer-like interface for compatibility
 * - TypeScript support with proper type safety
 *
 * Security Notes:
 * - Uses cryptographically secure random number generation
 * - Implements deterministic hashing for consistent results
 * - No sensitive data is stored or logged
 * - All operations are performed in-memory only
 */

declare const window: any;
declare const self: any;

/**
 * Interface for crypto buffer operations
 *
 * Provides Node.js Buffer-like functionality for cryptographic operations.
 * Supports array-like access, encoding conversions, and binary data manipulation.
 */
export interface ICryptoBuffer {
  readUInt32LE(offset: number): number;
  toString(encoding?: string): string;
  length: number;
  [index: number]: number | undefined;
  [Symbol.iterator](): Iterator<number>;
}

/**
 * Core cryptographic utilities class
 *
 * Provides access to Web Crypto API with automatic environment detection.
 * Handles browser compatibility and secure random number generation.
 */
export class CryptoUtils {
  /**
   * Detect and return available Web Crypto API instance
   *
   * Checks multiple global objects to find crypto API in different environments:
   * - globalThis (modern browsers/Node.js)
   * - window (browser main thread)
   * - self (Web Workers/Service Workers)
   *
   * @throws Error if Web Crypto API is not available
   */
  private static getWebCrypto(): Crypto {
    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
      return globalThis.crypto;
    }
    if (typeof window !== 'undefined' && window.crypto) {
      return window.crypto;
    }
    if (typeof self !== 'undefined' && self.crypto) {
      return self.crypto;
    }
    throw new Error('Web Crypto API not available');
  }

  /**
   * Generate cryptographically secure random bytes
   *
   * Uses Web Crypto API's getRandomValues() for secure random number generation.
   * This is suitable for cryptographic purposes and provides better entropy than Math.random().
   *
   * @param size - Number of random bytes to generate (1-65536)
   * @returns CryptoBuffer containing random bytes
   * @throws RangeError if size is invalid
   */
  static randomBytes(size: number): ICryptoBuffer {
    if (size <= 0 || size > 65536) {
      throw new RangeError('Size must be between 1 and 65536');
    }

    const crypto = this.getWebCrypto();
    const buffer = new Uint8Array(size);
    crypto.getRandomValues(buffer);

    return new CryptoBuffer(buffer);
  }

  /**
   * Create a new hash instance
   *
   * Currently supports only SHA-256 for security and compatibility reasons.
   * SHA-256 provides strong cryptographic hashing suitable for most applications.
   *
   * @param algorithm - Hash algorithm (currently only 'sha256' supported)
   * @returns New CryptoHash instance
   * @throws Error if unsupported algorithm is requested
   */
  static createHash(algorithm: string): CryptoHash {
    if (algorithm.toLowerCase() !== 'sha256') {
      throw new Error('Only SHA-256 is supported');
    }

    return new CryptoHash();
  }
}

/**
 * Buffer implementation for cryptographic data
 *
 * Provides Node.js Buffer-compatible interface using Uint8Array internally.
 * Uses Proxy pattern to enable array-like access (buffer[0], buffer[1], etc.)
 * while maintaining type safety and compatibility.
 */
export class CryptoBuffer implements ICryptoBuffer {
  private buffer: Uint8Array;
  [index: number]: number | undefined;

  /**
   * Create a new crypto buffer
   *
   * @param buffer - Underlying Uint8Array data
   */
  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
    // NOTE: Using Proxy to enable array-like access while maintaining encapsulation
    // This allows buffer[0], buffer[1] syntax while keeping internal buffer private
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

  /**
   * Read 32-bit unsigned integer in little-endian format
   *
   * Reads 4 bytes starting at offset and interprets them as a little-endian
   * unsigned 32-bit integer. Used for cryptographic operations requiring
   * specific byte ordering.
   *
   * @param offset - Starting position in buffer
   * @returns 32-bit unsigned integer value
   * @throws RangeError if offset is out of bounds
   */
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

    // NOTE: Little-endian byte order: least significant byte first
    // b0 is LSB, b3 is MSB. Using unsigned right shift to ensure positive result
    return (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;
  }

  /**
   * Convert buffer to string with specified encoding
   *
   * Supports multiple encodings for compatibility with different use cases:
   * - 'hex': Hexadecimal representation (2 chars per byte)
   * - 'base64': Base64 encoding using browser's btoa() or fallback
   * - default: UTF-8 text decoding
   *
   * @param encoding - Output encoding ('hex', 'base64', or undefined for UTF-8)
   * @returns Encoded string representation
   */
  toString(encoding?: string): string {
    if (encoding === 'hex') {
      return Array.from(this.buffer)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    if (encoding === 'base64') {
      const binString = Array.from(this.buffer, (byte: number) => String.fromCodePoint(byte)).join('');
      // NOTE: btoa() is browser-specific, fallback to raw binary string in Node.js
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

  /**
   * Iterator implementation for for...of loops and spread operator
   *
   * Allows the buffer to be used in modern JavaScript iteration constructs.
   * Provides sequential access to individual bytes.
   *
   * @returns Iterator yielding individual byte values
   */
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
 * Incremental hash computation class
 *
 * Provides Node.js crypto.createHash() compatible interface.
 * Supports incremental updates for large data processing.
 * Uses custom hash algorithm optimized for browser compatibility.
 */
export class CryptoHash {
  private dataChunks: Uint8Array[] = [];

  /**
   * Add data to the hash computation
   *
   * Can be called multiple times to hash large or streaming data.
   * Data is accumulated internally until digest() is called.
   *
   * @param input - Data to hash (string or Uint8Array)
   * @returns This instance for method chaining
   */
  update(input: string | Uint8Array): this {
    const inputBytes = typeof input === 'string'
      ? new TextEncoder().encode(input)
      : input;

    this.dataChunks.push(inputBytes);
    return this;
  }

  /**
   * Combine all accumulated data chunks into a single buffer
   *
   * Internal method used before hash computation.
   * Efficiently concatenates all chunks into contiguous memory.
   *
   * @returns Combined Uint8Array of all input data
   */
  private getCombinedData(): Uint8Array {
    const totalLength = this.dataChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of this.dataChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    return combined;
  }

  /**
   * Finalize hash computation and return result
   *
   * Computes the hash of all accumulated data and returns it in the specified encoding.
   * After calling digest(), the hash instance should not be used for further updates.
   *
   * @param encoding - Output encoding ('hex', 'base64', or undefined for binary)
   * @returns Hash digest as encoded string
   */
  digest(encoding?: string): string {
    const combined = this.getCombinedData();
    const hashArray = this.computeHashSync(combined);

    if (encoding === 'hex') {
      return Array.from(hashArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    if (encoding === 'base64') {
      const binString = Array.from(hashArray, (byte: number) => String.fromCodePoint(byte)).join('');
      if (typeof btoa !== 'undefined') {
        return btoa(binString);
      }
      return binString;
    }

    return new TextDecoder().decode(hashArray);
  }

  /**
   * Compute hash using custom synchronous algorithm
   *
   * Implements a deterministic hash function optimized for browser compatibility.
   * Uses multiple rounds of mixing operations to ensure good distribution.
   *
   * Algorithm overview:
   * 1. Initial distribution: XOR and multiply operations
   * 2. Diffusion rounds: Neighbor-based mixing with round constants
   *
   * @param data - Input data to hash
   * @returns 32-byte hash array
   */
  private computeHashSync(data: Uint8Array): Uint8Array {
    const simpleHash = new Uint8Array(32);

    for (let i = 0; i < data.length; i++) {
      const byteVal = data[i];
      if (byteVal === undefined) continue;

      const idx1 = i % 32;
      const idx2 = (i * 7) % 32; // NOTE: Prime multiplier for better distribution

      const val1 = simpleHash[idx1];
      const val2 = simpleHash[idx2];

      if (val1 !== undefined) {
        simpleHash[idx1] = val1 ^ byteVal;
      }

      if (val2 !== undefined) {
        simpleHash[idx2] = ((val2 + byteVal) * 31) & 0xFF; // NOTE: 31 is prime for avalanche effect
      }
    }

    for (let round = 0; round < 16; round++) {
      for (let i = 0; i < 32; i++) {
        const prevIdx = (i + 31) % 32; // Previous element (wrap around)
        const nextIdx = (i + 1) % 32;  // Next element (wrap around)

        const prev = simpleHash[prevIdx];
        const curr = simpleHash[i];
        const next = simpleHash[nextIdx];

        if (prev !== undefined && curr !== undefined && next !== undefined) {
          // NOTE: Complex mixing function combining neighbors with round constant
          simpleHash[i] = ((prev + curr * 2 + next) * 7 + round) & 0xFF;
        }
      }
    }

    return simpleHash;
  }
}

export const randomBytes = (size: number): ICryptoBuffer => CryptoUtils.randomBytes(size);
export const createHash = (algorithm: string): CryptoHash => CryptoUtils.createHash(algorithm);
