"use client";

import {
	useEffect,
	useRef,
	useCallback,
	useSyncExternalStore,
	useState,
	createContext,
	useContext,
} from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* ── Mode context ─────────────────────────────────────────────── */

export type ModalMode = "view" | "edit";

const ModalModeCtx = createContext<ModalMode>("edit");

/** Read the current modal mode from any child component */
export function useModalMode() {
	return useContext(ModalModeCtx);
}

/**
 * size variants:
 *   "small"   — compact side panel (sm:max-w-md)          [default]
 *   "medium"  — wider side panel (sm:max-w-2xl)
 *   "large"   — wide side panel  (sm:max-w-4xl)
 *   "content" — fills the main content area, stops short of the sidebar/navbar
 *   "full"    — fills the whole viewport, sidebar included
 *   "panel"   — truly full viewport width
 */
type ModalSize = "small" | "medium" | "large" | "xlarge" | "content" | "full" | "panel";

const PANEL_SIZE_CLASS: Record<Exclude<ModalSize, "full" | "content">, string> = {
	small: "sm:max-w-md sm:m-4",
	medium: "sm:max-w-2xl sm:m-4",
	large: "sm:max-w-4xl sm:m-4",
	xlarge: "sm:max-w-6xl sm:m-4",
	panel: "sm:max-w-[calc(100%-1rem)] sm:m-2",
};

/** How long the open/close slide takes. Drives both the animation and the unmount. */
const TRANSITION_MS = 350;

export interface ModalTab {
	id: string;
	label: string;
	icon?: React.ElementType;
}

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
	size?: ModalSize;
	/** Current mode — "view" shows read-only, "edit" shows form inputs */
	mode?: ModalMode;
	/** Called when the user clicks the header edit/cancel-edit button */
	onModeChange?: (mode: ModalMode) => void;
	/** Rendered as a sticky bar below the scrollable body (e.g. form action buttons) */
	footer?: React.ReactNode;
	/** Extra action buttons rendered in the header row, to the left of edit/close controls */
	headerActions?: React.ReactNode;
	/** Array of tabs to display stably below the header */
	tabs?: ModalTab[];
	/** Currently active tab ID */
	activeTab?: string;
	/** Callback when a tab is clicked */
	onTabChange?: (tabId: string) => void;
	/** Optional class name to customize the scrollable body styling/padding */
	bodyClassName?: string;
	/**
	 * Desktop entry animation. "bottom" (default) rises from the bottom edge like
	 * every detail panel; "right" slides in from the right, which reads better for
	 * a wide read-only surface the user is peeking at rather than editing.
	 * Mobile ignores this and stays a bottom sheet either way — a horizontal
	 * full-width slide on a phone reads as a page transition, not a panel.
	 */
	slideFrom?: "bottom" | "right";
	/**
	 * True while the form inside holds work the user has not saved.
	 *
	 * The modal's **own** close affordances — Escape, a backdrop click and the header
	 * X — then ask before discarding instead of closing straight away, and the browser
	 * warns on tab-close / refresh. One stray Escape used to wipe a half-filled form
	 * with no warning and no way back; on the longer forms (employee, work order, a
	 * proposal with line items) that is several minutes of typing.
	 *
	 * A footer **Cancel** button is deliberately *not* covered — that is the form's own
	 * control and its owner decides what it means. Route it through the same guard only
	 * if abandoning really should be confirmed there too.
	 */
	isDirty?: boolean;
	/**
	 * Gives a stateful form a chance to restore its last saved values after the user
	 * explicitly confirms Discard. `onClose` only changes whether this shell is open;
	 * forms that remain mounted for the exit animation otherwise keep their draft.
	 */
	onDiscard?: () => void;
}

