import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupportModule, supportModules } from "../module-data";

export function generateStaticParams() {
  return supportModules.map((module) => ({ module: module.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module: slug } = await params;
  const supportModule = getSupportModule(slug);

  if (!supportModule) return {};

  return {
    title: `${supportModule.title} | Josephine`,
    description: supportModule.summary,
  };
}

export default async function SupportModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module: slug } = await params;
  const supportModule = getSupportModule(slug);

  if (!supportModule) notFound();

  return (
    <main className="min-h-screen bg-stone-100 text-stone-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
          <Link
            className="text-sm font-semibold text-teal-800 hover:text-teal-950"
            href="/"
          >
            Back to My Campus Hub
          </Link>
          <p className="mt-5 text-xs font-bold uppercase text-teal-800">
            {supportModule.eyebrow}
          </p>
          <h1 className="mt-2 text-4xl font-black leading-tight sm:text-6xl">
            {supportModule.title}
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-stone-600">
            {supportModule.summary}
          </p>
        </header>

        {supportModule.links && supportModule.links.length > 0 ? (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {supportModule.links.map((link) => (
              <a
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-teal-700 bg-white px-4 text-sm font-semibold text-teal-800 shadow-sm hover:bg-teal-50"
                href={link.href}
                key={link.href}
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
              </a>
            ))}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          {supportModule.sections.map((section) => (
            <article
              className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm"
              key={section.title}
            >
              <h2 className="text-lg font-bold">{section.title}</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-stone-700">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
