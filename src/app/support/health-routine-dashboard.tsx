"use client";

import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ActionType = "done" | "already_did_it" | "snooze" | "need_help" | "created";

type HistoryEntry = {
  id: string;
  taskId: string | null;
  taskTitle: string;
  type: ActionType;
  createdAt: string;
};

type SupportHistoryRow = {
  id: string;
  task_id: string | null;
  task_title: string;
  action_type: ActionType;
  created_at: string;
};

type LoadState = "loading" | "ready" | "empty";

const storageKey = "josephine-support-state-v1";
const windowDays = 14;

const routines = [
  {
    id: "brush-teeth-night",
    title: "Brush It!",
    cadenceDays: 1,
    maxGapDays: 2,
    expectedLabel: "daily",
    helper: "The goal is a steady bedtime streak, not perfection.",
  },
  {
    id: "laundry",
    title: "Wash It!",
    cadenceDays: 7,
    maxGapDays: 14,
    expectedLabel: "weekly-ish",
    helper: "A weekly reset keeps clothes, towels, and sheets from becoming a huge pile.",
  },
];

function startOfLocalDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shortDayLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });
}

function readLocalHistory() {
  const storedState = window.localStorage.getItem(storageKey);
  if (!storedState) return [];

  try {
    const parsedState = JSON.parse(storedState) as {
      history?: HistoryEntry[];
    };

    return Array.isArray(parsedState.history) ? parsedState.history : [];
  } catch {
    return [];
  }
}

function historyFromRow(row: SupportHistoryRow): HistoryEntry {
  return {
    id: row.id,
    taskId: row.task_id,
    taskTitle: row.task_title,
    type: row.action_type,
    createdAt: row.created_at,
  };
}

function getRoutineStatus(daysSinceLast: number | null, maxGapDays: number) {
  if (daysSinceLast === null) return "Ready to start";
  if (daysSinceLast === 0) return "Done today";
  if (daysSinceLast <= maxGapDays / 2) return "On track";
  if (daysSinceLast <= maxGapDays) return "Due soon";
  return "Needs reset";
}

function getRoutineStatusClasses(status: string) {
  if (status === "Done today" || status === "On track") {
    return "bg-emerald-50 text-emerald-900";
  }

  if (status === "Due soon") {
    return "bg-amber-50 text-amber-900";
  }

  if (status === "Needs reset") {
    return "bg-rose-50 text-rose-900";
  }

  return "bg-stone-100 text-stone-700";
}

export function HealthRoutineDashboard() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let ignore = false;

    async function loadHistory() {
      const localHistory = readLocalHistory();

      if (isSupabaseConfigured && supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          const sinceDate = addDays(startOfLocalDay(new Date()), -windowDays);
          const { data, error } = await supabase
            .from("support_history")
            .select("id,task_id,task_title,action_type,created_at")
            .in(
              "task_id",
              routines.map((routine) => routine.id),
            )
            .in("action_type", ["done", "already_did_it"])
            .gte("created_at", sinceDate.toISOString())
            .order("created_at", { ascending: false });

          if (!ignore && !error && data) {
            const nextHistory = data.map((row) =>
              historyFromRow(row as SupportHistoryRow),
            );
            setHistory(nextHistory);
            setLoadState(nextHistory.length > 0 ? "ready" : "empty");
            return;
          }
        }
      }

      if (!ignore) {
        const filteredLocalHistory = localHistory.filter(
          (entry) =>
            routines.some((routine) => routine.id === entry.taskId) &&
            (entry.type === "done" || entry.type === "already_did_it"),
        );
        setHistory(filteredLocalHistory);
        setLoadState(filteredLocalHistory.length > 0 ? "ready" : "empty");
      }
    }

    void loadHistory();

    return () => {
      ignore = true;
    };
  }, []);

  const days = useMemo(() => {
    const today = startOfLocalDay(new Date());
    return Array.from({ length: windowDays }, (_item, index) =>
      addDays(today, index - (windowDays - 1)),
    );
  }, []);

  return (
    <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-teal-800">
            Routine Dashboard
          </p>
          <h2 className="mt-2 text-2xl font-black">
            Brush It! and Wash It!
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            A simple 14-day view of consistency. Filled dots mean Josephine
            marked the task Done or Already Did It.
          </p>
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
          {loadState === "loading"
            ? "Loading"
            : loadState === "empty"
              ? "No check-ins yet"
              : "Using check-ins"}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {routines.map((routine) => {
          const routineHistory = history.filter(
            (entry) => entry.taskId === routine.id,
          );
          const completedDayKeys = new Set(
            routineHistory.map((entry) => dayKey(new Date(entry.createdAt))),
          );
          const completedDays = days.filter((day) =>
            completedDayKeys.has(dayKey(day)),
          ).length;
          const expectedCompletions = Math.ceil(windowDays / routine.cadenceDays);
          const consistency = Math.min(
            100,
            Math.round((completedDays / expectedCompletions) * 100),
          );
          const lastCompletedAt = routineHistory
            .map((entry) => new Date(entry.createdAt))
            .sort((first, second) => second.getTime() - first.getTime())[0];
          const daysSinceLast = lastCompletedAt
            ? Math.floor(
                (startOfLocalDay(new Date()).getTime() -
                  startOfLocalDay(lastCompletedAt).getTime()) /
                  86400000,
              )
            : null;
          const status = getRoutineStatus(daysSinceLast, routine.maxGapDays);

          return (
            <article
              className="rounded-lg border border-stone-200 bg-stone-50 p-4"
              key={routine.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">{routine.title}</h3>
                  <p className="mt-1 text-sm text-stone-600">
                    Goal: {routine.expectedLabel}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${getRoutineStatusClasses(status)}`}
                >
                  {status}
                </span>
              </div>

              <div className="mt-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <strong className="text-3xl font-black">
                      {consistency}%
                    </strong>
                    <p className="text-sm text-stone-600">
                      {completedDays} of {expectedCompletions} expected check-ins
                    </p>
                  </div>
                  <p className="text-right text-xs font-semibold text-stone-500">
                    Last 14 days
                  </p>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-teal-700"
                    style={{ width: `${consistency}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-2">
                {days.map((day) => {
                  const completed = completedDayKeys.has(dayKey(day));
                  return (
                    <div className="grid justify-items-center gap-1" key={dayKey(day)}>
                      <span
                        aria-label={`${shortDayLabel(day)} ${
                          completed ? "completed" : "not completed"
                        }`}
                        className={`h-6 w-6 rounded-full border ${
                          completed
                            ? "border-teal-700 bg-teal-700"
                            : "border-stone-300 bg-white"
                        }`}
                        title={`${shortDayLabel(day)}: ${
                          completed ? "completed" : "not completed"
                        }`}
                      />
                      <span className="text-[10px] font-semibold text-stone-500">
                        {day.toLocaleDateString(undefined, { weekday: "narrow" })}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="mt-4 text-sm text-stone-600">{routine.helper}</p>
              <p className="mt-2 text-xs font-semibold text-stone-500">
                {lastCompletedAt
                  ? `Last checked ${lastCompletedAt.toLocaleDateString()}`
                  : "No check-in logged yet."}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
