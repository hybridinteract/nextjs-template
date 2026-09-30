#!/usr/bin/env node
/**
 * NCube CLI — Next.js scaffolding tool
 *
 * Mirrors the FastAPI fcube.py module generator for frontend domains.
 *
 * Commands:
 *   node ncube.js init [name]                — post-clone setup (name, .env, shadcn)
 *   node ncube.js startdomain <Name> [--plural <Plural>]
 *                                            — scaffold a module and register it
 *   node ncube.js listdomains                — list the modules in src/lib
 *   node ncube.js setup                      — install shadcn/ui components
 *   node ncube.js remove <feature>           — strip an optional subsystem cleanly
 *   node ncube.js bump <patch|minor|major>   — version + changelog entry
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ── ANSI colours ───────────────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

const ok = (msg) => console.log(`${c.green}✔${c.reset} ${msg}`);
const info = (msg) => console.log(`${c.blue}ℹ${c.reset} ${msg}`);
const warn = (msg) => console.log(`${c.yellow}⚠${c.reset} ${msg}`);
const err = (msg) => console.log(`${c.red}✘${c.reset} ${msg}`);
const step = (msg) => console.log(`${c.cyan}→${c.reset} ${msg}`);
const header = (msg) => console.log(`\n${c.bold}${c.blue}${msg}${c.reset}\n`);
const dim = (msg) => console.log(`  ${c.dim}${msg}${c.reset}`);

// ── Helpers ────────────────────────────────────────────────────────────────────
function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
  mkdirp(path.dirname(filePath));
  const shown = path.relative(process.cwd(), filePath);
  if (fs.existsSync(filePath)) {
    warn(`Skipping (already exists): ${shown}`);
    return;
  }
  fs.writeFileSync(filePath, content, "utf8");
  ok(`Created: ${shown}`);
}

function toPascalCase(str) {
  return str
    .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toUpperCase());
}

function toKebabCase(str) {
  return str
    .replace(/([A-Z])/g, (c) => `-${c.toLowerCase()}`)
    .replace(/^-/, "")
    .toLowerCase();
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

// ── startdomain ────────────────────────────────────────────────────────────────
//
// Scaffolds one module in the shape CLAUDE.md describes: a DataView list, one
// <Modal> that creates, views and edits, react-hook-form + zod, and no store.
// Then it registers the route and the permission keys, so the result passes
// type-check and lint before you touch it. `npm run test:generator` proves that,
// with and without the optional parts it leans on.
//
// It writes one real field, `name`, and one status. On purpose: a module with no
// fields teaches nothing, and your first edit renames them or adds to them.

// Folders in src/lib that belong to the template, not to a feature.
const CORE_LIB_DIRS = new Set([
  "auth", "permissions", "loading", "hooks", "forms", "numeric", "reference", "utilities",
]);

// The sidebar icon for a new module. Change it in config.ts afterwards.
const NAV_ICON = "LayoutList";

/** "Category" → "Categories", "Branch" → "Branches", "LeadSource" → "LeadSources". */
function pluralize(word) {
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  return `${word}s`;
}

/** "LeadSource" → "Lead source". Sentence case, for labels and titles. */
function toLabel(pascal) {
  const words = pascal.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(" ");
  return [words[0], ...words.slice(1).map((w) => w.toLowerCase())].join(" ");
}

/** Every spelling of one module's name, worked out once. */
function domainNames(rawName, rawPlural) {
  const Singular = toPascalCase(rawName);
  const Plural = rawPlural ? toPascalCase(rawPlural) : pluralize(Singular);
  const kebab = toKebabCase(Plural);
  return {
    Singular, // Category
    Plural, // Categories
    singular: toCamelCase(Singular), // category
    plural: toCamelCase(Plural), // categories
    kebab, // categories: the folders, the route and the API path
    resource: kebab.replace(/-/g, "_"), // categories: the permission resource
    CONST: toKebabCase(Singular).replace(/-/g, "_").toUpperCase(), // CATEGORY
    label: toLabel(Singular), // Category
    labelPlural: toLabel(Plural), // Categories
    lower: toLabel(Singular).toLowerCase(), // category
    lowerPlural: toLabel(Plural).toLowerCase(), // categories
  };
}

/** Which optional parts are still in the project. `ncube remove` can take them out. */
function detectFeatures(srcRoot) {
  return {
    permissions: fs.existsSync(path.join(srcRoot, "lib", "permissions")),
    blocking: fs.existsSync(path.join(srcRoot, "lib", "loading")),
    dataView: fs.existsSync(path.join(srcRoot, "components", "data-view")),
  };
}

// ── lib/<module>/ ──────────────────────────────────────────────────────────────

function generateTypesFile(n) {
  return `import { z } from "zod";

// ── Status ──────────────────────────────────────────────────────────────────
// An \`as const\` array, so \`asEnum\` and the status filter can use it at runtime.
// Replace these with the statuses your backend really has.
export const ${n.CONST}_STATUSES = ["active", "inactive"] as const;
export type ${n.Singular}Status = (typeof ${n.CONST}_STATUSES)[number];

export const ${n.CONST}_STATUS_LABELS: Record<${n.Singular}Status, string> = {
  active: "Active",
  inactive: "Inactive",
};

export const ${n.CONST}_PAGE_SIZE = 20;

// ── Wire shapes: snake_case, exactly as the backend sends them ───────────────
export interface Backend${n.Singular} {
  id: string;
  name: string;
  // A plain string on the wire. The backend may add a status next week.
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Backend${n.Singular}ListResponse {
  items: Backend${n.Singular}[];
  total: number;
}

// ── Frontend shapes: camelCase ───────────────────────────────────────────────
export interface ${n.Singular} {
  id: string;
  name: string;
  status: ${n.Singular}Status;
  createdAt: string;
  updatedAt: string;
}

export interface ${n.Singular}ListResult {
  items: ${n.Singular}[];
  total: number;
}

/** DataView's \`apiParams\`: skip, limit, search, sort_by, sort_order and the filters. */
export type ${n.Singular}ListParams = Record<string, string | number | undefined>;

// ── The form ────────────────────────────────────────────────────────────────
export const ${n.singular}FormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Keep it under 200 characters"),
  status: z.enum(${n.CONST}_STATUSES),
});

export type ${n.Singular}FormValues = z.infer<typeof ${n.singular}FormSchema>;

// ── Payloads: snake_case, straight to the API ────────────────────────────────
export interface Create${n.Singular}Payload {
  name: string;
  status: ${n.Singular}Status;
}

export type Update${n.Singular}Payload = Partial<Create${n.Singular}Payload>;
`;
}

function generateTransformersFile(n) {
  return `import {
  ${n.CONST}_STATUSES,
  type Backend${n.Singular},
  type ${n.Singular},
  type ${n.Singular}FormValues,
  type Create${n.Singular}Payload,
} from "./types";

// Every module carries its own copy (docs/rules/02-wire-format.md). A cast would
// let an unknown status through to a Record lookup and render a blank cell.
function asEnum<T extends readonly string[]>(
  raw: string | null | undefined,
  allowed: T,
  fallback: T[number],
): T[number] {
  return allowed.includes(raw as T[number]) ? (raw as T[number]) : fallback;
}

export function transform${n.Singular}(raw: Backend${n.Singular}): ${n.Singular} {
  return {
    id: raw.id,
    name: raw.name,
    status: asEnum(raw.status, ${n.CONST}_STATUSES, "active"),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

/** What the create form opens with. */
export const empty${n.Singular}Form: ${n.Singular}FormValues = {
  name: "",
  status: "active",
};

/** What the edit form opens with. Unsaved-work checks compare against this. */
export function ${n.singular}ToForm(${n.singular}: ${n.Singular}): ${n.Singular}FormValues {
  return {
    name: ${n.singular}.name,
    status: ${n.singular}.status,
  };
}

/**
 * Form values → the snake_case payload. The zod schema has already trimmed the
 * strings. For an optional field, send \`undefined\` rather than an empty box:
 * \`notes: values.notes || undefined\`.
 */
export function formToPayload(values: ${n.Singular}FormValues): Create${n.Singular}Payload {
  return {
    name: values.name,
    status: values.status,
  };
}
`;
}

