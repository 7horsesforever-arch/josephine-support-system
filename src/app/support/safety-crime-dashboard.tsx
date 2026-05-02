type CrimeTrend = {
  label: string;
  latest: number;
  previous: number;
  note: string;
};

const fortCollinsCrimeTrends: CrimeTrend[] = [
  {
    label: "Larceny / theft",
    latest: 3039,
    previous: 3390,
    note: "Most common listed property crime citywide.",
  },
  {
    label: "Burglary / breaking & entering",
    latest: 387,
    previous: 454,
    note: "Dorm/apartment habit: lock doors and windows.",
  },
  {
    label: "Motor vehicle theft",
    latest: 327,
    previous: 362,
    note: "Car habit: lock it, hide valuables, check parking area.",
  },
  {
    label: "Robbery",
    latest: 42,
    previous: 61,
    note: "Use SafeWalk, RamRide, lit routes, or rideshare at night.",
  },
];

const officialSafetySources = [
  {
    label: "Fort Collins Crime Stats",
    href: "https://www.fortcollins.gov/Services/Police-and-Public-Safety/Police-Services/Crime-Stats-and-Prevention",
    detail: "Citywide annual NIBRS index-crime table plus prevention notes.",
  },
  {
    label: "Live Crime Map",
    href: "https://myneighborhoodupdate.net/",
    detail: "Fort Collins Police links this map for recent calls and incident categories.",
  },
  {
    label: "CSUPD Daily Crime Log",
    href: "https://police.colostate.edu/daily-crime-and-fire-log/",
    detail: "Campus police log for recent Clery crime and fire entries.",
  },
  {
    label: "CSU Clery Statistics",
    href: "https://clery.colostate.edu/crime-statistics-for-colorado-state-university/",
    detail: "Annual campus crime-statistics report by category and location.",
  },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function trendPercent(latest: number, previous: number) {
  if (previous === 0) return 0;
  return ((latest - previous) / previous) * 100;
}

function trendLabel(latest: number, previous: number) {
  const percent = trendPercent(latest, previous);
  if (percent > 0) return `Up ${Math.abs(percent).toFixed(1)}%`;
  if (percent < 0) return `Down ${Math.abs(percent).toFixed(1)}%`;
  return "Flat";
}

export function SafetyCrimeDashboard() {
  return (
    <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-teal-800">
            Local Safety Picture
          </p>
          <h2 className="mt-2 text-2xl font-black">Fort Collins Crime Snapshot</h2>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            A small dashboard for property-crime awareness. Fort Collins Police
            annual stats show the latest citywide table available on their site;
            CSUPD keeps the recent campus crime/fire log.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
          2024 vs 2023
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {fortCollinsCrimeTrends.map((trend) => {
          const percent = trendPercent(trend.latest, trend.previous);
          const isIncreasing = percent > 0;

          return (
            <article
              className="rounded-lg border border-stone-200 bg-stone-50 p-4"
              key={trend.label}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-stone-950">
                  {trend.label}
                </h3>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-bold ${
                    isIncreasing
                      ? "bg-amber-100 text-amber-950"
                      : "bg-teal-100 text-teal-800"
                  }`}
                >
                  {trendLabel(trend.latest, trend.previous)}
                </span>
              </div>
              <p className="mt-4 text-3xl font-black">
                {formatNumber(trend.latest)}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase text-stone-500">
                2024 reported offenses
              </p>
              <p className="mt-3 text-sm text-stone-700">{trend.note}</p>
              <p className="mt-3 text-xs text-stone-500">
                2023: {formatNumber(trend.previous)}
              </p>
            </article>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <h3 className="font-bold">What To Watch</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Theft is the biggest citywide category in the FCPS annual table.</li>
            <li>
              Use the live map for recent nearby patterns, then filter by date
              and category instead of doom-scrolling.
            </li>
            <li>
              Use the CSUPD daily log for campus-specific reports from the most
              recent 60 days.
            </li>
          </ul>
        </article>

        <article className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950">
          <h3 className="font-bold">JoJo Safety Translation</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Lock dorm/suite doors even for quick trips.</li>
            <li>Register and lock bikes/scooters; do not leave gear loose.</li>
            <li>Lock the Touareg and keep bags, chargers, and valuables hidden.</li>
            <li>Use SafeWalk, RamRide, or rideshare when walking alone feels off.</li>
          </ul>
        </article>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {officialSafetySources.map((source) => (
          <a
            className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700 hover:bg-teal-50"
            href={source.href}
            key={source.href}
            target="_blank"
            rel="noreferrer"
          >
            <strong className="block text-stone-950">{source.label}</strong>
            <span className="mt-2 block">{source.detail}</span>
          </a>
        ))}
      </div>

      <p className="mt-4 text-xs text-stone-500">
        These numbers are awareness tools, not emergency alerts. If something is
        happening now, call or text 911.
      </p>
    </section>
  );
}
