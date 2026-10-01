# List Pages — always DataView

> Read this before you build any page that shows rows.
> Last verified against the code: 30 Sep 2026.

Guardrail: [`../../CLAUDE.md`](../../CLAUDE.md) §7.

---

## 1. What & why

Every list page uses `@/components/data-view`. Do not hand-roll search, filter, sort or
pagination state.

The state lives in the **URL**, which is what makes a filtered list shareable, bookmarkable
and survivable across a refresh or a Back. `apiParams` is shaped to match a FastAPI list
endpoint (`skip` / `limit` / `search` / `sort_by` / `sort_order` + filters), so the server
does the actual work — filtering a fetched page in JavaScript and reporting a page-local
count as the total is the bug this system exists to prevent.

## 2. The rules

- One `useDataView` per table. `namespace` prevents key collisions when a page has two.
- Feed `dv.apiParams` straight into the list hook, and into its query key.
- Sortable columns need `sortable: true` and a `sortKey` matching the backend field.
- **Pass `error` and `onRetry`.** A failed query without them renders an empty table, which
  reads as "there is no data" — the one message that is definitely wrong.
- **Pass `isPending`.** List hooks use `placeholderData`, so `isLoading` is false from the
  first render; without `isPending` a slow or retrying list flashes the empty state.
- Give the module an `emptyState` with its own sentence and its create button.
- Never filter, sort or paginate a fetched page in the browser.
- **A multi-select, reference or range filter needs its `FilterConfig[]` passed to
  `useDataView` too** (`useDataView({ …, filters: FILTERS })`). That is how `apiParams`
  knows to turn `"a,b"` into a list and `"10|50"` into two params. Leave it out and the
  backend gets the joined string, which matches nothing.
- **A multi-select or reference filter needs a backend filter that takes a list.** It is sent
  as a repeated param (`?status=a&status=b`). A single-value FastAPI param keeps one of the
  two and quietly ignores the other.
- A date or number range names its two backend params: `fromKey`/`toKey`, `minKey`/`maxKey`.
- Two sort options on one field ("Newest first", "Oldest first") each set `order`.

## 3. How it works here

```tsx
const dv = useDataView({ namespace: "orders", defaultSort: { field: "created_at", order: "desc" } });
const { data, isLoading, isPending, error, refetch } = useOrders(dv.apiParams);

<DataView
  params={dv}
  columns={columns}
  data={data?.items ?? []}
  total={data?.total ?? 0}
  isLoading={isLoading}
  isPending={isPending}
  error={error}
  onRetry={refetch}
  keyExtractor={(r) => r.id}
  onRowClick={(r) => setDetailId(r.id)}
  filters={FILTERS}
  sortOptions={SORT_OPTIONS}
  searchPlaceholder="Search orders…"
  entityName="orders"
  emptyState={<EmptyOrders canCreate={canCreate} onCreate={openCreate} />}
  actions={canCreate && <Button onClick={openCreate}>Add order</Button>}
/>
```

| File | Responsibility |
|---|---|
| `use-data-view.ts` | The state: URL-synced search (debounced), filters, sort, page. Produces `apiParams`. |
| `data-view.tsx` | Composes toolbar + table + pagination, and owns the four display states. |
| `data-toolbar.tsx` | Search box, the Filters button, sort menu, action slot, pills, count. |
| `filter-fields.tsx` | Every filter control, one small component per type. Both the dropdown and the panel draw these. |
| `filter-panel.tsx` | The panel for more than four filters. Drafts, then applies in one URL write. |
| `filter-pills.tsx` | One removable pill per applied filter. |
| `reference-filter.tsx` | The reference filter's control and pill, and its type. `ncube remove reference` deletes it. |
| `filter-parts.tsx` | Chips, the checkbox list, the label frame and the pill, shared by the three above. |
| `data-pagination.tsx` | Prev/next, hidden when there is one page. |
| `use-row-selection.ts` | Page-scoped selection; clears when the row set changes. |
| `bulk-action-bar.tsx` | The floating bar: mass field edits and delete. |
| `src/components/shared/data-table/` | The table itself — sortable headers, checkboxes, and a card layout below `md`. |

**The four states**, in the order `DataView` decides them:

1. `error` → the retry card.
2. cold load (`isLoading`, or `isPending` with no error) → skeleton rows.
3. empty **and unfiltered** → your `emptyState`.
4. empty **under a filter** → the plain "No results found." — because the fix there is to
   clear the filter, not to create a record.