function generateApiFile(n) {
  return `import { apiClient } from "@/lib/api-client";
import { transform${n.Singular} } from "./transformers";
import type {
  Backend${n.Singular},
  Backend${n.Singular}ListResponse,
  ${n.Singular},
  ${n.Singular}ListParams,
  ${n.Singular}ListResult,
  Create${n.Singular}Payload,
  Update${n.Singular}Payload,
} from "./types";

const BASE = "/api/v1/${n.kebab}";

export async function fetch${n.Plural}(params: ${n.Singular}ListParams): Promise<${n.Singular}ListResult> {
  const data = await apiClient.get<Backend${n.Singular}ListResponse>(BASE, { params });
  return { items: data.items.map(transform${n.Singular}), total: data.total };
}

export async function fetch${n.Singular}(id: string): Promise<${n.Singular}> {
  const data = await apiClient.get<Backend${n.Singular}>(\`\${BASE}/\${id}\`);
  return transform${n.Singular}(data);
}

export async function create${n.Singular}(payload: Create${n.Singular}Payload): Promise<${n.Singular}> {
  const data = await apiClient.post<Backend${n.Singular}>(BASE, payload);
  return transform${n.Singular}(data);
}

export async function update${n.Singular}(id: string, payload: Update${n.Singular}Payload): Promise<${n.Singular}> {
  const data = await apiClient.patch<Backend${n.Singular}>(\`\${BASE}/\${id}\`, payload);
  return transform${n.Singular}(data);
}

export async function delete${n.Singular}(id: string): Promise<void> {
  await apiClient.delete(\`\${BASE}/\${id}\`);
}
`;
}

/**
 * One mutation hook. With the blocking overlay it is `useBlockingMutation`;
 * after `ncube remove blocking-loading` it is a plain `useMutation`.
 */
function mutationHook(f, { name, input, body, success, failure, label }) {
  const options = `{
      mutationFn: async (${input}) => {
${body}
      },
      onSuccess: () => notify.success("${success}"),
      onError: (err) => notify.fromError(err, "${failure}"),
    }`;
  const call = f.blocking
    ? `useBlockingMutation(\n    ${options},\n    { source: "mutation", label: "${label}" },\n  )`
    : `useMutation(${options.replace(/\n {2}/g, "\n")})`;
  return `export function ${name}() {
  const queryClient = useQueryClient();
  return ${call};
}
`;
}

function generateHooksFile(n, f) {
  const reactQuery = f.blocking
    ? "useQuery, useQueryClient"
    : "useMutation, useQuery, useQueryClient";
  const loadingImport = f.blocking ? `import { useBlockingMutation } from "@/lib/loading";\n` : "";
  const create = mutationHook(f, {
    name: `useCreate${n.Singular}`,
    input: `values: ${n.Singular}FormValues`,
    body: `        const created = await ${n.singular}Api.create${n.Singular}(formToPayload(values));
        await queryClient.invalidateQueries({ queryKey: ${n.singular}Keys.lists() });
        return created;`,
    success: `${n.label} created`,
    failure: `Could not create the ${n.lower}`,
    label: `Creating ${n.lower}…`,
  });
  const update = mutationHook(f, {
    name: `useUpdate${n.Singular}`,
    input: `{ id, values }: { id: string; values: ${n.Singular}FormValues }`,
    body: `        const updated = await ${n.singular}Api.update${n.Singular}(id, formToPayload(values));
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ${n.singular}Keys.lists() }),
          queryClient.invalidateQueries({ queryKey: ${n.singular}Keys.detail(id) }),
        ]);
        return updated;`,
    success: `${n.label} saved`,
    failure: `Could not save the ${n.lower}`,
    label: "Saving changes…",
  });
  const remove = mutationHook(f, {
    name: `useDelete${n.Singular}`,
    input: "id: string",
    body: `        await ${n.singular}Api.delete${n.Singular}(id);
        queryClient.removeQueries({ queryKey: ${n.singular}Keys.detail(id) });
        await queryClient.invalidateQueries({ queryKey: ${n.singular}Keys.lists() });`,
    success: `${n.label} deleted`,
    failure: `Could not delete the ${n.lower}`,
    label: `Deleting ${n.lower}…`,
  });

  return `"use client";

import { ${reactQuery} } from "@tanstack/react-query";
${loadingImport}import { notify } from "@/lib/toast";
import * as ${n.singular}Api from "./api";
import { formToPayload } from "./transformers";
import type { ${n.Singular}FormValues, ${n.Singular}ListParams } from "./types";

// Build every key from here, so one invalidation reaches every list.
export const ${n.singular}Keys = {
  all: ["${n.kebab}"] as const,
  lists: () => [...${n.singular}Keys.all, "list"] as const,
  list: (params: ${n.Singular}ListParams) => [...${n.singular}Keys.lists(), params] as const,
  detail: (id: string) => [...${n.singular}Keys.all, "detail", id] as const,
};

// Both queries use the global 30s staleTime. Pick another tier from
// docs/rules/04-data-fetching.md if this data changes faster or slower.
export function use${n.Plural}(params: ${n.Singular}ListParams) {
  return useQuery({
    queryKey: ${n.singular}Keys.list(params),
    queryFn: () => ${n.singular}Api.fetch${n.Plural}(params),
    placeholderData: (previous) => previous,
  });
}

export function use${n.Singular}(id: string | null) {
  return useQuery({
    queryKey: ${n.singular}Keys.detail(id ?? ""),
    queryFn: () => ${n.singular}Api.fetch${n.Singular}(id ?? ""),
    enabled: Boolean(id),
  });
}

// Toasts live here, not in the component. A failed retry replaces its last
// error instead of stacking. Invalidation goes inside the mutationFn and is
// awaited, so the list is fresh before the panel closes.
${create}
${update}
${remove}`;
}

function generateIndexFile(n) {
  return `export {
  use${n.Plural},
  use${n.Singular},
  useCreate${n.Singular},
  useUpdate${n.Singular},
  useDelete${n.Singular},
  ${n.singular}Keys,
} from "./hooks";
export { empty${n.Singular}Form, ${n.singular}ToForm } from "./transformers";
export {
  ${n.CONST}_STATUSES,
  ${n.CONST}_STATUS_LABELS,
  ${n.CONST}_PAGE_SIZE,
  ${n.singular}FormSchema,
} from "./types";
export type {
  ${n.Singular},
  ${n.Singular}Status,
  ${n.Singular}FormValues,
  ${n.Singular}ListParams,
} from "./types";
`;
}

// ── components/<module>/ ───────────────────────────────────────────────────────

function generateViewFile(n, f) {
  const permissionImport = f.permissions ? `import { usePermission } from "@/lib/permissions";\n` : "";
  const canCreate = f.permissions ? `  const canCreate = usePermission("${n.resource}.create");\n` : "";
  const emptyState = f.permissions
    ? `<Empty${n.Plural} canCreate={canCreate} onCreate={openCreate} />`
    : `<Empty${n.Plural} onCreate={openCreate} />`;
  const actions = f.permissions ? `canCreate ? <AddButton onClick={openCreate} /> : null` : `<AddButton onClick={openCreate} />`;
  const emptyProps = f.permissions
    ? "{ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }"
    : "{ onCreate }: { onCreate: () => void }";
  const emptyButton = f.permissions
    ? "{canCreate && <AddButton onClick={onCreate} />}"
    : "<AddButton onClick={onCreate} />";

  return `"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  ${n.CONST}_PAGE_SIZE,
  ${n.CONST}_STATUS_LABELS,
  ${n.CONST}_STATUSES,
  use${n.Plural},
  type ${n.Singular},
  type ${n.Singular}Status,
} from "@/lib/${n.kebab}";
${permissionImport}import { formatDateTime } from "@/lib/date-utils";
import { useDisplayTimeZone } from "@/lib/timezone";
import { DataView, useDataView, type FilterConfig, type SortOption } from "@/components/data-view";
import type { Column } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { ${n.Singular}DetailModal } from "./${toKebabCase(n.Singular)}-detail-modal";

const STATUS_TONES: Record<${n.Singular}Status, StatusTone> = {
  active: "success",
  inactive: "neutral",
};

const FILTERS: FilterConfig[] = [
  {
    key: "status",
    label: "Status",
    options: ${n.CONST}_STATUSES.map((status) => ({ value: status, label: ${n.CONST}_STATUS_LABELS[status] })),
  },
];

const SORT_OPTIONS: SortOption[] = [
  { field: "name", label: "Name" },
  { field: "created_at", label: "Created" },
];

function buildColumns(timeZone: string): Column<${n.Singular}>[] {
  return [
    { key: "name", header: "Name", sortable: true, mobilePrimary: true },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge label={${n.CONST}_STATUS_LABELS[row.status]} tone={STATUS_TONES[row.status]} />
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      sortKey: "created_at",
      cell: (row) => formatDateTime(row.createdAt, { timeZone }),
    },
  ];
}

// Which panel is open. Only the id is kept: the modal reads the record through
// \`use${n.Singular}\`, so it is fresh after a save. Server data never goes in a store.
type Panel = { kind: "closed" } | { kind: "create" } | { kind: "record"; id: string };

export function ${n.Singular}View() {
  const timeZone = useDisplayTimeZone();
${canCreate}  const [panel, setPanel] = useState<Panel>({ kind: "closed" });
  const dv = useDataView({
    namespace: "${n.kebab}",
    pageSize: ${n.CONST}_PAGE_SIZE,
    defaultSort: { field: "created_at", order: "desc" },
  });
  const { data, isLoading, isPending, error, refetch } = use${n.Plural}(dv.apiParams);
  const openCreate = () => setPanel({ kind: "create" });

  // isPending, error and onRetry, all three. Without them a failed list reads as
  // "there is no data", and a slow one flashes the empty state.
  return (
    <>
      <DataView
        params={dv}
        columns={buildColumns(timeZone)}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        isLoading={isLoading}
        isPending={isPending}
        error={error}
        onRetry={refetch}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => setPanel({ kind: "record", id: row.id })}
        filters={FILTERS}
        sortOptions={SORT_OPTIONS}
        searchPlaceholder="Search ${n.lowerPlural}…"
        entityName="${n.lowerPlural}"
        emptyState={${emptyState}}
        actions={${actions}}
      />
      <${n.Singular}DetailModal
        isOpen={panel.kind !== "closed"}
        recordId={panel.kind === "record" ? panel.id : null}
        onClose={() => setPanel({ kind: "closed" })}
      />
    </>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" onClick={onClick}>
      <Plus className="size-4" />
      Add ${n.lower}
    </Button>
  );
}

function Empty${n.Plural}(${emptyProps}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">No ${n.lowerPlural} yet</p>
      <p className="text-sm text-muted-foreground">${n.labelPlural} you add will show up here.</p>
      ${emptyButton}
    </div>
  );
}
`;
}

