import { createHash } from 'crypto';
import type { CaptchaChallenge } from '../types';

export class CaptchaValidator {
  private static readonly MAX_INPUT_LENGTH = 1000;
  private static readonly VALID_CHAR_REGEX = /^[a-zA-Z0-9\s\-çÇğĞıİöÖşŞüÜ.,'!?]*$/;

  // main validation entry point, routes to the correct validator based on challenge type
  static validate(challenge: CaptchaChallenge, userInput: string): boolean {
    if (!this.isValidInput(userInput)) {
      return false;
    }

    if (challenge.type === 'multi') {
      return this.validateMulti(challenge, userInput);
    }

    if (challenge.type === 'custom') {
      return this.validateCustom(challenge, userInput);
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
  private static validateMulti(challenge: CaptchaChallenge, userInput: string): boolean {
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

  private static isNumericChallenge(challenge: CaptchaChallenge): boolean {
    return challenge.type === 'math' || challenge.type === 'sequence' || (challenge.type === 'mixed' && typeof challenge.answer === 'number');
  }

  private static validateNumeric(challenge: CaptchaChallenge, userInput: string): boolean {
    const inputNum = parseFloat(userInput);

    // make sure we got a valid number, not NaN or Infinity
    if (isNaN(inputNum) || !isFinite(inputNum)) {
      return false;
    }

    return this.verifyAnswer(challenge, inputNum.toString());
  }

  private static validateText(challenge: CaptchaChallenge, userInput: string): boolean {
    const sanitized = userInput.trim();

    if (!this.VALID_CHAR_REGEX.test(sanitized)) {
      return false;
    }

    return this.verifyAnswer(challenge, sanitized);
  }

  // NOTE: hash the user input with same salt and compare to stored hash
  private static verifyAnswer(challenge: CaptchaChallenge, userInput: string): boolean {
    const userHash = createHash('sha256')
      .update(userInput + challenge.salt)
      .digest('hex');

    return userHash === challenge.hashedAnswer;
  }

  private static validateCustom(challenge: CaptchaChallenge, userInput: string): boolean {
    const sanitized = userInput.trim();

    if (!this.VALID_CHAR_REGEX.test(sanitized)) {
      return false;
    }

    return this.verifyAnswer(challenge, sanitized);
  }
}