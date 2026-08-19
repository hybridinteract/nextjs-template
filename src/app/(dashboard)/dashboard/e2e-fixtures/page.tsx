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
 * renders nothing here and ships none of the fixture code to the browser. It is
 * not a runtime flag someone can flip. Playwright's `webServer` sets it.
 *
 * One caveat, so nobody mistakes this for a security boundary: the route still
 * answers **200** with the not-found body rather than a real 404, because this
 * segment is `force-dynamic` and the response has already started streaming by
 * the time `notFound()` runs. Nothing is exposed — but if you want the route
 * gone entirely, `node ncube.js remove e2e` deletes it along with the suite.
 *
 * Delete this folder along with `e2e/` if you drop the end-to-end layer.
 *
 * Note the folder name has no leading underscore: Next treats `_foo` as a
 * private folder and excludes it from routing entirely, so the route would
 * simply not exist.
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
