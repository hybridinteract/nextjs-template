import { beforeEach, expect, test } from "vitest";
import { useSessionStore } from "./session-store";

// None of this throws when it is wrong. A broken flag either tells someone who
// just signed out that their session ended, or hides a real expiry and lets them
// keep typing into a page that can no longer save.

const store = () => useSessionStore.getState();

beforeEach(() => {
  store().reset();
});

test("a failed refresh raises the dialog and remembers the way back", () => {
  store().markExpired("/dashboard/orders");
  expect(store().isExpired).toBe(true);
  expect(store().redirectTo).toBe("/dashboard/orders");
});

test("a deliberate sign-out never raises the dialog", () => {
  // The 401s a logout causes arrive after the cookies are gone.
  store().beginSignOut();
  store().markExpired("/dashboard");
  expect(store().isExpired).toBe(false);
});

test("the login page clears the dialog but keeps the sign-out flag", () => {
  // The login form can mount before the dashboard's last 401s land. If mounting
  // dropped the flag, those 401s would raise the dialog over the form.
  store().beginSignOut();
  store().clearExpired();
  store().markExpired("/dashboard");
  expect(store().isExpired).toBe(false);
});

test("a failed logout lets a real expiry through again", () => {
  // The person is still signed in. Their next real expiry must still warn them.
  store().beginSignOut();
  store().cancelSignOut();
  store().markExpired("/dashboard");
  expect(store().isExpired).toBe(true);
});

test("signing in ends the sign-out, so the next real expiry is reported", () => {
  store().beginSignOut();
  store().reset();
  store().markExpired("/dashboard");
  expect(store().isExpired).toBe(true);
});
