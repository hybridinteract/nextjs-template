import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Field } from "./form-fields";

// A label that is not associated with its control is invisible to a screen
// reader and to getByLabelText — the field looks fine and is unusable. That
// regression shipped once; these are what caught it.

test("the label is wired to the control", async () => {
  render(
    <Field label="Email">
      <input type="email" />
    </Field>,
  );
  expect(screen.getByLabelText("Email")).toBeInTheDocument();
});

test("clicking the label focuses the control", async () => {
  const user = userEvent.setup();
  render(
    <Field label="Email">
      <input type="email" />
    </Field>,
  );
  await user.click(screen.getByText("Email"));
  expect(screen.getByLabelText("Email")).toHaveFocus();
});

test("a control that brings its own id keeps it", () => {
  render(
    <Field label="Email">
      <input id="my-email" type="email" />
    </Field>,
  );
  expect(screen.getByLabelText("Email")).toHaveAttribute("id", "my-email");
});

test("an error marks the control invalid and is announced with it", () => {
  render(
    <Field label="Email" error="Invalid email address">
      <input type="email" />
    </Field>,
  );
  const input = screen.getByLabelText("Email");
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAccessibleDescription("Invalid email address");
});

test("a hint is announced when there is no error", () => {
  render(
    <Field label="Email" hint="Work address, please">
      <input type="email" />
    </Field>,
  );
  expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Work address, please");
});

test("an explicit htmlFor hands the wiring back to the caller", () => {
  render(
    <Field label="Range" htmlFor="from">
      <input id="from" aria-label="From" />
      <input id="to" aria-label="To" />
    </Field>,
  );
  expect(screen.getByText("Range")).toHaveAttribute("for", "from");
});