function generateFormFile(n) {
  const idPrefix = toKebabCase(n.Singular);
  return `"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import {
  ${n.CONST}_STATUS_LABELS,
  ${n.CONST}_STATUSES,
  type ${n.Singular}FormValues,
} from "@/lib/${n.kebab}";
import { Field } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const ${n.CONST}_FORM_ID = "${idPrefix}-form";

interface ${n.Singular}FormProps {
  form: UseFormReturn<${n.Singular}FormValues>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
}

/** The fields. The modal owns the form state, the saving and the closing. */
export function ${n.Singular}Form({ form, onSubmit }: ${n.Singular}FormProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <form id={${n.CONST}_FORM_ID} onSubmit={onSubmit} className="space-y-4">
      <Field label="Name" required error={errors.name?.message}>
        <Input autoComplete="off" {...register("name")} />
      </Field>

      {/* \`htmlFor\` because the Select sits inside a Controller, so Field cannot
          reach it to wire the label itself. */}
      <Field label="Status" htmlFor="${idPrefix}-status" error={errors.status?.message}>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="${idPrefix}-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {${n.CONST}_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {${n.CONST}_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
    </form>
  );
}
`;
}

function generateDetailModalFile(n, f) {
  const fileBase = toKebabCase(n.Singular);
  const permissionImport = f.permissions ? `import { usePermission } from "@/lib/permissions";\n` : "";
  const canLines = f.permissions
    ? `  const canEdit = usePermission("${n.resource}.edit");\n  const canDelete = usePermission("${n.resource}.delete");\n`
    : "";
  const onModeChange = f.permissions ? "recordId && canEdit ? setMode : undefined" : "recordId ? setMode : undefined";
  const canDeleteHere = f.permissions ? "recordId && canDelete" : "recordId";

  return `"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ${n.CONST}_STATUS_LABELS,
  empty${n.Singular}Form,
  ${n.singular}FormSchema,
  ${n.singular}ToForm,
  use${n.Singular},
  useCreate${n.Singular},
  useUpdate${n.Singular},
  type ${n.Singular},
  type ${n.Singular}FormValues,
} from "@/lib/${n.kebab}";
${permissionImport}import { formatDateTime } from "@/lib/date-utils";
import { useResetOnOpen } from "@/lib/forms";
import { useDisplayTimeZone } from "@/lib/timezone";
import { DetailRow } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Modal, type ModalMode } from "@/components/ui/modal";
import { Delete${n.Singular}Button } from "./delete-${fileBase}-button";
import { ${n.CONST}_FORM_ID, ${n.Singular}Form } from "./${fileBase}-form";

interface ${n.Singular}DetailModalProps {
  isOpen: boolean;
  /** The record to show, or null to create a new one. */
  recordId: string | null;
  onClose: () => void;
}

/**
 * Create, view and edit one ${n.lower}, in the shared <Modal>.
 *
 * A record opens in view mode, and the pencil switches to edit. A new one opens
 * straight into the form. The panel stays mounted while closed, so both the mode
 * and the form are reset every time it opens.
 */
export function ${n.Singular}DetailModal({ isOpen, recordId, onClose }: ${n.Singular}DetailModalProps) {
  const { data: record } = use${n.Singular}(recordId);
${canLines}  const [mode, setMode] = useState<ModalMode>("edit");
  useResetOnOpen(isOpen, () => setMode(recordId ? "view" : "edit"));

  const form = useForm<${n.Singular}FormValues>({
    resolver: zodResolver(${n.singular}FormSchema),
    defaultValues: empty${n.Singular}Form,
  });
  const { reset } = form;
  // What the form opened with. RHF's isDirty compares against this, so a stray
  // Escape only asks before throwing away real changes.
  useEffect(() => {
    if (isOpen) reset(record ? ${n.singular}ToForm(record) : empty${n.Singular}Form);
  }, [isOpen, record, reset]);

  const create${n.Singular} = useCreate${n.Singular}();
  const update${n.Singular} = useUpdate${n.Singular}();
  const isSaving = create${n.Singular}.isPending || update${n.Singular}.isPending;
  // The hooks toast success and failure. Here we only close, and only on success.
  const save = form.handleSubmit((values) => {
    if (recordId) update${n.Singular}.mutate({ id: recordId, values }, { onSuccess: onClose });
    else create${n.Singular}.mutate(values, { onSuccess: onClose });
  });

  const isView = mode === "view";
  const viewFooter =
    ${canDeleteHere} ? (
      <FooterRow>
        <Delete${n.Singular}Button id={recordId} onDeleted={onClose} />
      </FooterRow>
    ) : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={recordId ? (record?.name ?? "${n.label}") : "New ${n.lower}"}
      size="small"
      mode={recordId ? mode : undefined}
      onModeChange={${onModeChange}}
      isDirty={!isView && form.formState.isDirty}
      footer={
        isView ? viewFooter : <EditFooter isSaving={isSaving} isNew={!recordId} onCancel={onClose} />
      }
    >
      {isView ? <${n.Singular}Details record={record} /> : <${n.Singular}Form form={form} onSubmit={save} />}
    </Modal>
  );
}

function ${n.Singular}Details({ record }: { record: ${n.Singular} | undefined }) {
  const timeZone = useDisplayTimeZone();
  if (!record) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="divide-y divide-border">
      <DetailRow label="Name" value={record.name} />
      <DetailRow label="Status" value={${n.CONST}_STATUS_LABELS[record.status]} />
      <DetailRow label="Created" value={formatDateTime(record.createdAt, { timeZone })} />
      <DetailRow label="Updated" value={formatDateTime(record.updatedAt, { timeZone })} />
    </div>
  );
}

function FooterRow({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-2 p-4">{children}</div>;
}

interface EditFooterProps {
  isSaving: boolean;
  isNew: boolean;
  onCancel: () => void;
}

// Save submits the form by id, so Enter in a field and the button do the same thing.
function EditFooter({ isSaving, isNew, onCancel }: EditFooterProps) {
  return (
    <FooterRow>
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" form={${n.CONST}_FORM_ID} disabled={isSaving}>
        {isSaving ? "Saving…" : isNew ? "Create" : "Save changes"}
      </Button>
    </FooterRow>
  );
}
`;
}

function generateDeleteButtonFile(n) {
  return `"use client";

import { Trash2 } from "lucide-react";
import { useDelete${n.Singular} } from "@/lib/${n.kebab}";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface Delete${n.Singular}ButtonProps {
  id: string;
  onDeleted: () => void;
}

/** Delete, behind a confirm. A one-click delete is one misclick from lost data. */
export function Delete${n.Singular}Button({ id, onDeleted }: Delete${n.Singular}ButtonProps) {
  const delete${n.Singular} = useDelete${n.Singular}();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={delete${n.Singular}.isPending}>
          <Trash2 className="size-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this ${n.lower}?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={() => delete${n.Singular}.mutate(id, { onSuccess: onDeleted })}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
`;
}

