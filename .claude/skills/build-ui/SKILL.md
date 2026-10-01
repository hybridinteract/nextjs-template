---
name: build-ui
description: Use before building or changing anything a person sees in this app - a page, screen, section, card, form, table, modal, menu item or component. Keeps new UI inside the app's parts and tokens instead of inventing a look.
---

# Building UI

This app has one look, set by the tokens in `src/app/globals.css` and the parts in
`src/components/`. Your job is to build with them, not to design. A screen that
looks "a bit different" is a bug.

## Before you write any markup

1. Read `CLAUDE.md` §7 to §10, and `docs/rules/10-styling.md`.
2. Open `/dashboard/design` (`npm run dev:mock`, sign in with anything). The code
   is in `src/components/design/`. Find the part you need there and copy how it
   is used.
3. Find the nearest real screen and copy its structure. A new module starts from
   `node ncube.js startdomain <Name>`, whose output already follows the rules.

## While you build

- Use the parts: `Button`; `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`
  and `RadioGroup`, each inside `<Field>`; `Modal`; `DataView` for a list;
  `StatusBadge`; `DetailRow`; `StatsCard`; `PageLayout`. Never a `div` dressed up
  to look like one. ESLint blocks a raw `<button>`, `<input>`, `<select>`,
  `<textarea>`, `<dialog>` or `<table>` outside the folders that build parts.
- Dialogs are always `Modal`. Opening a record from a list is the default side
  panel. Starting something new is `placement="center"`. A destructive action
  asks first, in an `AlertDialog`. Never animate a dialog yourself.
- Colours come only from the tokens, by name: `bg-primary`,
  `text-muted-foreground`, `border-border`, `text-destructive`, `text-success`.
  No hex, no `text-red-500`. Sizes come from Tailwind's scale, never square
  brackets. Lint blocks both.
- Toasts go through `notify` (`@/lib/toast`), from the mutation hook. Dates go
  through `@/lib/date-utils`, money through `@/lib/numeric`.
- Icons are lucide-react, sized `size-4` or `size-3.5`. No other icon set, font
  or component kit.
- Sentence case. Plain words.

## If the part you need does not exist

Stop and ask the person you are working with. Do not invent it inside a feature.
A new part goes in `components/shared` (or `components/ui` for a primitive), and
onto the design page in the same change, once it has three real uses. A new
colour is a token in `globals.css`, set in both `:root` and `.dark`.

## Before you say it is done

- `npm run type-check && npm run lint && npm test && npm run build` all pass. A
  lint error here is usually a design rule. Fix it, never disable it.
- Look at the screen in both themes (Ctrl+K, then "Switch to dark mode"), at
  laptop and phone width, next to a screen that already exists. If it looks like a different app, it is wrong.
