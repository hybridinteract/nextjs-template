import { notFound } from "next/navigation";
import { Boxes } from "lucide-react";
import { PageLayout } from "@/components/layout";
import { FixtureView } from "./fixture-view";

/**
 * The surface the end-to-end tests drive.
 *
 * The template ships no domains, so there is no real list page to test — and the
 * shared systems (DataView, DataTable, Modal) are the part most worth testing.
 * This page gives them somewhere to run.
 *
 * `NEXT_PUBLIC_E2E` is inlined at build time, so a production build without it
 * cannot render this route at all — it is not a runtime check that someone can
 * flip. Playwright's `webServer` sets it.
 *
 * Delete this folder along with `e2e/` if you drop the end-to-end layer.
 */
export const metadata = { title: "Fixtures" };

export default function FixturesPage() {
  if (process.env.NEXT_PUBLIC_E2E !== "1") notFound();

  return (
    <PageLayout
      title="Widgets"
      description="A fixture for the end-to-end suite."
      icon={<Boxes className="size-4" />}
    >
      <FixtureView />
    </PageLayout>
  );
}
