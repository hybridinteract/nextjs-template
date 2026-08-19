# Documentation

Everything written down about this template, and what each thing is for.

## Start here

| Document | What it is for |
|---|---|
| [`../README.md`](../README.md) | Setting the template up and running it. Read first. |
| [`../CLAUDE.md`](../CLAUDE.md) | **The guardrail.** The conventions in one page, plus the anti-patterns list. Claude Code reads it automatically; read it yourself before your first change. |
| [`rules/README.md`](rules/README.md) | **The rules, one per file.** The detail behind every line in `CLAUDE.md` — what the rule is, how it works here, what was deliberately left undone, and how to check the file is still true. |
| [`FRONTEND_ARCHITECTURE_GUIDE_V3.md`](FRONTEND_ARCHITECTURE_GUIDE_V3.md) | **The narrative.** How the pieces fit together, and the life of a request end to end. Read this when meeting the codebase; read `rules/` when making a decision. |

## Reference

| Document | What it is for |
|---|---|
| [`../RELEASE_NOTES.md`](../RELEASE_NOTES.md) | What changed in each version of the template. |
| [`OPTIONAL_PARTS.md`](OPTIONAL_PARTS.md) | **What you can delete.** Every optional subsystem, what it costs to keep, and the one command that removes it cleanly. Generated from `ncube.js` — read this early, while removal is still easy. |
| [`TEMPLATE_UPDATE_PLAN.md`](TEMPLATE_UPDATE_PLAN.md) | The plan behind the 0.2.0 rewrite — what was brought over from the production app it seeded, and what was deliberately left there. Historical once the phases are done. |

## Which one do I read?

| I want to… | Read |
|---|---|
| get the app running | [`../README.md`](../README.md) |
| strip out what my project won't use | [`OPTIONAL_PARTS.md`](OPTIONAL_PARTS.md) |
| understand the shape of the codebase | the architecture guide |
| know whether I am allowed to do X | the matching file in [`rules/`](rules/README.md) |
| check myself before opening a PR | the anti-patterns list in [`../CLAUDE.md`](../CLAUDE.md) |
| point an AI tool at the conventions | [`../CLAUDE.md`](../CLAUDE.md) — Claude Code reads it automatically; tell any other tool to read it from the repo |

## The one-owner rule

Each rule has exactly one home, in [`rules/`](rules/README.md). Everything else states it
briefly and links there. When a rule changes, that folder is what you edit — otherwise the
same contract ends up restated in four places and the copies disagree.
