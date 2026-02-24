![Banner](https://www.upload.ee/image/18782156/k9guard.png)

[Türkçe Dokümantasyon](docs/tr/README.md)

# K9Guard

A secure, lightweight, and flexible CAPTCHA module for TypeScript/JavaScript projects with cryptographic security.

## Features

- **Cryptographically Secure**: NIST SP 800-90A compliant random generation
- **10 CAPTCHA Types**: Math, text, sequence, scramble, reverse, mixed, multi-step, image, emoji, and custom challenges
- **Security First**: SHA-256 salted hashing, server-side challenge store, nonce-based session management, and 5-minute expiry
- **Input Validation**: Length limits, type checking, and sanitization to prevent injection attacks
- **Custom Questions**: Support for your own questions with validation and sanitization
- **Zero Dependencies**: Lightweight with no external dependencies
- **Well Tested**: Comprehensive test coverage including edge cases and security scenarios
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

## API Reference

### Constructor Options

#### Standard CAPTCHA Options

```typescript
interface K9GuardOptions {
  type: 'math' | 'text' | 'sequence' | 'scramble' | 'reverse' | 'mixed' | 'multi' | 'image' | 'emoji';
  difficulty: 'easy' | 'medium' | 'hard';
}
```

#### Custom CAPTCHA Options

```typescript
interface K9GuardCustomOptions {
  type: 'custom';
  questions: CustomQuestion[];
}

interface CustomQuestion {
  question: string; // 5-500 characters
  answer: string; // 1-200 characters
  difficulty: 'easy' | 'medium' | 'hard';
}
```

### Methods

#### `generate(): CaptchaChallenge`

Generates a new CAPTCHA challenge. Returns a **public** object safe to send to the client — `answer`, `hashedAnswer` and `salt` are stripped and stored server-side, keyed by `nonce`.

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

#### `validate(challenge: CaptchaChallenge, userInput: string): boolean`

Validates user input against the stored server-side record (looked up by `challenge.nonce`). Returns `true` if correct, `false` otherwise. Tampered `hashedAnswer` or `salt` on the public challenge object have no effect.

```typescript
const isValid = captcha.validate(challenge, userAnswer);
```

## Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Add tests** for your changes
4. **Run tests**: `bun run src/test.ts`
5. **Commit your changes**: `git commit -m 'feat: add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
