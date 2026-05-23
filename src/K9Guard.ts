import type { K9GuardOptions, K9GuardCustomOptions, CaptchaChallenge, CustomQuestion, Difficulty } from './types';
import { CaptchaGenerator } from './core/captchaGenerator';
import { CaptchaValidator } from './core/captchaValidator';
import { AdaptiveTracker } from './core/adaptiveTracker';
import { CustomQuestionValidator } from './validators/customQuestionValidator';

export class K9Guard {
  private options: K9GuardOptions | K9GuardCustomOptions;
  private generator: CaptchaGenerator;
  private adaptiveTracker: AdaptiveTracker | null = null;
  private defaultSessionId: string | null = null;

  constructor(options: K9GuardOptions | K9GuardCustomOptions | { type: 'custom'; questions: CustomQuestion[]; sessionId?: string }) {
    const processedOptions = this.processOptions(options);
    this.generator = new CaptchaGenerator(processedOptions);
    this.options = processedOptions;

    if (this.isAdaptive()) {
      this.adaptiveTracker = new AdaptiveTracker();
      this.defaultSessionId = (options as Record<string, unknown>).sessionId as string | null ?? null;
    }
  }

  private isAdaptive(): boolean {
    return 'difficulty' in this.options && this.options.difficulty === 'adaptive';
  }

  private resolveSessionId(sessionId?: string): string {
    const id = sessionId ?? this.defaultSessionId;
    if (!id) {
      throw new Error('sessionId is required for adaptive difficulty. Provide it in constructor or as parameter.');
    }
    return id;
  }

  private processOptions(options: unknown): K9GuardOptions | K9GuardCustomOptions {
    if (typeof options !== 'object' || options === null) {
      throw new Error('Options must be an object');
    }

    const opt = options as Record<string, unknown>;

    if (opt.type === 'custom') {
      if (!Array.isArray(opt.questions)) {
        throw new Error('Custom type requires questions array');
      }

      const validation = CustomQuestionValidator.validate(opt.questions);
      if (!validation.valid) {
        throw new Error(`Invalid custom questions: ${validation.error}`);
      }

      return {
        type: 'custom',
        questions: CustomQuestionValidator.sanitize(opt.questions as CustomQuestion[]),
        sessionId: opt.sessionId,
      } as K9GuardCustomOptions;
    }

    const validTypes = ['math', 'text', 'sequence', 'scramble', 'reverse', 'mixed', 'multi', 'image', 'emoji'] as const;
    if (!validTypes.includes(opt.type as any)) {
      throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }

    const validDifficulties = ['easy', 'medium', 'hard', 'adaptive'] as const;
    if (!validDifficulties.includes(opt.difficulty as any)) {
      throw new Error(`Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}`);
    }

    return {
      type: opt.type,
      difficulty: opt.difficulty,
      sessionId: opt.sessionId,
    } as K9GuardOptions;
  }

  generate(sessionId?: string): CaptchaChallenge {
    if (!this.isAdaptive()) {
      return this.generator.generate();
    }

    const id = this.resolveSessionId(sessionId);
    const difficulty = this.adaptiveTracker!.getDifficulty(id);
    return this.generator.generate(difficulty);
  }

  validate(challenge: CaptchaChallenge, userInput: string, sessionId?: string): boolean {
    if (!this.isValidChallenge(challenge)) {
      return false;
    }

    if (typeof userInput !== 'string') {
      return false;
    }

    // consume() atomically removes the nonce from the store — single-use semantics.
    // hashedAnswer and salt come from the server-side store, never from the client,
    // which prevents hash-injection and replay attacks.
    const stored = this.generator.consume(challenge.nonce);
    if (!stored) {
      return false;
    }

    if (Date.now() > stored.expiry) {
      return false;
    }

    const isValid = CaptchaValidator.validate(stored, userInput);

    if (this.isAdaptive()) {
      const id = this.resolveSessionId(sessionId);
      this.adaptiveTracker!.recordAttempt(id, isValid);
    }

    return isValid;
  }

  clearSession(sessionId: string): boolean {
    if (!this.adaptiveTracker) {
      return false;
    }
    return this.adaptiveTracker.clearSession(sessionId);
  }

  clearAllSessions(): void {
    this.adaptiveTracker?.clearAll();
  }

  getSessionDifficulty(sessionId: string): Difficulty | null {
    if (!this.adaptiveTracker) {
      return null;
    }
    return this.adaptiveTracker.getDifficulty(sessionId);
  }

  private isValidChallenge(challenge: unknown): boolean {
    if (typeof challenge !== 'object' || challenge === null) {
      return false;
    }

    const c = challenge as Record<string, unknown>;

    return (
      typeof c.type === 'string' &&
      typeof c.question === 'string' &&
      typeof c.nonce === 'string' && c.nonce.length > 0 &&
      typeof c.expiry === 'number'
    );
  }
}
