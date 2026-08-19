# Permissions

> Read this before you add a button that not everyone should see.
> Last verified against the code: 19 Aug 2026.

Guardrail: [`../../CLAUDE.md`](../../CLAUDE.md) §6.

---

## 1. What & why

Every privileged affordance is gated with `usePermission("<domain>.<action>")`. The
frontend uses **dots**; the backend uses `resource:action` colons, and
`PERMISSION_MAPPING` is where the two meet.

The important part is what this is *not*. **Permission gating is UI affordance only.** The
backend is the real guard. A hidden button is a courtesy, not a control — anyone can open
devtools, and a permission check that runs in the browser is a suggestion.

## 2. The rules

- Gate every privileged control: create, edit, delete, approve, export.
- `Permission` is a **strict union**, not `string`. A key that is not in `PERMISSIONS` is a
  compile error, on purpose.
- Never hardcode a role name. Check a permission.
- Never treat `usePermission` as a security boundary.
- **Never feed a dropdown from a module's list hook.** That needs the *other* module's read
  permission, which the person filling in the form often does not have. See
  [`13-reference-data.md`](13-reference-data.md) — this is the single most common source of
  "the field is empty and there is no error".
- If a control genuinely needs gated data (a cost, a stock level), fetch it separately and
  pass `enabled` from `usePermission` — do not fire it and swallow the 403.

## 3. How it works here

| File | Responsibility |
|---|---|
| `src/lib/permissions/types.ts` | `PERMISSIONS` as a const array; `Permission` derived from it. |
| `src/lib/permissions/check.ts` | `PERMISSION_MAPPING` — frontend key → the backend names that grant it. |
| `src/lib/permissions/store.ts` | The role, superuser flag and effective permission set, seeded from `/me`. |
| `src/lib/permissions/hooks.ts` | `usePermission`, `useAnyPermission`, `useAllPermissions`, `useFilteredNavItems`. |
| `src/lib/permissions/config.ts` | Role labels and colours, using semantic tokens. |

```tsx
const canCreate = usePermission("orders.create");
...
{canCreate && <Button onClick={openCreate}>Add order</Button>}
```

**Why `Permission` is strict.** It used to be `(typeof PERMISSIONS)[number] | string`, which
collapses the union to plain `string`. Every guarantee went with it: `PERMISSION_MAPPING`
stopped requiring an entry per key, and `usePermission("orders.read")` — a typo for
`orders.view` — compiled and returned `false` for every non-superuser. The button was
missing for everyone and nothing failed.

## 4. Deliberately not done

| Not done | Why |
|---|---|
| **No route-level permission guard** | `proxy.ts` checks that you are logged in, not what you may do. Per-route permission checks in middleware duplicate the nav filter and drift from it. The nav hides the link; the backend refuses the call. |
| **No permission catalogue codegen (yet)** | `PERMISSION_MAPPING` hand-mirrors the backend catalogue. Worth generating once your backend exposes it — drift here silently hides affordances people actually have. |
| **No role hierarchy** | `super_admin` short-circuits everything; beyond that, roles are flat bags of permissions. An inheritance tree is harder to audit than a longer list. |

## 5. New module checklist

1. Add the keys to `PERMISSIONS` in `types.ts`.
2. Add a `PERMISSION_MAPPING` entry for each — the compiler will insist.
3. Gate create/edit/delete in the view.
4. Add the nav item with its `permission` in `app/(dashboard)/config.ts`.
5. Feed every picker from `@/lib/reference`, not from a module list hook.

## 6. How to re-check this doc

```bash
# Hardcoded role names outside the permissions module. Expect zero.
grep -rn "role === \|role !== " src/ | grep -v "src/lib/permissions/"
```

```bash
# `as Permission` casts — they defeat the strict union. Expect only check.ts,
# where a NavItem's `permission?: string` is narrowed on the way in (nav config
# is plain data and cannot import the union without a cycle). A cast anywhere
# else — especially in hooks.ts — means a mistyped key compiles again.
grep -rn "as Permission" src/
```

```bash
# Every permission has a mapping entry. Expect the two counts to match.
grep -c "^  \"" src/lib/permissions/types.ts
grep -c "^  \"" src/lib/permissions/check.ts
```
