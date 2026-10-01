/**
 * The sentence inside a FastAPI error's `detail`, when there is one.
 *
 * FastAPI sends `detail` in three shapes, and all three must reach a person as
 * words:
 *
 *   - a string: "Incorrect email or password". That is the sentence.
 *   - a 422 list of issues: [{ loc: ["body", "email"], msg: "..." }]. Flattened
 *     to "email: ...; password: ...".
 *   - an object with a `message`, when the backend refuses and also sends
 *     something to act on (the next step, the missing fields).
 *
 * Anything else returns null, so the caller's fallback wins.
 *
 * Used by `api-client.ts` for browser requests, and by the `/api/auth/*` route
 * handlers, which talk to the backend directly and so never pass through the
 * api-client. Pure, with no imports, so both sides can use it.
 */
export function detailToMessage(detail: unknown): string | null {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return issuesToMessage(detail);
  if (detail && typeof detail === "object" && "message" in detail) {
    const message = (detail as { message: unknown }).message;
    return typeof message === "string" ? message : null;
  }
  return null;
}

function issuesToMessage(issues: unknown[]): string | null {
  const lines: string[] = [];
  for (const issue of issues) {
    const line = issueToLine(issue);
    if (line) lines.push(line);
  }
  return lines.length > 0 ? lines.join("; ") : null;
}

// "email: value is not a valid email address". The field is the last part of
// `loc`, but only when it is a name. A list index like `0` means nothing to the
// person reading it, so the message stands alone.
function issueToLine(issue: unknown): string | null {
  if (!issue || typeof issue !== "object") return null;
  const { msg, loc } = issue as { msg?: unknown; loc?: unknown };
  if (typeof msg !== "string") return null;

  const field = Array.isArray(loc) ? loc.at(-1) : undefined;
  return typeof field === "string" ? `${field}: ${msg}` : msg;
}
