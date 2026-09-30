/**
 * Proves `node ncube.js startdomain` writes code that passes type-check and lint.
 *
 * Run: `npm run test:generator`. CI runs it on every push.
 *
 * Why: new modules get copied from whatever the generator writes. It used to
 * write a Zustand store, a raw <button>, a shadcn Dialog with no unsaved-work
 * guard and a toLocaleDateString() call, and it failed lint on its first run.
 * Nothing noticed, because nothing ran it.
 *
 * Each scenario copies the project to a temp folder, runs ncube there, then runs
 * tsc and ESLint (zero warnings) on the copy. The real project is never touched.
 * The scenarios cover the optional parts the generator adapts to, because
 * `ncube remove` can take them out: permissions and the blocking overlay.
 */

import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

// Not copied. node_modules is linked instead, and the rest is build output or
// tool state that has nothing to do with the source.
const SKIP = new Set([
  "node_modules", ".next", ".git", ".claude", "test-results", "playwright-report", "coverage",
]);

// "Probe" names, because a project made from the template runs this test too,
// and a real `categories` module there would make "Category" fail for no reason.
const SCENARIOS = [
  {
    name: "the full template, two modules",
    steps: [
      // Two words, and a y-to-ies plural.
      { args: ["startdomain", "ProbeCategory"] },
      // A second module, so registrations must append, not collide.
      { args: ["startdomain", "ProbePerson", "--plural", "ProbePeople"] },
      // Same name again must stop before writing anything.
      { args: ["startdomain", "ProbeCategory"], fails: true },
    ],
  },
  {
    name: "without permissions",
    steps: [{ args: ["remove", "permissions"] }, { args: ["startdomain", "ProbeCategory"] }],
  },
  {
    name: "without the blocking overlay",
    steps: [{ args: ["remove", "blocking-loading"] }, { args: ["startdomain", "ProbeCategory"] }],
  },
];

function copyProject() {
  const dir = mkdtempSync(join(tmpdir(), "ncube-test-"));
  cpSync(ROOT, dir, { recursive: true, filter: (src) => !SKIP.has(basename(src)) });
  symlinkSync(join(ROOT, "node_modules"), join(dir, "node_modules"));
  return dir;
}

/** Runs a command in `cwd`. Returns its output, or throws with the output attached. */
function run(cwd, command, args) {
  try {
    return execFileSync(command, args, { cwd, encoding: "utf8", stdio: "pipe" });
  } catch (error) {
    error.output = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim();
    throw error;
  }
}

function runStep(dir, step) {
  const label = `ncube ${step.args.join(" ")}`;
  if (!step.fails) {
    run(dir, process.execPath, ["ncube.js", ...step.args]);
    return;
  }
  try {
    run(dir, process.execPath, ["ncube.js", ...step.args]);
  } catch {
    return; // It refused, which is what this step checks.
  }
  throw Object.assign(new Error(`${label} should have failed, but it succeeded`), { output: "" });
}

function runScenario(scenario) {
  const dir = copyProject();
  try {
    for (const step of scenario.steps) runStep(dir, step);
    run(dir, "npx", ["tsc", "--noEmit"]);
    run(dir, "npx", ["eslint", "src", "--max-warnings", "0"]);
    rmSync(dir, { recursive: true, force: true });
    return { ok: true };
  } catch (error) {
    // Kept on failure, so you can open the generated files and see what broke.
    return { ok: false, dir, message: error.message, output: error.output ?? "" };
  }
}

let failures = 0;
for (const scenario of SCENARIOS) {
  process.stdout.write(`… ${scenario.name}\n`);
  const result = runScenario(scenario);
  if (result.ok) {
    console.log(`✔ ${scenario.name}`);
    continue;
  }
  failures += 1;
  console.log(`✘ ${scenario.name}`);
  console.log(`  ${result.message.split("\n")[0]}`);
  if (result.output) console.log(result.output.replace(/^/gm, "    "));
  console.log(`  The copy is kept at ${result.dir}`);
}

console.log(failures ? `\n${failures} scenario(s) failed.` : "\nThe generator's output passes type-check and lint.");
process.exit(failures ? 1 : 0);
