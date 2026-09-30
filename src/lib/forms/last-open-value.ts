"use client";

/**
 * "Keep showing the record this panel was opened with, until it has finished
 * closing."
 *
 * The other half of `useResetOnOpen`. That one clears state on the way in; this
 * one holds it on the way out.
 */

import { useState } from "react";

/**
 * The value a closing panel should keep rendering.
 *
 * A parent closes a detail panel by clearing the record it was showing:
 * `setPanel({ kind: "closed" })` flips `isOpen` false **and** empties the record
 * in the same render. `Modal` latches its own props for exactly this reason — so
 * the panel does not slide out empty — but a wrapper that reads the record
 * *before* it renders `<Modal>` never gets that far. It does one of two things,
 * and both make the panel vanish instead of sliding:
 *
 * - `if (!user) return null` — unmounts the Modal mid-slide.
 * - `user ? <EditForm/> : <CreateForm/>` — swaps to a *different* `<Modal>`,
 *   mounted closed, which renders nothing.
 *
 * ```ts
 * const shown = useLastOpenValue(user, isOpen);
 * ```
 *
 * Updated during render, not in an effect: an effect paints one frame of the
 * cleared value first, which is the flicker this exists to prevent, and
 * `react-hooks/set-state-in-effect` rejects it anyway. Same shape as the
 * `wasOpen` latch inside `Modal` itself.
 */
export function useLastOpenValue<T>(value: T, isOpen: boolean): T {
  const [held, setHeld] = useState(value);

  if (isOpen && value !== held) {
    setHeld(value);
    return value;
  }

  // Closed: whatever it was showing when it was last open. Open: the live value,
  // so an edit inside the panel is not held one render behind.
  return isOpen ? value : held;
}
