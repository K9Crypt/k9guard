import { describe, test, expect, beforeEach } from 'bun:test';
import { AdaptiveTracker } from '../../src/core/adaptiveTracker';

describe('AdaptiveTracker', () => {
  let tracker: AdaptiveTracker;

  beforeEach(() => {
    tracker = new AdaptiveTracker();
  });

  describe('getDifficulty()', () => {
    test('returns medium for unknown session', () => {
      expect(tracker.getDifficulty('unknown')).toBe('medium');
    });

    test('returns medium for new session', () => {
      tracker.recordAttempt('user-1', true);
      expect(tracker.getDifficulty('user-1')).toBe('medium');
    });
  });

  describe('recordAttempt()', () => {
    test('creates session on first attempt', () => {
      tracker.recordAttempt('user-1', true);
      const session = tracker.getSession('user-1');
      expect(session).toBeDefined();
      expect(session!.attempts.length).toBe(1);
      expect(session!.attempts[0]!.success).toBe(true);
    });

    test('tracks multiple attempts', () => {
      tracker.recordAttempt('user-1', true);
      tracker.recordAttempt('user-1', false);
      tracker.recordAttempt('user-1', true);
      const session = tracker.getSession('user-1');
      expect(session!.attempts.length).toBe(3);
    });

    test('keeps separate sessions per sessionId', () => {
      tracker.recordAttempt('user-1', true);
      tracker.recordAttempt('user-2', false);
      expect(tracker.getSession('user-1')!.attempts.length).toBe(1);
      expect(tracker.getSession('user-2')!.attempts.length).toBe(1);
    });
  });

  describe('adaptive difficulty adjustment', () => {
    test('increases difficulty after high success rate', () => {
      const sessionId = 'high-performer';
      // need at least 3 attempts before adjustment
      tracker.recordAttempt(sessionId, true);
      tracker.recordAttempt(sessionId, true);
      tracker.recordAttempt(sessionId, true);
      // 4th attempt with 100% success rate should trigger increase
      tracker.recordAttempt(sessionId, true);

      expect(tracker.getDifficulty(sessionId)).toBe('hard');
    });

    test('decreases difficulty after low success rate', () => {
      const sessionId = 'struggler';
      tracker.recordAttempt(sessionId, false);
      tracker.recordAttempt(sessionId, false);
      tracker.recordAttempt(sessionId, false);
      // 4th attempt with 0% success rate should trigger decrease
      tracker.recordAttempt(sessionId, false);

      expect(tracker.getDifficulty(sessionId)).toBe('easy');
    });

    test('keeps difficulty stable at moderate success rate', () => {
      const sessionId = 'moderate';
      tracker.recordAttempt(sessionId, true);
      tracker.recordAttempt(sessionId, false);
      tracker.recordAttempt(sessionId, true);
      // 50% success rate - should stay medium
      tracker.recordAttempt(sessionId, false);

      expect(tracker.getDifficulty(sessionId)).toBe('medium');
    });

    test('adjusts from easy to medium on high success', () => {
      const sessionId = 'improving';
      // first decrease to easy (need 4 failures)
      for (let i = 0; i < 4; i++) {
        tracker.recordAttempt(sessionId, false);
      }
      expect(tracker.getDifficulty(sessionId)).toBe('easy');

      // now succeed enough to push failures out of window and reach 80%+
      // window size is 10, need at least 8 successes in last 10 attempts
      for (let i = 0; i < 10; i++) {
        tracker.recordAttempt(sessionId, true);
      }

      expect(tracker.getDifficulty(sessionId)).toBe('medium');
    });

    test('respects sliding window size', () => {
      const sessionId = 'window-test';
      // fill with failures
      for (let i = 0; i < 10; i++) {
        tracker.recordAttempt(sessionId, false);
      }
      expect(tracker.getDifficulty(sessionId)).toBe('easy');

      // now fill window with successes
      for (let i = 0; i < 10; i++) {
        tracker.recordAttempt(sessionId, true);
      }
      expect(tracker.getDifficulty(sessionId)).toBe('medium');
    });
  });

  describe('clearSession()', () => {
    test('removes session', () => {
      tracker.recordAttempt('user-1', true);
      expect(tracker.clearSession('user-1')).toBe(true);
      expect(tracker.getSession('user-1')).toBeUndefined();
    });

    test('returns false for non-existent session', () => {
      expect(tracker.clearSession('unknown')).toBe(false);
    });
  });

  describe('clearAll()', () => {
    test('removes all sessions', () => {
      tracker.recordAttempt('user-1', true);
      tracker.recordAttempt('user-2', true);
      tracker.clearAll();
      expect(tracker.sessionCount).toBe(0);
    });
  });

  describe('sessionCount', () => {
    test('tracks number of active sessions', () => {
      expect(tracker.sessionCount).toBe(0);
      tracker.recordAttempt('user-1', true);
      expect(tracker.sessionCount).toBe(1);
      tracker.recordAttempt('user-2', true);
      expect(tracker.sessionCount).toBe(2);
      tracker.clearSession('user-1');
      expect(tracker.sessionCount).toBe(1);
    });
  });
});
