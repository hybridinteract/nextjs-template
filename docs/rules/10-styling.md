# Styling — semantic tokens only

> Read this before you write a colour.
> Last verified against the code: 30 Sep 2026.

Guardrail: [`../../CLAUDE.md`](../../CLAUDE.md) §10.

---

## 1. What & why

Colour comes from CSS-variable tokens defined in `src/app/globals.css`. Never from the raw
Tailwind palette, never from a hex literal.

This is what makes dark mode work. `text-green-600` is a fixed colour: it is readable on
white and nearly invisible on the dark card behind it. The token `text-success` is defined
twice — once per theme — so the same class means the right thing in both.

## 2. The rules

- Use the tokens: `bg-primary` `text-primary-foreground` `text-muted-foreground`
  `border-border` `bg-card` `text-destructive` `text-success` `text-warning` `text-info`
  `bg-accent`.
- ❌ `text-red-500`, `text-green-600`, `bg-gray-100`, `style={{ color: "#AA232B" }}`
- ✅ `text-destructive`, `text-success`, `bg-muted`, `text-primary`
- **ESLint blocks the raw palette, hex and any hand-picked colour in a class name.** Until
  30 Sep 2026 this was only written down. `ROLE_COLORS` in `lib/permissions/config.ts` held
  four raw-palette strings the whole time, unused, and the `.tsx`-only grep below never saw
  them. It is deleted.
- Sizes, corners, shadows and timings come from Tailwind's scale. A value in square
  brackets fails lint, except in the folders that build parts.
- Status pills go through `<StatusBadge label tone>`. Map a domain status to a tone in a
  small helper (`orderStatusTone`), not inline at each call site.
- Compose classes with `cn()` from `@/lib/utils`.
- Use the shadcn primitives (`Button`, `Input`, `Select`, `Switch`, `Textarea`,
  `Checkbox`…). Do not restyle a native element to look like one. ESLint blocks a raw
  `<button>`, `<input>`, `<select>`, `<textarea>`, `<dialog>` or `<table>` outside the
  folders that build parts.
- **Every shared part is on the design page**, `/dashboard/design`
  (`src/components/design/`). Copy from there. A new part goes on it in the same change.
- Style buttons with `<Button variant size>`, never a hand-written class string.
- Icons come from `lucide-react`, sized with `size-4` / `size-3.5`. No other icon set or
  component kit, Radix only through `components/ui`, fonts only in `app/layout.tsx`. Lint
  blocks the imports.
- **Anything that portals to `document.body` takes its z-index from the ladder in
  `globals.css`**: `z-(--z-modal)`, `z-(--z-dialog)`, `z-(--z-popper)`, `z-(--z-tooltip)`.
  Never a bare `z-50` or `z-[100]`. The rule is that a layer opened from inside another
  sits above it. Radix's Portal creates no stacking context, so a popper competes directly
  with the panel it opened from. When `<Modal>` sat at `z-[100]` and the poppers at `z-50`,
  a `<Select>` inside a modal opened behind it and looked dead. `e2e/modal.spec.ts` guards it.
- Import order, seen throughout: external packages → `@/lib/*` → `@/components/*` →
  relative `./`.

## 3. How it works here

`globals.css` holds the tokens twice — `:root` for light, `.dark` for dark — and maps them
into Tailwind utilities in the `@theme inline` block. A token that is not mapped there does
not produce a class.

| Token group | Tokens |
|---|---|
| Surface | `background` `foreground` `card` `card-foreground` `popover` `muted` `accent` |
| Brand | `primary` `primary-foreground` `secondary` `secondary-foreground` |
| Semantic | `destructive` **`success`** **`warning`** **`info`** |
| Structure | `border` `input` `ring` `radius` |
| Sidebar | `sidebar` `sidebar-foreground` `sidebar-primary` `sidebar-accent` `sidebar-border` |
| Charts | `chart-1` … `chart-5` |

`success`, `warning` and `info` were added on 19 Aug 2026. Their absence is exactly why code
reaches for `text-green-600`: if the token does not exist, the palette is the only option.
They are **lifted, not inverted** in dark mode — the light values are too dark to read on a
dark ground.

### What lint enforces, and where

The rules are in `eslint.config.mjs`, and the Claude lint hook runs them on every file
Claude edits.

| Rule | Feature code | `shared/`, `data-view/` | `ui/`, `layout/` |
|---|---|---|---|
| No raw palette, hex or hand-picked colour | blocked | blocked | allowed |
| No size in square brackets | blocked | allowed | allowed |
| No raw `<button>`, `<input>` and the rest | blocked | allowed | allowed |
| No colour or font in an inline `style` | blocked | allowed | allowed |
| Icons, UI kits, Radix, fonts | blocked | blocked | Radix allowed |

