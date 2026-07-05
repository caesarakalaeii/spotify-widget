import type { NowPlaying } from '@/types/nowplaying'
import type { WidgetSettings } from '@/lib/settings/schema'
import { RateLimiter, globalRateLimiter } from '@/lib/poller/rateLimiter'
import { fetchCurrentlyPlaying, UnauthorizedError } from '@/lib/spotify/client'
import { refreshAccessToken } from '@/lib/spotify/oauth'
import { ReauthRequiredError, type SpotifyTokenResponse } from '@/lib/spotify/types'
import { getRefreshToken, updateRefreshToken, setNeedsReauth } from '@/lib/db/users'
import { logger } from '@/lib/logger'

export interface Subscriber {
  onNowPlaying: (np: NowPlaying) => void
  onSettings: (s: WidgetSettings) => void
  onNeedsReauth: () => void
}

interface LoopState {
  userId: string
  refCount: number
  running: boolean
  timer: ReturnType<typeof setTimeout> | null
  graceTimer: ReturnType<typeof setTimeout> | null
  accessToken: string | null
  tokenExpiresAt: number
  latestSnapshot: NowPlaying | null
  subscribers: Set<Subscriber>
}

export interface PollDeps {
  fetchNowPlaying: (accessToken: string) => Promise<NowPlaying>
  refreshAccessToken: (refreshToken: string) => Promise<SpotifyTokenResponse>
  getRefreshToken: (userId: string) => Promise<string | null>
  updateRefreshToken: (userId: string, token: string) => Promise<void>
  setNeedsReauth: (userId: string, v: boolean) => Promise<void>
  rateLimiter: RateLimiter
  now: () => number
  setTimeoutFn: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>
  clearTimeoutFn: (t: ReturnType<typeof setTimeout>) => void
  intervalPlayingMs: number
  intervalIdleMs: number
  graceMs: number
  /** When false (tests), addViewer does not auto-start polling; call pollNow(). */
  autoStart: boolean
}

const defaults: PollDeps = {
  fetchNowPlaying: (token) => fetchCurrentlyPlaying(token),
  refreshAccessToken,
  getRefreshToken,
  updateRefreshToken,
  setNeedsReauth,
  rateLimiter: globalRateLimiter,
  now: () => Date.now(),
  setTimeoutFn: (fn, ms) => setTimeout(fn, ms),
  clearTimeoutFn: (t) => clearTimeout(t),
  intervalPlayingMs: 5_000,
  intervalIdleMs: 15_000,
  graceMs: 60_000,
  autoStart: true,
}

export class PollManager {
  private loops = new Map<string, LoopState>()
  private deps: PollDeps

  constructor(deps: Partial<PollDeps> = {}) {
    this.deps = { ...defaults, ...deps }
  }

  /** Register an SSE viewer for a user's overlay; starts the loop if idle. */
  addViewer(userId: string, sub: Subscriber): void {
    let loop = this.loops.get(userId)
    if (!loop) {
      loop = {
        userId,
        refCount: 0,
        running: false,
        timer: null,
        graceTimer: null,
        accessToken: null,
        tokenExpiresAt: 0,
        latestSnapshot: null,
        subscribers: new Set(),
      }
      this.loops.set(userId, loop)
    }
    if (loop.graceTimer) {
      this.deps.clearTimeoutFn(loop.graceTimer)
      loop.graceTimer = null
    }
    loop.subscribers.add(sub)
    loop.refCount += 1
    // A new viewer immediately gets the last known state (no extra upstream call).
    if (loop.latestSnapshot) sub.onNowPlaying(loop.latestSnapshot)
    if (!loop.running && this.deps.autoStart) this.start(loop)
  }

  /** Deregister a viewer; stop the loop after a grace window at zero viewers. */
  removeViewer(userId: string, sub: Subscriber): void {
    const loop = this.loops.get(userId)
    if (!loop) return
    loop.subscribers.delete(sub)
    loop.refCount = Math.max(0, loop.refCount - 1)
    if (loop.refCount === 0 && !loop.graceTimer) {
      loop.graceTimer = this.deps.setTimeoutFn(() => this.stop(loop), this.deps.graceMs)
    }
  }

  /** Push updated settings to every live viewer of this user's overlay. */
  pushSettings(userId: string, settings: WidgetSettings): void {
    const loop = this.loops.get(userId)
    if (!loop) return
    for (const sub of loop.subscribers) sub.onSettings(settings)
  }

