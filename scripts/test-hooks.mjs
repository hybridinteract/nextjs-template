/**
 * Module-resolution hooks for `npm test`.
 *
 * Node's built-in test runner strips TypeScript types natively, so the suite needs
 * no dependency and no build step. What Node will *not* do is resolve the two
 * specifier styles this codebase is written in:
 *
 *   import { toBig } from "./decimal";        // extensionless — ESM requires ".ts"
 *   import { apiClient } from "@/lib/api-client";  // the tsconfig path alias
 *
 * Without these hooks only a module with no runtime imports could be tested, which
 * quietly limits the suite to leaf files — exactly the modules least likely to
 * carry a bug. Thirty lines here means any module under `src/` is testable.
 *
 * Type-only imports never reach this code: stripping removes them first.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SRC_URL = pathToFileURL(path.resolve(process.cwd(), "src") + path.sep).href;

/** Tried in order for a specifier that names a directory or omits its extension. */
const CANDIDATES = [".ts", ".tsx", "/index.ts", "/index.tsx"];

const HAS_EXTENSION = /\.[mc]?[jt]sx?$|\.json$/;

export async function resolve(specifier, context, nextResolve) {
  // "@/lib/x" → the real file URL under src/.
  const rewritten = specifier.startsWith("@/")
    ? new URL(specifier.slice(2), SRC_URL).href
    : specifier;

  const isLocal =
    rewritten.startsWith(".") || rewritten.startsWith("/") || rewritten.startsWith("file:");

  if (isLocal && !HAS_EXTENSION.test(rewritten)) {
    const base = new URL(rewritten, context.parentURL ?? SRC_URL);
    for (const ext of CANDIDATES) {
      const candidate = new URL(base.href + ext);
      if (existsSync(candidate)) return nextResolve(candidate.href, context);
    }
  }

  return nextResolve(rewritten, context);
}
