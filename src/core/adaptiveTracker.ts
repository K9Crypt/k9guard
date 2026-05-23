import type { Difficulty, AdaptiveSession, AdaptiveAttempt } from '../types';

const WINDOW_SIZE = 10;
const MIN_ATTEMPTS_BEFORE_ADJUST = 3;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_SESSIONS = 10_000;

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

export class AdaptiveTracker {
  private sessions: Map<string, AdaptiveSession> = new Map();

  getDifficulty(sessionId: string): Difficulty {
    this.pruneExpired();

    const session = this.sessions.get(sessionId);
    if (!session) {
      return 'medium';
    }

    return session.currentDifficulty;
  }

  recordAttempt(sessionId: string, success: boolean): void {
    this.pruneExpired();

    let session = this.sessions.get(sessionId);

    if (!session) {
      session = this.createSession();
      if (this.sessions.size >= MAX_SESSIONS) {
        this.evictOldest();
      }
      this.sessions.set(sessionId, session);
    }

    const attempt: AdaptiveAttempt = {
      timestamp: Date.now(),
      success,
    };

    session.attempts.push(attempt);

    if (session.attempts.length > WINDOW_SIZE) {
      session.attempts = session.attempts.slice(-WINDOW_SIZE);
    }

    session.attemptsSinceAdjustment++;

    if (session.attemptsSinceAdjustment >= MIN_ATTEMPTS_BEFORE_ADJUST) {
      this.adjustDifficulty(session);
    }
  }

  getSession(sessionId: string): AdaptiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  clearSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  clearAll(): void {
    this.sessions.clear();
  }

  get sessionCount(): number {
    return this.sessions.size;
  }

  private createSession(): AdaptiveSession {
    return {
      attempts: [],
      currentDifficulty: 'medium',
      lastAdjustment: Date.now(),
      attemptsSinceAdjustment: 0,
    };
  }

  private adjustDifficulty(session: AdaptiveSession): void {
    const recentAttempts = session.attempts.slice(-WINDOW_SIZE);
    if (recentAttempts.length < MIN_ATTEMPTS_BEFORE_ADJUST) {
      return;
    }

    const successCount = recentAttempts.filter(a => a.success).length;
    const successRate = successCount / recentAttempts.length;

    const currentIndex = DIFFICULTY_ORDER.indexOf(session.currentDifficulty);
    let newIndex = currentIndex;

    if (successRate >= 0.8 && currentIndex < DIFFICULTY_ORDER.length - 1) {
      newIndex = currentIndex + 1;
    } else if (successRate <= 0.4 && currentIndex > 0) {
      newIndex = currentIndex - 1;
    }

    if (newIndex !== currentIndex) {
      session.currentDifficulty = DIFFICULTY_ORDER[newIndex]!;
      session.lastAdjustment = Date.now();
      session.attemptsSinceAdjustment = 0;
    }
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, session] of this.sessions) {
      const lastAttempt = session.attempts.length > 0
        ? session.attempts[session.attempts.length - 1]!.timestamp
        : session.lastAdjustment;

      if (now - lastAttempt > SESSION_TTL_MS) {
        this.sessions.delete(key);
      }
    }
  }

  private evictOldest(): void {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    for (const [key, session] of this.sessions) {
      const lastActivity = session.attempts.length > 0
        ? session.attempts[session.attempts.length - 1]!.timestamp
        : session.lastAdjustment;

      if (lastActivity < oldestTime) {
        oldestTime = lastActivity;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      this.sessions.delete(oldestKey);
    }
  }
}