  viewerCount(userId: string): number {
    return this.loops.get(userId)?.refCount ?? 0
  }

  private start(loop: LoopState): void {
    loop.running = true
    void this.tick(loop)
  }

  private stop(loop: LoopState): void {
    if (loop.timer) this.deps.clearTimeoutFn(loop.timer)
    if (loop.graceTimer) this.deps.clearTimeoutFn(loop.graceTimer)
    // Dropping the loop discards latestSnapshot — no Spotify content is retained.
    this.loops.delete(loop.userId)
  }

  private async tick(loop: LoopState): Promise<void> {
    if (loop.refCount === 0) return
    await this.pollNow(loop.userId)
    if (loop.refCount === 0 || !this.loops.has(loop.userId)) return
    const interval = loop.latestSnapshot?.isPlaying
      ? this.deps.intervalPlayingMs
      : this.deps.intervalIdleMs
    loop.timer = this.deps.setTimeoutFn(() => void this.tick(loop), interval)
  }

  /** Run a single poll cycle for a user, fanning the result to subscribers. */
  async pollNow(userId: string): Promise<void> {
    const loop = this.loops.get(userId)
    if (!loop) return

    // Global breaker: skip upstream calls while rate limited (keep last snapshot).
    if (this.deps.rateLimiter.isBlocked()) return

    let token: string
    try {
      token = await this.ensureToken(loop, false)
    } catch (e) {
      if (e instanceof ReauthRequiredError) return this.handleReauth(loop)
      logger.warn('token ensure failed (transient)', { err: String(e) })
      return
    }

    try {
      await this.fetchAndFanout(loop, token)
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        // Access token rejected: force one refresh + retry.
        try {
          const fresh = await this.ensureToken(loop, true)
          await this.fetchAndFanout(loop, fresh)
        } catch (e2) {
          if (e2 instanceof ReauthRequiredError) return this.handleReauth(loop)
          logger.warn('retry after 401 failed', { err: String(e2) })
        }
      } else if (isRateLimited(e)) {
        this.deps.rateLimiter.on429(e.retryAfterSeconds)
        logger.warn('spotify 429', { retryAfter: e.retryAfterSeconds })
      } else {
        logger.warn('poll failed', { err: String(e) })
      }
    }
  }

  private async fetchAndFanout(loop: LoopState, token: string): Promise<void> {
    const np = await this.deps.fetchNowPlaying(token)
    this.deps.rateLimiter.onSuccess()
    loop.latestSnapshot = np
    for (const sub of loop.subscribers) sub.onNowPlaying(np)
  }

  private async ensureToken(loop: LoopState, force: boolean): Promise<string> {
    const now = this.deps.now()
    if (!force && loop.accessToken && now < loop.tokenExpiresAt - 60_000) {
      return loop.accessToken
    }
    const refresh = await this.deps.getRefreshToken(loop.userId)
    if (!refresh) throw new ReauthRequiredError('No refresh token stored')
    const res = await this.deps.refreshAccessToken(refresh) // may throw ReauthRequiredError
    loop.accessToken = res.access_token
    loop.tokenExpiresAt = now + res.expires_in * 1000
    if (res.refresh_token && res.refresh_token !== refresh) {
      await this.deps.updateRefreshToken(loop.userId, res.refresh_token)
    }
    return loop.accessToken
  }

  private async handleReauth(loop: LoopState): Promise<void> {
    try {
      await this.deps.setNeedsReauth(loop.userId, true)
    } catch (e) {
      logger.error('setNeedsReauth failed', { err: String(e) })
    }
    for (const sub of loop.subscribers) sub.onNeedsReauth()
    this.stop(loop)
  }
}

function isRateLimited(e: unknown): e is { retryAfterSeconds: number } {
  return (
    typeof e === 'object' &&
    e !== null &&
    'retryAfterSeconds' in e &&
    typeof (e as { retryAfterSeconds: unknown }).retryAfterSeconds === 'number'
  )
}

/** Process-wide singleton (survives dev hot-reload via globalThis). */
declare global {
  // eslint-disable-next-line no-var
  var __swPollManager: PollManager | undefined
}

export function getPollManager(): PollManager {
  if (!globalThis.__swPollManager) globalThis.__swPollManager = new PollManager()
  return globalThis.__swPollManager
}
