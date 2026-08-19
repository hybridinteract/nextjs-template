// ⚠️ **This barrel cannot be imported from a Server Component.** `lazy.tsx` below
// calls `dynamic(..., { ssr: false })`, which Next refuses in a Server Component —
// and a barrel pulls in every sibling, so one `page.tsx` importing anything from
// here fails the build with an error pointing at `lazy.tsx` rather than at the
// import that caused it.
//
// From a `page.tsx`, import the component by its own path. Everywhere else —
// client components — use this.
export { DataTable } from "./data-table";
export type { Column, SortState } from "./data-table";
export { StatsCard } from "./stats-card";
export { LazyDataTable } from "./lazy";
export { SearchableSelect } from "./searchable-select";
export type { SearchableSelectOption } from "./searchable-select";
export { ReferencePicker } from "./reference-picker";
export { Field, DetailRow } from "./form-fields";
