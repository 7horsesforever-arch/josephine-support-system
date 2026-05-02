"use client";

import { useEffect, useMemo, useState } from "react";

type ViperTrackerState = {
  startingBags: number;
  recordedAt: string;
  targetBags: number;
  bagsPerDay: number;
  supplyNotes: string;
};

const storageKey = "josephine-viper-tracker";
const defaultState: ViperTrackerState = {
  startingBags: 40,
  recordedAt: new Date().toISOString(),
  targetBags: 60,
  bagsPerDay: 2,
  supplyNotes: "",
};

const supplyChecklist = [
  "Order grain and supplements before the 10-bag alert becomes urgent.",
  "Confirm baggies/containers, labels, scoop, and storage bin are ready.",
  "Text caregiver the exact number of bags left and the target number to make.",
  "When home on break, batch as many bags as practical and reset the tracker.",
];

function safeNumber(value: number, fallback = 0) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

function dateInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function daysBetween(start: Date, end: Date) {
  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  return Math.max(
    0,
    Math.floor((endDay.getTime() - startDay.getTime()) / 86_400_000),
  );
}

function updateNumber(
  setter: (nextState: (current: ViperTrackerState) => ViperTrackerState) => void,
  field: keyof Pick<
    ViperTrackerState,
    "startingBags" | "targetBags" | "bagsPerDay"
  >,
  value: string,
) {
  setter((current) => ({
    ...current,
    [field]: safeNumber(Number(value)),
  }));
}

