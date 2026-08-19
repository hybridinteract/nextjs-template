# Styling — semantic tokens only

> Read this before you write a colour.
> Last verified against the code: 19 Aug 2026.

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
- **The codebase is at zero raw-palette usages. Keep it at zero.**
- Status pills go through `<StatusBadge label tone>`. Map a domain status to a tone in a
  small helper (`orderStatusTone`), not inline at each call site.
- Compose classes with `cn()` from `@/lib/utils`.
- Use the shadcn primitives (`Button`, `Input`, `Select`, `Switch`, `Textarea`,
  `Checkbox`…). Do not restyle a native element to look like one.
- Style buttons with `<Button variant size>`, never a hand-written class string.
- Icons come from `lucide-react`, sized with `size-4` / `size-3.5`.
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
| **`app/global-error.tsx` uses inline hex** | It replaces the whole document when the **root layout itself** throws — the layout that would have loaded `globals.css` is what failed. It cannot reference a token that is not loaded. This is the only file in the app allowed literal colours, and it is why the grep below excludes it. |

## 5. New module checklist

1. No hex, no palette classes.
2. Statuses map to a `StatusTone` in one helper.
3. Use shadcn primitives; add new ones with `npx shadcn@latest add <name>`.
4. Check the module in dark mode before calling it done.

## 6. How to re-check this doc

```bash
# Raw palette classes. Expect zero.
grep -rnE "(text|bg|border|ring|fill|stroke)-(red|green|blue|amber|yellow|orange|gray|zinc|slate|neutral|stone|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-[0-9]" src/ --include="*.tsx"
```

```bash
# Inline hex. Expect zero — global-error.tsx is the one sanctioned exception
# (it renders without the stylesheet; see section 4).
grep -rnE "#[0-9A-Fa-f]{3,8}\b" src/ --include="*.tsx" | grep -v "global-error.tsx"
```

```bash
# Every COLOUR token defined in :root is also defined in .dark. A colour that
# exists in only one theme is unreadable in the other.
# `--radius` is deliberately light-only: a corner radius does not change with
# the theme, so it is excluded here.
diff <(sed -n '/^:root {/,/^}/p' src/app/globals.css | grep -oE "^\s+--[a-z0-9-]+" | tr -d ' ' | grep -v "^--radius$" | sort) \
     <(sed -n '/^\.dark {/,/^}/p' src/app/globals.css | grep -oE "^\s+--[a-z0-9-]+" | tr -d ' ' | sort) \
  && echo "in step"
```