function generateComponentIndexFile(n) {
  return `export { ${n.Singular}View } from "./${toKebabCase(n.Singular)}-view";
`;
}

// ── app/(dashboard)/dashboard/<module>/ ────────────────────────────────────────

function generatePageFile(n) {
  return `import { ${NAV_ICON} } from "lucide-react";
import { PageLayout } from "@/components/layout";
import { ${n.Singular}View } from "@/components/${n.kebab}";

// A Server Component: metadata and layout only. The list is the client view.
export const metadata = { title: "${n.labelPlural}" };

export default function ${n.Plural}Page() {
  return (
    <PageLayout
      title="${n.labelPlural}"
      description="Search, filter and open ${n.lowerPlural}."
      icon={<${NAV_ICON} className="size-4" />}
    >
      <${n.Singular}View />
    </PageLayout>
  );
}
`;
}

function generateLoadingFile() {
  return `// The dashboard's skeleton, while this route loads. Replace it with one shaped
// like this page once the page has settled.
export { default } from "../loading";
`;
}

// ── Registering the module ─────────────────────────────────────────────────────
//
// Each registration is an insert between two exact markers, checked before
// anything is written. If a marker has gone (the file was reshaped by hand), that
// one registration is skipped and the exact lines to add are printed instead.
// A half-registered module is worse than a clearly unregistered one.

/** Where to insert `text`: just before the first `end` that follows `start`. */
function findInsert(source, start, end) {
  const from = source.indexOf(start);
  if (from === -1) return -1;
  return source.indexOf(end, from + start.length);
}

/** Add `name` to the file's lucide-react import. False if there is no such import. */
function withLucideIcon(source, name) {
  const match = /import \{([^}]*)\} from "lucide-react";/.exec(source);
  if (!match) return null;
  const names = match[1].split(",").map((s) => s.trim()).filter(Boolean);
  if (names.includes(name)) return source;
  const line = `import { ${[...names, name].join(", ")} } from "lucide-react";`;
  return source.replace(match[0], line);
}

function registrationPlan(n, f, srcRoot) {
  const plan = [];
  const permissionLine = f.permissions ? `    permission: "${n.resource}.view",\n` : "";
  plan.push({
    label: "sidebar and ROUTES",
    file: path.join(srcRoot, "app", "(dashboard)", "config.ts"),
    already: `"/dashboard/${n.kebab}"`,
    icon: NAV_ICON,
    inserts: [
      {
        start: "export const dashboardNavItems",
        end: "];",
        text: `  {\n    name: "${n.labelPlural}",\n    href: "/dashboard/${n.kebab}",\n    icon: ${NAV_ICON},\n${permissionLine}  },\n`,
      },
      {
        start: "export const ROUTES",
        end: "} as const;",
        text: `  ${n.plural}: "/dashboard/${n.kebab}",\n`,
      },
    ],
  });
  if (!f.permissions) return plan;

  const actions = ["view", "create", "edit", "delete"];
  plan.push({
    label: "permission keys",
    file: path.join(srcRoot, "lib", "permissions", "types.ts"),
    already: `"${n.resource}.view"`,
    inserts: [
      {
        start: "export const PERMISSIONS = [",
        end: "] as const;",
        text: `  // ${n.labelPlural}\n${actions.map((a) => `  "${n.resource}.${a}",\n`).join("")}`,
      },
    ],
  });
  const backend = { view: ["read", "read_all"], create: ["create"], edit: ["update"], delete: ["delete"] };
  const mapping = actions
    .map((a) => `  "${n.resource}.${a}": [${backend[a].map((b) => `"${n.resource}:${b}"`).join(", ")}],\n`)
    .join("");
  plan.push({
    label: "permission mapping",
    file: path.join(srcRoot, "lib", "permissions", "check.ts"),
    already: `"${n.resource}.view":`,
    inserts: [{ start: "PERMISSION_MAPPING: Record<Permission, readonly string[]> = {", end: "};", text: mapping }],
  });
  return plan;
}

/** The new file contents, or a reason it cannot be applied. */
function applyInserts(item) {
  if (!fs.existsSync(item.file)) return { error: "file not found" };
  let source = fs.readFileSync(item.file, "utf8");
  if (source.includes(item.already)) return { skipped: true };
  if (item.icon) {
    source = withLucideIcon(source, item.icon);
    if (source === null) return { error: 'no `import { … } from "lucide-react"` line' };
  }
  for (const insert of item.inserts) {
    const at = findInsert(source, insert.start, insert.end);
    if (at === -1) return { error: `could not find \`${insert.start}\` … \`${insert.end}\`` };
    source = source.slice(0, at) + insert.text + source.slice(at);
  }
  return { source };
}

function registerModule(n, f, srcRoot) {
  const plan = registrationPlan(n, f, srcRoot);
  // Check every file first. The permission keys and their mapping must land
  // together: a key with no mapping entry is a type error in check.ts.
  const results = plan.map((item) => ({ item, ...applyInserts(item) }));
  const failed = results.filter((r) => r.error);
  const permissionsBroken = failed.some((r) => r.item.label.startsWith("permission"));

  for (const r of results) {
    const rel = path.relative(process.cwd(), r.item.file);
    const blocked = r.item.label.startsWith("permission") && permissionsBroken;
    if (r.skipped) info(`${rel} already has the ${r.item.label}`);
    else if (r.error || blocked) printManualRegistration(r.item, rel, r.error ?? "its pair failed");
    else {
      fs.writeFileSync(r.item.file, r.source);
      ok(`Registered the ${r.item.label} in ${rel}`);
    }
  }
}

function printManualRegistration(item, rel, reason) {
  warn(`Could not register the ${item.label} in ${rel}: ${reason}.`);
  dim("Add these lines by hand:");
  for (const insert of item.inserts) {
    dim(`  inside ${insert.start} … ${insert.end}`);
    insert.text.trimEnd().split("\n").forEach((line) => dim(`    ${line}`));
  }
  if (item.icon) dim(`  and import ${item.icon} from "lucide-react"`);
}

// ── The command ────────────────────────────────────────────────────────────────

const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9]*([-_][A-Za-z0-9]+)*$/;

/** `startdomain <Name> [--plural <Plural>]`. Exits if either name is missing or malformed. */
function parseStartDomainArgs(args) {
  const pluralFlag = args.indexOf("--plural");
  const rawPlural = pluralFlag === -1 ? undefined : args[pluralFlag + 1];
  const rawName = args.find((a, i) => !a.startsWith("--") && (pluralFlag === -1 || i !== pluralFlag + 1));
  const badPlural = pluralFlag !== -1 && !NAME_PATTERN.test(rawPlural ?? "");
  if (!rawName || !NAME_PATTERN.test(rawName) || badPlural) {
    err("Usage: node ncube.js startdomain <Name> [--plural <Plural>]");
    dim("  The name is singular, like Category or LeadSource. Letters and digits only.");
    process.exit(1);
  }
  return { rawName, rawPlural };
}

/** Everything that must be true before a single file is written. Exits on failure. */
function checkCanScaffold(n, f, dirs) {
  if (!f.dataView) {
    err("startdomain builds its list on DataView, and src/components/data-view is gone.");
    dim("  docs/rules/07-list-pages.md says every list page uses it. Restore it, or build this list by hand.");
    process.exit(1);
  }
  if (CORE_LIB_DIRS.has(n.kebab)) {
    err(`"${n.kebab}" is a folder the template already uses in src/lib. Pick another name.`);
    process.exit(1);
  }
  const taken = dirs.filter((d) => fs.existsSync(d));
  if (taken.length) {
    err(`${n.Singular} already exists. Nothing was written.`);
    taken.forEach((d) => dim(`  ${path.relative(process.cwd(), d)}`));
    process.exit(1);
  }
}

