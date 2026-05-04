// Central registry for lazily-loaded heavy components.
// All lazy imports go here — never import dynamic() inline in feature components.

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const TableSkeleton = () => (
  <Skeleton className="h-64 w-full rounded-xl" />
);

export const LazyDataTable = dynamic(
  () => import("./data-table").then((m) => ({ default: m.DataTable })),
  {
    ssr: false,
    loading: TableSkeleton,
  },
);
