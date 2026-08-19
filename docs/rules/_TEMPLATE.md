# <Topic>

> Read this before you <the thing this rule governs>.
> Last verified against the code: <DD Mon YYYY>.

Copy this file to start a new rule. Keep all six sections, in this order — the shape is
what makes them scannable and comparable. Delete this paragraph.

Number the file with the next free prefix and add a row to [`README.md`](README.md).

---

## 1. What & why

One paragraph. What this mechanism is and the problem it solves. No tutorial content — if
a reader needs to learn the technology itself, link out.

Name the concrete failure it prevents. A rule whose consequence is unstated gets deleted
by the next person who finds it inconvenient.

## 2. The rules

Hard rules as a bullet list. Each one must be **checkable**: someone reading a diff should
be able to say "line 40 breaks rule 3".

## 3. How it works here

The files that implement it, and how they fit together. One row per file, verified by
reading the code rather than by reading another doc.

| File | Responsibility |
|---|---|
| `src/...` | |

## 4. Deliberately not done

What looks like it should follow this rule and doesn't, **with the reason and the
consequence**. This is the section that makes the doc trustworthy — without it, the next
person "fixes" a deliberate omission.

## 5. New module checklist

A short numbered list: what to do about this rule when building something new.

## 6. How to re-check this doc

The literal commands that rebuild section 3, with the result they should produce.

```bash
# what this proves
<command>
```

**If a command here disagrees with the doc, the doc is stale — fix it before relying on
it.** This is the only thing standing between this file and quiet rot.
