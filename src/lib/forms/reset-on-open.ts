"use client";

/**
 * "Clear this form every time the panel opens."
 *
 * The companion to `<Modal isDirty>`. The guard asks before closing; this is what makes
 * the answer true.
 */

import { useState } from "react";

/**
 * Runs `reset` on the render where `isOpen` flips false → true.
 *
 * **Why a modal needs this at all.** Detail and create panels stay mounted while they
 * are closed — `Modal` animates itself out, and unmounting mid-slide is what made them
 * snap shut. Closing one only flips a prop; it does not touch the `useState` in the body.
 * So a form the user abandoned is still sitting there the next time the panel opens, and
 * **that includes one they explicitly discarded** — the prompt says the work is gone, and
 * then it comes back. Only a page reload clears it.
 *
 * ```ts
 * const reset = () => { setQuantity(""); setNote(""); };
 * useResetOnOpen(isOpen, reset);
 * ```
 *
 * Adjusted during render, not in an effect: an effect renders the stale values once
 * before clearing them, and `react-hooks/set-state-in-effect` rejects it. This is the
 * pattern React sanctions for "reset state when a prop changes" — the same shape as a
 * "reset when a prop changes" latch.
 *
 * **Only for state this component owns.** `reset` must do nothing but call this
 * component's own setters. In particular do **not** pass react-hook-form's `reset` —
 * updating RHF's store during render is not the same thing. Those forms already
 * re-`reset` on open from an effect; keep it there.
 *
 * Where the values must come back as *the server's*, not as empty — an editor whose
 * draft was loaded from a record — `<Modal onDiscard>` is the other half: it fires on the
 * explicit Discard, so the panel behind it is right immediately rather than at the next
 * open.
 */
export function useResetOnOpen(isOpen: boolean, reset: () => void): void {
	const [wasOpen, setWasOpen] = useState(isOpen);
	if (wasOpen !== isOpen) {
		setWasOpen(isOpen);
		if (isOpen) reset();
	}
}
