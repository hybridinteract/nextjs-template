import { test, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./modal";

// The unsaved-work guard is the reason this component is not a shadcn Dialog.
// Every test below is a way a user has lost typing in an app that lacked it.
//
// What is NOT tested here: the slide animation and the desktop/mobile switch.
// jsdom runs no animations and has no layout engine, so an assertion about
// either would pass without meaning anything. Those live in e2e/.

afterEach(() => vi.restoreAllMocks());

function open(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
  const onClose = vi.fn();
  const onDiscard = vi.fn();
  render(
    <Modal
      isOpen
      onClose={onClose}
      onDiscard={onDiscard}
      title="Edit order"
      {...props}
    >
      <input aria-label="Reference" defaultValue="ORD-1" />
    </Modal>,
  );
  return { onClose, onDiscard };
}

test("renders its title and children when open", () => {
  open();
  expect(screen.getByText("Edit order")).toBeInTheDocument();
  expect(screen.getByLabelText("Reference")).toBeInTheDocument();
});

test("a clean modal closes on Escape without asking", async () => {
  const user = userEvent.setup();
  const { onClose } = open({ isDirty: false });

  await user.keyboard("{Escape}");

  expect(onClose).toHaveBeenCalledOnce();
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});

test("a dirty modal asks before Escape throws the work away", async () => {
  const user = userEvent.setup();
  const { onClose } = open({ isDirty: true });

  await user.keyboard("{Escape}");

  // The whole point: it did NOT close.
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  expect(screen.getByText("Discard your changes?")).toBeInTheDocument();
});

test("the X button is guarded too, not just Escape", async () => {
  const user = userEvent.setup();
  const { onClose } = open({ isDirty: true });

  await user.click(screen.getByLabelText("Close"));

  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();
});

test("Escape while the prompt is up means keep editing, not discard", async () => {
  const user = userEvent.setup();
  const { onClose } = open({ isDirty: true });

  await user.keyboard("{Escape}"); // raises the guard
  await user.keyboard("{Escape}"); // must NOT fall through and close

  expect(onClose).not.toHaveBeenCalled();
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Reference")).toHaveValue("ORD-1");
});

test("Keep editing dismisses the prompt and leaves the work alone", async () => {
  const user = userEvent.setup();
  const { onClose } = open({ isDirty: true });

  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "Keep editing" }));

  expect(onClose).not.toHaveBeenCalled();
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Reference")).toHaveValue("ORD-1");
});

test("Discard closes, and tells the form to restore itself", async () => {
  const user = userEvent.setup();
  const { onClose, onDiscard } = open({ isDirty: true });

  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "Discard" }));

  expect(onClose).toHaveBeenCalledOnce();
  // onDiscard is the other half: onClose only hides the shell, so a form that
  // stays mounted for the exit animation would otherwise keep its draft.
  expect(onDiscard).toHaveBeenCalledOnce();
});

test("a closed modal renders nothing", () => {
  render(
    <Modal isOpen={false} onClose={vi.fn()} title="Edit order">
      <input aria-label="Reference" />
    </Modal>,
  );
  expect(screen.queryByText("Edit order")).not.toBeInTheDocument();
});

test("the panel is a dialog named by its title", () => {
  // Without the role and the label, a screen reader announces a panel full of
  // fields with no idea what they belong to. Only the discard prompt had a role.
  open();
  expect(screen.getByRole("dialog", { name: "Edit order" })).toBeInTheDocument();
});

test("a centred modal refuses a full-width size instead of guessing", () => {
  // "full" in the middle of the screen has no sensible meaning. Failing here
  // shows the mistake on the laptop it was built on, not on a phone later.
  vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => open({ placement: "center", size: "full" })).toThrow(/cannot be centred/);
  expect(() => open({ placement: "center", size: "large" })).not.toThrow();
});
