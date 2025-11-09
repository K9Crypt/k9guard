import K9Guard from './index.ts';

function testCaptcha(type: string) {
  const captcha = new K9Guard({ type: type as any, difficulty: 'easy' });
  const challenge = captcha.generate();
  console.log(`${type} Challenge:`, challenge.question);

  let correctInput: string;
  if (challenge.type === 'math') {
    const parts = challenge.question.split(' ');
    const num1 = parseFloat(parts[0]!);
    const op = parts[1]!;
    const num2 = parseFloat(parts[2]!);
    let expected = 0;
    if (op === '+') expected = num1 + num2;
    if (op === '-') expected = num1 - num2;
    if (op === '*') expected = num1 * num2;
    if (op === '/') expected = Math.round((num1 / num2) * 100) / 100;
    correctInput = expected.toString();
  } else {
    const answer = challenge.answer as string | number;
    correctInput = answer.toString();
  }

  const isValidCorrect = captcha.validate(challenge, correctInput);
  console.log(`${type} Correct Test Passed:`, isValidCorrect);

  const isValidWrong = captcha.validate(challenge, 'wrong');
  console.log(`${type} Wrong Test Passed (should be false):`, !isValidWrong);

  const isValidEmpty = captcha.validate(challenge, '');
  console.log(`${type} Empty Test Passed (should be false):`, !isValidEmpty);

  const isValidLong = captcha.validate(challenge, 'a'.repeat(1001));
  console.log(`${type} Long Test Passed (should be false):`, !isValidLong);

  return isValidCorrect && !isValidWrong && !isValidEmpty && !isValidLong;
}

function testCustomQuestions() {
  const customQuestions = [
    { question: 'What is the capital of France?', answer: 'paris', difficulty: 'easy' as const },
    { question: 'What is the largest planet in our solar system?', answer: 'jupiter', difficulty: 'medium' as const },
    { question: 'Who wrote Romeo and Juliet?', answer: 'shakespeare', difficulty: 'hard' as const }
  ];

  const captcha = new K9Guard({ type: 'custom', questions: customQuestions });
  const challenge = captcha.generate();
  console.log('Custom Challenge:', challenge.question);

  const answer = challenge.answer as string;
  const isValidCorrect = captcha.validate(challenge, answer);
  console.log('Custom Correct Test Passed:', isValidCorrect);

  const isValidWrong = captcha.validate(challenge, 'wrong');
  console.log('Custom Wrong Test Passed (should be false):', !isValidWrong);

  const isValidEmpty = captcha.validate(challenge, '');
  console.log('Custom Empty Test Passed (should be false):', !isValidEmpty);

  const isValidLong = captcha.validate(challenge, 'a'.repeat(1001));
  console.log('Custom Long Test Passed (should be false):', !isValidLong);

  return isValidCorrect && !isValidWrong && !isValidEmpty && !isValidLong;
}

function testCustomQuestionsValidation() {
  console.log('\nTesting Custom Questions Validation:');

  let passed = true;

  try {
    const invalidEmpty = new K9Guard({ type: 'custom', questions: [] });
    console.log('Empty questions test: FAILED (should throw)');
    passed = false;
  } catch {
    console.log('Empty questions test: PASSED (correctly threw)');
  }

  try {
    const invalidShort = new K9Guard({
      type: 'custom',
      questions: [
        { question: 'hi', answer: 'ok', difficulty: 'easy' as const }
      ]
    });
    console.log('Short question test: FAILED (should throw)');
    passed = false;
  } catch {
    console.log('Short question test: PASSED (correctly threw)');
  }

  try {
    const validCustom = new K9Guard({
      type: 'custom',
      questions: [
        { question: 'What color is the sky?', answer: 'blue', difficulty: 'easy' as const }
      ]
    });
    console.log('Valid custom test: PASSED');
  } catch (error) {
    console.log('Valid custom test: FAILED', error);
    passed = false;
  }

  try {
    const invalidDifficulty = new K9Guard({
      type: 'custom',
      questions: [
        { question: 'What is this?', answer: 'test', difficulty: 'impossible' as any }
      ]
    });
    console.log('Invalid difficulty test: FAILED (should throw)');
    passed = false;
  } catch {
    console.log('Invalid difficulty test: PASSED (correctly threw)');
  }

  return passed;
}

function testLocale() {
  const captchaTr = new K9Guard({ type: 'riddle', difficulty: 'easy', locale: 'tr' });
  const challengeTr = captchaTr.generate();
  console.log('TR Riddle:', challengeTr.question);
  const trAnswer = challengeTr.answer as string | number;
  const isValidTr = captchaTr.validate(challengeTr, trAnswer.toString());
  console.log('TR Locale Test Passed:', isValidTr);

  const captchaEn = new K9Guard({ type: 'logic', difficulty: 'easy', locale: 'en' });
  const challengeEn = captchaEn.generate();
  console.log('EN Logic:', challengeEn.question);
  const enAnswer = challengeEn.answer as string | number;
  const isValidEn = captchaEn.validate(challengeEn, enAnswer.toString());
  console.log('EN Locale Test Passed:', isValidEn);

  return isValidTr && isValidEn;
}

function testMulti() {
  const captcha = new K9Guard({ type: 'multi', difficulty: 'easy' });
  const challenge = captcha.generate();
  console.log('Multi Challenge:', challenge.question);
  if (challenge.steps) {
    const inputs = challenge.steps.map(step => {
      const answer = step.answer as string | number;
      return answer.toString();
    });
    const userInput = JSON.stringify(inputs);
    const isValid = captcha.validate(challenge, userInput);
    console.log('Multi Test Passed:', isValid);
    return isValid;
  }
  return false;
}

function runTests() {
  console.log('Running Standard CAPTCHA Tests\n');
  const types = ['math', 'text', 'riddle', 'sequence', 'scramble', 'logic', 'reverse', 'mixed'];
  let allPassed = true;
  for (const type of types) {
    const passed = testCaptcha(type);
    if (!passed) {
      allPassed = false;
    }
  }

  console.log('\nRunning Locale Tests \n');
  const localePassed = testLocale();
  if (!localePassed) allPassed = false;

  console.log('\nRunning Multi-Step Tests\n');
  const multiPassed = testMulti();
  if (!multiPassed) allPassed = false;

  console.log('\nRunning Custom Questions Tests\n');
  const customValidationPassed = testCustomQuestionsValidation();
  if (!customValidationPassed) allPassed = false;

  console.log('\nRunning Custom Questions Functionality\n');
  const customPassed = testCustomQuestions();
  if (!customPassed) allPassed = false;

  console.log('\nTest Summary');
  if (allPassed) {
    console.log('All tests passed!');
  } else {
    console.log('Some tests failed!');
  }
}

runTests();
