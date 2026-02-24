import { createHash, randomBytes } from '../utils/crypto';
import { Random } from '../utils/random';
import { SequenceGenerator } from '../utils/sequenceGenerator';
import { ScrambleGenerator } from '../utils/scrambleGenerator';
import { ReverseGenerator } from '../utils/reverseGenerator';
import { CustomQuestionGenerator } from '../utils/customQuestionGenerator';
import { CustomQuestionValidator } from '../validators/customQuestionValidator';
import { ImageGenerator } from '../utils/imageGenerator';
import { EmojiGenerator } from '../utils/emojiGenerator';
import type { K9GuardOptions, K9GuardCustomOptions, CaptchaChallenge, StoredChallenge, MathCaptcha, TextCaptcha, SequenceCaptcha, ScrambleCaptcha, ReverseCaptcha, MixedCaptcha, CustomCaptcha, ImageCaptcha, EmojiCaptcha, CustomQuestion } from '../types';

// Bounded nonce store: evicts the oldest entry once capacity is reached to
// prevent unbounded memory growth while still blocking same-process replays.
const NONCE_STORE_MAX = 10_000;

export class CaptchaGenerator {
  private standardOptions: K9GuardOptions | null = null;
  private customOptions: K9GuardCustomOptions | null = null;
  private customGenerator: CustomQuestionGenerator | null = null;
  // Keyed by nonce; stores the full server-side record including answer hash and salt.
  // answer, hashedAnswer and salt are never included in the public CaptchaChallenge.
  private store: Map<string, StoredChallenge> = new Map();

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

  // Look up the internal StoredChallenge by nonce for use during validation.
  lookup(nonce: string): StoredChallenge | undefined {
    return this.store.get(nonce);
  }

