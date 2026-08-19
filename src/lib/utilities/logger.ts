/**
 * Tiny logger wrapper. Today it forwards to the console; later it can route to
 * Sentry or Datadog without touching a single call site.
 *
 * Use this instead of a bare `console.error` in production code paths — that is
 * the whole reason it exists. Console calls scattered through the app are noise
 * in development and invisible in production.
 */

const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    if (isDev) {
      console.error(`[error] ${message}`, error ?? "", context ?? "");
    }
    // TODO: forward to your error reporter here.
  },
  warn(message: string, context?: Record<string, unknown>) {
    if (isDev) {
      console.warn(`[warn] ${message}`, context ?? "");
    }
  },
  info(message: string, context?: Record<string, unknown>) {
    if (isDev) {
      console.info(`[info] ${message}`, context ?? "");
    }
  },
};