export function ViperTracker() {
  const [tracker, setTracker] = useState<ViperTrackerState>(defaultState);
  const viperCamUrl = process.env.NEXT_PUBLIC_VIPER_CAM_URL;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;

      try {
        const parsed = JSON.parse(saved) as Partial<ViperTrackerState>;
        setTracker({
          startingBags: safeNumber(
            Number(parsed.startingBags ?? defaultState.startingBags),
            defaultState.startingBags,
          ),
          recordedAt: parsed.recordedAt ?? defaultState.recordedAt,
          targetBags: safeNumber(
            Number(parsed.targetBags ?? defaultState.targetBags),
            defaultState.targetBags,
          ),
          bagsPerDay: Math.max(
            0.1,
            safeNumber(
              Number(parsed.bagsPerDay ?? defaultState.bagsPerDay),
              defaultState.bagsPerDay,
            ),
          ),
          supplyNotes: parsed.supplyNotes ?? "",
        });
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify(tracker));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [tracker]);

  const estimate = useMemo(() => {
    const recordedAt = new Date(tracker.recordedAt);
    const safeRecordedAt = Number.isNaN(recordedAt.getTime())
      ? new Date()
      : recordedAt;
    const elapsedDays = daysBetween(safeRecordedAt, new Date());
    const usedBags = elapsedDays * tracker.bagsPerDay;
    const remainingBags = Math.max(0, tracker.startingBags - usedBags);
    const daysUntilTen =
      remainingBags <= 10
        ? 0
        : Math.ceil((remainingBags - 10) / tracker.bagsPerDay);
    const daysUntilEmpty = Math.ceil(remainingBags / tracker.bagsPerDay);
    const bagsToTarget = Math.max(0, tracker.targetBags - remainingBags);

    return {
      elapsedDays,
      usedBags,
      remainingBags,
      daysUntilTen,
      daysUntilEmpty,
      bagsToTarget,
      tenBagDate: addDays(new Date(), daysUntilTen),
      emptyDate: addDays(new Date(), daysUntilEmpty),
    };
  }, [tracker]);

  const alertLevel =
    estimate.remainingBags <= 0
      ? "empty"
      : estimate.remainingBags <= 10
        ? "low"
        : "ok";

  function resetWithCurrentCount() {
    setTracker((current) => ({
      ...current,
      startingBags: Math.round(estimate.remainingBags),
      recordedAt: new Date().toISOString(),
    }));
  }

  function markBatchMade() {
    setTracker((current) => ({
      ...current,
      startingBags: current.targetBags,
      recordedAt: new Date().toISOString(),
    }));
  }

  return (
    <section className="grid gap-5">
      <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-teal-800">
              Viper Cam
            </p>
            <h2 className="mt-2 text-2xl font-black">Check On Viper</h2>
            <p className="mt-2 max-w-3xl text-sm text-stone-600">
              Open the private camera viewer from here. If the camera service
              blocks embedding, the button still gets Josephine to the feed.
            </p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
            Private viewer
          </span>
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-stone-200 bg-stone-950">
          {viperCamUrl ? (
            <iframe
              className="h-72 w-full bg-stone-950 md:h-96"
              src={viperCamUrl}
              title="Viper camera viewer"
            />
          ) : (
            <div className="flex h-72 items-center justify-center p-6 text-center text-sm text-stone-200 md:h-96">
              Add NEXT_PUBLIC_VIPER_CAM_URL to show the private camera link
              here.
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {viperCamUrl ? (
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
              href={viperCamUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open Viper Cam
            </a>
          ) : null}
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            Keep camera usernames and passwords inside the camera app, not in
            this support system.
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-teal-800">
              Grain Bag Tracker
            </p>
            <h2 className="mt-2 text-2xl font-black">How Many Bags Are Left?</h2>
            <p className="mt-2 max-w-3xl text-sm text-stone-600">
              Viper eats 2 premade grain bags per day. Enter how many bags are
              left, and the tracker counts down with time.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              alertLevel === "ok"
                ? "bg-teal-50 text-teal-800"
                : "bg-amber-100 text-amber-950"
            }`}
          >
            {alertLevel === "ok"
              ? "Supply ok"
              : alertLevel === "low"
                ? "Make more soon"
                : "Needs bags now"}
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-stone-800">
              Bags counted
              <input
                className="min-h-11 rounded-md border border-stone-300 px-3 text-sm text-stone-950"
                min="0"
                step="1"
                type="number"
                value={tracker.startingBags}
                onChange={(event) =>
                  updateNumber(setTracker, "startingBags", event.target.value)
                }
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-stone-800">
              Counted on
              <input
                className="min-h-11 rounded-md border border-stone-300 px-3 text-sm text-stone-950"
                type="date"
                value={dateInputValue(tracker.recordedAt)}
                onChange={(event) =>
                  setTracker((current) => ({
                    ...current,
                    recordedAt: new Date(`${event.target.value}T09:00:00`).toISOString(),
                  }))
                }
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-stone-800">
              Bags per day
              <input
                className="min-h-11 rounded-md border border-stone-300 px-3 text-sm text-stone-950"
                min="0.1"
                step="0.1"
                type="number"
                value={tracker.bagsPerDay}
                onChange={(event) =>
                  updateNumber(setTracker, "bagsPerDay", event.target.value)
                }
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-stone-800">
              Target batch size
              <input
                className="min-h-11 rounded-md border border-stone-300 px-3 text-sm text-stone-950"
                min="0"
                step="1"
                type="number"
                value={tracker.targetBags}
                onChange={(event) =>
                  updateNumber(setTracker, "targetBags", event.target.value)
                }
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-stone-800 sm:col-span-2">
              Supply notes
              <textarea
                className="min-h-24 rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-950"
                placeholder="Example: order grain Friday, ask Mom to make bags Sunday, check supplements."
                value={tracker.supplyNotes}
                onChange={(event) =>
                  setTracker((current) => ({
                    ...current,
                    supplyNotes: event.target.value,
                  }))
                }
              />
            </label>

            <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
              <button
                className="min-h-11 rounded-md border border-teal-700 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50"
                type="button"
                onClick={resetWithCurrentCount}
              >
                Save Current Count
              </button>
              <button
                className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
                type="button"
                onClick={markBatchMade}
              >
                Batch Made
              </button>
            </div>
          </div>

          <aside className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-teal-950">
            <p className="text-xs font-bold uppercase">Estimated bags left</p>
            <strong className="mt-2 block text-5xl font-black">
              {Math.floor(estimate.remainingBags)}
            </strong>
            <p className="mt-2 text-sm">
              Since the last count, about {estimate.usedBags.toFixed(1)} bags
              have been used over {estimate.elapsedDays} day
              {estimate.elapsedDays === 1 ? "" : "s"}.
            </p>

            <div className="mt-5 grid gap-2 text-sm">
              <div className="rounded-md bg-white p-3">
                <span className="block text-xs font-bold uppercase text-stone-500">
                  10-bag alert
                </span>
                <strong className="mt-1 block text-stone-950">
                  {alertLevel === "ok"
                    ? formatDate(estimate.tenBagDate)
                    : "Now"}
                </strong>
              </div>
              <div className="rounded-md bg-white p-3">
                <span className="block text-xs font-bold uppercase text-stone-500">
                  Estimated out date
                </span>
                <strong className="mt-1 block text-stone-950">
                  {formatDate(estimate.emptyDate)}
                </strong>
              </div>
              <div className="rounded-md bg-white p-3">
                <span className="block text-xs font-bold uppercase text-stone-500">
                  Bags to target
                </span>
                <strong className="mt-1 block text-stone-950">
                  {Math.ceil(estimate.bagsToTarget)}
                </strong>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <h3 className="font-bold">When The Count Hits 10</h3>
            <p className="mt-2">
              That is about 5 days of food at 2 bags per day. Order supplies
              and remind caregiver support to make more before the bin gets too
              low.
            </p>
          </article>

          <article className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
            <h3 className="font-bold text-stone-950">Break Batch Plan</h3>
            <p className="mt-2">
              When Josephine is home, use the target batch size to make a large
              run of premade bags, then tap Batch Made to reset the countdown.
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase text-teal-800">
          Supply Checklist
        </p>
        <h2 className="mt-2 text-2xl font-black">Keep Viper Stocked</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {supplyChecklist.map((item) => (
            <div
              className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700"
              key={item}
            >
              {item}
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
