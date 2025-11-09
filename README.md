![Banner](https://www.upload.ee/image/18782156/k9guard.png)

[Türkçe Dokümantasyon](docs/tr/README.md)

# K9Guard

A secure, lightweight, and flexible CAPTCHA module for TypeScript/JavaScript projects with cryptographic security and multi-language support.

## Features

- **Cryptographically Secure**: NIST SP 800-90A compliant random generation
- **Multi-Language Support**: English and Turkish locales for riddles and logic questions
- **9 CAPTCHA Types**: Math, text, riddle, sequence, scramble, logic, reverse, mixed, and multi-step challenges
- **Security First**: SHA-256 salted hashing, nonce-based session management, and 5-minute expiry
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
  difficulty: 'medium',
  locale: 'en'
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

### Riddle CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'riddle', difficulty: 'easy', locale: 'en' });
const challenge = captcha.generate();
// Output: "What has keys but can't open locks?"
// Answer: "piano"
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

### Logic CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'logic', difficulty: 'easy', locale: 'en' });
const challenge = captcha.generate();
// Output: "Water is dry. True or False?"
// Answer: "false"
```

### Reverse CAPTCHA

```typescript
const captcha = new K9Guard({ type: 'reverse', difficulty: 'easy' });
const challenge = captcha.generate();
// Output: "god"
// Answer: "dog"
```

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
  // user must solve both steps
  const answers = challenge.steps.map(step => step.answer.toString());
  const userInput = JSON.stringify(answers);
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
  type: 'math' | 'text' | 'riddle' | 'sequence' | 'scramble' | 'logic' | 'reverse' | 'mixed' | 'multi';
  difficulty: 'easy' | 'medium' | 'hard';
  locale?: 'en' | 'tr'; // default: 'en'
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

Generates a new CAPTCHA challenge with unique nonce, expiry time, and hashed answer.

```typescript
const challenge = captcha.generate();
console.log(challenge.question); // the question to show user
console.log(challenge.nonce); // unique session identifier
console.log(challenge.expiry); // timestamp when challenge expires
```

#### `validate(challenge: CaptchaChallenge, userInput: string): boolean`

Validates user input against the challenge. Returns `true` if correct, `false` otherwise.

```typescript
const isValid = captcha.validate(challenge, userAnswer);
```

## Testing

Run the included test suite:

```bash
bun run src/test.ts
```

Tests include:
- All CAPTCHA types with correct/incorrect/edge case inputs
- Custom question validation
- Locale switching
- Multi-step challenges
- Input sanitization
- Security validations

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
