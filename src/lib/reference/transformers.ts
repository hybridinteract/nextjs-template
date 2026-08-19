import type {
  BackendReferenceOption,
  BackendReferenceOptionsResponse,
  ReferenceOption,
  ReferenceOptionsResult,
} from "./types";

function transformOption(raw: BackendReferenceOption): ReferenceOption {
  return {
    id: raw.id,
    label: raw.label,
    sublabel: raw.sublabel ?? null,
    isActive: raw.is_active,
  };
}

export function transformReferenceOptions(
  raw: BackendReferenceOptionsResponse,
): ReferenceOptionsResult {
  return {
    items: (raw.items ?? []).map(transformOption),
    hasMore: raw.has_more ?? false,
  };
}
