/**
 * Global circuit breaker for Spotify 429s. Spotify rate limits are per-client_id
 * (app-wide), so a single shared breaker protects every poll loop at once.
 *
 * On 429 we back off for max(Retry-After, exponential backoff), where the
 * exponential term is min(baseline * 2^n, cap). Any successful call resets it.
 * The clock is injectable so tests can drive it deterministically.
 */
export class RateLimiter {
  private rateLimitedUntil = 0
  private consecutive = 0

  constructor(
    private readonly now: () => number = () => Date.now(),
    private readonly baselineMs = 1000,
    private readonly capMs = 60_000,
  ) {}

  /** Milliseconds until calls are allowed again (0 = allowed now). */
  blockedForMs(): number {
    return Math.max(0, this.rateLimitedUntil - this.now())
  }

  isBlocked(): boolean {
    return this.blockedForMs() > 0
  }

  /** Record a 429 and arm the breaker, honouring Retry-After. */
  on429(retryAfterSeconds: number): void {
    const backoff = Math.min(this.baselineMs * 2 ** this.consecutive, this.capMs)
    const wait = Math.max(retryAfterSeconds * 1000, backoff)
    this.rateLimitedUntil = this.now() + wait
    this.consecutive += 1
  }

  /** Record a success and disarm the breaker. */
  onSuccess(): void {
    this.consecutive = 0
    this.rateLimitedUntil = 0
  }
}

/** Process-wide shared breaker. */
export const globalRateLimiter = new RateLimiter()