`ui/` and `layout/` build the design system, so they set their own values. `shared/` and
`data-view/` build parts from raw elements and their own sizes, but take colour from the
tokens like everyone else. Tests and `app/global-error.tsx` sit with `shared/`.

### The design page

`/dashboard/design` shows every shared part in its common states: colours, type, buttons,
fields, status tones, data, toasts and dialogs. It uses only parts `ncube remove` cannot
take out, so it keeps compiling whatever a project removes. It is not in the sidebar,
because it is for developers. `e2e/design.spec.ts` checks every section renders and the page
does not scroll sideways on a phone. Claude reaches it through the `build-ui` skill in
`.claude/skills/`.

### Rebranding

Change the values in `:root` and `.dark`. Nothing else. Use [oklch.com](https://oklch.com)
to pick in the same colour space as the defaults.

```css
:root  { --primary: oklch(0.55 0.20 250); --radius: 0.75rem; }
.dark  { --primary: oklch(0.70 0.18 250); }
```

## 4. Deliberately not done

| Not done | Why |
|---|---|
| **No `tailwind.config.js`** | Tailwind v4 is CSS-native. Configuration lives in `globals.css`, which is also where the tokens are — one file instead of two that must agree. |
| **No `styles.ts` string constants** | A `btnPrimary` string is a second button API that does not know about `variant`, `size`, `disabled` or focus rings. Use `<Button>`. |
| **A diff view is the one place accent colour touches body text** | Use `destructive` / `success` / `warning` for removed / added / modified, and keep row body text on `text-foreground` — only the markers and totals take the accent. |
| **No motion tokens** | Herbally IP has a set: four durations and three easings, in CSS and in `lib/motion.ts`. The template has two framer-motion animations, the Modal and the bulk-action bar. A shared module for two call sites is an abstraction before its time. Add the set when a project's own design sets timings. |
| **No named type scale** | Herbally IP names its sizes (`text-title`, `text-small`) because its design study set them. The template uses Tailwind's scale as it is. A project with its own design adds `--text-*` tokens in `globals.css`, and the lint message should then name them. |
| **`app/global-error.tsx` uses inline hex** | It replaces the whole document when the **root layout itself** throws — the layout that would have loaded `globals.css` is what failed. It cannot reference a token that is not loaded. With the next row, the only place in the app allowed literal colours, and why the grep below excludes it. |
| **The browser's `theme-color` is hex too** | `viewport.themeColor` in `app/layout.tsx` and the colours in `app/manifest.ts` become a `<meta>` tag and a manifest field. The browser paints its own toolbar from them, outside the page, where no CSS variable reaches. Change them by hand with a rebrand. |

## 5. New module checklist

1. No hex, no palette classes.
2. Statuses map to a `StatusTone` in one helper.
3. Use shadcn primitives; add new ones with `npx shadcn@latest add <name>`.
4. Check the module in dark mode before calling it done. Ctrl+K (⌘K on a Mac), then
   "Switch to dark mode". Until 30 Sep 2026 nothing in the app could switch it.

## 6. How to re-check this doc

```bash
# The design rules pass. Lint is the real check. The grep below is a backstop
# for an eslint-disable.
npx eslint src
```

```bash
# Raw palette classes, in .ts files too. Expect zero.
grep -rnE "(text|bg|border|ring|fill|stroke)-(red|green|blue|amber|yellow|orange|gray|zinc|slate|neutral|stone|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-[0-9]" src/ --include="*.ts" --include="*.tsx"
```

```bash
# A bare z-index on something that portals. Expect only avatar.tsx (z-10, in-page),
# the blocking overlay (z-[9999], meant to cover everything) and the discard
# prompt inside the modal (z-20, in-page).
grep -rnoE "z-\[[0-9]+\]|z-[0-9]+\b" src/components
```

```bash
# Inline hex. Expect zero. global-error.tsx renders without the stylesheet, and
# the theme-color in app/layout.tsx is read by the browser (see section 4).
grep -rnE "#[0-9A-Fa-f]{3,8}\b" src/ --include="*.tsx" | grep -v "global-error.tsx\|src/app/layout.tsx"
```

```bash
# Every COLOUR token defined in :root is also defined in .dark. A colour that
# exists in only one theme is unreadable in the other.
# `--radius` and the `--z-*` stacking layers are deliberately light-only: neither
# a corner radius nor a stacking order changes with the theme.
diff <(sed -n '/^:root {/,/^}/p' src/app/globals.css | grep -oE "^\s+--[a-z0-9-]+" | tr -d ' ' | grep -vE "^--(radius|z-[a-z]+)$" | sort) \
     <(sed -n '/^\.dark {/,/^}/p' src/app/globals.css | grep -oE "^\s+--[a-z0-9-]+" | tr -d ' ' | sort) \
  && echo "in step"
```
