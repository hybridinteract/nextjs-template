import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// React Testing Library does not auto-clean when `globals` is on in some setups;
// doing it explicitly means a leaked component from one test cannot be found by
// the next one's query, which produces the most confusing kind of failure.
afterEach(cleanup);

// jsdom implements neither of these, and both are read during render by code
// this app actually ships — `useMediaQuery` and the Modal's desktop/mobile
// switch. Without them the first render throws.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

window.HTMLElement.prototype.scrollIntoView = vi.fn();