function writeModuleFiles(n, f, dirs) {
  const [libDir, compDir, pageDir] = dirs;
  const base = toKebabCase(n.Singular);
  const files = [
    [path.join(libDir, "types.ts"), generateTypesFile(n)],
    [path.join(libDir, "transformers.ts"), generateTransformersFile(n)],
    [path.join(libDir, "api.ts"), generateApiFile(n)],
    [path.join(libDir, "hooks.ts"), generateHooksFile(n, f)],
    [path.join(libDir, "index.ts"), generateIndexFile(n)],
    [path.join(compDir, `${base}-view.tsx`), generateViewFile(n, f)],
    [path.join(compDir, `${base}-form.tsx`), generateFormFile(n)],
    [path.join(compDir, `${base}-detail-modal.tsx`), generateDetailModalFile(n, f)],
    [path.join(compDir, `delete-${base}-button.tsx`), generateDeleteButtonFile(n)],
    [path.join(compDir, "index.ts"), generateComponentIndexFile(n)],
    [path.join(pageDir, "page.tsx"), generatePageFile(n)],
    [path.join(pageDir, "loading.tsx"), generateLoadingFile()],
  ];
  for (const [file, content] of files) writeFile(file, content);
}

function cmdStartDomain(args) {
  const { rawName, rawPlural } = parseStartDomainArgs(args);
  const n = domainNames(rawName, rawPlural);
  const srcRoot = path.join(process.cwd(), "src");
  const f = detectFeatures(srcRoot);
  const dirs = [
    path.join(srcRoot, "lib", n.kebab),
    path.join(srcRoot, "components", n.kebab),
    path.join(srcRoot, "app", "(dashboard)", "dashboard", n.kebab),
  ];
  checkCanScaffold(n, f, dirs);

  header(`Scaffolding ${n.labelPlural} (/dashboard/${n.kebab})`);
  if (!f.permissions) info("Permissions were removed, so nothing is gated.");
  if (!f.blocking) info("The blocking overlay was removed, so mutations use plain useMutation.");
  writeModuleFiles(n, f, dirs);
  console.log("");
  registerModule(n, f, srcRoot);
  printStartDomainNextSteps(n, f, Boolean(rawPlural));
}

function printStartDomainNextSteps(n, f, pluralGiven) {
  header("Next steps");
  dim(`1. Match src/lib/${n.kebab}/types.ts to your backend. It starts with a name and a status.`);
  dim(`   Then the transformer, the zod schema, the form fields and the columns.`);
  dim(`2. Check the API path, /api/v1/${n.kebab}, against your FastAPI router.`);
  if (f.permissions) {
    dim(`3. Check the backend names in src/lib/permissions/check.ts, like "${n.resource}:read".`);
  }
  dim(`${f.permissions ? 4 : 3}. npm run dev:mock and open /dashboard/${n.kebab}. The list shows an error`);
  dim(`   with a retry until the backend has the route. That is the error state working.`);
  console.log("");
  if (pluralGiven) return;
  dim("Irregular plural? Delete the folders and run again with --plural, like:");
  dim("  node ncube.js startdomain Person --plural People");
  console.log("");
}

function cmdListDomains() {
  header("Existing domains");

  const hasSrc = fs.existsSync(path.join(process.cwd(), "src"));
  const libDir = hasSrc
    ? path.join(process.cwd(), "src", "lib")
    : path.join(process.cwd(), "lib");

  if (!fs.existsSync(libDir)) {
    warn("lib/ directory not found.");
    return;
  }

  const entries = fs.readdirSync(libDir, { withFileTypes: true });
  const domains = entries
    .filter((e) => e.isDirectory() && !CORE_LIB_DIRS.has(e.name))
    .map((e) => e.name);

  if (domains.length === 0) {
    info("No feature domains yet. Run: node ncube.js startdomain <Name>");
    return;
  }

  domains.forEach((d) => ok(d));
  console.log("");
  info(`${domains.length} domain(s) found.`);
}

function cmdSetup() {
  header("Setting up shadcn/ui components");

  const components = [
    "button",
    "input",
    "label",
    "card",
    "badge",
    "dialog",
    "alert-dialog",
    "dropdown-menu",
    "sheet",
    "table",
    "tabs",
    "skeleton",
    "avatar",
    "separator",
    "scroll-area",
    "form",
    "select",
    "checkbox",
    "switch",
    "textarea",
    "popover",
    "command",
    "sonner",
    "tooltip",
    "radio-group",
  ];

  step("Installing shadcn/ui components (this may take a minute)…");
  console.log("");

  try {
    execSync(`npx shadcn@latest add --yes ${components.join(" ")}`, {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("");
    ok("shadcn/ui components installed successfully.");
  } catch {
    err("shadcn setup failed. Try running manually:");
    dim(`npx shadcn@latest add --yes ${components.join(" ")}`);
    process.exit(1);
  }
}

function cmdInit(rawArgs) {
  // Determine app name
  // Priority: positional arg → --name flag → current directory name
  const nameFlag = rawArgs.indexOf("--name");
  let appName;
  if (nameFlag !== -1 && rawArgs[nameFlag + 1]) {
    appName = toKebabCase(rawArgs[nameFlag + 1]);
  } else {
    const positional = rawArgs.find((a) => !a.startsWith("--"));
    appName = positional
      ? toKebabCase(positional)
      : path.basename(process.cwd());
  }

  header(`Initializing project: ${appName}`);

  // 1. Update package.json name
  const pkgPath = path.join(process.cwd(), "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const oldName = pkg.name;
    if (oldName !== appName) {
      pkg.name = appName;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
      ok(`package.json name: ${c.dim}${oldName}${c.reset} → ${c.green}${appName}${c.reset}`);
    } else {
      ok(`package.json name: ${appName} (already set)`);
    }
  }

  // 2. Create .env from .env.example if not already present
  const envExamplePath = path.join(process.cwd(), ".env.example");
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envExamplePath) && !fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envExamplePath, "utf8");
    envContent = envContent.replace(
      /^NEXT_PUBLIC_APP_NAME=.*$/m,
      `NEXT_PUBLIC_APP_NAME="${appName}"`,
    );
    fs.writeFileSync(envPath, envContent);
    ok("Created .env from .env.example");
  } else if (fs.existsSync(envPath)) {
    info(".env already exists — skipping");
  } else {
    warn(".env.example not found — skipping .env creation");
  }

  // 3. Install shadcn components if src/components/ui/ is missing or empty
  const hasSrc = fs.existsSync(path.join(process.cwd(), "src"));
  const uiDir = hasSrc
    ? path.join(process.cwd(), "src", "components", "ui")
    : path.join(process.cwd(), "components", "ui");
  const needsSetup =
    !fs.existsSync(uiDir) || fs.readdirSync(uiDir).length === 0;

  if (needsSetup) {
    cmdSetup();
  } else {
    ok("shadcn/ui components already installed — skipping setup");
  }

  console.log("");
  header("You're ready!");
  dim("Next steps:");
  dim("  1. npm run dev:mock — the app with a fake backend. Sign in with anything.");
  dim("  2. When the backend is up: set NEXT_PUBLIC_API_URL in .env, then npm run dev");
  console.log("");
  info("Add feature domains with:  node ncube.js startdomain <Name>");
  console.log("");
}

// ── bump command ───────────────────────────────────────────────────────────────
function cmdBump(bumpType) {
  const validTypes = ["patch", "minor", "major"];
  if (!bumpType || !validTypes.includes(bumpType)) {
    err(`Usage: node ncube.js bump <patch|minor|major>`);
    dim("  patch  — bug fixes, minor doc updates");
    dim("  minor  — new features, new components, backwards-compatible");
    dim("  major  — breaking changes, major dep upgrades, arch changes");
    process.exit(1);
  }

  const pkgPath = path.join(process.cwd(), "package.json");
  if (!fs.existsSync(pkgPath)) {
    err("package.json not found. Run from the project root.");
    process.exit(1);
  }

  // ── Read current version ──────────────────────────────────────────────────
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const current = pkg.version ?? "0.0.0";
  const [maj, min, pat] = current.split(".").map(Number);

  let next;
  if (bumpType === "major") next = `${maj + 1}.0.0`;
  else if (bumpType === "minor") next = `${maj}.${min + 1}.0`;
  else next = `${maj}.${min}.${pat + 1}`;

  // ── Update package.json ───────────────────────────────────────────────────
  pkg.version = next;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  ok(`package.json version: ${c.dim}${current}${c.reset} → ${c.green}${next}${c.reset}`);

  // ── Prepend entry to RELEASE_NOTES.md ────────────────────────────────────
  const notesPath = path.join(process.cwd(), "RELEASE_NOTES.md");
  const today = new Date().toISOString().slice(0, 10);

  const newEntry = `
## [${next}] — ${today}

### Added
-

### Changed
-

### Fixed
-

### Removed
-

---
`;

  if (fs.existsSync(notesPath)) {
    const existing = fs.readFileSync(notesPath, "utf8");
    // Insert after the header block (first `---` separator line)
    const insertAfter = "---\n";
    const insertIdx = existing.indexOf(insertAfter);
    if (insertIdx !== -1) {
      const updated =
        existing.slice(0, insertIdx + insertAfter.length) +
        newEntry +
        existing.slice(insertIdx + insertAfter.length);
      fs.writeFileSync(notesPath, updated);
      ok(`RELEASE_NOTES.md — added entry for [${next}]`);
    } else {
      fs.appendFileSync(notesPath, newEntry);
      ok(`RELEASE_NOTES.md — appended entry for [${next}]`);
    }
  } else {
    warn("RELEASE_NOTES.md not found — skipped.");
  }

  console.log("");
  header("Next steps");
  dim(`1. Fill in the [${next}] section in RELEASE_NOTES.md`);
  dim(`2. Commit the changes:`);
  console.log(`   ${c.dim}git add package.json RELEASE_NOTES.md${c.reset}`);
  console.log(`   ${c.dim}git commit -m "chore: release v${next}"${c.reset}`);
  dim(`3. Tag the release:`);
  console.log(`   ${c.dim}git tag v${next}${c.reset}`);
  console.log(`   ${c.dim}git push && git push --tags${c.reset}`);
  console.log("");
}

