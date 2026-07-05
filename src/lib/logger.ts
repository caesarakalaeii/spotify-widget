/**
 * Minimal structured logger. Levels gate on LOG_LEVEL (default "info").
 * Never log token plaintext, cookies, or client secrets.
 */
type Level = 'debug' | 'info' | 'warn' | 'error'

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }

function threshold(): number {
  const lvl = (process.env.LOG_LEVEL || 'info').toLowerCase() as Level
  return ORDER[lvl] ?? ORDER.info
}

function emit(level: Level, msg: string, fields?: Record<string, unknown>) {
  if (ORDER[level] < threshold()) return
  const line = { level, msg, ...fields }
  const out = level === 'error' || level === 'warn' ? console.error : console.log
  out(JSON.stringify(line))
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => emit('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => emit('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit('error', msg, fields),
}
