import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLastOpenValue } from "./last-open-value";

/**
 * The hook a modal wrapper depends on to animate out with its record still on
 * screen. If it breaks, the panel goes blank or vanishes as it closes. Its whole
 * job is what it returns after `isOpen` goes false, which is one render — cheap
 * to test here, invisible to the e2e suite, which can only see the effect on the
 * panel.
 */
describe("useLastOpenValue", () => {
  it("returns the live value while open", () => {
    const { result, rerender } = renderHook(
      ({ value, isOpen }) => useLastOpenValue(value, isOpen),
      { initialProps: { value: "a", isOpen: true } },
    );
    expect(result.current).toBe("a");

    rerender({ value: "b", isOpen: true });
    expect(result.current).toBe("b");
  });

  it("holds the last open value when the panel closes and the record clears", () => {
    // The exact shape of the bug: `isOpen` goes false and the record goes null
    // in the same render.
    const { result, rerender } = renderHook(
      ({ value, isOpen }) => useLastOpenValue(value, isOpen),
      { initialProps: { value: "a" as string | null, isOpen: true } },
    );

    rerender({ value: null, isOpen: false });
    expect(result.current).toBe("a");
  });

  it("picks up the new record on the next open", () => {
    const { result, rerender } = renderHook(
      ({ value, isOpen }) => useLastOpenValue(value, isOpen),
      { initialProps: { value: "a" as string | null, isOpen: true } },
    );

    rerender({ value: null, isOpen: false });
    rerender({ value: "b", isOpen: true });
    expect(result.current).toBe("b");
  });

  it("keeps holding across repeated closed renders", () => {
    // A closed panel re-renders whenever its parent does. Each of those must not
    // reset the held value to whatever null-ish thing is being passed now.
    const { result, rerender } = renderHook(
      ({ value, isOpen }) => useLastOpenValue(value, isOpen),
      { initialProps: { value: "a" as string | null, isOpen: true } },
    );

    rerender({ value: null, isOpen: false });
    rerender({ value: null, isOpen: false });
    rerender({ value: null, isOpen: false });
    expect(result.current).toBe("a");
  });
});
