import Link from "next/link";

const featuredCategories = [
  { name: "Women", href: "/shop/women" },
  { name: "Men", href: "/shop/men" },
  { name: "New Arrivals", href: "/shop/new-arrivals" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Guruji Collections home">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-bold tracking-widest text-[var(--brand-foreground)]">
              GJC
            </span>
            <div>
              <p className="text-sm font-semibold tracking-[0.25em]">GURUJI</p>
              <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--muted)]">Collections</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm md:flex" aria-label="Primary navigation">
            <Link href="/shop/women">Women</Link>
            <Link href="/shop/men">Men</Link>
            <Link href="/shop/new-arrivals">New Arrivals</Link>
            <Link href="/about">About</Link>
          </nav>

          <div className="flex items-center gap-4 text-sm">
            <Link href="/search">Search</Link>
            <Link href="/account">Account</Link>
            <Link href="/cart">Cart (0)</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
        <div className="flex flex-col justify-center rounded-[2rem] bg-[var(--brand)] px-8 py-14 text-white sm:px-12 lg:px-16 lg:py-20">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.4em] text-[var(--accent)]">GJC / Curated Fashion</p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            Everyday style, thoughtfully collected.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
            Discover clothing selected for modern wardrobes, easy layering, and confident everyday wear.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/shop" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black">
              Shop collection
            </Link>
            <Link href="/shop/new-arrivals" className="rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white">
              New arrivals
            </Link>
          </div>
        </div>

        <div className="flex min-h-[420px] items-end rounded-[2rem] border border-[var(--border)] bg-gradient-to-br from-stone-200 via-stone-100 to-amber-100 p-8">
          <div className="max-w-md rounded-2xl bg-white/80 p-6 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Coming next</p>
            <h2 className="mt-2 text-2xl font-semibold">The GJC AI catalog assistant</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Upload a product photo, add your price, and let GJC prepare the product listing for your review.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 lg:px-8">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Explore GJC</p>
            <h2 className="mt-2 text-2xl font-semibold">Start with a collection</h2>
          </div>
          <Link href="/shop" className="text-sm font-semibold underline underline-offset-4">View all</Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {featuredCategories.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="aspect-[4/3] rounded-xl bg-stone-100" />
              <div className="mt-5 flex items-center justify-between">
                <span className="font-semibold">{category.name}</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} Guruji Collections (GJC)</p>
          <div className="flex gap-5">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
