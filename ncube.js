#!/usr/bin/env node
/**
 * NCube CLI — Next.js scaffolding tool
 *
 * Mirrors the FastAPI fcube.py module generator for frontend domains.
 *
 * Commands:
 *   node ncube.js startdomain <DomainName>   — scaffold a new feature domain
 *   node ncube.js listdomains                — list existing domains in lib/
 *   node ncube.js setup                      — install shadcn/ui components
 *   node ncube.js create <name> [--variant base|rbac|full]
 *                                            — bootstrap a new project from this template
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
function generateTypesFile(Domain, domain, domainKebab) {
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

function generateTransformersFile(Domain, domain) {
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

function generateStoreFile(Domain, domain) {
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

function cmdCreate(projectName, variant) {
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

// ── Entry point ────────────────────────────────────────────────────────────────
function main() {
  const [, , command, ...rest] = process.argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(`
${c.bold}${c.blue}NCube CLI${c.reset} — Next.js scaffolding tool

${c.bold}Commands:${c.reset}
  ${c.cyan}startdomain${c.reset} <DomainName>              Scaffold a new feature domain
  ${c.cyan}listdomains${c.reset}                           List existing domains
  ${c.cyan}setup${c.reset}                                 Install shadcn/ui components
  ${c.cyan}create${c.reset} <name> [--variant base|rbac|full]  Bootstrap a new project
  ${c.cyan}bump${c.reset} <patch|minor|major>              Bump version + add changelog entry

${c.bold}Examples:${c.reset}
  node ncube.js startdomain Product
  node ncube.js listdomains
  node ncube.js setup
  node ncube.js create my-saas --variant rbac
  node ncube.js bump minor
`);
    return;
  }

  switch (command) {
    case "startdomain":
      cmdStartDomain(rest[0]);
      break;
    case "listdomains":
      cmdListDomains();
      break;
    case "setup":
      cmdSetup();
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
