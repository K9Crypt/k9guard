![Banner](https://www.upload.ee/image/18782156/k9guard.png)

[Türkçe Dokümantasyon](docs/tr/README.md)

# K9Guard

A secure, lightweight, and flexible CAPTCHA module for TypeScript/JavaScript projects with cryptographic security.

## Features

- **Cryptographically Secure**: NIST SP 800-90A compliant random generation
- **10 CAPTCHA Types**: Math, text, sequence, scramble, reverse, mixed, multi-step, image, emoji, and custom challenges
- **Adaptive Difficulty**: Automatically adjusts challenge difficulty based on user success rate
- **Security First**: SHA-256 salted hashing, server-side challenge store, nonce-based session management, and 5-minute expiry
- **Single-Use Challenges**: Every nonce is consumed on the first `validate()` call — success or failure — preventing replay and brute-force attacks
- **Strict Configuration**: Invalid `type` or `difficulty` values throw immediately; no silent fallbacks
- **Input Validation**: Length limits, strict numeric parsing, type checking, and sanitization to prevent injection attacks
- **Custom Questions**: Support for your own questions with validation and sanitization
- **Zero Dependencies**: Lightweight with no external dependencies
- **Well Tested**: 228+ tests covering unit, integration, security, edge-case, and benchmark scenarios
- **OWASP Compliant**: Follows OWASP Top 10 security guidelines
- **Privacy Compliant**: GDPR/KVKK compliant with no personal data storage

## Installation

```bash
npm install k9guard
```

## Quick Start

```typescript
import K9Guard from "k9guard";

const captcha = new K9Guard({
  type: 'math',
  difficulty: 'medium'
});

// generate a challenge
const challenge = captcha.generate();
console.log(challenge.question); // "15 + 7"

// validate user answer
const isValid = captcha.validate(challenge, "22");
if (isValid) {
  console.log("Access granted!");
} else {
  console.log("Wrong answer!");
}
```

## Usage Examples

### Math CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'math', difficulty: 'easy' });
const challenge = captcha.generate();
// Output: "5 + 3"
// Answer: "8"
```

### Text CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'text', difficulty: 'medium' });
const challenge = captcha.generate();
// Output: "aB2xY9"
// Answer: "aB2xY9"
```

### Sequence CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'sequence', difficulty: 'easy' });
const challenge = captcha.generate();
// Output: "2, 4, 6, ?"
// Answer: "8"
```

### Scramble CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'scramble', difficulty: 'easy' });
const challenge = captcha.generate();
// Output: "tac"
// Answer: "cat"
```

### Reverse CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'reverse', difficulty: 'easy' });
const challenge = captcha.generate();
// Output: "god"
// Answer: "dog"
```

### Image CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'image', difficulty: 'medium' });
const challenge = captcha.generate();

// challenge.image — base64 SVG data URI, render it directly in an <img> tag
// challenge.question — "Type the characters shown in the image"
console.log(challenge.image); // "data:image/svg+xml;base64,..."

// validate user input (case-insensitive)
const isValid = captcha.validate(challenge, "aB3z");
if (isValid) {
  console.log("Access granted!");
} else {
  console.log("Wrong answer!");
}
```

The image is a distorted SVG with:
- **Rotated & offset characters** per-glyph, randomized color and size
- **Sinusoidal wave overlays** proportional to difficulty
- **Noise lines and dots** that break simple segmentation attacks
- **Case-insensitive validation** — user may type upper or lowercase
- **No external dependencies** — pure SVG generated server-side

### Emoji CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'emoji', difficulty: 'medium' });
const challenge = captcha.generate();

// challenge.emojis — array of emojis to display (6 for medium)
// challenge.category — the target category name (e.g. "animals")
// challenge.question — "Select all animals from the list (6 emojis, 3 correct)"
console.log(challenge.emojis);   // ["🐶", "🍎", "🚗", "🐱", "🌸", "🏀"]
console.log(challenge.category); // "animals"

// user submits sorted comma-separated zero-based indices of the correct emojis
// e.g. if emojis[0] and emojis[3] are animals: "0,3"
const isValid = captcha.validate(challenge, "0,3");
if (isValid) {
  console.log("Access granted!");
} else {
  console.log("Wrong answer!");
}
```

Difficulty controls the number of emojis shown and correct answers required:

| Difficulty | Total emojis | Correct to select |
|------------|-------------|-------------------|
| easy       | 4           | 2                 |
| medium     | 6           | 3                 |
| hard       | 8           | 4                 |

There are 5 categories (animals, food, vehicles, nature, sports) with 20 emojis each. Distractors are drawn from all other categories. Answer format: sorted comma-separated zero-based indices, e.g. `"0,2,4"`.

### Mixed CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'mixed', difficulty: 'medium' });
const challenge = captcha.generate();
// Randomly picks one of the above types
```

### Multi-Step CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'multi', difficulty: 'easy' });
const challenge = captcha.generate();

if (challenge.steps) {
  // user must solve both steps; steps expose only question/nonce/expiry — not the answer
  // answers are submitted as a JSON array of strings
  const userInput = JSON.stringify(["22", "typescript"]);
  const isValid = captcha.validate(challenge, userInput);
}
```

### Custom Questions

```typescript
const captcha = new K9Guard({
  type: 'custom',
  questions: [
    { question: 'What is the capital of France?', answer: 'paris', difficulty: 'easy' },
    { question: 'What is 2+2?', answer: '4', difficulty: 'easy' },
    { question: 'What color is the sky?', answer: 'blue', difficulty: 'easy' }
  ]
});

const challenge = captcha.generate();
const isValid = captcha.validate(challenge, "paris");
```

### Adaptive Difficulty

Adaptive difficulty automatically adjusts the challenge difficulty based on the user's success rate. This provides a better user experience — easy challenges for struggling users and harder challenges for those who solve quickly.

#### How It Works

- Tracks the last 10 attempts per session (sliding window)
- **80%+ success rate** — difficulty increases (easy -> medium -> hard)
- **40% or lower success rate** — difficulty decreases (hard -> medium -> easy)
- **40-80% success rate** — difficulty stays stable
- Minimum 3 attempts required before any adjustment (hysteresis)
- Sessions expire after 30 minutes of inactivity
- Maximum 10,000 concurrent sessions (oldest evicted automatically)

#### Option 1: Session ID in Constructor

```typescript
const captcha = new K9Guard({
  type: 'math',
  difficulty: 'adaptive',
  sessionId: 'user-123'  // any unique string (user ID, session token, IP, etc.)
});

const challenge = captcha.generate();  // uses user-123's current difficulty
const isValid = captcha.validate(challenge, userAnswer);  // records result automatically
```

#### Option 2: Session ID as Parameter

```typescript
const captcha = new K9Guard({ type: 'math', difficulty: 'adaptive' });

// pass sessionId with each call
const challenge = captcha.generate('user-123');
const isValid = captcha.validate(challenge, userAnswer, 'user-123');
```

#### Option 3: Flexible (Both)

Constructor `sessionId` is the default. Parameter `sessionId` overrides it.

```typescript
const captcha = new K9Guard({
  type: 'math',
  difficulty: 'adaptive',
  sessionId: 'default-user'
});

captcha.generate();                // uses 'default-user'
captcha.generate('other-user');    // uses 'other-user' (overrides default)
```

#### Session Management

```typescript
// get current difficulty for a session
const difficulty = captcha.getSessionDifficulty('user-123'); // 'easy' | 'medium' | 'hard' | null

// clear a specific session (resets to 'medium')
captcha.clearSession('user-123');

// clear all sessions
captcha.clearAllSessions();
```

#### Works with All CAPTCHA Types

```typescript
// adaptive works with any captcha type
const captcha = new K9Guard({ type: 'image', difficulty: 'adaptive', sessionId: 'user-1' });
const captcha = new K9Guard({ type: 'emoji', difficulty: 'adaptive', sessionId: 'user-1' });
const captcha = new K9Guard({ type: 'reverse', difficulty: 'adaptive', sessionId: 'user-1' });
// ... and so on
```

#### Express.js Example

```typescript
import express from 'express';
import K9Guard from 'k9guard';

const app = express();
const captcha = new K9Guard({ type: 'math', difficulty: 'adaptive' });

app.get('/captcha', (req, res) => {
  const challenge = captcha.generate(req.sessionID);
  res.json(challenge);
});

app.post('/verify', (req, res) => {
  const isValid = captcha.validate(req.body.challenge, req.body.answer, req.sessionID);
  res.json({ valid: isValid });
});
```

## API Reference

### Constructor Options

Both `type` and `difficulty` are **required** and strictly validated. Passing an invalid value throws an error immediately.

#### Standard CAPTCHA Options

```typescript
interface K9GuardOptions {
  type: 'math' | 'text' | 'sequence' | 'scramble' | 'reverse' | 'mixed' | 'multi' | 'image' | 'emoji';
  difficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
  sessionId?: string;  // optional, required when difficulty is 'adaptive'
}
```

#### Custom CAPTCHA Options

```typescript
interface K9GuardCustomOptions {
  type: 'custom';
  questions: CustomQuestion[];
  sessionId?: string;
}

interface CustomQuestion {
  question: string; // 5-500 characters
  answer: string; // 1-200 characters
  difficulty: 'easy' | 'medium' | 'hard';
}
```

### Methods

#### `generate(sessionId?: string): CaptchaChallenge`

Generates a new CAPTCHA challenge. Returns a **public** object safe to send to the client — `answer`, `hashedAnswer` and `salt` are stripped and stored server-side, keyed by `nonce`.

When `difficulty` is `'adaptive'`, the `sessionId` parameter is used to look up the user's current difficulty level. If a `sessionId` was provided in the constructor, it is used as the default.

```typescript
const challenge = captcha.generate();
console.log(challenge.question);  // the question to show the user
console.log(challenge.nonce);     // unique session identifier (pass back on validate)
console.log(challenge.expiry);    // Unix ms timestamp when challenge expires
console.log(challenge.image);     // base64 SVG data URI (only for type: 'image')
console.log(challenge.emojis);    // emoji array (only for type: 'emoji')
console.log(challenge.category);  // category name (only for type: 'emoji')
// challenge.answer / .hashedAnswer / .salt — NOT present; never sent to client
```

#### `validate(challenge: CaptchaChallenge, userInput: string, sessionId?: string): boolean`

Validates user input against the stored server-side record (looked up by `challenge.nonce`). Returns `true` if correct, `false` otherwise. Tampered `hashedAnswer` or `salt` on the public challenge object have no effect.

When `difficulty` is `'adaptive'`, the validation result is automatically recorded for the session and the difficulty is adjusted accordingly.

> **⚠️ Single-use semantics:** `validate()` consumes the nonce on the **first call**, regardless of whether the answer is correct or not. After any validation attempt, the challenge is invalidated. Always call `generate()` again before presenting a new challenge to the user.

```typescript
const isValid = captcha.validate(challenge, userAnswer);

// After validate(), the challenge is consumed.
// For a retry, generate a fresh challenge:
if (!isValid) {
  const newChallenge = captcha.generate();
}
```

#### `getSessionDifficulty(sessionId: string): Difficulty | null`

Returns the current adaptive difficulty for a session. Returns `null` if the instance is not in adaptive mode.

```typescript
const difficulty = captcha.getSessionDifficulty('user-123');
// 'easy' | 'medium' | 'hard' | null
```

#### `clearSession(sessionId: string): boolean`

Removes a specific adaptive session. Returns `true` if the session existed, `false` otherwise.

```typescript
captcha.clearSession('user-123');
```

#### `clearAllSessions(): void`

Removes all adaptive sessions.

```typescript
captcha.clearAllSessions();
```

### Exported Utilities

```typescript
import K9Guard, { AdaptiveTracker, CustomQuestionValidator, CustomQuestionGenerator } from 'k9guard';
```

| Export | Description |
|--------|-------------|
| `K9Guard` (default) | Main CAPTCHA class |
| `AdaptiveTracker` | Standalone adaptive difficulty tracker (useful for custom integrations) |
| `CustomQuestionValidator` | Validate and sanitize custom question arrays |
| `CustomQuestionGenerator` | Generate from custom question pools |

### Type Exports

```typescript
import type {
  K9GuardOptions,
  K9GuardCustomOptions,
  CaptchaChallenge,
  CustomQuestion,
  Difficulty,
  AdaptiveSession,
  AdaptiveAttempt,
  StoredChallenge,
  ImageCaptcha,
  MathCaptcha,
  TextCaptcha,
  SequenceCaptcha,
  ScrambleCaptcha,
  ReverseCaptcha,
  MixedCaptcha,
  CustomCaptcha,
  EmojiCaptcha,
} from 'k9guard';
```

## Testing

K9Guard uses `bun:test` for its test suite with 228+ tests covering unit, integration, security, edge-case, and benchmark scenarios.

### Run Tests

```bash
# run all tests
bun test

# run tests in watch mode
bun run test:watch

# run tests with coverage
bun run test:coverage
```

### Test Categories

| Category | Coverage |
|----------|----------|
| **Unit** | Each module tested independently with correct outputs and edge cases |
| **Integration** | Full generate-validate flow for all 10 captcha types + adaptive mode |
| **Security** | Timing attack resistance, nonce replay prevention, hash injection, input sanitization, SVG injection |
| **Edge Cases** | Division by zero, unicode characters, concurrent generators, invalid inputs |
| **Benchmark** | Performance assertions for all captcha types (generate < 5ms, validate < 5ms) |

## Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Add tests** for your changes
4. **Run tests**: `bun test`
5. **Commit your changes**: `git commit -m 'feat: add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
