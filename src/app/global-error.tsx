"use client";

/**
 * The last resort: an error thrown by the root layout itself.
 *
 * This boundary replaces the entire document, so it must render its own `<html>`
 * and `<body>` — the layout that would normally provide them is what failed. It
 * also cannot use the app's providers or fonts for the same reason, so the styling
 * here is deliberately inline and self-contained.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
          color: "#18181b",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ maxWidth: "28rem", padding: "1.5rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#71717a", margin: "0 0 1.25rem" }}>
            The application failed to start. Reloading usually clears it.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#a1a1aa",
                fontFamily: "ui-monospace, monospace",
                margin: "0 0 1.25rem",
              }}
            >
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              border: "1px solid #e4e4e7",
              background: "#fff",
              borderRadius: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
