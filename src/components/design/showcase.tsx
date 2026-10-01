import type { ReactNode } from "react";

interface ShowcaseProps {
  id: string;
  title: string;
  /** The rule, in a sentence or two. */
  note: string;
  children: ReactNode;
}

/** One section of the design page: a heading, the rule, then the parts. */
export function Showcase({ id, title, note, children }: ShowcaseProps) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-border pt-8 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1 mb-5 max-w-2xl text-sm text-muted-foreground">{note}</p>
      {children}
    </section>
  );
}

/** A small caption above a row of examples. */
export function Caption({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-xs font-medium text-muted-foreground">{children}</p>;
}