  // Stores the full record server-side; returns a public CaptchaChallenge
  // that is safe to send to the client (no answer, hashedAnswer or salt).
  private createChallenge(base: Omit<StoredChallenge, 'nonce' | 'expiry' | 'hashedAnswer' | 'salt'>): CaptchaChallenge {
    let nonce: string;
    do {
      nonce = Random.generateNonce();
    } while (this.store.has(nonce));

    // evict oldest entry before inserting to cap memory at NONCE_STORE_MAX
    if (this.store.size >= NONCE_STORE_MAX) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) {
        this.store.delete(oldest);
      }
    }

    const expiry = Date.now() + 5 * 60 * 1000;
    const salt = Random.generateSalt();
    // answer is never sent to the client; only its salted hash is stored
    const hashedAnswer = createHash('sha256').update(base.answer.toString() + salt).digest('hex');

    const stored: StoredChallenge = { ...base, nonce, expiry, hashedAnswer, salt };
    this.store.set(nonce, stored);

    // strip sensitive fields before returning to caller
    const { answer: _answer, hashedAnswer: _ha, salt: _salt, ...publicChallenge } = stored;
    return publicChallenge as CaptchaChallenge;
  }

  // evaluate arithmetic expression for the math captcha type
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
        return Number.NaN;
      }
      // round to 2 decimals to avoid floating point representation issues
      return Math.round((a / b) * 100) / 100;
    }
    return 0;
  }

  // dispatch to the correct generator based on configured captcha type
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
    if (captchaType === 'sequence') {
      return this.generateSequence();
    }
    if (captchaType === 'scramble') {
      return this.generateScramble();
    }
    if (captchaType === 'reverse') {
      return this.generateReverse();
    }
    if (captchaType === 'multi') {
      return this.generateMulti();
    }
    if (captchaType === 'image') {
      return this.generateImage();
    }
    if (captchaType === 'emoji') {
      return this.generateEmoji();
    }
    return this.generateMixed();
  }

  private generateCustom(): CustomCaptcha {
    if (!this.customGenerator) {
      throw new Error('Custom generator not initialized');
    }

    const custom = this.customGenerator.generate();

    // an empty answer would allow bypass with any blank input; reject early
    if (!custom.question || !custom.answer) {
      throw new Error('Custom question pool returned an empty question or answer');
    }

    return this.createChallenge({ type: 'custom', question: custom.question, answer: custom.answer }) as CustomCaptcha;
  }

  private generateMath(): MathCaptcha {
    const difficulty = this.getDifficulty();
    let num1 = Random.getRandomNumber(difficulty);
    let num2 = Random.getRandomNumber(difficulty);
    const operator = Random.getRandomOperator();

    // guarantee non-zero divisor; add 1 so the result is always >= 1
    if (operator === '/' && num2 === 0) {
      num2 = Random.getRandomNumber(difficulty) + 1;
    }

    const answer = this.calculateMath(num1, operator, num2);

    // calculateMath only returns NaN for division by zero, which is already
    // prevented above — but guard here avoids any future regression without
    // unbounded recursion: iterate instead of recurse
    if (isNaN(answer) || !isFinite(answer)) {
      num1 = Random.getRandomNumber(difficulty);
      num2 = Random.getRandomNumber(difficulty) + 1;
      return this.createChallenge({
        type: 'math',
        question: `${num1} + ${num2}`,
        answer: num1 + num2
      }) as MathCaptcha;
    }

    return this.createChallenge({ type: 'math', question: `${num1} ${operator} ${num2}`, answer }) as MathCaptcha;
  }

  private generateText(): TextCaptcha {
    const text = Random.generateRandomString(this.getDifficulty());
    return this.createChallenge({ type: 'text', question: text, answer: text }) as TextCaptcha;
  }

  private generateSequence(): SequenceCaptcha {
    const seq = SequenceGenerator.generate(this.getDifficulty());
    return this.createChallenge({ type: 'sequence', question: seq.question, answer: seq.answer }) as SequenceCaptcha;
  }

  private generateScramble(): ScrambleCaptcha {
    const scr = ScrambleGenerator.generate(this.getDifficulty());
    return this.createChallenge({ type: 'scramble', question: scr.question, answer: scr.answer }) as ScrambleCaptcha;
  }

  private generateReverse(): ReverseCaptcha {
    const rev = ReverseGenerator.generate(this.getDifficulty());
    return this.createChallenge({ type: 'reverse', question: rev.question, answer: rev.answer }) as ReverseCaptcha;
  }

  // randomly selects one of the available non-compound types
  private generateMixed(): MixedCaptcha {
    const types = ['math', 'text', 'sequence', 'scramble', 'reverse'] as const;
    const buffer = randomBytes(1) as any;
    const randomType = types[buffer[0]! % types.length]!;

    // resolve the raw answer directly so we can pass it to createChallenge;
    // avoids mutating this.standardOptions and prevents race conditions
    let question: string;
    let answer: string | number;

    if (randomType === 'math') {
      const difficulty = this.getDifficulty();
      let num1 = Random.getRandomNumber(difficulty);
      let num2 = Random.getRandomNumber(difficulty);
      const operator = Random.getRandomOperator();
      if (operator === '/' && num2 === 0) {
        num2 = Random.getRandomNumber(difficulty) + 1;
      }
      const result = this.calculateMath(num1, operator, num2);
      if (isNaN(result) || !isFinite(result)) {
        num1 = Random.getRandomNumber(difficulty);
        num2 = Random.getRandomNumber(difficulty) + 1;
        question = `${num1} + ${num2}`;
        answer = num1 + num2;
      } else {
        question = `${num1} ${operator} ${num2}`;
        answer = result;
      }
    } else if (randomType === 'text') {
      const text = Random.generateRandomString(this.getDifficulty());
      question = text;
      answer = text;
    } else if (randomType === 'sequence') {
      const seq = SequenceGenerator.generate(this.getDifficulty());
      question = seq.question;
      answer = seq.answer;
    } else if (randomType === 'scramble') {
      const scr = ScrambleGenerator.generate(this.getDifficulty());
      question = scr.question;
      answer = scr.answer;
    } else {
      const rev = ReverseGenerator.generate(this.getDifficulty());
      question = rev.question;
      answer = rev.answer;
    }

    return this.createChallenge({ type: 'mixed', question, answer }) as MixedCaptcha;
  }

  // two-step captcha: math + scramble, both must be solved correctly
  private generateMulti(): CaptchaChallenge {
    const step1 = this.store.get(this.generateMath().nonce)!;
    const step2 = this.store.get(this.generateScramble().nonce)!;

    return this.createChallenge({
      type: 'multi',
      question: 'Complete two steps',
      answer: '',
      steps: [step1, step2]
    });
  }

  // generates an SVG-based visual CAPTCHA immune to trivial OCR attacks
  private generateImage(): ImageCaptcha {
    const result = ImageGenerator.generate(this.getDifficulty());
    return this.createChallenge({
      type: 'image',
      question: result.question,
      answer: result.answer,
      image: result.image
    }) as ImageCaptcha;
  }

  // generates an emoji selection CAPTCHA: user picks all emojis from a given category
  private generateEmoji(): EmojiCaptcha {
    const result = EmojiGenerator.generate(this.getDifficulty());
    return this.createChallenge({
      type: 'emoji',
      question: result.question,
      answer: result.answer,
      emojis: result.emojis,
      category: result.category
    }) as EmojiCaptcha;
  }
}
