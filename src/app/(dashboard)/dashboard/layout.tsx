/**
 * Everything under /dashboard renders dynamically.
 *
 * `useSearchParams` — which `useTabState` and the DataView list system both read —
 * cannot run during static prerendering. Setting it once here saves wrapping every
 * list page in its own `<Suspense>` boundary.
 */
export const dynamic = "force-dynamic";

export default function DashboardSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
