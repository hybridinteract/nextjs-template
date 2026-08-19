"use client";

// Resolves WHICH timezone the UI should render values in.
//
//   • useDisplayTimeZone() — for INSTANTS (created/updated/logged times).
//     Resolution order: user preference → "auto" (this device) → the app default.
//   • useBusinessTimeZone() — for BUSINESS-DATE inputs (which calendar day a new
//     record books on). Always the business's zone, never the viewer's device: a
//     user travelling abroad must not file today's record on yesterday.
//
// Display only: none of this changes stored data, nor which day a record books on.

import { useAuthStore } from "@/lib/auth/store";
import { DEFAULT_TIME_ZONE } from "@/lib/date-utils";

/** Quick picks, offered first. The full IANA list (~400) is `allTimeZones()`. */
export const COMMON_ZONES = [
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];

/**
 * Every IANA zone the runtime knows, with `COMMON_ZONES` pinned first so the list
 * opens somewhere useful rather than on Africa/Abidjan. Only usable behind a
 * searchable control — ~400 entries is far past what a plain `<Select>` can carry.
 */
export function allTimeZones(): string[] {
  let all: string[];
  try {
    all = Intl.supportedValuesOf("timeZone");
  } catch {
    return [...COMMON_ZONES];
  }
  return [
    ...COMMON_ZONES.filter((z) => all.includes(z)),
    ...all.filter((z) => !COMMON_ZONES.includes(z)),
  ];
}

/**
 * `list`, with `zone` prepended when it is not already there — so a stored zone
 * the list does not offer (a deprecated alias like `Asia/Calcutta`) stays
 * selectable instead of being silently reset on save.
 */
export function zoneOptions(
  zone: string | null | undefined,
  list: string[] = COMMON_ZONES,
): string[] {
  return zone && !list.includes(zone) ? [zone, ...list] : list;
}

/** The viewer's device zone (e.g. "Europe/London"), or the default if undetectable. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/**
 * The zone business dates book on.
 *
 * A hook rather than a constant on purpose: it is the seam. In a single-tenant app
 * this is just the app default, but a multi-branch app resolves it from the active
 * branch — swap the body and no call site changes.
 */
export function useBusinessTimeZone(): string {
  return DEFAULT_TIME_ZONE;
}

/** Timezone to render instants in (see the resolution order above). */
export function useDisplayTimeZone(): string {
  const preference = useAuthStore((s) => s.user?.timezonePreference ?? null);

  if (preference === "auto") return deviceTimeZone();
  return preference || DEFAULT_TIME_ZONE;
}
