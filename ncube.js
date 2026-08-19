#!/usr/bin/env node
/**
 * NCube CLI — Next.js scaffolding tool
 *
 * Mirrors the FastAPI fcube.py module generator for frontend domains.
 *
 * Commands:
 *   node ncube.js init [name]                — post-clone setup (name, .env, shadcn)
 *   node ncube.js startdomain <DomainName>   — scaffold a new feature domain
 *   node ncube.js listdomains                — list existing domains in lib/
 *   node ncube.js setup                      — install shadcn/ui components
 *   node ncube.js remove <feature>           — strip an optional subsystem cleanly
 *   node ncube.js bump <patch|minor|major>   — version + changelog entry
 *   node ncube.js create <name> [--variant base|rbac|full]
 *                                            — (deprecated) bootstrap from local template
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
  if (fs.existsSync(filePath)) {
    warn(`Skipping (already exists): ${filePath}`);
    return;
  }
  fs.writeFileSync(filePath, content, "utf8");
  ok(`Created: ${filePath}`);
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

// ── Domain template generators ─────────────────────────────────────────────────
function generateTypesFile(Domain, domain, _domainKebab) {
  return `import { z } from "zod";

// ── Constants ────────────────────────────────────────────────────────────────
export const ${Domain.toUpperCase()}_STATUSES = ["active", "inactive"] as const;
export type ${Domain}Status = (typeof ${Domain.toUpperCase()}_STATUSES)[number];

export const ${Domain.toUpperCase()}_STATUS_LABELS: Record<${Domain}Status, string> = {
  active: "Active",
  inactive: "Inactive",
};

export const ${Domain.toUpperCase()}_STATUS_COLORS: Record<${Domain}Status, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

export const ${Domain.toUpperCase()}_PAGE_SIZE = 20;

// ── Backend shapes (match wire format exactly) ────────────────────────────────
export interface Backend${Domain} {
  id: string;
  // TODO: Add backend fields (snake_case)
  status: ${Domain}Status;
  created_at: string;
  updated_at: string;
}

export interface Backend${Domain}ListResponse {
  items: Backend${Domain}[];
  total: number;
  skip: number;
  limit: number;
}

// ── Frontend shapes ───────────────────────────────────────────────────────────
export interface ${Domain} {
  id: string;
  // TODO: Add frontend fields (camelCase)
  status: ${Domain}Status;
  createdAt: string;
  updatedAt: string;
}

export interface ${Domain}ListResult {
  items: ${Domain}[];
  total: number;
}

// ── Query params ──────────────────────────────────────────────────────────────
export interface ${Domain}ListParams {
  skip?: number;
  limit?: number;
  search?: string;
  status?: ${Domain}Status | "";
}

// ── Zod schemas ───────────────────────────────────────────────────────────────
export const ${domain}FormSchema = z.object({
  // TODO: Add form fields
});

export type ${Domain}FormValues = z.infer<typeof ${domain}FormSchema>;
`;
}

function generateTransformersFile(Domain, _domain) {
  return `import type { Backend${Domain}, ${Domain}, ${Domain}FormValues } from "./types";

export function transform${Domain}(raw: Backend${Domain}): ${Domain} {
  return {
    id: raw.id,
    // TODO: Map backend fields (snake_case) → frontend fields (camelCase)
    status: raw.status,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function toBackend${Domain}(values: Partial<${Domain}FormValues>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  // TODO: Map camelCase form fields → snake_case backend fields
  return payload;
}
`;
}

function generateApiFile(Domain, domain, domainKebab) {
  return `import { apiClient } from "@/lib/api-client";
import { transform${Domain}, toBackend${Domain} } from "./transformers";
import type {
  Backend${Domain},
  Backend${Domain}ListResponse,
  ${Domain},
  ${Domain}FormValues,
  ${Domain}ListParams,
  ${Domain}ListResult,
} from "./types";
import { ${Domain.toUpperCase()}_PAGE_SIZE } from "./types";

export async function fetch${Domain}s(params: ${Domain}ListParams = {}): Promise<${Domain}ListResult> {
  const queryParams: Record<string, string> = {};
  if (params.skip !== undefined) queryParams.skip = String(params.skip);
  queryParams.limit = String(params.limit ?? ${Domain.toUpperCase()}_PAGE_SIZE);
  if (params.search) queryParams.search = params.search;
  if (params.status) queryParams.status = params.status;

  const data = await apiClient.get<Backend${Domain}ListResponse>("/api/v1/${domainKebab}s", {
    params: queryParams,
  });
  return { items: data.items.map(transform${Domain}), total: data.total };
}

export async function fetch${Domain}(id: string): Promise<${Domain}> {
  const data = await apiClient.get<Backend${Domain}>(\`/api/v1/${domainKebab}s/\${id}\`);
  return transform${Domain}(data);
}

export async function create${Domain}(values: ${Domain}FormValues): Promise<${Domain}> {
  const payload = toBackend${Domain}(values);
  const data = await apiClient.post<Backend${Domain}>("/api/v1/${domainKebab}s", payload);
  return transform${Domain}(data);
}

export async function update${Domain}(id: string, values: Partial<${Domain}FormValues>): Promise<${Domain}> {
  const payload = toBackend${Domain}(values);
  const data = await apiClient.patch<Backend${Domain}>(\`/api/v1/${domainKebab}s/\${id}\`, payload);
  return transform${Domain}(data);
}

export async function delete${Domain}(id: string): Promise<void> {
  await apiClient.delete(\`/api/v1/${domainKebab}s/\${id}\`);
}
`;
}

function generateHooksFile(Domain, domain, domainKebab) {
  return `"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useBlockingMutation } from "@/lib/loading";
import { AppError } from "@/types";
import * as ${domain}Api from "./api";
import type { ${Domain}ListParams, ${Domain}FormValues } from "./types";

// ── Query key factory ─────────────────────────────────────────────────────────
export const ${domain}Keys = {
  all: ["${domainKebab}s"] as const,
  lists: () => [...${domain}Keys.all, "list"] as const,
  list: (params: ${Domain}ListParams) => [...${domain}Keys.lists(), params] as const,
  detail: (id: string) => [...${domain}Keys.all, "detail", id] as const,
};

function handleError(err: unknown) {
  const message = err instanceof AppError ? err.message : "An unexpected error occurred";
  toast.error(message);
}

// ── Query hooks ───────────────────────────────────────────────────────────────
export function use${Domain}s(params: ${Domain}ListParams = {}) {
  return useQuery({
    queryKey: ${domain}Keys.list(params),
    queryFn: () => ${domain}Api.fetch${Domain}s(params),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function use${Domain}(id: string) {
  return useQuery({
    queryKey: ${domain}Keys.detail(id),
    queryFn: () => ${domain}Api.fetch${Domain}(id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

// ── Mutation hooks ────────────────────────────────────────────────────────────
export function useCreate${Domain}() {
  const queryClient = useQueryClient();
  return useBlockingMutation(
    {
      mutationFn: async (values: ${Domain}FormValues) => {
        const result = await ${domain}Api.create${Domain}(values);
        await queryClient.invalidateQueries({ queryKey: ${domain}Keys.lists() });
        return result;
      },
      onSuccess: () => toast.success("${Domain} created"),
      onError: handleError,
    },
    { source: "mutation", label: "Creating ${Domain.toLowerCase()}…" },
  );
}

export function useUpdate${Domain}() {
  const queryClient = useQueryClient();
  return useBlockingMutation(
    {
      mutationFn: async ({ id, values }: { id: string; values: Partial<${Domain}FormValues> }) => {
        const result = await ${domain}Api.update${Domain}(id, values);
        await queryClient.invalidateQueries({ queryKey: ${domain}Keys.lists() });
        await queryClient.invalidateQueries({ queryKey: ${domain}Keys.detail(id) });
        return result;
      },
      onSuccess: () => toast.success("${Domain} updated"),
      onError: handleError,
    },
    { source: "mutation", label: "Saving changes…" },
  );
}

export function useDelete${Domain}() {
  const queryClient = useQueryClient();
  return useBlockingMutation(
    {
      mutationFn: async (id: string) => {
        await ${domain}Api.delete${Domain}(id);
        await queryClient.invalidateQueries({ queryKey: ${domain}Keys.lists() });
      },
      onSuccess: () => toast.success("${Domain} deleted"),
      onError: handleError,
    },
    { source: "mutation", label: "Deleting…" },
  );
}

`;
}

function generateStoreFile(Domain, _domain) {
  return `"use client";

import { create } from "zustand";
import type { ${Domain} } from "./types";

interface ${Domain}UIState {
  // ── Modal state ─────────────────────────────────────────────────────────
  is${Domain}Open: boolean;
  editing${Domain}: ${Domain} | null;
  isViewMode: boolean;
  open${Domain}View: (item: ${Domain}) => void;
  open${Domain}Form: (item?: ${Domain}) => void;
  close${Domain}Form: () => void;

  // ── Delete confirmation ──────────────────────────────────────────────────
  deleting${Domain}: ${Domain} | null;
  openDelete${Domain}: (item: ${Domain}) => void;
  closeDelete${Domain}: () => void;

  // ── Filters ─────────────────────────────────────────────────────────────
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
}

export const use${Domain}Store = create<${Domain}UIState>((set) => ({
  is${Domain}Open: false,
  editing${Domain}: null,
  isViewMode: false,
  open${Domain}View: (item) => set({ is${Domain}Open: true, editing${Domain}: item, isViewMode: true }),
  open${Domain}Form: (item) => set({ is${Domain}Open: true, editing${Domain}: item ?? null, isViewMode: false }),
  close${Domain}Form: () => set({ is${Domain}Open: false, editing${Domain}: null, isViewMode: false }),

  deleting${Domain}: null,
  openDelete${Domain}: (item) => set({ deleting${Domain}: item }),
  closeDelete${Domain}: () => set({ deleting${Domain}: null }),

  searchQuery: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  statusFilter: "",
  setStatusFilter: (statusFilter) => set({ statusFilter }),
}));
`;
}

function generateIndexFile(Domain, domain) {
  return `export { fetch${Domain}s, fetch${Domain}, create${Domain}, update${Domain}, delete${Domain} } from "./api";
export { use${Domain}s, use${Domain}, useCreate${Domain}, useUpdate${Domain}, useDelete${Domain}, ${domain}Keys } from "./hooks";
export { use${Domain}Store } from "./store";
export type { ${Domain}, ${Domain}ListParams, ${Domain}FormValues, ${Domain}Status } from "./types";
export { ${Domain.toUpperCase()}_STATUSES, ${Domain.toUpperCase()}_STATUS_LABELS, ${Domain.toUpperCase()}_STATUS_COLORS } from "./types";
`;
}

// ── Component template generators ─────────────────────────────────────────────
function generateListComponent(Domain, domain, domainKebab) {
  return `"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { use${Domain}s } from "@/lib/${domainKebab}";
import { use${Domain}Store } from "@/lib/${domainKebab}";
import { DataTable, type Column } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks";
import type { ${Domain}, ${Domain}ListParams } from "@/lib/${domainKebab}";
import { ${Domain.toUpperCase()}_STATUS_COLORS, ${Domain.toUpperCase()}_STATUS_LABELS } from "@/lib/${domainKebab}";

export function ${Domain}List() {
  const [params, setParams] = useState<${Domain}ListParams>({ skip: 0, limit: 20 });
  const { searchQuery, setSearchQuery, open${Domain}Form, open${Domain}View } = use${Domain}Store();
  const debouncedSearch = useDebounce(searchQuery);

  const { data, isLoading } = use${Domain}s({ ...params, search: debouncedSearch });

  const columns: Column<${Domain}>[] = [
    {
      key: "id",
      header: "ID",
      cell: (row) => (
        <button
          className="font-mono text-xs text-primary hover:underline"
          onClick={() => open${Domain}View(row)}
        >
          {row.id.slice(0, 8)}…
        </button>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge className={${Domain.toUpperCase()}_STATUS_COLORS[row.status]}>
          {${Domain.toUpperCase()}_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Search ${Domain.toLowerCase()}s…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Button size="sm" onClick={() => open${Domain}Form()}>
          <Plus className="size-4 mr-1.5" />
          Add ${Domain}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
        emptyMessage="No ${Domain.toLowerCase()}s found."
      />

      <div className="text-xs text-muted-foreground">
        {data?.total ?? 0} total
      </div>
    </div>
  );
}
`;
}

function generateFormComponent(Domain, domain, domainKebab) {
  return `"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { use${Domain}Store } from "@/lib/${domainKebab}";
import { useCreate${Domain}, useUpdate${Domain} } from "@/lib/${domainKebab}";
import { ${domain}FormSchema, type ${Domain}FormValues } from "@/lib/${domainKebab}/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ${Domain}Form() {
  const { is${Domain}Open, editing${Domain}, isViewMode, close${Domain}Form } = use${Domain}Store();
  const { mutate: create, isPending: isCreating } = useCreate${Domain}();
  const { mutate: update, isPending: isUpdating } = useUpdate${Domain}();

  const isPending = isCreating || isUpdating;
  const isEdit = Boolean(editing${Domain}) && !isViewMode;
  const title = isViewMode ? "${Domain} Details" : editing${Domain} ? "Edit ${Domain}" : "New ${Domain}";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<${Domain}FormValues>({
    resolver: zodResolver(${domain}FormSchema),
  });

  useEffect(() => {
    if (editing${Domain}) {
      // TODO: reset form with editing${Domain} values
      reset({});
    } else {
      reset({});
    }
  }, [editing${Domain}, reset]);

  const onSubmit = (values: ${Domain}FormValues) => {
    if (editing${Domain} && isEdit) {
      update(
        { id: editing${Domain}.id, values },
        { onSuccess: close${Domain}Form },
      );
    } else {
      create(values, { onSuccess: close${Domain}Form });
    }
  };

  return (
    <Dialog open={is${Domain}Open} onOpenChange={(open) => !open && close${Domain}Form()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {isViewMode && editing${Domain} ? (
          <div className="space-y-3 text-sm">
            {/* TODO: Render read-only detail view */}
            <p className="text-muted-foreground">ID: {editing${Domain}.id}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* TODO: Add form fields */}
            <div className="space-y-1.5">
              <Label>Field</Label>
              <Input placeholder="…" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={close${Domain}Form}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
