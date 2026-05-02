import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupportModule, supportModules } from "../module-data";
import { HealthRoutineDashboard } from "../health-routine-dashboard";
import { MessagesWorkspace } from "../messages-workspace";
import { MoneyPlaidDashboard } from "../money-plaid-dashboard";
import { SchoolFocusTimer } from "../school-focus-timer";
import { CloudStorageConnections } from "../cloud-storage-connections";
import { WorkPaycheckEstimator } from "../work-paycheck-estimator";

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

const adultingModuleCards = [
  {
    slug: "health",
    label: "Health & Wellness",
    status: "routines + body data",
    surfaces: "Scrub It!, Brush It!, Wash It!, refills, appointments, sleep, and Oura charging.",
  },
  {
    slug: "housing",
    label: "Housing",
    status: "room + dorm life",
    surfaces: "Room reset, supply checks, move-in details, contracts, maintenance, and housing accommodation follow-up.",
  },
  {
    slug: "food",
    label: "Food",
    status: "meals + restock",
    surfaces: "Dining schedules, robot delivery instructions, mini-fridge restock, and low-energy food backups.",
  },
  {
    slug: "money",
    label: "Money",
    status: "read-only finances",
    surfaces: "Balance checks, bills, subscriptions, and caregiver-approved reward payouts.",
  },
  {
    slug: "campus",
    label: "Campus Basics",
    status: "getting around",
    surfaces: "RamCard, parking, transit, bus trackers, mail/packages, and campus logistics.",
  },
  {
    slug: "docs",
    label: "Docs & Packing",
    status: "files + lists",
    surfaces: "Drive folders, IDs, insurance cards, housing docs, packing lists, and room inventory.",
  },
  {
    slug: "vehicle",
    label: "Vehicle",
    status: "car care",
    surfaces: "Gas, mileage checks, oil-service planning, car wash, cleanout, and warning-light notes.",
  },
  {
    slug: "travel",
    label: "Home & Visits",
    status: "travel planning",
    surfaces: "Trips home, holidays, Viper visits, packing, transport details, and recovery time.",
  },
  {
    slug: "work",
    label: "Work",
    status: "future job",
    surfaces: "Handshake, applications, onboarding docs, schedules, hours, paychecks, and workload fit.",
  },
];

const schoolScheduleDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const schoolScheduleFields = [
  "Course name and section",
  "Class time",
  "Building and room",
  "Instructor or TA",
  "Office hours",
  "Exam or lab pattern",
];

const campusDiningLocations = [
  {
    name: "Braiden Dining Center",
    focus: "Home base",
    schedule: "Use first for breakfast, lunch, dinner, and between-class meals.",
    note: "Braiden Hall contains Braiden Dining Center and RAMwich pickup.",
  },
  {
    name: "Lory Student Center",
    focus: "Class-day backup",
    schedule: "Use between classes for quick meals and national-chain options.",
    note: "CSU lists local favorites plus national chains in the LSC.",
  },
  {
    name: "Academic Village / Ram's Horn",
    focus: "South-campus option",
    schedule: "Use when near Academic Village, Edwards, Summit, or Ingersoll.",
    note: "Good alternate dining center when Braiden is crowded or closed.",
  },
  {
    name: "Durrell Center",
    focus: "Northwest-campus option",
    schedule: "Use when near Moby, Durward, Westfall, or Laurel Village.",
    note: "CSU map lists Durrell Dining Center and Durrell Express.",
  },
  {
    name: "Corbett / Parmelee",
    focus: "North-campus option",
    schedule: "Use when near the Rec Center, Corbett, Parmelee, or north campus.",
    note: "CSU map lists Corbett Marketplace and Parmelee Dining Center.",
  },
  {
    name: "Allison Cafe",
    focus: "Light meal option",
    schedule: "Use for smaller breakfast or lunch when near Allison and LSC.",
    note: "CSU map lists continental breakfast and Spoons Soups and Salads for lunch.",
  },
];

const robotDeliverySteps = [
  "Open Grubhub and choose the CSU campus dining option.",
  "Pick a campus restaurant that offers robot delivery.",
  "Set the delivery pin outside Braiden Hall or the closest safe outdoor pickup spot.",
  "Watch the order tracker and go outside when the robot arrives.",
  "Use this when going out feels too hard, the weather is bad, or energy is low.",
];

const miniFridgeShoppingList = [
  "Greek yogurt cups",
  "Cheese sticks or Babybel",
  "Hummus cups",
  "Baby carrots or snap peas",
  "Apples, grapes, or berries",
  "Microwave rice or pasta cups",
  "Protein drinks or shelf-stable shakes",
  "Turkey, tuna, or tofu snack packs",
  "Granola bars",
  "Crackers or pretzels",
  "Peanut butter or sunflower butter",
  "Sparkling water or electrolyte drinks",
];

