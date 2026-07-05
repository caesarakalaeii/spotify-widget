import { z } from 'zod'

/**
 * Environment configuration, validated with zod on first access (lazy, so that
 * importing modules never crashes `next build`). Fail-fast with a clear message
 * when a required var is missing at runtime.
 */
const EnvSchema = z.object({
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  SPOTIFY_REDIRECT_URI: z.string().url(),
  SPOTIFY_SCOPES: z.string().default('user-read-currently-playing'),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  TOKEN_ENCRYPTION_KEY: z.string().min(1),

  BASE_URL: z.string().url(),

  DATABASE_URL: z.string().optional(),
  DATABASE_HOST: z.string().default('127.0.0.1'),
  DATABASE_PORT: z.coerce.number().default(5432),
  DATABASE_NAME: z.string().default('spotify_widget'),
  DATABASE_USER: z.string().default('spotify_user'),
  DATABASE_PASSWORD: z.string().default(''),

  LOG_LEVEL: z.string().default('info'),

  // Overridable so tests can point the Spotify client at a local stub.
  SPOTIFY_ACCOUNTS_BASE: z.string().url().default('https://accounts.spotify.com'),
  SPOTIFY_API_BASE: z.string().url().default('https://api.spotify.com/v1'),
})

export type Env = z.infer<typeof EnvSchema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  cached = parsed.data
  return cached
}

/** Build a libpq connection string from either DATABASE_URL or the discrete vars. */
export function databaseUrl(): string {
  const env = getEnv()
  if (env.DATABASE_URL) return env.DATABASE_URL
  const auth = env.DATABASE_PASSWORD
    ? `${encodeURIComponent(env.DATABASE_USER)}:${encodeURIComponent(env.DATABASE_PASSWORD)}`
    : encodeURIComponent(env.DATABASE_USER)
  return `postgresql://${auth}@${env.DATABASE_HOST}:${env.DATABASE_PORT}/${env.DATABASE_NAME}`
}

/** Reset the cache — test-only. */
export function __resetEnvForTests() {
  cached = null
}
