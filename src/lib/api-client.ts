import { AppError } from "@/types";
import { useSessionStore } from "@/lib/auth/session-store";

// ── Types ──────────────────────────────────────────────────────────────────────
interface RequestOptions {
  /**
   * Query params. An array value becomes a **repeated** param (`?ids=a&ids=b`),
   * which is what FastAPI parses back into a list — a comma-joined single value
   * would arrive as one malformed string and 422.
   */
  params?: Record<
    string,
    string | number | boolean | readonly string[] | readonly number[] | undefined
  >;
  headers?: Record<string, string>;
  fetchOptions?: RequestInit;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function buildUrl(path: string, params?: RequestOptions["params"]): string {
  // Browser requests MUST be same-origin so the Next.js proxy (proxy.ts) can
  // inject the Authorization header from the httpOnly cookie. NEXT_PUBLIC_API_URL
  // is only for server-side BFF route handlers that talk to the backend directly.
  //
  // Pointing this at the backend origin instead is the bug this comment exists to
  // stop: the cookies live on the Next.js origin, so a cross-origin call carries
  // no credentials and every authenticated request 401s.
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_API_URL ?? "");
  const url = new URL(path.startsWith("http") ? path : `${base}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (Array.isArray(v)) {
        // Repeated, not comma-joined — see the `params` doc comment above. An
        // empty array contributes nothing rather than an empty `?k=`.
        v.forEach((item) => url.searchParams.append(k, String(item)));
        return;
      }
      url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function parseError(response: Response): Promise<AppError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  // Flatten FastAPI 422 validation errors: [{ msg, loc }] → "field: message"
  if (
    response.status === 422 &&
    body &&
    typeof body === "object" &&
    "detail" in body &&
    Array.isArray((body as { detail: unknown }).detail)
  ) {
    const detail = (body as { detail: Array<{ msg: string; loc: string[] }> }).detail;
    const message = detail
      .map((issue) => `${issue.loc.at(-1) ?? "field"}: ${issue.msg}`)
      .join("; ");
    return new AppError(message, 422, detail, body);
  }

  const message =
    body &&
    typeof body === "object" &&
    "detail" in body &&
    typeof (body as { detail: unknown }).detail === "string"
      ? (body as { detail: string }).detail
      : `Request failed with status ${response.status}`;

  return new AppError(message, response.status, body, body);
}

// ── Optimistic concurrency ─────────────────────────────────────────────────────

/**
 * Edit precondition for a single-record write.
 *
 * Where a backend enforces it, every update of a business record declares which
 * version it was built from, or the write is rejected with 428. The version is
 * the `updatedAt` the read returned — echo it back untouched; never synthesise
 * one from `Date.now()` or a re-read, which defeats the check it exists to make.
 *
 * A 409 back means someone else saved first: tell the user, refetch, and let them
 * redo their edit on top. See {@link isConflict}.
 */
export function ifMatch(version: string): { headers: Record<string, string> } {
  return { headers: { "If-Match": `"${version}"` } };
}

/** Did this write lose a race with someone else's save? (409 from the precondition.) */
export function isConflict(err: unknown): boolean {
  return err instanceof AppError && err.statusCode === 409;
}

// ── Singleton API client ───────────────────────────────────────────────────────
// This client is stateless — it never stores tokens. Auth is handled by the
// Next.js middleware (proxy.ts), which injects the Authorization header from the
// httpOnly cookie. Do not add a second http client (no axios) and do not add
// tokens here.
class ApiClient {
  private refreshPromise: Promise<void> | null = null;

  /**
   * The 401 → refresh → retry dance, in one place.
   *
   * Every verb goes through here, including the blob helpers. Writing it per
   * method is how the three copies in the app it came from drifted apart.
   *
   * `doFetch` is a thunk rather than a Response because the retry has to build a
   * fresh request — a Response cannot be replayed.
   */
  private async withAuthRetry(doFetch: () => Promise<Response>): Promise<Response> {
    const response = await doFetch();
    if (response.status !== 401) return response;

    // Deduplicate concurrent refreshes: a screen firing six queries at once must
    // not send six refresh requests and rotate the token six times.
    if (!this.refreshPromise) {
      this.refreshPromise = fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      })
        .then((r) => {
          if (!r.ok) throw new Error("Refresh failed");
        })
        .finally(() => {
          this.refreshPromise = null;
        });
    }

    try {
      await this.refreshPromise;
    } catch {
      this.onSessionExpired();
      throw new AppError("Session expired", 401);
    }

    const retried = await doFetch();
    if (retried.status === 401) {
      this.onSessionExpired();
      throw new AppError("Session expired", 401);
    }
    return retried;
  }

  /**
   * What happens when the session is truly gone.
   *
   * Raises a flag; it does not navigate. `<SessionExpiredDialog>` picks it up and
   * asks the user before leaving the page, because a redirect from here silently
   * throws away whatever they had half-typed. The path travels with it so the
   * login page can send them back — `proxy.ts` already reads `?redirect=`.
   */
  private onSessionExpired(): void {
    if (typeof window === "undefined") return;
    const back = `${window.location.pathname}${window.location.search}`;
    useSessionStore.getState().markExpired(back);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const url = buildUrl(path, options?.params);
    const headers: Record<string, string> = {
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options?.headers,
    };

    const response = await this.withAuthRetry(() =>
      fetch(url, {
        method,
        credentials: "include",
        headers,
        body:
          body instanceof FormData
            ? body
            : body !== undefined
              ? JSON.stringify(body)
              : undefined,
        ...options?.fetchOptions,
      }),
    );

    if (!response.ok) throw await parseError(response);
    // 204 No Content — and any other body-less success.
    if (response.status === 204) return null as T;
    return response.json() as Promise<T>;
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, undefined, options);
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", path, body, options);
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PUT", path, body, options);
  }

  delete<T = void>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, undefined, options);
  }

  upload<T>(path: string, formData: FormData, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, formData, options);
  }

  /** GET a binary payload (a PDF or spreadsheet export). Same auth handling. */
  async downloadBlob(path: string, options?: RequestOptions): Promise<Blob> {
    const url = buildUrl(path, options?.params);
    const response = await this.withAuthRetry(() =>
      fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { ...options?.headers },
        ...options?.fetchOptions,
      }),
    );
    if (!response.ok) throw await parseError(response);
    return response.blob();
  }

  /**
   * POST a JSON body and get a binary payload back.
   *
   * The GET sibling cannot carry a body, and a live preview has to send a whole
   * definition to be rendered without being saved. A raw `fetch` in a module's
   * `api.ts` would skip the auth handling — use this instead.
   *
   * Pass `fetchOptions: { signal }` for anything fired on a debounce, so an
   * abandoned preview is cancelled rather than resolving over a newer answer.
   */
  async postBlob(path: string, body: unknown, options?: RequestOptions): Promise<Blob> {
    const url = buildUrl(path, options?.params);
    const response = await this.withAuthRetry(() =>
      fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...options?.headers },
        body: JSON.stringify(body),
        ...options?.fetchOptions,
      }),
    );
    if (!response.ok) throw await parseError(response);
    return response.blob();
  }
}

export const apiClient = new ApiClient();