// ── Removable features ─────────────────────────────────────────────────────────
//
// A template ships things a given project will not need, and dead code is worse
// than absent code: it gets read, maintained and copied. Each entry below says
// exactly what one feature is made of, so `node ncube.js remove <name>` can take
// it out cleanly — and so `docs/OPTIONAL_PARTS.md` can be generated from the same
// data instead of drifting from it.
//
// `edits` use EXACT string matches on purpose. If a file has been changed since
// the template shipped, the match fails, the command stops, and it tells you to
// finish by hand — which is the honest outcome. A regex that "mostly" matches
// would silently mangle the file instead.
const REMOVABLE = {
  permissions: {
    label: "Permissions / RBAC",
    summary: "Role-based gating of nav items and buttons.",
    keeps:
      "Auth still works. Everyone who is signed in sees every nav item, and the backend remains the real guard.",
    when: "Your app has no roles, or a single role, and the backend gates everything.",
    files: ["src/lib/permissions"],
    deps: [],
    docs: ["docs/rules/06-permissions.md"],
    edits: [
      {
        file: "src/app/(dashboard)/layout.tsx",
        find: 'import { useRoleStore, useFilteredNavItems } from "@/lib/permissions";\n',
        replace: "",
      },
      {
        file: "src/app/(dashboard)/layout.tsx",
        find:
          "  const { setRole, setIsSuperuser, setEffectivePermissions } = useRoleStore();\n" +
          "  const navItems = useFilteredNavItems(dashboardNavItems);",
        replace: "  const navItems = dashboardNavItems;",
      },
      {
        file: "src/app/(dashboard)/layout.tsx",
        find:
          "  useEffect(() => {\n" +
          "    if (user) {\n" +
          "      setUser(user);\n" +
          "      setRole(user.role);\n" +
          "      setIsSuperuser(user.isSuperuser);\n" +
          "      setEffectivePermissions(user.effectivePermissions);\n" +
          "    }\n" +
          "  }, [user, setUser, setRole, setIsSuperuser, setEffectivePermissions]);",
        replace:
          "  useEffect(() => {\n" +
          "    if (user) setUser(user);\n" +
          "  }, [user, setUser]);",
      },
      {
        file: "src/app/(dashboard)/config.ts",
        find: 'import type { PermissionedNavItem } from "@/lib/permissions";',
        replace: 'import type { NavItem } from "@/types";',
      },
      {
        file: "src/app/(dashboard)/config.ts",
        find: "export const dashboardNavItems: PermissionedNavItem[] = [",
        replace: "export const dashboardNavItems: NavItem[] = [",
      },
      {
        file: "src/app/(dashboard)/config.ts",
        find:
          "// ── Navigation items ────────────────────────────────────────────────────────\n" +
          "// Add permission/permissions to gate visibility by role.\n" +
          "// Leave both undefined to show to all authenticated users.",
        replace:
          "// ── Navigation items ────────────────────────────────────────────────────────\n" +
          "// Every signed-in user sees every item (permission gating was removed).",
      },
    ],
    // Nav entries keep no dead `permission:` keys behind.
    strip: [{ file: "src/app/(dashboard)/config.ts", pattern: /^\s*permissions?: .*\n/gm }],
  },

  numeric: {
    label: "Decimal money & quantities (big.js)",
    summary: "String-based money and quantity maths, and their formatters.",
    keeps: "Everything else. Dates are a separate module and stay.",
    when: "Your app shows no money, no decimals, and no quantities.",
    files: ["src/lib/numeric"],
    deps: ["big.js", "@types/big.js"],
    // The e2e fixture page formats money and quantities, so it has to go first.
    removeFirst: ["e2e"],
    docs: [],
    edits: [
      {
        file: "eslint.config.mjs",
        find: '      "src/lib/date-utils.ts",\n      "src/lib/numeric/**",\n',
        replace: '      "src/lib/date-utils.ts",\n',
      },
      {
        file: "src/lib/utils.ts",
        find:
          "// formatCurrency() and formatNumber() used to live here. They are gone on purpose:\n" +
          "// both took a `locale` argument and did float math on money. Use\n" +
          "// `formatMoney` / `formatQuantity` from `@/lib/numeric`, which pin one locale and\n" +
          "// keep money as a decimal string. See that module's comments for why.\n\n",
        replace: "",
      },
    ],
    note:
      "The Intl.NumberFormat lint rules stay. If you now format numbers by hand, delete the two NumberFormat selectors in eslint.config.mjs — and read docs/rules/12 first, because the browser-locale trap they prevent is real either way.",
  },

  reference: {
    label: "Reference pickers",
    summary: "Ungated dropdown feeds and the shared <ReferencePicker>.",
    keeps: "<SearchableSelect> stays — it is the combobox underneath, and useful on its own.",
    when: "Your backend has no /<resource>/options routes and you are not adding them.",
    files: ["src/lib/reference", "src/components/shared/reference-picker.tsx"],
    deps: [],
    docs: ["docs/rules/13-reference-data.md"],
    edits: [
      {
        file: "src/components/shared/index.ts",
        find: 'export { ReferencePicker } from "./reference-picker";\n',
        replace: "",
      },
    ],
    note:
      "Read docs/rules/13 before removing this. The permission trap it exists to prevent — a dropdown fed from a gated module list, silently empty for the people who need it — comes back the moment you write your own picker.",
  },

  "blocking-loading": {
    label: "Blocking loading overlay",
    summary: "useBlockingMutation and the full-screen overlay it drives.",
    keeps: "Mutations still work. You handle pending state per component instead.",
    when: "You prefer inline pending states on buttons to a global overlay.",
    files: ["src/lib/loading", "src/components/loading"],
    deps: [],
    docs: [],
    edits: [
      {
        file: "src/components/providers/app-providers.tsx",
        find: 'import { GlobalLoadingOverlay } from "@/components/loading/global-loading-overlay";\n',
        replace: "",
      },
      {
        file: "src/components/providers/app-providers.tsx",
        find: "      <GlobalLoadingOverlay />\n",
        replace: "",
      },
      {
        file: "src/lib/auth/hooks.ts",
        find: 'import { useBlockingMutation } from "@/lib/loading";\n',
        replace: "",
      },
      {
        file: "src/lib/auth/hooks.ts",
        find: "  return useBlockingMutation(\n    {\n      mutationFn: authApi.logout,",
        replace: "  return useMutation({\n      mutationFn: authApi.logout,",
      },
      {
        file: "src/lib/auth/hooks.ts",
        find: '    },\n    { source: "auth", label: "Signing out…" },\n  );\n}',
        replace: "  });\n}",
      },
    ],
    note:
      "Modules you already built on useBlockingMutation stop compiling until you switch them to useMutation. `ncube startdomain` sees the overlay is gone and writes useMutation from now on.",
  },

  "data-view": {
    label: "DataView (the list system)",
    summary:
      "URL-synced search, filters, sort, pagination, row selection and bulk actions.",
    keeps: "<DataTable> stays — you would render it yourself and own the state.",
    when: "Your app is not list-driven. Think hard: this is most of the template's value.",
    files: ["src/components/data-view"],
    deps: [],
    docs: ["docs/rules/07-list-pages.md"],
    // The e2e fixture page is a DataView, so it has to go first.
    removeFirst: ["e2e"],
    edits: [
      {
        file: "eslint.config.mjs",
        find: '  "src/components/data-view/**",\n',
        replace: "",
      },
    ],
    note:
      "Removing this means hand-rolling page/search/filter state, which docs/rules/07 exists to talk you out of. Read it first.",
  },

  e2e: {
    label: "End-to-end tests (Playwright)",
    summary:
      "The browser suite, its mock backend, and the fixture route the shared-system tests drive.",
    keeps:
      "The Vitest layer stays — unit and component tests keep running with `npm test`.",
    when:
      "You are not going to run a browser suite. Deleting it also removes the fixture route from your app entirely.",
    files: ["e2e", "playwright.config.ts", "src/app/(dashboard)/dashboard/e2e-fixtures"],
    deps: ["@playwright/test"],
    docs: [],
    edits: [
      {
        file: "package.json",
        find: '    "test:e2e": "playwright test",\n    "test:e2e:ui": "playwright test --ui",\n',
        replace: "",
      },
    ],
    note:
      "docs/rules/16-testing.md still describes two layers. Trim its Playwright half so the doc matches what you have.",
  },

  "dark-mode": {
    label: "Dark mode",
    summary: "next-themes and the theme-aware toast surface.",
    keeps:
      "The .dark token block stays in globals.css — harmless, and it means re-adding dark mode later is one provider.",
    when: "The product is light-only by design.",
    files: [],
    deps: ["next-themes"],
    docs: [],
    edits: [
      {
        file: "src/app/layout.tsx",
        find: 'import { ThemeProvider } from "next-themes";\n',
        replace: "",
      },
      {
        file: "src/app/layout.tsx",
        find:
          "        {/* Here, not in a group's layout, because the public site needs it\n" +
          "            too. Its class has to be on <html> before the first paint, or the\n" +
          "            page flashes the wrong theme. */}\n" +
          "        <ThemeProvider\n" +
          '          attribute="class"\n' +
          '          defaultTheme="light"\n' +
          "          enableSystem\n" +
          "          disableTransitionOnChange\n" +
          "        >\n",
        replace: "",
      },
      {
        file: "src/app/layout.tsx",
        find: "        </ThemeProvider>\n",
        replace: "",
      },
      {
        file: "src/components/ui/sonner.tsx",
        find: 'import { useTheme } from "next-themes"\n',
        replace: "",
      },
      {
        file: "src/components/ui/sonner.tsx",
        find: '  const { theme = "system" } = useTheme()\n\n  return (\n    <Sonner\n      theme={theme as ToasterProps["theme"]}\n',
        replace: "  return (\n    <Sonner\n",
      },
    ],
  },

  site: {
    label: "Public site",
    summary: "The app/(site) route group: pages anyone can read without signing in, starting with the home page at /.",
    keeps:
      "Sign-in and the dashboard are unchanged. \"/\" sends people to the dashboard again, and the dashboard sends anyone not signed in to the login page.",
    when: "The app is only for people who sign in, like an internal tool or an admin console.",
    files: ["src/app/(site)", "e2e/site.spec.ts"],
    deps: [],
    docs: [],
    edits: [
      {
        file: "next.config.ts",
        find: "  poweredByHeader: false,\n",
        replace:
          "  poweredByHeader: false,\n" +
          "  // No public site (`ncube remove site`), so \"/\" has nothing to show.\n" +
          "  async redirects() {\n" +
          '    return [{ source: "/", destination: "/dashboard", permanent: false }];\n' +
          "  },\n",
      },
    ],
    note:
      "docs/rules/08-components-and-routing.md still describes the public site. Trim that part so the doc matches what you have.",
  },
};

