import { Caption, Showcase } from "./showcase";

// Written out in full, not built from the name, so Tailwind finds the class
// names when it scans the source. `bg-${name}` would render no colour at all.
const SWATCHES = [
  { name: "background", className: "bg-background" },
  { name: "card", className: "bg-card" },
  { name: "muted", className: "bg-muted" },
  { name: "accent", className: "bg-accent" },
  { name: "border", className: "bg-border" },
  { name: "primary", className: "bg-primary" },
  { name: "secondary", className: "bg-secondary" },
  { name: "destructive", className: "bg-destructive" },
  { name: "success", className: "bg-success" },
  { name: "warning", className: "bg-warning" },
  { name: "info", className: "bg-info" },
] as const;

export function ColourSection() {
  return (
    <Showcase
      id="colour"
      title="Colour"
      note="Only these tokens, by name: bg-primary, text-muted-foreground, border-border. They follow dark mode and a rebrand. A raw palette class or a hex fails lint. To rebrand, change the values in :root and .dark in globals.css."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {SWATCHES.map((swatch) => (
          <div key={swatch.name} className="space-y-1.5">
            <div className={`h-12 rounded-lg border border-border ${swatch.className}`} />
            <p className="font-mono text-xs text-muted-foreground">{swatch.name}</p>
          </div>
        ))}
      </div>
    </Showcase>
  );
}

const TYPE_SCALE = [
  { className: "text-2xl font-bold tracking-tight", use: "text-2xl · the page title, which PageLayout sets" },
  { className: "text-lg font-semibold", use: "text-lg · a section heading, a modal title" },
  { className: "text-base", use: "text-base · reading text" },
  { className: "text-sm", use: "text-sm · tables, forms and most of the app" },
  { className: "text-xs text-muted-foreground", use: "text-xs · captions, hints and meta" },
  { className: "font-mono text-sm", use: "font-mono · ids and codes" },
] as const;

export function TypeSection() {
  return (
    <Showcase
      id="type"
      title="Type"
      note="Tailwind's scale, nothing in between. A made-up size in square brackets fails lint outside the folders that build parts."
    >
      <div className="space-y-3">
        {TYPE_SCALE.map((row) => (
          <div key={row.use}>
            <Caption>{row.use}</Caption>
            <p className={row.className}>Order ORD-1042 for Ravi Kumar, 24 Sep</p>
          </div>
        ))}
      </div>
    </Showcase>
  );
}
