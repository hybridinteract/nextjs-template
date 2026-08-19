/** One function for every dropdown feed in the app. */

import { apiClient } from "@/lib/api-client";
import { transformReferenceOptions } from "./transformers";
import {
  REFERENCE_PICKER_LIMIT,
  REFERENCE_RESOURCES,
  type BackendReferenceOptionsResponse,
  type ReferenceOptionsParams,
  type ReferenceOptionsResult,
  type ReferenceResource,
} from "./types";

export async function listReferenceOptions(
  resource: ReferenceResource,
  params: ReferenceOptionsParams = {},
): Promise<ReferenceOptionsResult> {
  const raw = await apiClient.get<BackendReferenceOptionsResponse>(
    REFERENCE_RESOURCES[resource],
    { params: { limit: REFERENCE_PICKER_LIMIT, ...params } },
  );
  return transformReferenceOptions(raw);
}
