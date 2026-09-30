"use client";

import { isServer, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Don't retry on 401/403/404
          if (
            error instanceof Error &&
            "statusCode" in error &&
            [401, 403, 404].includes((error as { statusCode: number }).statusCode)
          ) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * One client per browser tab, not one per mount.
 *
 * `(auth)` and `(dashboard)` each mount their own `<AppProviders>`, so signing
 * in unmounts one QueryProvider and mounts another. `useLogin` fetches /me just
 * before that, so the sidebar has its menu on the first paint. With a client per
 * mount, that fetch went into a cache that was thrown away, and the dashboard
 * fetched /me again. Influen has that bug. `e2e/auth.spec.ts` guards it.
 *
 * On the server it is a new client every time. A shared one there would hand one
 * person's cached data to the next request.
 */
function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
