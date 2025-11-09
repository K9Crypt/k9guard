export interface K9GuardOptions {
  type: 'math' | 'text' | 'riddle' | 'sequence' | 'scramble' | 'logic' | 'reverse' | 'mixed' | 'multi';
  difficulty: 'easy' | 'medium' | 'hard';
  locale?: 'en' | 'tr';
}

export interface CustomQuestion {
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface K9GuardCustomOptions {
  type: 'custom';
  questions: CustomQuestion[];
}

export interface CaptchaChallenge {
  type: 'math' | 'text' | 'riddle' | 'sequence' | 'scramble' | 'logic' | 'reverse' | 'mixed' | 'multi' | 'custom';
  question: string;
  answer: string | number;
  nonce: string;
  expiry: number;
  hashedAnswer: string;
  salt: string;
  steps?: CaptchaChallenge[];
}

export interface MathCaptcha extends CaptchaChallenge {
  type: 'math';
  answer: number;
}

export interface TextCaptcha extends CaptchaChallenge {
  type: 'text';
  answer: string;
}

export interface RiddleCaptcha extends CaptchaChallenge {
  type: 'riddle';
  answer: string;
}

export interface SequenceCaptcha extends CaptchaChallenge {
  type: 'sequence';
  answer: string | number;
}

export interface ScrambleCaptcha extends CaptchaChallenge {
  type: 'scramble';
  answer: string;
}

export interface LogicCaptcha extends CaptchaChallenge {
  type: 'logic';
  answer: string;
}

export interface ReverseCaptcha extends CaptchaChallenge {
  type: 'reverse';
  answer: string;
}

export interface MixedCaptcha extends CaptchaChallenge {
  type: 'mixed';
  answer: string | number;
}

export interface CustomCaptcha extends CaptchaChallenge {
  type: 'custom';
  answer: string;
}