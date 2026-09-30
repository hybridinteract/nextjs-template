import { expect, test } from "vitest";
import { detailToMessage } from "./backend-error";

// A wrong answer here never throws. The person just sees "Request failed with
// status 403", or nothing at all, where the backend had sent a real sentence.

test("a plain string detail is the message", () => {
  expect(detailToMessage("Incorrect email or password")).toBe("Incorrect email or password");
});

test("a 422 issue list becomes one readable line", () => {
  // FastAPI sends validation errors as an array. The login route used to pass
  // the array itself through as the "message".
  const detail = [
    { loc: ["body", "email"], msg: "value is not a valid email address", type: "value_error" },
    { loc: ["body", "password"], msg: "Field required", type: "missing" },
  ];
  expect(detailToMessage(detail)).toBe(
    "email: value is not a valid email address; password: Field required",
  );
});

test("an issue with no field name keeps its message and drops the prefix", () => {
  // A list index or a missing loc is not a field name anybody can act on.
  expect(detailToMessage([{ loc: ["body", "items", 0], msg: "Too many" }])).toBe("Too many");
  expect(detailToMessage([{ msg: "Something is off" }])).toBe("Something is off");
});

test("an object with a message is how a backend refuses and sends more", () => {
  // Influen's verification gate sends { message, next_step }. Reading only
  // strings turned it into "Request failed with status 403".
  expect(detailToMessage({ message: "Verify your business first", next_step: "/verify" })).toBe(
    "Verify your business first",
  );
});

test("anything else has no message, so the caller's fallback wins", () => {
  expect(detailToMessage(undefined)).toBeNull();
  expect(detailToMessage(null)).toBeNull();
  expect(detailToMessage({ code: 42 })).toBeNull();
  expect(detailToMessage([])).toBeNull();
  expect(detailToMessage([{ loc: ["body"] }, "junk"])).toBeNull();
});