function rmrf(target) {
  if (!fs.existsSync(target)) return false;
  fs.rmSync(target, { recursive: true, force: true });
  return true;
}

/** Strip a dependency from package.json, wherever it is declared. */
function removeDep(pkg, name) {
  let found = false;
  for (const section of ["dependencies", "devDependencies"]) {
    if (pkg[section] && pkg[section][name] !== undefined) {
      delete pkg[section][name];
      found = true;
    }
  }
  return found;
}

// Not searched for markdown: dependencies, build output, git, and agent
// worktrees (whole copies of the repo whose links would be edited twice).
const DOC_SKIP_DIRS = new Set([
  "node_modules", ".next", ".git", ".claude", "test-results", "playwright-report", "coverage",
]);

function markdownFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (DOC_SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) markdownFiles(full, out);
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

/**
 * Turns every markdown link into a deleted doc into plain text, marked as removed.
 * A dead link fails `npm run check:docs`, and CI runs that. Returns the files changed.
 */
function unlinkDeletedDoc(docPath, featureName) {
  const deleted = path.join(process.cwd(), docPath);
  const changed = [];
  for (const file of markdownFiles(process.cwd())) {
    const text = fs.readFileSync(file, "utf8");
    const unlink = (link, label, target) => {
      const pointsAtDeleted = path.resolve(path.dirname(file), target) === deleted;
      return pointsAtDeleted ? `${label} (removed by \`ncube remove ${featureName}\`)` : link;
    };
    const updated = text.replace(/\[([^\]]*)\]\(([^)\s#]+)(?:#[^)\s]*)?\)/g, unlink);
    if (updated === text) continue;
    fs.writeFileSync(file, updated);
    changed.push(path.relative(process.cwd(), file));
  }
  return changed;
}

function cmdRemoveList() {
  header("Removable features");
  console.log(
    `  ${c.dim}Each of these is optional. Remove what your project does not need —${c.reset}`,
  );
  console.log(
    `  ${c.dim}dead code still gets read, maintained and copied.${c.reset}\n`,
  );
  for (const [key, f] of Object.entries(REMOVABLE)) {
    console.log(`  ${c.bold}${key}${c.reset}  ${c.dim}—${c.reset} ${f.label}`);
    console.log(`    ${c.dim}${f.summary}${c.reset}`);
    console.log(`    ${c.dim}Remove when: ${f.when}${c.reset}\n`);
  }
  dim("Usage:  node ncube.js remove <name> [--dry-run]");
  dim("Docs:   docs/OPTIONAL_PARTS.md");
  console.log("");
}

function cmdRemove(name, flags) {
  if (!name || name === "--list") return cmdRemoveList();

  const feature = REMOVABLE[name];
  if (!feature) {
    err(`Unknown feature: ${name}`);
    dim(`Known: ${Object.keys(REMOVABLE).join(", ")}`);
    dim("Run `node ncube.js remove --list` for what each one is.");
    process.exit(1);
  }

  const dry = flags.includes("--dry-run");
  header(`${dry ? "Dry run — " : ""}Removing: ${feature.label}`);
  console.log(`  ${c.dim}${feature.summary}${c.reset}`);
  console.log(`  ${c.dim}Keeps: ${feature.keeps}${c.reset}\n`);

  // ── Ordering: some features are used by others, so they cannot go first. ──
  for (const dep of feature.removeFirst ?? []) {
    const stillHere = (REMOVABLE[dep]?.files ?? []).some((f) =>
      fs.existsSync(path.join(process.cwd(), f)),
    );
    if (stillHere) {
      err(`Remove \`${dep}\` first — it uses ${name}.`);
      dim(`  node ncube.js remove ${dep}`);
      dim(`  node ncube.js remove ${name}`);
      console.log("");
      warn("Nothing was changed.");
      process.exit(1);
    }
  }

  // ── Verify every edit still matches before changing anything. ──────────────
  // Half-applied removals are the failure mode worth designing against: the
  // build breaks and it is not obvious which of ten edits landed.
  const problems = [];
  for (const edit of feature.edits ?? []) {
    const p = path.join(process.cwd(), edit.file);
    if (!fs.existsSync(p)) {
      problems.push(`${edit.file} — file not found`);
    } else if (!fs.readFileSync(p, "utf8").includes(edit.find)) {
      problems.push(`${edit.file} — expected text not found (file was modified?)`);
    }
  }
  if (problems.length) {
    err("Cannot remove cleanly. These files no longer match the template:");
    problems.forEach((p) => dim(`  ${p}`));
    console.log("");
    warn("Nothing was changed. Remove this feature by hand — docs/OPTIONAL_PARTS.md");
    dim("lists every file and edit involved.");
    process.exit(1);
  }

  // ── Apply ─────────────────────────────────────────────────────────────────
  for (const target of feature.files ?? []) {
    if (dry) { info(`would delete  ${target}`); continue; }
    if (rmrf(path.join(process.cwd(), target))) ok(`deleted  ${target}`);
  }

  for (const doc of feature.docs ?? []) {
    if (dry) { info(`would delete  ${doc}`); continue; }
    if (rmrf(path.join(process.cwd(), doc))) {
      ok(`deleted  ${doc}`);
      // Keep the rules index honest.
      const idx = path.join(process.cwd(), "docs/rules/README.md");
      if (fs.existsSync(idx)) {
        const base = path.basename(doc);
        const kept = fs
          .readFileSync(idx, "utf8")
          .split("\n")
          .filter((line) => !line.includes(base))
          .join("\n");
        fs.writeFileSync(idx, kept);
        ok(`updated  docs/rules/README.md`);
      }
      unlinkDeletedDoc(doc, name).forEach((f) => ok(`unlinked ${f}`));
    }
  }

  for (const edit of feature.edits ?? []) {
    if (dry) { info(`would edit    ${edit.file}`); continue; }
    const p = path.join(process.cwd(), edit.file);
    fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(edit.find, edit.replace));
    ok(`edited   ${edit.file}`);
  }

  for (const s of feature.strip ?? []) {
    if (dry) { info(`would strip   ${s.file}`); continue; }
    const p = path.join(process.cwd(), s.file);
    fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(s.pattern, ""));
    ok(`stripped ${s.file}`);
  }

  if ((feature.deps ?? []).length) {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const dropped = feature.deps.filter((d) => removeDep(pkg, d));
    if (dry) {
      dropped.forEach((d) => info(`would drop    ${d}`));
    } else if (dropped.length) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
      dropped.forEach((d) => ok(`dropped  ${d} from package.json`));
      warn("Run `npm install` to update the lockfile.");
    }
  }

  if (dry) {
    console.log("");
    info("Dry run — nothing was changed.");
    return;
  }

  if (feature.note) {
    console.log("");
    warn(feature.note);
  }

  // ── Prove it ──────────────────────────────────────────────────────────────
  // A removal that leaves the project broken is worse than no command at all,
  // so this reports honestly rather than claiming success.
  console.log("");
  step("Checking the project still compiles…");
  try {
    // Next's generated route types still name the pages just deleted, and
    // tsconfig includes them. Stale entries would read as real errors.
    fs.rmSync(path.join(process.cwd(), ".next/types"), { recursive: true, force: true });
    fs.rmSync(path.join(process.cwd(), ".next/dev/types"), { recursive: true, force: true });
    execSync("npx tsc --noEmit", { stdio: "pipe", cwd: process.cwd() });
    ok("type-check passed.");
    console.log("");
    dim("Next: npm run lint && npm run build");
  } catch (e) {
    console.log("");
    warn("type-check failed. What is left refers to the feature you removed:");
    console.log("");
    console.log(String(e.stdout ?? e.message).trim());
    console.log("");
    dim("Fix those references, then re-run `npm run type-check`.");
    dim("To undo the whole removal: git checkout -- . && git clean -fd");
  }
}

