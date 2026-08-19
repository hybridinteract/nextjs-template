/**
 * The shape every `GET /<resource>/options` endpoint returns.
 *
 * One type for every resource, on purpose.
 *
 * **Why this exists.** Filling in a field is not the same act as browsing the
 * register behind it. "May this person browse the vendor master?" and "may this
 * person put a vendor on the purchase request they are allowed to raise?" are
 * different questions, and answering both with `vendors:read` produces a form
 * with a permanently empty required field. In the app this pattern came from,
 * an audit found that shape in 14 places across 6 of 10 non-admin roles.
 *
 * So each referenceable resource gets a second, deliberately tiny endpoint that
 * carries **no permission** and returns an id, a label and one disambiguator.
 * Its safety comes from being that narrow, not from a gate.
 *
 * If you find yourself wanting a fifth field here, that is the signal you want
 * the module's real endpoint instead — which is gated, and should be.
 *
 * **Never put money, contact details, tax numbers, addresses, stock levels or
 * costs on an option.** If a control genuinely needs one, fetch it separately
 * and gate that fetch with `usePermission`, so the form degrades to a blank
 * price rather than leaking a cost.
 */

/**
 * Which reference feeds this app has. One entry per backend `/options` route.
 *
 * Empty in the template — add your own as you build modules:
 *
 * ```ts
 * export const REFERENCE_RESOURCES = {
 *   clients: "/api/v1/clients/options",
 *   users: "/api/v1/users/options",
 * } as const;
 * ```
 */
export const REFERENCE_RESOURCES = {} as const satisfies Record<string, string>;

export type ReferenceResource = keyof typeof REFERENCE_RESOURCES;

/** Wire shape (snake_case). */
export interface BackendReferenceOption {
  id: string;
  label: string;
  sublabel: string | null;
  is_active: boolean;
}

export interface BackendReferenceOptionsResponse {
  items: BackendReferenceOption[];
  has_more: boolean;
}

/** Domain shape (camelCase) — what components see. */
export interface ReferenceOption {
  id: string;
  label: string;
  sublabel: string | null;
  isActive: boolean;
}

export interface ReferenceOptionsResult {
  items: ReferenceOption[];
  /** True when the server capped the page. The picker tells the user to keep typing. */
  hasMore: boolean;
}

/**
 * Params every options feed accepts.
 *
 * `ids` is what removes the `selected` shim a picker would otherwise carry: the
 * server pins those rows into the result even when they do not match `q` and even
 * when they are no longer active, so an edit form never renders a blank field.
 *
 * Add per-resource narrowing filters here as you need them (a `statuses` list, a
 * `role`). They are snake_case because they go straight onto the query string.
 * Narrowing what may be offered is fine; widening the response is not.
 */
export interface ReferenceOptionsParams {
  q?: string;
  ids?: string[];
  limit?: number;
  include_inactive?: boolean;
  [key: string]: string | number | boolean | string[] | undefined;
}

/** Should match the backend's own cap. */
export const REFERENCE_PICKER_LIMIT = 50;