`;
}

function generatePageComponent(Domain, domainKebab) {
  return `"use client";

import { ${Domain}List } from "@/components/${domainKebab}";
import { ${Domain}Form } from "@/components/${domainKebab}";

export default function ${Domain}Page() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">${Domain}s</h1>
        <p className="text-muted-foreground">Manage your ${Domain.toLowerCase()}s.</p>
      </div>

      <${Domain}List />
      <${Domain}Form />
    </div>
  );
}
`;
}

function generateComponentIndexFile(Domain, domainKebab) {
  return `export { ${Domain}List } from "./${domainKebab}-list";
export { ${Domain}Form } from "./${domainKebab}-form";
`;
}

// ── Commands ───────────────────────────────────────────────────────────────────
function cmdStartDomain(rawName) {
  if (!rawName) {
    err("Usage: node ncube.js startdomain <DomainName>");
    process.exit(1);
  }

  const Domain = toPascalCase(rawName);
  const domain = toCamelCase(rawName);
  const domainKebab = toKebabCase(rawName);

  header(`Scaffolding domain: ${Domain}`);

  // Detect src/ vs root layout
  const hasSrc = fs.existsSync(path.join(process.cwd(), "src"));
  const srcRoot = hasSrc ? path.join(process.cwd(), "src") : process.cwd();

  const libDir = path.join(srcRoot, "lib", domainKebab);
  const compDir = path.join(srcRoot, "components", domainKebab);
  const pageDir = path.join(srcRoot, "app", "(dashboard)", "dashboard", domainKebab);

  step(`Creating lib/${domainKebab}/`);
  writeFile(path.join(libDir, "types.ts"), generateTypesFile(Domain, domain, domainKebab));
  writeFile(path.join(libDir, "transformers.ts"), generateTransformersFile(Domain, domain));
  writeFile(path.join(libDir, "api.ts"), generateApiFile(Domain, domain, domainKebab));
  writeFile(path.join(libDir, "hooks.ts"), generateHooksFile(Domain, domain, domainKebab));
  writeFile(path.join(libDir, "store.ts"), generateStoreFile(Domain, domain));
  writeFile(path.join(libDir, "index.ts"), generateIndexFile(Domain, domain));

  step(`Creating components/${domainKebab}/`);
  writeFile(path.join(compDir, `${domainKebab}-list.tsx`), generateListComponent(Domain, domain, domainKebab));
  writeFile(path.join(compDir, `${domainKebab}-form.tsx`), generateFormComponent(Domain, domain, domainKebab));
  writeFile(path.join(compDir, "index.ts"), generateComponentIndexFile(Domain, domainKebab));

  step(`Creating app/(dashboard)/dashboard/${domainKebab}/`);
  writeFile(path.join(pageDir, "page.tsx"), generatePageComponent(Domain, domainKebab));

  console.log("");
  header("Next steps");
  dim(`1. Add your fields to src/lib/${domainKebab}/types.ts`);
  dim(`2. Update transformers.ts to map snake_case ↔ camelCase`);
  dim(`3. Add form fields to src/components/${domainKebab}/${domainKebab}-form.tsx`);
  dim(`4. Add a nav item in src/app/(dashboard)/config.ts:`);
  console.log("");
  console.log(`  ${c.dim}{${c.reset}`);
  console.log(`  ${c.dim}  name: "${Domain}s",${c.reset}`);
  console.log(`  ${c.dim}  href: "/dashboard/${domainKebab}",${c.reset}`);
  console.log(`  ${c.dim}  icon: SomeIcon,${c.reset}`);
  console.log(`  ${c.dim}  permission: "${domainKebab}.view",${c.reset}`);
  console.log(`  ${c.dim}}${c.reset}`);
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

  const coreDirs = new Set(["auth", "permissions", "loading", "hooks"]);
  const entries = fs.readdirSync(libDir, { withFileTypes: true });
  const domains = entries
    .filter((e) => e.isDirectory() && !coreDirs.has(e.name))
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
  dim("  1. Edit .env — set NEXT_PUBLIC_API_URL to your backend URL");
  dim("  2. npm run dev");
  console.log("");
  info("Add feature domains with:  node ncube.js startdomain <Name>");
  console.log("");
}

function cmdCreate(projectName, variant) {
  // ── Deprecation notice ────────────────────────────────────────────────────────
  console.log("");
  console.log(`${c.yellow}${c.bold}⚠  Deprecation notice${c.reset}`);
  console.log(
    `${c.dim}  'create' is no longer the recommended way to start a project.${c.reset}`,
  );
  console.log(
    `${c.dim}  Use GitHub's "Use this template" button instead:${c.reset}`,
  );
  console.log(
    `${c.dim}    1. Click "Use this template" on GitHub → name your repo${c.reset}`,
  );
  console.log(
    `${c.dim}    2. git clone <your-repo> && cd <your-repo>${c.reset}`,
  );
  console.log(`${c.dim}    3. npm install && node ncube.js init${c.reset}`);
  console.log(`${c.dim}  Continuing with local 'create' anyway…${c.reset}`);
  console.log("");
  // ─────────────────────────────────────────────────────────────────────────────

  if (!projectName) {
    err("Usage: node ncube.js create <project-name> [--variant base|rbac|full]");
    process.exit(1);
  }

  const validVariants = ["base", "rbac", "full"];
  const resolvedVariant = validVariants.includes(variant) ? variant : "rbac";

  header(`Creating project: ${projectName} (variant: ${resolvedVariant})`);

  const destDir = path.join(process.cwd(), "..", projectName);

  if (fs.existsSync(destDir)) {
    err(`Directory already exists: ${destDir}`);
    process.exit(1);
  }

  step("Copying template files…");

  // Files to exclude from the copy
  const excludeAlways = new Set([".git", "node_modules", ".next", "ncube.js"]);

  // Files to exclude per variant
  const excludeByVariant = {
    base: new Set([
      "src/lib/permissions",
      "src/app/(dashboard)/access-control",
    ]),
    rbac: new Set([]),
    full: new Set([]),
  };

  const excluded = new Set([
    ...excludeAlways,
    ...(excludeByVariant[resolvedVariant] || []),
  ]);

  function copyDir(src, dest) {
    mkdirp(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      const relPath = path.relative(process.cwd(), srcPath).replace(/\\/g, "/");

      if (excludeAlways.has(entry.name)) continue;
      if ([...excluded].some((ex) => relPath.startsWith(ex))) continue;

      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  copyDir(process.cwd(), destDir);

  // Copy ncube.js into the new project
  fs.copyFileSync(
    path.join(process.cwd(), "ncube.js"),
    path.join(destDir, "ncube.js"),
  );

  // Update package.json name
  const pkgPath = path.join(destDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    pkg.name = projectName;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }

  // Create .env from .env.example
  const envExamplePath = path.join(destDir, ".env.example");
  const envPath = path.join(destDir, ".env");
  if (fs.existsSync(envExamplePath) && !fs.existsSync(envPath)) {
    fs.copyFileSync(envExamplePath, envPath);
    ok("Created .env from .env.example");
  }

  console.log("");
  ok(`Project created at ../${projectName}`);
  console.log("");
  header("Next steps");
  dim(`cd ../${projectName}`);
  dim("npm install");
  dim("# Edit .env with your API URL");
  dim("node ncube.js setup   # installs shadcn/ui components");
  dim("npm run dev");
  console.log("");

  if (resolvedVariant === "base") {
    info("Variant: base — permissions/RBAC system excluded.");
    dim("To add RBAC later, copy src/lib/permissions from the template.");
  }
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
    docs: [],
    edits: [
      {
        file: "eslint.config.mjs",
        find: '    ignores: ["src/lib/date-utils.ts", "src/lib/numeric/**"],',
        replace: '    ignores: ["src/lib/date-utils.ts"],',
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
        file: "src/app/layout.tsx",
        find: 'import { GlobalLoadingOverlay } from "@/components/loading/global-loading-overlay";\n',
        replace: "",
      },
      {
        file: "src/app/layout.tsx",
        find: "            <GlobalLoadingOverlay />\n",
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
      "Every generated mutation hook uses useBlockingMutation. After removing this, `ncube startdomain` output will not compile until you switch those to useMutation.",
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
    edits: [],
    note:
      "Removing this means hand-rolling page/search/filter state, which docs/rules/07 exists to talk you out of. Read it first.",
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
          "          <ThemeProvider\n" +
          '            attribute="class"\n' +
          '            defaultTheme="light"\n' +
          "            enableSystem\n" +
          "            disableTransitionOnChange\n" +
          "          >\n",
        replace: "",
      },
      {
        file: "src/app/layout.tsx",
        find: "          </ThemeProvider>\n",
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
    "anything. If you have modified one of the files it needs to touch, it stops and tells",
  );
  lines.push("you to finish by hand rather than half-applying the removal.");
  lines.push("");
  lines.push("Afterwards it runs `tsc --noEmit` and reports honestly. To undo:");
  lines.push("`git checkout -- . && git clean -fd`.");
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
    if (f.note) {
      lines.push(`> ⚠️ ${f.note}`);
      lines.push("");
    }
    const touched = [];
    (f.files ?? []).forEach((x) => touched.push([`\`${x}\``, "deleted"]));
    (f.docs ?? []).forEach((x) => touched.push([`\`${x}\``, "deleted (and its row in the rules index)"]));
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
  ${c.cyan}startdomain${c.reset} <DomainName>              Scaffold a new feature domain
  ${c.cyan}listdomains${c.reset}                           List existing domains
  ${c.cyan}setup${c.reset}                                 Install shadcn/ui components
  ${c.cyan}remove${c.reset} <feature> [--dry-run]           Strip an optional subsystem cleanly
  ${c.cyan}remove${c.reset} --list                          What can be removed, and when to
  ${c.cyan}create${c.reset} <name> [--variant base|rbac|full]  ${c.dim}(deprecated)${c.reset} Bootstrap locally
  ${c.cyan}bump${c.reset} <patch|minor|major>              Bump version + add changelog entry

${c.bold}Examples:${c.reset}
  node ncube.js init my-saas
  node ncube.js startdomain Product
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
      cmdStartDomain(rest[0]);
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
    case "create": {
      const variantFlag = rest.indexOf("--variant");
      const variant = variantFlag !== -1 ? rest[variantFlag + 1] : "rbac";
      const name = rest.filter((_, i) => i !== variantFlag && i !== variantFlag + 1)[0];
      cmdCreate(name, variant);
      break;
    }
    default:
      err(`Unknown command: ${command}`);
      dim("Run: node ncube.js --help");
      process.exit(1);
  }
}

main();
