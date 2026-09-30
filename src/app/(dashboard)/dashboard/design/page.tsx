import { Palette } from "lucide-react";
import { PageLayout } from "@/components/layout";
import { DesignView } from "@/components/design/design-view";

export const metadata = { title: "Design system" };

/**
 * Every shared part in one place, for whoever builds the next screen, and for
 * Claude through the build-ui skill.
 *
 * Not in the sidebar: it is a reference for developers, not a screen for the
 * people using the app. It holds no real data, so it is safe at its address in
 * production too.
 */
export default function DesignPage() {
  return (
    <PageLayout
      title="Design system"
      description="Every shared part, in its common states. Check both themes before you copy one."
      icon={<Palette className="size-4" />}
    >
      <DesignView />
    </PageLayout>
  );
}
