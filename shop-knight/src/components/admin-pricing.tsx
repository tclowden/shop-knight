import Link from 'next/link';
import { Nav } from '@/components/nav';
import { pricingSections, type PricingLeafLink } from '@/lib/admin-pricing';

type PricingPageShellProps = {
  title: string;
  description: string;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
};

export function PricingPageShell({
  title,
  description,
  eyebrow = 'Admin Pricing',
  backHref = '/admin/pricing',
  backLabel = 'Back to Pricing',
  children,
}: PricingPageShellProps) {
  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">{eyebrow}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {backLabel}
          </Link>
        ) : null}
      </div>

      <Nav />

      {children}
    </main>
  );
}

function PricingLinkCard({ href, label, description }: PricingLeafLink) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <span className="text-sm font-semibold text-sky-700 transition group-hover:translate-x-0.5">Open</span>
      </div>
    </Link>
  );
}

export function PricingOverview() {
  return (
    <PricingPageShell
      title="Pricing"
      description="Admin scaffold for pricing controls, rate tables, discount structures, and material setup."
      backHref=""
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pricingSections.map((section) => (
          <div key={section.href} className="space-y-3">
            <PricingLinkCard {...section} />
            {section.children?.length ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Included Links</p>
                <div className="mt-3 space-y-2">
                  {section.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:text-sky-700"
                    >
                      <span>{child.label}</span>
                      <span className="text-slate-400">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </section>
    </PricingPageShell>
  );
}

export function PricingPlaceholderPage({
  title,
  description,
  relatedLinks = [],
}: {
  title: string;
  description: string;
  relatedLinks?: PricingLeafLink[];
}) {
  return (
    <PricingPageShell title={title} description={description}>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm leading-6 text-slate-600">
          This admin area is scaffolded and ready for pricing-specific forms, grids, and APIs. No business logic has been attached yet.
        </p>
      </section>

      {relatedLinks.length ? (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Related Links</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {relatedLinks.map((link) => (
              <PricingLinkCard key={link.href} {...link} />
            ))}
          </div>
        </section>
      ) : null}
    </PricingPageShell>
  );
}
