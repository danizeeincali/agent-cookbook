/**
 * Rate limiting for receipt submissions
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number = 100, windowMinutes: number = 60) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMinutes * 60 * 1000;
  }

  /**
   * Check if agent is within rate limit
   */
  isAllowed(agentKey: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(agentKey);

    if (!entry) {
      // First request
      this.limits.set(agentKey, { count: 1, windowStart: now });
      return true;
    }

    const windowAge = now - entry.windowStart;

    if (windowAge > this.windowMs) {
      // Window expired, reset
      this.limits.set(agentKey, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      // Rate limit exceeded
      return false;
    }

    // Increment count
    entry.count++;
    return true;
  }

  /**
   * Clean up old entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now - entry.windowStart > this.windowMs) {
        this.limits.delete(key);
      }
    }
  }
}
