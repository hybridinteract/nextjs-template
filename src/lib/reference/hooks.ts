"use client";

import { useQuery } from "@tanstack/react-query";
import * as referenceApi from "./api";
import type {
  ReferenceOptionsParams,
  ReferenceOptionsResult,
  ReferenceResource,
} from "./types";

// ── Query key factory ─────────────────────────────────────────────────────────
export const referenceKeys = {
  all: ["reference"] as const,
  resource: (resource: ReferenceResource) => [...referenceKeys.all, resource] as const,
  options: (resource: ReferenceResource, params?: ReferenceOptionsParams) =>
    [...referenceKeys.resource(resource), params ?? {}] as const,
};

/**
 * The dropdown feed for one reference resource.
 *
 * Use this — never a module's own list hook (`useVendors`, `useClients`). Those
 * are gated on the owning module's read permission, which is the bug: someone who
 * may raise a purchase request but holds no `vendors:read` gets a 403 per
 * keystroke and an empty required field. See `./types` for the full reasoning.
 *
 * `staleTime` is 5 minutes rather than the usual 30 seconds: reference data is the
 * slowest-moving thing in an app (a vendor is added weekly, not hourly) and a
 * picker refetching on every keystroke pause is pure noise. A newly created record
 * still appears immediately — a quick-create flow should invalidate
 * `referenceKeys.resource("vendors")` on success.
 */
export function useReferenceOptions(
  resource: ReferenceResource,
  params: ReferenceOptionsParams = {},
  enabled = true,
) {
  return useQuery<ReferenceOptionsResult>({
    queryKey: referenceKeys.options(resource, params),
    queryFn: () => referenceApi.listReferenceOptions(resource, params),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60_000,
    enabled,
  });
}
