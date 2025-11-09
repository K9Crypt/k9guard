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
      return { type: 'math', difficulty: 'medium', locale: 'en' };
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

    return {
      type: opt.type || 'math',
      difficulty: opt.difficulty || 'medium',
      locale: opt.locale || 'en'
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

    const now = Date.now();
    if (now > challenge.expiry) {
      return false;
    }

    return CaptchaValidator.validate(challenge, userInput);
  }

  private isValidChallenge(challenge: unknown): boolean {
    if (typeof challenge !== 'object' || challenge === null) {
      return false;
    }

    const c = challenge as Record<string, unknown>;

    return (
      typeof c.type === 'string' &&
      typeof c.question === 'string' &&
      typeof c.nonce === 'string' &&
      typeof c.expiry === 'number' &&
      typeof c.hashedAnswer === 'string' &&
      typeof c.salt === 'string'
    );
  }
}
