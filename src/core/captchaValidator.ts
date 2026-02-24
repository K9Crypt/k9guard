import { createHash } from '../utils/crypto';
import { timingSafeEqual } from 'node:crypto';
import type { StoredChallenge } from '../types';

export class CaptchaValidator {
  private static readonly MAX_INPUT_LENGTH = 1000;
  private static readonly VALID_CHAR_REGEX = /^[a-zA-Z0-9\s\-çÇğĞıİöÖşŞüÜ.,'!?]*$/;

  // main validation entry point, routes to the correct validator based on challenge type
  static validate(challenge: StoredChallenge, userInput: string): boolean {
    if (!this.isValidInput(userInput)) {
      return false;
    }

    if (challenge.type === 'multi') {
      return this.validateMulti(challenge, userInput);
    }

    if (challenge.type === 'custom') {
      return this.validateCustom(challenge, userInput);
    }

    if (challenge.type === 'image') {
      return this.validateImage(challenge, userInput);
    }

    if (challenge.type === 'emoji') {
      return this.validateEmoji(challenge, userInput);
    }

    if (this.isNumericChallenge(challenge)) {
      return this.validateNumeric(challenge, userInput);
    }

    return this.validateText(challenge, userInput);
  }

  private static isValidInput(input: unknown): boolean {
    if (typeof input !== 'string') {
      return false;
    }
    if (input.length === 0 || input.length > this.MAX_INPUT_LENGTH) {
      return false;
    }
    return true;
  }

  // validates multi step captchas by checking each step individually
  private static validateMulti(challenge: StoredChallenge, userInput: string): boolean {
    if (!challenge.steps || challenge.steps.length === 0) {
      return false;
    }

    let parsed: unknown;
    try {
      // NOTE: user input should be a JSON array of answers
      parsed = JSON.parse(userInput);
    } catch {
      return false;
    }

    if (!Array.isArray(parsed) || parsed.length !== challenge.steps.length) {
      return false;
    }

    // check each step answer matches its challenge
    for (let i = 0; i < challenge.steps.length; i++) {
      const step = challenge.steps[i];
      const input = parsed[i];
      
      if (!step || typeof input !== 'string') {
        return false;
      }
      
      if (!this.validate(step, input)) {
        return false;
      }
    }

    return true;
  }

  private static isNumericChallenge(challenge: StoredChallenge): boolean {
    // sequence can return string answers (e.g. letters for medium difficulty), so check the actual answer type
    return challenge.type === 'math' ||
      (challenge.type === 'sequence' && typeof challenge.answer === 'number') ||
      (challenge.type === 'mixed' && typeof challenge.answer === 'number');
  }

  private static validateNumeric(challenge: StoredChallenge, userInput: string): boolean {
    const inputNum = parseFloat(userInput);

    // make sure we got a valid number, not NaN or Infinity
    if (isNaN(inputNum) || !isFinite(inputNum)) {
      return false;
    }

    return this.verifyAnswer(challenge, inputNum.toString());
  }

  private static validateText(challenge: StoredChallenge, userInput: string): boolean {
    const sanitized = userInput.trim();

    if (!this.VALID_CHAR_REGEX.test(sanitized)) {
      return false;
    }

    return this.verifyAnswer(challenge, sanitized);
  }

  // hash the user input with the same salt and compare using a constant-time
  // equality check to eliminate timing side-channels
  private static verifyAnswer(challenge: StoredChallenge, userInput: string): boolean {
    const userHash = createHash('sha256')
      .update(userInput + challenge.salt)
      .digest('hex');

    // both buffers must be the same length for timingSafeEqual; hex-encoded
    // SHA-256 is always 64 chars so this holds unless hashedAnswer is corrupted
    if (userHash.length !== challenge.hashedAnswer.length) {
      return false;
    }

    return timingSafeEqual(
      Buffer.from(userHash, 'hex'),
      Buffer.from(challenge.hashedAnswer, 'hex')
    );
  }

  private static validateCustom(challenge: StoredChallenge, userInput: string): boolean {
    const sanitized = userInput.trim();

    if (!this.VALID_CHAR_REGEX.test(sanitized)) {
      return false;
    }

    return this.verifyAnswer(challenge, sanitized);
  }

  // image answers are case-insensitive; only alphanumeric chars are accepted
  private static validateImage(challenge: StoredChallenge, userInput: string): boolean {
    const sanitized = userInput.trim().toLowerCase();

    if (!/^[a-z0-9]+$/.test(sanitized)) {
      return false;
    }

    if (sanitized.length < 1 || sanitized.length > 20) {
      return false;
    }

    return this.verifyAnswer(challenge, sanitized);
  }

  // emoji answers: comma-separated zero-based indices e.g. "0,2,4"
  // parsed, deduplicated, sorted numerically then re-joined to produce the canonical form
  private static validateEmoji(challenge: StoredChallenge, userInput: string): boolean {
    const trimmed = userInput.trim();

    // only digits and commas are valid; reject anything else to prevent injection
    if (!/^[0-9,]+$/.test(trimmed)) {
      return false;
    }

    const parts = trimmed.split(',').filter(s => s.length > 0);

    if (parts.length === 0 || parts.length > 20) {
      return false;
    }

    const indices = parts.map(Number);

    if (indices.some(n => isNaN(n) || n < 0 || !Number.isInteger(n))) {
      return false;
    }

    // canonical form matches what EmojiGenerator stored: sorted unique indices
    const normalized = [...new Set(indices)].sort((a, b) => a - b).join(',');

    return this.verifyAnswer(challenge, normalized);
  }
}