**The filter types.** Each is a `FilterConfig` with a `type`:

| `type` | Control | URL | Sent to the backend |
|---|---|---|---|
| `select` (or none) | A dropdown, searchable from 10 options | `f_status=active` | `status=active` |
| `multiselect` | Chips up to 8 options, a searchable checkbox list past that | `f_status=active,draft` | `status=active&status=draft` |
| `reference` | A checkbox list searched on the server, from a rule 13 options feed | `f_customer=id1,id2` | `customer=id1&customer=id2` |
| `daterange` | Two date inputs | `f_due=2026-07-01\|2026-07-31` | `due_from=…&due_to=…` |
| `numberrange` | Min and max inputs, optional one-click bands | `f_price=1500\|` | `price_min=1500` |
| `boolean` | Any, Yes, No | `f_in_stock=true` | `in_stock=true` |

Any filter can take a `group`, a heading in the panel, and a `hint`, one line under its
label. Page code that needs a range's halves uses `splitRange` from `@/components/data-view`.

**Up to four filters, a dropdown. More, a panel.** The dropdown writes each change to the URL
at once, which is right for a status and a date. The panel keeps changes in a draft and
writes them together on Apply, so building a query from six filters costs one request, not
six. It is a `<Modal isDirty>`, so a stray Escape asks before throwing the draft away. The
applied filters show as pills under the toolbar, each removable in one click.

**The reference filter** is for filtering by a related record whose list is too long to hold
in the page: a customer, an assignee, a city. It reads the same ungated feed as
`<ReferencePicker>` (rule 13), searches it on the server, and pins the chosen ids into the
answer, so their names never go blank. `narrow` passes narrowing to the feed, and as a
function it sees the other filters in the open panel, so districts narrow to the state just
ticked. `minChars` holds the request for a feed that refuses an unnarrowed one. The template
ships no feed, so its browser tests cannot reach this filter. It was checked on 30 Sep 2026
against a stand-in feed in a scratch copy: search, apply, and the pill's name after a reload.

**Mobile.** Below `md` the table renders as cards, so a wide list does not scroll sideways
on a phone. Mark the title column `mobilePrimary`, hide row-action columns with
`mobileHidden`, and relabel a cramped header with `mobileLabel`.

## 4. Deliberately not done

| Not done | Why |
|---|---|
| **No client-side sorting** | It sorts the current page only, so "sort by newest" silently means "the newest of these twenty". The backend sorts the whole set. |
| **No column show/hide or density toggle (yet)** | Both are real wins and both need per-user persistence to be worth anything. Add them to `DataView` when you add the preference store, not as a one-off on one page. |
| **No `useState` for page/search** | That is the anti-pattern the whole system replaces. It breaks Back, breaks sharing, and re-renders the table on every keystroke. |
| **No filters applied on arrival** | Influen has `defaultFilters`, for a queue whose useful view is a subset. One screen uses it. Copy it from Influen when a project has a queue. |
| **No "find a filter" box** | Influen shows one past eight filters, for a directory with twenty. A template list has two or three. |
| **No card layout or hidden toolbar** | Influen's, built for its client's prototype. |
| **Selection is not URL-synced** | Unlike the rest of the state. A selection is a transient intent, not a view worth sharing, and it clears when the rows change anyway. |

## 5. New module checklist

1. `useDataView` with a `namespace` and a `defaultSort`.
2. Feed `apiParams` into the hook and its key.
3. Columns with `sortable` + `sortKey` where the backend can sort.
4. Pass `isPending`, `error` and `onRetry` — all three.
5. Write an `emptyState` with the module's own words.
6. Gate the create button with `usePermission`.

## 6. How to re-check this doc

```bash
# A DataView page not wired to apiParams — the "filtering in JS" bug.
# The DataView library's own files (index.ts, use-row-selection.ts) always
# appear; anything else is a page filtering in the browser and reporting a
# page-local count as the total.
comm -23 <(grep -rln "useDataView" src/components/ | sort) \
         <(grep -rln "apiParams" src/components/ | sort)
```

```bash
# Hand-rolled list state on a page that has a DataView.
grep -rn "useState.*\(page\|search\|filters\)" src/components/ --include="*-view.tsx"
```

```bash
# DataViews missing the error or pending props.
grep -rL "isPending" $(grep -rl "<DataView" src/components/ 2>/dev/null) 2>/dev/null
```