/** Regenerate docs/OPTIONAL_PARTS.md from REMOVABLE, so the two cannot drift. */
function cmdRemoveDocs() {
  const lines = [];
  lines.push("# Optional parts");
  lines.push("");
  lines.push("> Generated from the `REMOVABLE` manifest in `ncube.js`.");
  lines.push("> Regenerate with `node ncube.js remove --write-docs`. Do not edit by hand.");
  lines.push("");
  lines.push(
    "A template ships things your project will not need. **Dead code is worse than absent",
  );
  lines.push(
    "code** — it gets read, maintained, copied into new modules, and it makes every search",
  );
  lines.push("noisier. Take out what you are not using, early, while it is still easy.");
  lines.push("");
  lines.push("```bash");
  lines.push("node ncube.js remove --list          # what can go");
  lines.push("node ncube.js remove <name> --dry-run  # what it would touch");
  lines.push("node ncube.js remove <name>          # do it, then type-check");
  lines.push("```");
  lines.push("");
  lines.push(
    "The command verifies every edit still matches the template **before** changing",
  );
  lines.push(
    "anything. If you have modified one of the files it needs to touch, it stops and",
  );
  lines.push(
    "changes nothing, telling you to finish by hand rather than half-applying the removal.",
  );
  lines.push("");
  lines.push(
    "That check is a substring match, so it will not catch every possible edit — a comment",
  );
  lines.push(
    "appended to the last matched line still matches. The real guarantee is the step after:",
  );
  lines.push(
    "the command runs `tsc --noEmit` and prints the failures verbatim rather than claiming",
  );
  lines.push("success. To undo everything: `git checkout -- . && git clean -fd`.");
  lines.push("");
  lines.push(
    "**Commit before removing.** The command is designed to be revertible, and that only",
  );
  lines.push("works if there is something to revert to.");
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const [key, f] of Object.entries(REMOVABLE)) {
    lines.push(`## \`${key}\` — ${f.label}`);
    lines.push("");
    lines.push(f.summary);
    lines.push("");
    lines.push(`**Remove when:** ${f.when}`);
    lines.push("");
    lines.push(`**What still works:** ${f.keeps}`);
    lines.push("");
    if ((f.removeFirst ?? []).length) {
      lines.push(
        `**Remove \`${f.removeFirst.join("`, `")}\` first** — it depends on this one.`,
      );
      lines.push("");
    }
    if (f.note) {
      lines.push(`> ⚠️ ${f.note}`);
      lines.push("");
    }
    const touched = [];
    (f.files ?? []).forEach((x) => touched.push([`\`${x}\``, "deleted"]));
    (f.docs ?? []).forEach((x) => touched.push([`\`${x}\``, "deleted, with its row in the rules index. Links to it become plain text"]));
    [...new Set((f.edits ?? []).map((e) => e.file))].forEach((x) =>
      touched.push([`\`${x}\``, "edited"]),
    );
    [...new Set((f.strip ?? []).map((e) => e.file))].forEach((x) =>
      touched.push([`\`${x}\``, "lines stripped"]),
    );
    (f.deps ?? []).forEach((x) => touched.push([`\`${x}\``, "dependency dropped"]));
    if (touched.length) {
      lines.push("| What | Action |");
      lines.push("|---|---|");
      touched.forEach(([a, b]) => lines.push(`| ${a} | ${b} |`));
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  lines.push("## Adding a removable feature");
  lines.push("");
  lines.push(
    "Add an entry to `REMOVABLE` in `ncube.js` and run `node ncube.js remove --write-docs`.",
  );
  lines.push("");
  lines.push(
    "Use **exact strings** in `edits`, never regex. A match that fails is a clean stop; a",
  );
  lines.push("regex that half-matches quietly mangles the file.");
  lines.push("");

  const out = path.join(process.cwd(), "docs/OPTIONAL_PARTS.md");
  fs.writeFileSync(out, lines.join("\n"));
  ok("docs/OPTIONAL_PARTS.md regenerated from the manifest.");
}

// ── Entry point ────────────────────────────────────────────────────────────────
function main() {
  const [, , command, ...rest] = process.argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(`
${c.bold}${c.blue}NCube CLI${c.reset} — Next.js scaffolding tool

${c.bold}Commands:${c.reset}
  ${c.cyan}init${c.reset} [name]                           Post-clone setup: name, .env, shadcn
  ${c.cyan}startdomain${c.reset} <Name> [--plural <Plural>]  Scaffold a module: list, modal, route, permissions
  ${c.cyan}listdomains${c.reset}                           List existing domains
  ${c.cyan}setup${c.reset}                                 Install shadcn/ui components
  ${c.cyan}remove${c.reset} <feature> [--dry-run]           Strip an optional subsystem cleanly
  ${c.cyan}remove${c.reset} --list                          What can be removed, and when to
  ${c.cyan}bump${c.reset} <patch|minor|major>              Bump version + add changelog entry

${c.bold}Examples:${c.reset}
  node ncube.js init my-saas
  node ncube.js startdomain Category
  node ncube.js startdomain Person --plural People
  node ncube.js listdomains
  node ncube.js setup
  node ncube.js remove --list
  node ncube.js remove permissions --dry-run
  node ncube.js bump minor
`);
    return;
  }

  switch (command) {
    case "init":
      cmdInit(rest);
      break;
    case "startdomain":
      cmdStartDomain(rest);
      break;
    case "listdomains":
      cmdListDomains();
      break;
    case "setup":
      cmdSetup();
      break;
    case "remove":
      if (rest[0] === "--write-docs") cmdRemoveDocs();
      else cmdRemove(rest[0], rest.slice(1));
      break;

    case "bump":
      cmdBump(rest[0]);
      break;
    default:
      err(`Unknown command: ${command}`);
      dim("Run: node ncube.js --help");
      process.exit(1);
  }
}

main();
