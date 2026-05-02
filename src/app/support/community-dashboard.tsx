"use client";

import { useEffect, useMemo, useState } from "react";

type EventStatus = "watching" | "interested" | "not_now";

type CommunityEvent = {
  id: string;
  title: string;
  category: string;
  whyItMatters: string;
  source: string;
  deadlineBehavior: string;
};

const eventStatusKey = "josephine-community-event-statuses";

const interestKeywords = [
  "equine",
  "horse",
  "animal science",
  "livestock",
  "veterinary",
  "pre-vet",
  "one health",
  "temple grandin",
  "black student union",
  "b/aacc",
  "black african american cultural center",
  "delta sigma theta",
  "nphc",
  "divine nine",
  "key llc",
  "ops",
  "scholarship",
  "internship",
  "research",
];

const communityEvents: CommunityEvent[] = [
  {
    id: "equine-animal-science",
    title: "Equine + Animal Science opportunities",
    category: "Major",
    whyItMatters:
      "Prioritize talks, research, internships, barn/lab opportunities, and department events tied to her majors.",
    source: "Animal Sciences, Equine Science, CSU email, Canvas, RamLink",
    deadlineBehavior:
      "Add to the front page when it has an application, RSVP, meeting, or scholarship deadline.",
  },
  {
    id: "one-health",
    title: "One Health and animal-care events",
    category: "Major adjacent",
    whyItMatters:
      "Good fit for animal, human, and environmental health interests without requiring a huge social leap.",
    source: "One Health Institute, RamLink, department announcements",
    deadlineBehavior:
      "Surface as an opportunity first; add to tasks only if she opts in or there is a required step.",
  },
  {
    id: "baacc-bsu",
    title: "Black Student Union + B/AACC updates",
    category: "Belonging",
    whyItMatters:
      "A priority community lane for Black student support, events, mentorship, and cultural connection.",
    source: "B/AACC, cultural resource centers, CSU email, RamLink",
    deadlineBehavior:
      "Show as a community alert; add event reminders only after Josephine chooses Interested.",
  },
  {
    id: "dst-nphc",
    title: "Delta Sigma Theta + NPHC interest",
    category: "Belonging",
    whyItMatters:
      "Track information sessions, public service events, and official interest opportunities without auto-contacting anyone.",
    source: "Fraternity and Sorority Life, B/AACC, RamLink, CSU announcements",
    deadlineBehavior:
      "Never auto-RSVP. Ask Josephine first, then add opted-in dates to the front-page feed.",
  },
  {
    id: "key-ops",
    title: "Key LLC + OPS check-ins",
    category: "Support network",
    whyItMatters:
      "Built-in community and accountability supports that can make the week easier to navigate.",
    source: "Key LLC, OPS, CSU email, support contacts",
    deadlineBehavior:
      "Add required meetings or follow-ups to the dashboard; keep optional events opt-in.",
  },
];

const communitySources = [
  {
    label: "Animal Sciences",
    href: "https://agsci.colostate.edu/ansci/",
  },
  {
    label: "Equine Science",
    href: "https://agsci.colostate.edu/ansci/degree/equine-science/",
  },
  {
    label: "Animal Science Major",
    href: "https://admissions.colostate.edu/programs/animal-science/",
  },
  {
    label: "RamLink / Student Orgs",
    href: "https://catalog.colostate.edu/general-catalog/cocurricular-engagement/clubs-organizations/",
  },
  {
    label: "Cultural Resource Centers",
    href: "https://inclusiveexcellence.colostate.edu/cultural-and-resource-centers",
  },
  {
    label: "B/AACC Info",
    href: "https://catalog.colostate.edu/general-catalog/academic-services-support/resources-students/",
  },
  {
    label: "Fraternity & Sorority Life",
    href: "https://catalog.colostate.edu/general-catalog/cocurricular-engagement/fraternity-sorority/",
  },
  {
    label: "One Health Club",
    href: "https://onehealth.colostate.edu/one-health-club/",
  },
];

function statusLabel(status: EventStatus) {
  if (status === "interested") return "Interested";
  if (status === "not_now") return "Not now";
  return "Watching";
}

