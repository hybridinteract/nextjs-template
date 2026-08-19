# Forms & Unsaved Work

> Read this before you add a form, or a modal that holds typed input.
> Last verified against the code: 19 Aug 2026.

Guardrail: [`../../CLAUDE.md`](../../CLAUDE.md) §9.

---

## 1. What & why

Forms use **react-hook-form + zod**. The schema doubles as the payload guard, so validation
and typing come from one declaration instead of two that drift.

The second half of this rule matters more than the first. A modal holding typed input and
no `isDirty` loses the user's work to one stray Escape — no warning, no undo. On a long
form that is several minutes of typing, and the user has no idea it was avoidable.

## 2. The rules

- New forms use react-hook-form + zod. Derive the values type with `z.infer`.
- `formToPayload(values)` produces the snake_case payload: trims strings, maps `""` →
  `undefined`, drops server-owned fields.
- **A modal holding typed input must pass `<Modal isDirty>`.**
- **Dirtiness compares against the state the form opened with, never against empty.** An
  edit form starts full, so "not empty" marks every edit dirty before the user touches it —
  and a prompt that always fires is a prompt people learn to click through.
- **It must also clear that state**, via `useResetOnOpen(isOpen, reset)`, a seeding
  `openCreate()`, or `<Modal onDiscard>`. These panels stay mounted while closed, so
  otherwise "Discard" throws nothing away and the values are still there on the next open.
- Autosave only where the record already exists and the form is long enough to earn it.

## 3. How it works here

| File | Responsibility |
|---|---|
| `src/lib/forms/dirty.ts` | `isFormDirty(current, initial)`, `isEqual`, `anyFilled`. |
| `src/lib/forms/reset-on-open.ts` | `useResetOnOpen` — clears a panel on the false→true transition. |
| `src/components/ui/modal.tsx` | The `isDirty` guard, the discard prompt, the `beforeunload` warning. |
| `src/components/shared/form-fields.tsx` | `<Field>` and `<DetailRow>`. |

```tsx
const form = useForm<OrderFormValues>({
  resolver: zodResolver(orderFormSchema),
  defaultValues: emptyOrderForm,
});

<Modal
  isOpen={isOpen}
  onClose={close}
  title="New order"
  isDirty={form.formState.isDirty}
  onDiscard={() => form.reset(emptyOrderForm)}
  footer={<FormActions onSubmit={form.handleSubmit(submit)} />}
>
  <Field label="Reference" required error={form.formState.errors.reference?.message}>
    <Input {...form.register("reference")} />
  </Field>
</Modal>
```

**Two dirty-checks, two situations.** react-hook-form gives `formState.isDirty` for free and
it already compares against `defaultValues` — use it. `isFormDirty` from `@/lib/forms` is
for a panel holding plain `useState`, which a small create modal with three pickers often
is. `anyFilled` is the create-only shortcut when the fields start empty.

**`useResetOnOpen` adjusts state during render, not in an effect.** An effect renders the
stale values once before clearing them, and `react-hooks/set-state-in-effect` rejects it.
Do **not** pass react-hook-form's `reset` to it — RHF forms already re-`reset` on open from
their own effect; keep it there.

## 4. Deliberately not done

| Not done | Why |
|---|---|
| **The footer Cancel button is not covered by the guard** | That is the form's own control and its owner decides what it means. Route it through the same guard only if abandoning really should be confirmed there too. |
| **No global "unsaved changes" router guard** | Next's App Router has no stable navigation-blocking API, and a partial guard is worse than none — it teaches people the app will catch them, and then it does not. |
| **Zod is not used on API responses** | See [`02-wire-format.md`](02-wire-format.md) §4. Human input is validated; a typed wire boundary is not. |

## 5. New module checklist

1. Define `xFormSchema` with zod; derive `XFormValues` with `z.infer`.
2. `emptyXForm` for create, `xToForm(entity)` for edit.
3. `formToPayload(values)` — trim, drop empties, snake_case out.
4. Pass `isDirty` to the modal. Verify a stray Escape prompts.
5. Verify the panel is clear the second time it opens.

## 6. How to re-check this doc

```bash
# Modals with an input inside and no isDirty. Read each hit.
for f in $(grep -rl "<Modal" src/components/ 2>/dev/null); do
  grep -q "isDirty" "$f" || echo "NO isDirty: $f"
done
```

```bash
# Dirty checks written against empty instead of the opened state.
grep -rn "isFormDirty(.*empty" src/
```
