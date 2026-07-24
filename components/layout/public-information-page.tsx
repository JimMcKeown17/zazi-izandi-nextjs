import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";

import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";

type ContentsItem = {
  href: string;
  label: string;
};

type PublicInformationPageProps = {
  eyebrow: string;
  title: string;
  summary: string;
  lastUpdated: string;
  contents: ContentsItem[];
  children: ReactNode;
};

export function PublicInformationPage({
  eyebrow,
  title,
  summary,
  lastUpdated,
  contents,
  children,
}: PublicInformationPageProps) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-20">
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-700 to-primary-900 py-16 text-white md:py-24">
          <div
            className="absolute inset-0 opacity-10"
            aria-hidden="true"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }}
          />
          <div className="container relative z-10">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Zazi iZandi
            </Link>
            <div className="max-w-4xl">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-accent-yellow">
                {eyebrow}
              </p>
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                {title}
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/90 md:text-xl">
                {summary}
              </p>
              <p className="mt-6 flex items-center gap-2 text-sm text-white/70">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Last updated {lastUpdated}
              </p>
            </div>
          </div>
        </section>

        <div className="container py-12 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <nav
                aria-label="On this page"
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="mb-3 font-bold text-slate-900">On this page</p>
                <ul className="space-y-2 text-sm">
                  {contents.map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        className="block rounded-md px-2 py-1.5 text-slate-600 transition-colors hover:bg-primary-50 hover:text-primary"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            <article className="min-w-0 space-y-10 text-slate-700">
              {children}
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

type InformationSectionProps = {
  id: string;
  title: string;
  children: ReactNode;
};

export function InformationSection({
  id,
  title,
  children,
}: InformationSectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      <h2 className="mb-5 text-2xl font-bold text-slate-950 md:text-3xl">
        {title}
      </h2>
      <div className="space-y-4 leading-7 [&_a]:font-semibold [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_h3]:pt-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-900 [&_li]:pl-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_strong]:font-semibold [&_strong]:text-slate-900 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  );
}
