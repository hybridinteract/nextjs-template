/**
 * The public home page, at "/". A placeholder: replace it with the product's
 * own. Its title and description come from the root layout until it sets its
 * own metadata.
 */
export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-24 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Welcome
      </h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        This is the public home page. Anyone can read the pages in{" "}
        <code className="font-mono text-sm">src/app/(site)</code> without signing in.
      </p>
    </section>
  );
}
