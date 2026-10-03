import Link from "next/link";
import { LEGAL } from "@/lib/legal";
import { Lockup } from "@/components/Logo";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 lg:max-w-5xl lg:px-10 2xl:max-w-6xl pb-24 pt-10 sm:pt-16">
      <Lockup />
      <h1 className="display mt-8 text-4xl leading-[1.05]">{title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated {LEGAL.updated}</p>
      <div className="legal mt-8 max-w-3xl space-y-4 text-ink-2 leading-relaxed [&_h2]:display [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:text-ink [&_a]:underline [&_a]:decoration-rule [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </main>
  );
}

export function Mail() {
  return <a href={`mailto:${LEGAL.contact}`}>{LEGAL.contact}</a>;
}

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-auto w-full max-w-3xl px-5 lg:max-w-5xl lg:px-10 2xl:max-w-6xl pb-10 pt-6 text-xs text-muted">
      <nav className="flex flex-wrap gap-x-5 gap-y-1">
        <Link href="/terms" className="hover:text-ink">Terms</Link>
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/refunds" className="hover:text-ink">Refunds</Link>
      </nav>
      <p className="mt-2">
        {LEGAL.company}, trading as {LEGAL.tradingAs}. Registered in England and Wales, company number {LEGAL.number}.
      </p>
    </footer>
  );
}
