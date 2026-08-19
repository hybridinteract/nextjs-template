/**
 * "Has the user typed anything that is not saved yet?"
 *
 * Feeds `<Modal isDirty>`, which then asks before Escape / a backdrop click / the X
 * throws the work away. See that prop's docstring for why the guard exists.
 *
 * The comparison is **against the state the form opened with**, not against empty —
 * an edit form starts full, so "not empty" would mark every edit dirty before the user
 * touched it, and the prompt would fire on every close. That is the version of this
 * feature people learn to click through without reading.
 */

/** Values a form field can hold. Deliberately narrow — this is not a general deep-equal. */
type FormValue = unknown;

/**
 * Deep value equality for plain form state: objects, arrays, and primitives.
 *
 * Handles the shapes the house form pattern actually produces (`XFormState` objects,
 * line-item arrays). It is **not** a general structural comparison — no `Map`, `Set`,
 * `RegExp` or class instances, because no form state holds one. If that changes, widen
 * this deliberately rather than reaching for a library.
 *
 * `null` and `undefined` compare equal: `formToPayload` maps `""` → `undefined` on the
 * way out, so a field can legitimately read back as either without the user having
 * touched it.
 */
export function isEqual(a: FormValue, b: FormValue): boolean {
	if (a === b) return true;
	if (a == null || b == null) return a == null && b == null;

	if (Array.isArray(a) || Array.isArray(b)) {
		if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
		return a.every((item, i) => isEqual(item, b[i]));
	}

	if (a instanceof Date || b instanceof Date) {
		return (
			a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
		);
	}

	if (typeof a === "object" && typeof b === "object") {
		const ao = a as Record<string, FormValue>;
		const bo = b as Record<string, FormValue>;
		const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
		return [...keys].every((k) => isEqual(ao[k], bo[k]));
	}

	return false;
}

/**
 * True when `current` differs from the state the form opened with.
 *
 * ```ts
 * const [form, setForm] = useState<ClientFormState>(emptyClientForm);
 * <Modal isDirty={isFormDirty(form, emptyClientForm)} …>
 * ```
 *
 * Pass `null`/`undefined` as `initial` when the form has not loaded yet — nothing has
 * been typed into a form that is not on screen, so that reads as clean.
 */
export function isFormDirty<T>(current: T, initial: T | null | undefined): boolean {
	if (current == null || initial == null) return false;
	return !isEqual(current, initial);
}

/**
 * True when any of the given values is non-empty.
 *
 * For the modals that keep a handful of separate `useState`s rather than one form
 * object — a create modal with four pickers, say. Only valid where the fields start
 * empty, i.e. **create**, never edit; use `isFormDirty` for anything pre-filled.
 */
export function anyFilled(...values: FormValue[]): boolean {
	return values.some((v) => {
		if (v == null || v === false) return false;
		if (typeof v === "string") return v.trim() !== "";
		if (Array.isArray(v)) return v.length > 0;
		return true;
	});
}