function FoodDashboard() {
  return (
    <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-teal-800">
            Campus Food Map
          </p>
          <h2 className="mt-2 text-2xl font-black">Braiden First</h2>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            Use Braiden as the default, keep backups ready, and make low-energy
            food decisions easier before hunger turns into a crisis.
          </p>
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
          Braiden first
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {campusDiningLocations.map((location) => (
          <article
            className="rounded-lg border border-stone-200 bg-stone-50 p-4"
            key={location.name}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold">{location.name}</h3>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                {location.focus}
              </span>
            </div>
            <p className="mt-3 text-sm text-stone-700">{location.schedule}</p>
            <p className="mt-2 text-sm text-stone-600">{location.note}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-teal-950">
          <h3 className="text-lg font-bold">Robot Delivery</h3>
          <ol className="mt-4 grid gap-2 text-sm">
            {robotDeliverySteps.map((step) => (
              <li className="rounded-md bg-white p-2" key={step}>
                {step}
              </li>
            ))}
          </ol>
        </article>

        <article className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <h3 className="text-lg font-bold">Bi-weekly Mini-fridge List</h3>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-stone-700 sm:grid-cols-3">
            {miniFridgeShoppingList.map((item) => (
              <span className="rounded-md bg-white p-2" key={item}>
                {item}
              </span>
            ))}
          </div>
        </article>
      </div>

      <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <h3 className="font-bold">Hours rule</h3>
        <p className="mt-2">
          Always check dining hours during breaks, finals, holidays, and
          weather days. The page keeps the links close, but CSU hours are the
          source of truth.
        </p>
      </div>
    </section>
  );
}

function SchoolScheduleDashboard() {
  return (
    <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-teal-800">
            Class Schedule
          </p>
          <h2 className="mt-2 text-2xl font-black">Weekly School Map</h2>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            This is the landing spot for Josephine&apos;s class schedule. Once
            courses are known, each class can sit here with time, location,
            professor, office hours, and testing notes.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
          Waiting for courses
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {schoolScheduleDays.map((day) => (
          <article
            className="min-h-36 rounded-lg border border-stone-200 bg-stone-50 p-3"
            key={day}
          >
            <h3 className="text-sm font-bold text-stone-950">{day}</h3>
            <div className="mt-3 rounded-md border border-dashed border-stone-300 bg-white p-3 text-sm text-stone-500">
              Add classes here
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr]">
        <article className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <h3 className="font-bold">What To Capture</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-stone-700">
            {schoolScheduleFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </article>

        <article className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-teal-950">
          <h3 className="font-bold">How This Helps JoJo</h3>
          <p className="mt-3 text-sm">
            The schedule gives assignment planning more context: class days,
            travel time, testing-center deadlines, tutoring windows, office
            hours, meals, sleep, and recovery time can all be planned around the
            real week.
          </p>
        </article>
      </div>
    </section>
  );
}

function AdultingDashboard() {
  return (
    <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-teal-800">
            Module Map
          </p>
          <h2 className="mt-2 text-2xl font-black">Adulting Command Center</h2>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            Adulting is the roll-up for practical-life stuff. This page shows
            the connected modules and what kind of time-sensitive items each one
            can send to the dashboard.
          </p>
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
          {adultingModuleCards.length} connected pages
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adultingModuleCards.map((card) => {
          const supportCardModule = getSupportModule(card.slug);

          return (
            <article
              className="rounded-lg border border-stone-200 bg-stone-50 p-4"
              key={card.slug}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-lg font-bold">{card.label}</h3>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-stone-600">
                  {card.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-stone-700">
                {supportCardModule?.summary ?? card.surfaces}
              </p>
              <div className="mt-4 rounded-md border border-stone-200 bg-white p-3">
                <strong className="text-xs uppercase text-teal-800">
                  Can surface when time-sensitive
                </strong>
                <p className="mt-2 text-sm text-stone-700">{card.surfaces}</p>
              </div>
              <Link
                className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-teal-700 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50"
                href={`/support/${card.slug}`}
              >
                Open {card.label}
              </Link>
            </article>
          );
        })}
      </div>

      <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <h3 className="font-bold">Dashboard rule</h3>
        <p className="mt-2">
          Adulting sends only due, overdue, or date-bound items to the front
          page. Reference notes, instructions, and setup details stay on the
          dedicated pages so the main dashboard stays calmer.
        </p>
      </div>
    </section>
  );
}

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

        {supportModule.slug === "health" ? (
          <>
            <HealthWellnessDashboard />
            <HealthRoutineDashboard />
          </>
        ) : null}

        {supportModule.slug === "adulting" ? <AdultingDashboard /> : null}

        {supportModule.slug === "messages" ? <MessagesWorkspace /> : null}

        {supportModule.slug === "docs" ? <CloudStorageConnections /> : null}

        {supportModule.slug === "food" ? <FoodDashboard /> : null}

        {supportModule.slug === "money" ? <MoneyPlaidDashboard /> : null}

        {supportModule.slug === "work" ? <WorkPaycheckEstimator /> : null}

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

        {supportModule.slug === "school" ? (
          <>
            <SchoolFocusTimer />
            <SchoolScheduleDashboard />
          </>
        ) : null}
      </div>
    </main>
  );
}
