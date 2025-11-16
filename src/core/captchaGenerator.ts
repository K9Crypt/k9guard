import { createHash, randomBytes } from '../utils/crypto';
import { Random } from '../utils/random';
import { RiddleBank } from '../utils/riddleBank';
import { SequenceGenerator } from '../utils/sequenceGenerator';
import { ScrambleGenerator } from '../utils/scrambleGenerator';
import { LogicGenerator } from '../utils/logicGenerator';
import { ReverseGenerator } from '../utils/reverseGenerator';
import { CustomQuestionGenerator } from '../utils/customQuestionGenerator';
import { CustomQuestionValidator } from '../validators/customQuestionValidator';
import type { K9GuardOptions, K9GuardCustomOptions, CaptchaChallenge, MathCaptcha, TextCaptcha, RiddleCaptcha, SequenceCaptcha, ScrambleCaptcha, LogicCaptcha, ReverseCaptcha, MixedCaptcha, CustomCaptcha, CustomQuestion } from '../types';

export class CaptchaGenerator {
  private standardOptions: K9GuardOptions | null = null;
  private customOptions: K9GuardCustomOptions | null = null;
  private customGenerator: CustomQuestionGenerator | null = null;
  private usedNonces: Set<string> = new Set();

  // set up the generator and check custom questions if they exist
  constructor(options: K9GuardOptions | K9GuardCustomOptions) {
    if (this.isCustomOptions(options)) {
      this.customOptions = options;
      const validation = CustomQuestionValidator.validate(options.questions);
      if (!validation.valid) {
        throw new Error(`Invalid custom questions: ${validation.error}`);
      }
      const sanitized = CustomQuestionValidator.sanitize(options.questions);
      this.customGenerator = new CustomQuestionGenerator(sanitized);
    } else {
      this.standardOptions = options;
    }
  }

  // check if we got custom captcha options
  private isCustomOptions(options: unknown): options is K9GuardCustomOptions {
    if (typeof options !== 'object' || options === null) {
      return false;
    }
    const opt = options as Record<string, unknown>;
    return opt.type === 'custom' && Array.isArray(opt.questions);
  }

  private getDifficulty(): 'easy' | 'medium' | 'hard' {
    if (!this.standardOptions) {
      return 'easy';
    }
    return this.standardOptions.difficulty;
  }

  private getLocale(): 'en' | 'tr' {
    if (!this.standardOptions) {
      return 'en';
    }
    return this.standardOptions.locale || 'en';
  }

  // add security stuff to the challenge like unique nonce, expiry time, and hashed answer
  private createChallenge(base: Omit<CaptchaChallenge, 'nonce' | 'expiry' | 'hashedAnswer' | 'salt'>): CaptchaChallenge {
    let nonce: string;
    do {
      // NOTE: make sure each nonce is unique to stop replay attacks
      nonce = Random.generateNonce();
    } while (this.usedNonces.has(nonce));

    this.usedNonces.add(nonce);

    // challenge will expire in 5 minutes
    const expiry = Date.now() + 5 * 60 * 1000;
    const salt = Random.generateSalt();
    // never save the real answer, only the hash for checking later
    const hashedAnswer = createHash('sha256').update(base.answer.toString() + salt).digest('hex');

    return {
      ...base,
      nonce,
      expiry,
      hashedAnswer,
      salt
    };
  }

  // do the math based on which operator we got
  private calculateMath(a: number, op: string, b: number): number {
    if (op === '+') {
      return a + b;
    }
    if (op === '-') {
      return a - b;
    }
    if (op === '*') {
      return a * b;
    }
    if (op === '/') {
      if (b === 0) {
        // can't divide by zero, return NaN
        return Number.NaN;
      }
      // round to 2 decimals to avoid weird floating point numbers
      return Math.round((a / b) * 100) / 100;
    }
    return 0;
  }

