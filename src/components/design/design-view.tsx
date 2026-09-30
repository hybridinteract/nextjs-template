import { Button } from "@/components/ui/button";
import { DataSection, DialogsSection } from "./content";
import { ButtonsSection, FeedbackSection, FieldsSection, StatusSection } from "./controls";
import { ColourSection, TypeSection } from "./foundations";

const CONTENTS = [
  ["colour", "Colour"],
  ["type", "Type"],
  ["buttons", "Buttons"],
  ["fields", "Fields"],
  ["status", "Status"],
  ["data", "Data"],
  ["feedback", "Feedback"],
  ["dialogs", "Dialogs"],
] as const;

/**
 * Every shared part, in its common states. Building a screen? Find the part here
 * and copy how it is used. Adding a part? Add it here in the same change. The
 * rules behind each section are in docs/rules/10-styling.md.
 *
 * It only uses parts `ncube remove` cannot take out, so it keeps compiling
 * whatever a project removes.
 */
export function DesignView() {
  return (
    <div className="space-y-10">
      <nav aria-label="Sections" className="flex flex-wrap gap-1.5">
        {CONTENTS.map(([id, label]) => (
          <Button key={id} variant="outline" size="xs" className="rounded-full" asChild>
            <a href={`#${id}`}>{label}</a>
          </Button>
        ))}
      </nav>
      <ColourSection />
      <TypeSection />
      <ButtonsSection />
      <FieldsSection />
      <StatusSection />
      <DataSection />
      <FeedbackSection />
      <DialogsSection />
    </div>
  );
}
