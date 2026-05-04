import { AppError } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────────
interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  fetchOptions?: RequestInit;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function buildUrl(path: string, params?: RequestOptions["params"]): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  const url = new URL(path.startsWith("http") ? path : `${base}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
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

// ── Singleton API client ───────────────────────────────────────────────────────
// This client is stateless — it never stores tokens. Auth is handled by the
// Next.js middleware (proxy.ts) which injects Authorization headers from cookies.
class ApiClient {
  private refreshPromise: Promise<void> | null = null;

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

    const response = await fetch(url, {
      method,
      credentials: "include",
      headers,
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      ...options?.fetchOptions,
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return null as T;
    }

    if (response.status === 401) {
      // Deduplicate concurrent refresh attempts
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
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new AppError("Session expired", 401);
      }

      // Retry once after refresh
      const retried = await fetch(url, {
        method,
        credentials: "include",
        headers,
        body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
        ...options?.fetchOptions,
      });

      if (!retried.ok) {
        if (retried.status === 401 && typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw await parseError(retried);
      }

      if (retried.status === 204) return null as T;
      return retried.json() as Promise<T>;
    }

    if (!response.ok) {
      throw await parseError(response);
    }

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
}

export const apiClient = new ApiClient();
