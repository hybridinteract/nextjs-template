#!/usr/bin/env node
/**
 * Documentation checker — relative links resolve, and stamps stay fresh.
 *
 * Two ways documentation goes wrong on its own, without anybody touching it:
 *
 *   1. A file moves or is deleted and every link into it dies.
 *   2. A rule quietly ages past the point where anyone should trust it. Every rule under
 *      docs/rules/ carries "Last verified against the code: <DD Mon YYYY>". Past --max-age
 *      days it is reported as stale.
 *
 * An unstamped or silently-stale rule is worse than no rule, because a reader cannot tell
 * July-true from today-true.
 *
 * Links are checked in every markdown file. Stamps only in docs/rules/, because each rule
 * makes claims about the code. The guides and indexes don't carry stamps.
 *
 * Usage:
 *   npm run check:docs
 *   node scripts/check-docs.mjs --links-only
 *   node scripts/check-docs.mjs --max-age 60
 *   node scripts/check-docs.mjs --strict    # stale stamps become errors
 *   node scripts/check-docs.mjs --quiet     # only problems
 *
 * Exit code is 1 if any error was found. Stale stamps are warnings by default.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SKIP_DIRS = new Set([
  ".git", "node_modules", ".next", "dist", "build", "coverage",
  "test-results", "playwright-report", ".turbo",
  // Agent worktrees are whole copies of the repo nested deeper, so every doc gets
  // checked twice and each ../ link resolves outside the checkout and reads as dead.
  ".claude",
]);

// Files that carry no stamp on purpose.
const STAMP_EXEMPT = new Set([
  "docs/rules/_TEMPLATE.md",
  // The index of the rules, not a rule.
  "docs/rules/README.md",
]);

// Only this subtree is stamp-checked.
const STAMP_ROOT = "docs/rules";

const LINK_RE = /\[[^\]]*\]\(([^)\s]+?)(?:\s+"[^"]*")?\)/g;
const STAMP_RE = /Last verified against the code:\s*\**\s*(\d{1,2}\s+\w+\s+\d{4})/;
const EXTERNAL = ["http://", "https://", "mailto:", "tel:", "#"];

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function markdownFiles(dir = REPO, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      markdownFiles(join(dir, entry.name), out);
    } else if (entry.name.endsWith(".md")) {
      out.push(join(dir, entry.name));
    }
  }
  return out.sort();
}

/** Accepts both "19 Aug 2026" and "19 August 2026". Returns null if unparseable. */
function parseStamp(raw) {
  const [day, month, year] = raw.trim().split(/\s+/);
  const m = MONTHS[month?.slice(0, 3).toLowerCase()];
  if (m === undefined) return null;
  const d = new Date(Number(year), m, Number(day));
  return Number.isNaN(d.getTime()) ? null : d;
}

function checkLinks(files) {
  const errors = [];
  let checked = 0;
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(LINK_RE)) {
      const target = match[1];
      if (EXTERNAL.some((p) => target.startsWith(p))) continue;
      const path = target.split("#")[0];
      if (!path) continue;
      checked++;
      if (!existsSync(resolve(dirname(file), path))) {
        const line = text.slice(0, match.index).split("\n").length;
        errors.push(`${relative(REPO, file)}:${line}  dead link -> ${target}`);
      }
    }
  }
  return { errors, checked };
}

function checkStamps(files, maxAge) {
  const today = new Date();
  const missing = [];
  const stale = [];
  let checked = 0;
  for (const file of files) {
    const rel = relative(REPO, file).split("\\").join("/");
    if (!rel.startsWith(`${STAMP_ROOT}/`) || STAMP_EXEMPT.has(rel)) continue;
    checked++;
    const match = STAMP_RE.exec(readFileSync(file, "utf8"));
    if (!match) {
      missing.push(`${rel}  no 'Last verified against the code' stamp`);
      continue;
    }
    const stamped = parseStamp(match[1]);
    if (!stamped) {
      missing.push(`${rel}  unparseable stamp date: "${match[1]}"`);
      continue;
    }
    const age = Math.floor((today - stamped) / 86400000);
    if (age > maxAge) stale.push(`${rel}  stamp is ${age} days old (${match[1]})`);
  }
  return { missing, stale, checked };
}

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const maxAge = argv.includes("--max-age")
  ? Number(argv[argv.indexOf("--max-age") + 1])
  : 30;
if (!Number.isInteger(maxAge) || maxAge < 1) {
  console.error("--max-age needs a whole number of days, like --max-age 60");
  process.exit(1);
}
const quiet = flag("--quiet");

const files = markdownFiles();
const errors = [];

const links = checkLinks(files);
errors.push(...links.errors);
if (!quiet) console.log(`links   : ${links.checked} checked, ${links.errors.length} dead`);

if (!flag("--links-only")) {
  const stamps = checkStamps(files, maxAge);
  errors.push(...stamps.missing);
  if (flag("--strict")) errors.push(...stamps.stale);
  if (!quiet) {
    console.log(
      `stamps  : ${stamps.checked} checked, ${stamps.missing.length} missing, ` +
        `${stamps.stale.length} older than ${maxAge}d`,
    );
  }
  for (const s of stamps.stale) console.log(`  warn  ${s}`);
}

for (const e of errors) console.log(`  ERROR ${e}`);

if (errors.length) {
  console.log(`\n${errors.length} problem(s). Fix the doc, or the link it points at.`);
  process.exit(1);
}
if (!quiet) console.log("\nDocs OK.");