  // main function that picks the right generator for the captcha type
  generate(): CaptchaChallenge {
    if (this.customOptions) {
      return this.generateCustom();
    }

    if (!this.standardOptions) {
      throw new Error('Generator not properly initialized');
    }

    const captchaType = this.standardOptions.type;

    if (captchaType === 'math') {
      return this.generateMath();
    }
    if (captchaType === 'text') {
      return this.generateText();
    }
    if (captchaType === 'riddle') {
      return this.generateRiddle();
    }
    if (captchaType === 'sequence') {
      return this.generateSequence();
    }
    if (captchaType === 'scramble') {
      return this.generateScramble();
    }
    if (captchaType === 'logic') {
      return this.generateLogic();
    }
    if (captchaType === 'reverse') {
      return this.generateReverse();
    }
    if (captchaType === 'multi') {
      return this.generateMulti();
    }
    return this.generateMixed();
  }

  private generateCustom(): CustomCaptcha {
    if (!this.customGenerator) {
      throw new Error('Custom generator not initialized');
    }

    const custom = this.customGenerator.generate();
    return this.createChallenge({ type: 'custom', question: custom.question, answer: custom.answer }) as CustomCaptcha;
  }

  private generateMath(): MathCaptcha {
    let num1 = Random.getRandomNumber(this.getDifficulty());
    let num2 = Random.getRandomNumber(this.getDifficulty());
    const operator = Random.getRandomOperator();

    if (operator === '/' && num2 === 0) {
      num2 = Random.getRandomNumber(this.getDifficulty()) + 1;
    }

    const question = `${num1} ${operator} ${num2}`;
    const answer = this.calculateMath(num1, operator, num2);

    if (isNaN(answer)) {
      return this.generateMath();
    }

    return this.createChallenge({ type: 'math', question, answer }) as MathCaptcha;
  }

  private generateText(): TextCaptcha {
    const text = Random.generateRandomString(this.getDifficulty());
    return this.createChallenge({ type: 'text', question: text, answer: text }) as TextCaptcha;
  }

  private generateRiddle(): RiddleCaptcha {
    const riddle = RiddleBank.getRandom(this.getLocale(), this.getDifficulty());
    return this.createChallenge({ type: 'riddle', question: riddle.question, answer: riddle.answer }) as RiddleCaptcha;
  }

  private generateSequence(): SequenceCaptcha {
    const seq = SequenceGenerator.generate(this.getDifficulty());
    return this.createChallenge({ type: 'sequence', question: seq.question, answer: seq.answer }) as SequenceCaptcha;
  }

  private generateScramble(): ScrambleCaptcha {
    const scr = ScrambleGenerator.generate(this.getDifficulty());
    return this.createChallenge({ type: 'scramble', question: scr.question, answer: scr.answer }) as ScrambleCaptcha;
  }

  private generateLogic(): LogicCaptcha {
    const logic = LogicGenerator.getRandom(this.getLocale(), this.getDifficulty());
    return this.createChallenge({ type: 'logic', question: logic.question, answer: logic.answer }) as LogicCaptcha;
  }

  private generateReverse(): ReverseCaptcha {
    const rev = ReverseGenerator.generate(this.getDifficulty());
    return this.createChallenge({ type: 'reverse', question: rev.question, answer: rev.answer }) as ReverseCaptcha;
  }

  // generates a mixed captcha by randomly selecting a type and generating accordingly
  private generateMixed(): MixedCaptcha {
    const types: ('math' | 'text' | 'riddle' | 'sequence' | 'scramble' | 'logic' | 'reverse')[] = ['math', 'text', 'riddle', 'sequence', 'scramble', 'logic', 'reverse'];
    const buffer = randomBytes(1) as any;
    const randomType = types[buffer[0]! % types.length]!;

    const previousType = this.standardOptions?.type;
    if (this.standardOptions) {
      // NOTE: change the type temporarily so we can call generate() again
      this.standardOptions.type = randomType;
    }

    const challenge = this.generate();
    if (this.standardOptions && previousType) {
      // put back the old type when done
      this.standardOptions.type = previousType;
    }

    return this.createChallenge({ ...challenge, type: 'mixed' }) as MixedCaptcha;
  }

  // make a two-step captcha with math and riddle
  private generateMulti(): CaptchaChallenge {
    const step1 = this.generateMath();
    const step2 = this.generateRiddle();

    return this.createChallenge({
      type: 'multi',
      question: 'Complete two steps',
      answer: '',
      steps: [step1, step2]
    });
  }
}