export function CommunityDashboard() {
  const [statuses, setStatuses] = useState<Record<string, EventStatus>>({});

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const saved = window.localStorage.getItem(eventStatusKey);
      if (!saved) return;

      try {
        setStatuses(JSON.parse(saved) as Record<string, EventStatus>);
      } catch {
        window.localStorage.removeItem(eventStatusKey);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      window.localStorage.setItem(eventStatusKey, JSON.stringify(statuses));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [statuses]);

  const counts = useMemo(
    () =>
      communityEvents.reduce(
        (nextCounts, event) => {
          const status = statuses[event.id] ?? "watching";
          nextCounts[status] += 1;
          return nextCounts;
        },
        { watching: 0, interested: 0, not_now: 0 } satisfies Record<
          EventStatus,
          number
        >,
      ),
    [statuses],
  );

  function updateStatus(id: string, status: EventStatus) {
    setStatuses((current) => ({ ...current, [id]: status }));
  }

  return (
    <section className="grid gap-6">
      <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-teal-800">
              Community Alerts
            </p>
            <h2 className="mt-2 text-2xl font-black">Major + Belonging Watch</h2>
            <p className="mt-2 max-w-3xl text-sm text-stone-600">
              This page is where email, RamLink, department notices, and campus
              announcements should surface opportunities that match Josephine,
              without turning every event into a task.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-800">
              {counts.interested} interested
            </span>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-600">
              {counts.watching} watching
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {communityEvents.map((event) => {
            const status = statuses[event.id] ?? "watching";

            return (
              <article
                className="rounded-lg border border-stone-200 bg-stone-50 p-4"
                key={event.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase text-teal-800">
                      {event.category}
                    </p>
                    <h3 className="mt-1 text-lg font-bold">{event.title}</h3>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${
                      status === "interested"
                        ? "bg-teal-100 text-teal-800"
                        : status === "not_now"
                          ? "bg-stone-200 text-stone-600"
                          : "bg-amber-100 text-amber-950"
                    }`}
                  >
                    {statusLabel(status)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-stone-700">
                  {event.whyItMatters}
                </p>
                <div className="mt-4 rounded-md border border-stone-200 bg-white p-3 text-sm text-stone-700">
                  <strong className="block text-stone-950">Source watch</strong>
                  {event.source}
                </div>
                <div className="mt-3 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-950">
                  <strong className="block">Task rule</strong>
                  {event.deadlineBehavior}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <button
                    className="min-h-10 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800"
                    type="button"
                    onClick={() => updateStatus(event.id, "interested")}
                  >
                    Interested
                  </button>
                  <button
                    className="min-h-10 rounded-md border border-teal-700 px-3 text-sm font-semibold text-teal-800 hover:bg-teal-50"
                    type="button"
                    onClick={() => updateStatus(event.id, "watching")}
                  >
                    Watch
                  </button>
                  <button
                    className="min-h-10 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-100"
                    type="button"
                    onClick={() => updateStatus(event.id, "not_now")}
                  >
                    Not now
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-teal-800">
            Alert Keywords
          </p>
          <h2 className="mt-2 text-2xl font-black">What JoJo Should Notice</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {interestKeywords.map((keyword) => (
              <span
                className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-700"
                key={keyword}
              >
                {keyword}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-xs font-bold uppercase">Opt-in rule</p>
          <h2 className="mt-2 text-2xl font-black">Events Need A Yes</h2>
          <p className="mt-3 text-sm">
            Events, club meetings, info sessions, and optional opportunities
            should stay as Community alerts until Josephine chooses Interested.
            After that, the app can add the event, RSVP deadline, travel buffer,
            or prep task to the front-page feed.
          </p>
        </article>
      </section>

      <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase text-teal-800">
          Official Starting Points
        </p>
        <h2 className="mt-2 text-2xl font-black">Places To Check</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {communitySources.map((source) => (
            <a
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-teal-700 px-4 text-center text-sm font-semibold text-teal-800 hover:bg-teal-50"
              href={source.href}
              key={source.href}
              target="_blank"
              rel="noreferrer"
            >
              {source.label}
            </a>
          ))}
        </div>
      </section>
    </section>
  );
}
