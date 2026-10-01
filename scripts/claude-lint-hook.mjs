/**
 * Lints the one file Claude just edited, and hands any error straight back to
 * Claude so it fixes it before moving on.
 *
 * Wired as a PostToolUse hook in `.claude/settings.json`. Claude Code pipes
 * the tool call in as JSON on stdin. Exit code 2 sends stderr back to Claude
 * as feedback. Exit code 0 says nothing.
 *
 * Why: some of this project's rules live in ESLint (no raw toLocaleString or
 * Intl for dates and numbers, React hook rules, see eslint.config.mjs). Without
 * this hook Claude only meets them when someone runs `npm run lint` at the end,
 * after it has built a whole screen the wrong way.
 *
 * Only `.ts`/`.tsx` files under `src/` are linted, and only errors block.
 * Warnings (an unused variable mid-edit) would only nag.
 */

import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SRC = resolve(ROOT, "src");

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function editedFile(payload) {
  const input = JSON.parse(payload);
  const path = input.tool_input?.file_path ?? input.tool_response?.filePath;
  if (!path) return null;
  const file = resolve(ROOT, path);
  if (!file.startsWith(`${SRC}/`)) return null;
  if (!/\.tsx?$/.test(file)) return null;
  return file;
}

async function main() {
  const file = editedFile(await readStdin());
  if (!file) return;

  const eslint = new ESLint({ cwd: ROOT });
  const results = await eslint.lintFiles([file]);
  const errors = results.reduce((sum, result) => sum + result.errorCount, 0);
  if (errors === 0) return;

  // Warnings are left out of the report, so Claude only sees what blocks.
  const errorsOnly = ESLint.getErrorResults(results);
  const formatter = await eslint.loadFormatter("stylish");
  const report = await formatter.format(errorsOnly);
  process.stderr.write(
    `ESLint found ${errors} error(s) in ${relative(ROOT, file)}. Fix them before going on. ` +
      `The rules behind them are in CLAUDE.md and docs/rules/.\n${report}`,
  );
  process.exit(2);
}

main().catch((error) => {
  // A broken hook must not stop the work, but it must say it broke.
  process.stderr.write(`claude-lint-hook failed to run: ${error.stack ?? error}\n`);
  process.exit(1);
});
