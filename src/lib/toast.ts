import { toast as sonner, type ExternalToast } from "sonner";
import { AppError } from "@/types";

/**
 * The one place anything in the app raises a toast.
 *
 * **Import `notify` from here; never `toast` from `sonner` directly.** That is
 * the whole enforcement mechanism — one grep for `from "sonner"` outside
 * `components/ui/sonner.tsx` finds every call site that skipped the durations,
 * the error handling and the de-duplication below.
 *
 * There is no `promise` or `loading` wrapper here on purpose. Pending state
 * belongs to `useBlockingMutation` and its overlay (§5); a second, competing
 * spinner in the corner is how the same save ends up announcing itself twice.
 */

/**
 * How long each type stays on screen.
 *
 * They are not equal because the reading job is not equal. "Saved" is confirming
 * something you already knew you did — four seconds is generous. An error is
 * news, often with a sentence of detail, and it is the one you may want to read
 * twice or copy out of, so it gets double.
 */
const DURATION = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 8000,
} as const;

/** Everything sonner accepts per toast — `description`, `action`, `id`, `duration`… */
export type NotifyOptions = ExternalToast;

/**
 * Pull a human message out of anything thrown.
 *
 * `AppError` is checked first even though it extends `Error`, because the order
 * documents the intent: the api-client already flattened FastAPI's 422 into a
 * readable sentence, and that is the message worth showing.
 *
 * Exported because forms need the string without the toast — an inline field
 * error is not a toast (§5).
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof AppError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export const notify = {
  success: (message: string, options?: NotifyOptions) =>
    sonner.success(message, { duration: DURATION.success, ...options }),

  info: (message: string, options?: NotifyOptions) =>
    sonner.info(message, { duration: DURATION.info, ...options }),

  warning: (message: string, options?: NotifyOptions) =>
    sonner.warning(message, { duration: DURATION.warning, ...options }),

  /** An error you already have the words for. */
  error: (message: string, options?: NotifyOptions) =>
    sonner.error(message, { duration: DURATION.error, ...options }),

  /**
   * An error you were handed. This is what a mutation's `onError` calls.
   *
   * The id defaults to the fallback text, which makes a retried write *replace*
   * its own last message instead of stacking. A request that fails three times
   * on a flaky connection used to leave three identical red cards on screen and
   * push everything else out of the four-toast window. Pass your own `id` to
   * opt out.
   */
  fromError: (err: unknown, fallback: string, options?: NotifyOptions) =>
    sonner.error(errorMessage(err, fallback), {
      id: `error:${fallback}`,
      duration: DURATION.error,
      ...options,
    }),

  /** Close one toast by the id `notify.*` returned, or all of them. */
  dismiss: (id?: number | string) => sonner.dismiss(id),
};
