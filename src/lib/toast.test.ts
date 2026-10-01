import { test, expect, vi, beforeEach } from "vitest";
import { AppError } from "../types";
import { errorMessage, notify } from "./toast";

// `errorMessage` decides what a person reads when a write fails, and it fails
// silently in the worst way: get the narrowing wrong and every error in the app
// degrades to the same generic fallback, which looks fine in every screenshot
// and tells nobody anything.

const sonner = vi.hoisted(() => ({
  success: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: sonner }));

beforeEach(() => {
  vi.clearAllMocks();
});

test("an AppError shows the message the api-client already flattened", () => {
  // FastAPI's 422 arrives as a nested structure and the api-client turns it
  // into a sentence. Falling through to the fallback throws that away.
  const err = new AppError("Email is already registered", 409);
  expect(errorMessage(err, "Could not create the user")).toBe("Email is already registered");
});

test("a plain Error shows its message", () => {
  expect(errorMessage(new Error("Network request failed"), "fallback")).toBe(
    "Network request failed",
  );
});

test("an Error with an empty message falls back rather than showing nothing", () => {
  // `throw new Error()` is real, and an empty toast is worse than a generic one.
  expect(errorMessage(new Error(""), "Could not save")).toBe("Could not save");
});

test("anything else falls back", () => {
  expect(errorMessage("a thrown string", "Could not save")).toBe("Could not save");
  expect(errorMessage(null, "Could not save")).toBe("Could not save");
  expect(errorMessage({ message: "not an Error" }, "Could not save")).toBe("Could not save");
});

test("an error stays on screen twice as long as a success", () => {
  // Drop the duration map and both silently become sonner's 4s default, which
  // is not long enough to read an error sentence twice.
  notify.success("Saved");
  notify.error("Could not save");

  expect(sonner.success.mock.calls[0][1]).toMatchObject({ duration: 4000 });
  expect(sonner.error.mock.calls[0][1]).toMatchObject({ duration: 8000 });
});

test("a repeated failure reuses one id, so it replaces instead of stacking", () => {
  // Three retries on a flaky connection used to leave three identical cards and
  // fill the four-toast window.
  notify.fromError(new Error("boom"), "Could not load widgets");
  notify.fromError(new Error("boom"), "Could not load widgets");

  const [first, second] = sonner.error.mock.calls;
  expect(first[1].id).toBe(second[1].id);
});

test("caller options win over the defaults", () => {
  // A long error someone has to act on may want to stay until dismissed.
  notify.error("Could not save", { duration: Infinity });
  expect(sonner.error.mock.calls[0][1]).toMatchObject({ duration: Infinity });

  notify.fromError(new Error("boom"), "Could not save", { id: "my-own-id" });
  expect(sonner.error.mock.calls[1][1].id).toBe("my-own-id");
});