function ModalPanel({
	isOpen,
	onClose,
	title,
	children,
	size = "small",
	mode = "edit",
	onModeChange,
	footer,
	headerActions,
	tabs,
	activeTab,
	onTabChange,
	bodyClassName,
	slideFrom = "bottom",
	isDirty = false,
	onDiscard,
}: ModalProps) {
	// Keep the portal in the DOM until the exit animation finishes. Raised during
	// render rather than in an effect: an effect paints one empty frame first, so
	// the panel visibly pops in instead of sliding.
	const [show, setShow] = useState(isOpen);
	if (isOpen && !show) setShow(true);

	// Lowered on a timer rather than framer-motion's `onAnimationComplete`, which
	// does not fire for this setup at all — the panel would slide out of view and
	// then sit in the DOM forever, one stale subtree per record the user opened.
	// The timer shares TRANSITION_MS with the animation below so the two cannot
	// drift apart.
	useEffect(() => {
		if (isOpen) return;
		const timer = setTimeout(() => setShow(false), TRANSITION_MS);
		return () => clearTimeout(timer);
	}, [isOpen]);

	// Shown instead of closing when `isDirty` — see the prop's docstring.
	const [confirmingDiscard, setConfirmingDiscard] = useState(false);

	// Never leave the prompt up for the *next* thing that opens in this panel. Adjusted
	// during render rather than in an effect: that is the pattern React sanctions for
	// "reset state when a prop changes", and an effect here trips
	// `react-hooks/set-state-in-effect`. Same shape as the `loaded…Id` latches in
	// `certificate-format-modal.tsx`.
	const [wasOpen, setWasOpen] = useState(isOpen);
	if (wasOpen !== isOpen) {
		setWasOpen(isOpen);
		if (!isOpen) setConfirmingDiscard(false);
	}

	/** Every close path the modal owns goes through here. */
	const requestClose = useCallback(() => {
		if (isDirty) {
			setConfirmingDiscard(true);
			return;
		}
		onClose();
	}, [isDirty, onClose]);

	const discardAndClose = useCallback(() => {
		setConfirmingDiscard(false);
		onDiscard?.();
		onClose();
	}, [onClose, onDiscard]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key !== "Escape" || !isOpen) return;
			// While the prompt is up, Escape means "no, keep editing" — the safe answer.
			// Letting it fall through would make one key both raise the guard and defeat it.
			if (confirmingDiscard) {
				setConfirmingDiscard(false);
				return;
			}
			requestClose();
		},
		[isOpen, confirmingDiscard, requestClose],
	);

	// The same work is just as lost to a reload or a closed tab, and that is the one
	// exit this component cannot render a prompt for — the browser owns that dialog.
	useEffect(() => {
		if (!isOpen || !isDirty) return;
		const warn = (e: BeforeUnloadEvent) => e.preventDefault();
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [isOpen, isDirty]);

	// Remember the element that had focus when the modal opened so we can
	// restore focus to it on close — important for keyboard / screen reader users.
	const previouslyFocusedRef = useRef<HTMLElement | null>(null);
	useEffect(() => {
		if (isOpen) {
			previouslyFocusedRef.current =
				(typeof document !== "undefined"
					? (document.activeElement as HTMLElement | null)
					: null) ?? null;
			return () => {
				const el = previouslyFocusedRef.current;
				if (el && typeof el.focus === "function") {
					// Defer to next tick so React finishes unmounting the panel first.
					setTimeout(() => el.focus({ preventScroll: true }), 0);
				}
			};
		}
	}, [isOpen]);

	const mounted = useSyncExternalStore(
		() => () => {},
		() => true,
		() => false,
	);
	const isDesktop = useSyncExternalStore(
		(cb) => {
			const mq = window.matchMedia("(min-width: 768px)");
			mq.addEventListener("change", cb);
			return () => mq.removeEventListener("change", cb);
		},
		() => window.matchMedia("(min-width: 768px)").matches,
		() => false,
	);

	useEffect(() => {
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	const isFull = size === "full";
	const isContent = size === "content";
	// `full` means the whole viewport, sidebar included. It costs the navigation
	// while the modal is open — the trade is worth it only for a focused editing
	// surface that genuinely needs the width (a side-by-side editor and preview).
	// `content` fills the same area but stops at the sidebar, so the nav stays
	// reachable. It reads `--sidebar-offset`; set that on your shell if you use
	// this size, otherwise it falls back to the full width.
	const panelSizeClass = isFull || isContent
		? "sm:max-w-full"
		: PANEL_SIZE_CLASS[size as Exclude<ModalSize, "full" | "content">];

	const containerStyle = isContent ? { left: "var(--sidebar-offset, 0px)" } : { left: 0 };

	const transition = {
		type: "tween" as const,
		ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
		duration: TRANSITION_MS / 1000,
	};

	// Horizontal entry is a desktop-only affordance; the mobile bottom sheet is
	// unchanged so the drag handle and safe-area footer still make sense.
	const slidesFromRight = slideFrom === "right" && isDesktop;
	const panelInitial = slidesFromRight ? { x: "100%" } : { y: "100%" };
	const panelAnimate = slidesFromRight
		? { x: isOpen ? 0 : "100%" }
		: { y: isOpen ? 0 : "100%" };

	const modalContent = show ? (
		<div className="fixed inset-0 z-[100]">
			{/* Backdrop */}
			<motion.div
				className="absolute inset-0 bg-black/40"
				initial={{ opacity: 0 }}
				animate={{ opacity: isOpen ? 1 : 0 }}
				transition={transition}
				onClick={requestClose}
				style={{ pointerEvents: isOpen ? "auto" : "none" }}
			/>

			{/* Panel container */}
			<div
				className="pointer-events-none absolute inset-y-0 right-0 sm:flex sm:justify-end"
				style={containerStyle}
			>
				{/* Panel — bottom sheet on mobile, side panel on desktop */}
				<motion.div
					initial={panelInitial}
					animate={panelAnimate}
					transition={transition}
					className={`pointer-events-auto absolute bottom-0 left-0 right-0 sm:relative sm:bottom-auto sm:left-auto sm:right-auto w-full sm:w-auto sm:flex-1 bg-card text-card-foreground border border-border shadow-2xl flex flex-col rounded-t-3xl sm:rounded-3xl max-h-[92dvh] sm:max-h-full ${panelSizeClass}`}
					style={{ willChange: "transform" }}
				>
					{/* Drag handle — mobile only */}
					<div className="flex w-full shrink-0 justify-center pt-3 pb-1.5 sm:hidden">
						<div className="h-1.5 w-12 rounded-full bg-border/60" />
					</div>

					{/* Header */}
					<div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3.5 sm:px-6 sm:py-4 bg-card rounded-t-3xl sm:rounded-t-3xl">
						<h2 className="truncate text-base font-semibold sm:text-lg">
							{title}
						</h2>
						<div className="flex shrink-0 items-center gap-1">
							{headerActions}
							{headerActions && <div className="mx-1 h-4 w-px bg-border" />}
							{onModeChange && mode === "view" && (
								<button
									type="button"
									onClick={() => onModeChange!("edit")}
									className="flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-muted sm:size-9"
									aria-label="Edit"
								>
									<Pencil className="h-4 w-4" />
								</button>
							)}
							<button
								type="button"
								onClick={requestClose}
								className="rounded-lg p-2 transition-colors hover:bg-muted"
								aria-label="Close"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
					</div>

					{/* Optional Tabs */}
					{tabs && tabs.length > 0 && activeTab && onTabChange && (
						<div className="shrink-0 border-b border-border px-4 py-2 sm:px-6 bg-card overflow-x-auto scrollbar-hide">
							<div className="flex flex-nowrap gap-1 rounded-lg bg-muted/50 p-1 w-fit border border-border/40">
								{tabs.map((tab) => {
									const Icon = tab.icon;
									const isActive = activeTab === tab.id;
									const btnClass = isActive
										? "bg-card text-foreground shadow-sm ring-1 ring-border/50"
										: "text-muted-foreground hover:text-foreground hover:bg-muted/80";
									return (
										<button
											key={tab.id}
											type="button"
											onClick={() => onTabChange!(tab.id)}
											className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-all shrink-0 whitespace-nowrap ${btnClass}`}
										>
											{Icon && <Icon className="h-3.5 w-3.5" />}
											{tab.label}
										</button>
									);
								})}
							</div>
						</div>
					)}

					{/* Scrollable body */}
					<div className={cn("flex-1 overflow-y-auto px-4 pt-4 pb-20 sm:px-6 sm:pt-5 sm:pb-5", bodyClassName)}>
						<ModalModeCtx.Provider value={mode}>
							{children}
						</ModalModeCtx.Provider>
					</div>

					{/* Optional sticky footer — safe-area padding keeps action buttons
					    clear of the phone's home indicator on the mobile bottom sheet. */}
					{footer && (
						<div className="shrink-0 border-t border-border [padding-bottom:env(safe-area-inset-bottom)] sm:[padding-bottom:0px]">{footer}</div>
					)}

					{/* Discard guard — covers the panel so the answer cannot be skipped by
					    clicking past it, and sits inside the panel so it travels with the
					    exit animation instead of needing a second portal. */}
					{confirmingDiscard && (
						<div
							role="alertdialog"
							aria-modal="true"
							aria-labelledby="modal-discard-title"
							className="absolute inset-0 z-20 flex items-center justify-center rounded-t-3xl bg-background/80 p-4 backdrop-blur-sm sm:rounded-3xl"
						>
							<div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
								<h3 id="modal-discard-title" className="text-base font-semibold">
									Discard your changes?
								</h3>
								<p className="mt-1.5 text-sm text-muted-foreground">
									Nothing here has been saved yet. Close now and you will have to
									type it again.
								</p>
								<div className="mt-4 flex justify-end gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setConfirmingDiscard(false)}
										autoFocus
									>
										Keep editing
									</Button>
									<Button variant="destructive" size="sm" onClick={discardAndClose}>
										Discard
									</Button>
								</div>
							</div>
						</div>
					)}
				</motion.div>
			</div>
		</div>
	) : null;

	if (!mounted) return null;
	return createPortal(modalContent, document.body);
}

/**
 * The props whose *last open value* has to survive the exit animation.
 *
 * A parent almost always closes a detail panel by clearing the record it was
 * showing — `setSelectedId(null)` flips `isOpen` false and empties `children` in
 * the same render. Without a latch the panel would slide out empty.
 */
type LatchedProps = Pick<
	ModalProps,
	| "title"
	| "children"
	| "footer"
	| "headerActions"
	| "tabs"
	| "activeTab"
	| "onTabChange"
	| "mode"
	| "onModeChange"
	| "size"
	| "bodyClassName"
>;

/**
 * Side panel on desktop, bottom sheet on mobile.
 *
 * This outer component does one thing: hold the last props the panel was open
 * with, so the exit animation still has something to render. Everything else
 * lives in `ModalPanel`, which is a plain component with no refs — keeping the
 * escape hatch to the two lines below rather than spreading it through 250 lines
 * of markup.
 */
/* eslint-disable react-hooks/refs -- The latch below is the deliberate exception,
   and it is bounded to this one function. Reading and writing a ref during render
   is normally unsafe because React may discard a render; here a discarded render
   would have written exactly the value the re-render writes, so nothing stale can
   survive. React's own docs name "information from previous renders" as a valid
   ref use. Everything that renders markup lives in ModalPanel, which touches no
   refs at all. */
export function Modal(props: ModalProps) {
	const { isOpen, onClose, slideFrom, isDirty, onDiscard, ...latchable } = props;

	// The one ref read/write during render in this file. It is safe here in a way
	// the lint rule cannot see: a render React discards would write exactly the
	// same value a re-render writes, so a torn-up render leaves nothing stale
	// behind. React's own docs name "information from previous renders" as a
	// legitimate ref use.
	const latchedRef = useRef<LatchedProps>(latchable);
	if (isOpen) {
		latchedRef.current = latchable;
	}

	const latched = latchedRef.current;

	return (
		<ModalPanel
			{...latched}
			isOpen={isOpen}
			onClose={onClose}
			slideFrom={slideFrom}
			isDirty={isDirty}
			onDiscard={onDiscard}
		/>
	);
}
/* eslint-enable react-hooks/refs */
