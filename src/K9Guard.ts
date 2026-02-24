import type { K9GuardOptions, K9GuardCustomOptions, CaptchaChallenge, CustomQuestion } from './types';
import { CaptchaGenerator } from './core/captchaGenerator';
import { CaptchaValidator } from './core/captchaValidator';
import { CustomQuestionValidator } from './validators/customQuestionValidator';

export class K9Guard {
  private options: K9GuardOptions | K9GuardCustomOptions;
  private generator: CaptchaGenerator;

  constructor(options: K9GuardOptions | K9GuardCustomOptions | { type: 'custom'; questions: CustomQuestion[] } = { type: 'math', difficulty: 'medium' }) {
    const processedOptions = this.processOptions(options);
    this.generator = new CaptchaGenerator(processedOptions);
    this.options = processedOptions;
  }

  private processOptions(options: unknown): K9GuardOptions | K9GuardCustomOptions {
    if (typeof options !== 'object' || options === null) {
      return { type: 'math', difficulty: 'medium' };
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
        questions: CustomQuestionValidator.sanitize(opt.questions as CustomQuestion[])
      } as K9GuardCustomOptions;
    }

    const validTypes = ['math', 'text', 'sequence', 'scramble', 'reverse', 'mixed', 'multi', 'image', 'emoji'];
    const type = validTypes.includes(opt.type as string) ? opt.type : 'math';

    return {
      type,
      difficulty: opt.difficulty || 'medium'
    } as K9GuardOptions;
  }

  generate(): CaptchaChallenge {
    return this.generator.generate();
  }

  validate(challenge: CaptchaChallenge, userInput: string): boolean {
    if (!this.isValidChallenge(challenge)) {
      return false;
    }

    if (typeof userInput !== 'string') {
      return false;
    }

    // resolve the stored record by nonce; reject if not found or expired.
    // hashedAnswer and salt come from the server-side store, never from the client,
    // which prevents hash-injection attacks.
    const stored = this.generator.lookup(challenge.nonce);
    if (!stored) {
      return false;
    }

    const now = Date.now();
    if (now > stored.expiry) {
      return false;
    }

    return CaptchaValidator.validate(stored, userInput);
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
