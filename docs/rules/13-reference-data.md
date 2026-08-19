# Reference Data & Pickers

> Read this before you add a dropdown, a filter, or a column showing another module's name.
> Last verified against the code: 19 Aug 2026.

Guardrail: [`../../CLAUDE.md`](../../CLAUDE.md) §13.

---

## 1. What & why

**Filling in a field is not the same act as browsing the register behind it.**

If a vendor dropdown is fed by `useVendors`, it needs `vendors:read`. But "may this person
browse the vendor master?" and "may this person put a vendor on the purchase request they
are allowed to raise?" are different questions. Answering both with one permission produces
a form with a permanently empty **required** field, a 403 per keystroke, and no error the
user can see or report.

That is not hypothetical. In the production app this template's patterns come from, an
audit found this exact shape in **14 places across 6 of the 10 non-admin roles**. The worst
one was a compliance-critical picker that was empty for precisely the people who had to
fill it in.

The fix is a second, deliberately tiny endpoint per resource — `GET /<resource>/options` —
which carries **no permission** and returns id + label + one disambiguator. Its safety
comes from being that narrow, not from a gate.

## 2. The rules

- **A picker reads `/<resource>/options`. Never the module's list endpoint.** If you are
  reaching for `useVendors` / `useClients` to populate a control, stop.
- The response is `{ id, label, sublabel, is_active }` and nothing else. **Do not add a
  fifth field.** Every field here is published to every authenticated user.
- **Never** put money, contact details, tax numbers, addresses, stock levels, costs or
  notes on an option. If the control needs one, it needs the gated endpoint — and the
  caller must ask for it only when the user holds the permission (`enabled`), not fire it
  and swallow a 403.
- Options routes are capped, and `has_more` is returned so the UI can say "keep typing"
  instead of pretending a capped page is the whole set.
- Narrowing what may be offered (a `statuses` filter, a `role`) is fine. **Widening the
  response is not.**
- Write thin wrappers over `<ReferencePicker>`, never a new picker component.

## 3. How it works here

| File | Responsibility |
|---|---|
| `src/lib/reference/types.ts` | `REFERENCE_RESOURCES` — the map of resource name → route. Ships empty; fill it in. |
| `src/lib/reference/hooks.ts` | `useReferenceOptions(resource, params, enabled)`, `staleTime` 5 min. |
| `src/components/shared/reference-picker.tsx` | The one picker. |
| `src/components/shared/searchable-select.tsx` | The combobox underneath it. |

```ts
export const REFERENCE_RESOURCES = {
  clients: "/api/v1/clients/options",
  users: "/api/v1/users/options",
} as const satisfies Record<string, string>;
```

```tsx
<ReferencePicker resource="clients" value={clientId} onChange={setClientId} allowClear />

// A thin named wrapper is fine and encouraged:
export const ClientPicker = (p: Omit<Props, "resource">) => (
  <ReferencePicker resource="clients" {...p} />
);
```

**`ids` pins the current value.** The picker sends the selected id along with every search,
so the server returns its label even when the search excludes it, the cap would have pushed
it off the page, or the row has since been archived. This is what removes the `selected`
shim that every hand-rolled picker ends up carrying.

**`staleTime` is 5 minutes**, not the usual 30 seconds. Reference data is the slowest-moving
thing in an app, and a picker refetching on every keystroke pause is pure noise. A
quick-create flow should invalidate `referenceKeys.resource("clients")` on success so a new
record still appears immediately.

**`REFERENCE_RESOURCES` ships empty**, so `ReferenceResource` is `never` and
`<ReferencePicker resource="clients">` will not compile until you register the resource.
That is deliberate — it forces the decision rather than letting a picker quietly reach for
a gated list.

## 4. Deliberately not done

| Not done | Why |
|---|---|
| **The module's own register page stays on the gated endpoint** | That page *is* the register. Having two endpoints is the whole point — one to browse, one to name. |
| **Options routes do not apply own-scope** | Own-scope answers "whose register am I browsing?", which is the wrong question for a field naming the record already in front of you. Someone reviewing another person's order must still see the client on it. |
| **A cost or stock hint on a line editor is fetched separately** | It is a commercial figure. The picker works for everyone; the hint is gated, and the form degrades to a blank price rather than leaking a cost. |
| **`REFERENCE_RESOURCES` is not auto-generated** | It is a security surface. Adding a resource should be a decision someone makes, and reviews. |

## 5. New module checklist

1. Ask: does anything reference this module by id in another module's form, filter or
   column? If no, you do not need an options route.
2. Backend: add `GET /<resource>/options`, ungated, capped, returning the four fields.
3. Frontend: add the resource to `REFERENCE_RESOURCES`.
4. Use `<ReferencePicker resource="…">`. Do not write a new picker.
5. If a control needs gated data too, fetch it separately with `enabled` from
   `usePermission`.

## 6. How to re-check this doc

```bash
# Pickers reading a gated module list. Expect zero in shared/.
grep -rn "use[A-Z][a-zA-Z]*(" src/components/shared/ | grep -v "useReferenceOptions\|useState\|useMemo\|useCallback\|useEffect\|useRef"
```

```bash
# Cross-module list hooks in components. Each hit must be that module's own
# register page, or a gated read guarded by `enabled` / usePermission.
grep -rn "use[A-Z][a-zA-Z]*(\{" src/components/ --include="*.tsx" | grep -v "components/shared/"
```

```bash
# The option shape has not grown a fifth field.
grep -A6 "interface BackendReferenceOption" src/lib/reference/types.ts
```
