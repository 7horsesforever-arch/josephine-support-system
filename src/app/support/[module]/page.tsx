import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupportModule, supportModules } from "../module-data";

const healthMetricCards = [
  {
    label: "Sleep",
    value: "Ready for data",
    source: "Oura + Apple Health",
    detail: "Duration, timing, restfulness, and rough nights.",
  },
  {
    label: "Readiness",
    value: "Ready for data",
    source: "Oura",
    detail: "A gentle recovery signal for easier day planning.",
  },
  {
    label: "Movement",
    value: "Ready for data",
    source: "Apple Health",
    detail: "Steps and activity trends without turning it into pressure.",
  },
  {
    label: "Ring Battery",
    value: "Weekly check",
    source: "Oura",
    detail: "Charge once a week so bedtime data keeps flowing.",
  },
];

const healthConnectionCards = [
  {
    title: "Oura Ring",
    status: "OAuth connection planned",
    items: [
      "Show sleep, readiness, resting heart rate, and ring battery status.",
      "Store refresh tokens encrypted on the server, not in browser storage.",
      "Use the weekly Charge Oura Ring task as the backup reminder.",
    ],
  },
  {
    title: "Apple Health",
    status: "Native helper needed",
    items: [
      "Apple Health data needs HealthKit permission through an Apple-device helper or a user-approved export.",
      "Start with high-level sleep, steps, and activity summaries only.",
      "A Shortcuts export can be the low-tech bridge before a native helper exists.",
    ],
  },
];

function HealthWellnessDashboard() {
  return (
    <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-teal-800">
            Data Dashboard
          </p>
          <h2 className="mt-2 text-2xl font-black">Body Battery Check</h2>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            A calm snapshot for sleep, recovery, movement, and Oura battery.
            The goal is better planning, not judging the day.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
          Setup needed
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {healthMetricCards.map((metric) => (
          <article
            className="rounded-lg border border-stone-200 bg-stone-50 p-4"
            key={metric.label}
          >
            <p className="text-xs font-bold uppercase text-stone-500">
              {metric.label}
            </p>
            <strong className="mt-2 block text-xl text-stone-950">
              {metric.value}
            </strong>
            <span className="mt-1 block text-xs font-semibold text-teal-800">
              {metric.source}
            </span>
            <p className="mt-3 text-sm text-stone-600">{metric.detail}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        {healthConnectionCards.map((card) => (
          <article
            className="rounded-lg border border-stone-200 bg-white p-4"
            key={card.title}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold">{card.title}</h3>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
                {card.status}
              </span>
            </div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-stone-700">
              {card.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
        <h3 className="font-bold">Privacy rule</h3>
        <p className="mt-2">
          Pull in trends and summaries only. Keep detailed medical history,
          diagnoses, medication details, and raw health exports out of the app
          unless Josephine explicitly chooses a secure medical workflow.
        </p>
      </div>
    </section>
  );
}

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

        {supportModule.slug === "health" ? <HealthWellnessDashboard /> : null}

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
