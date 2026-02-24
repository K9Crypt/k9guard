export interface K9GuardOptions {
  type: 'math' | 'text' | 'sequence' | 'scramble' | 'reverse' | 'mixed' | 'multi' | 'image' | 'emoji';
  difficulty: 'easy' | 'medium' | 'hard';
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

// Internal: full challenge record kept server-side only.
// answer, hashedAnswer and salt must never leave the server.
export interface StoredChallenge {
  type: 'math' | 'text' | 'sequence' | 'scramble' | 'reverse' | 'mixed' | 'multi' | 'custom' | 'image' | 'emoji';
  question: string;
  answer: string | number;
  nonce: string;
  expiry: number;
  hashedAnswer: string;
  salt: string;
  steps?: StoredChallenge[];
  image?: string;
  emojis?: string[];
  category?: string;
}

// Public: safe subset sent to the client.
// answer, hashedAnswer and salt are intentionally omitted to prevent
// hash-injection attacks where an attacker forges hashedAnswer on the client.
export interface CaptchaChallenge {
  type: StoredChallenge['type'];
  question: string;
  nonce: string;
  expiry: number;
  steps?: CaptchaChallenge[];
  image?: string;
  emojis?: string[];
  category?: string;
}

export interface ImageCaptcha extends CaptchaChallenge {
  type: 'image';
  image: string;
}

export interface MathCaptcha extends CaptchaChallenge {
  type: 'math';
}

export interface TextCaptcha extends CaptchaChallenge {
  type: 'text';
}

export interface SequenceCaptcha extends CaptchaChallenge {
  type: 'sequence';
}

export interface ScrambleCaptcha extends CaptchaChallenge {
  type: 'scramble';
}

export interface ReverseCaptcha extends CaptchaChallenge {
  type: 'reverse';
}

export interface MixedCaptcha extends CaptchaChallenge {
  type: 'mixed';
}

export interface CustomCaptcha extends CaptchaChallenge {
  type: 'custom';
}

export interface EmojiCaptcha extends CaptchaChallenge {
  type: 'emoji';
  emojis: string[];
  category: string;
}
