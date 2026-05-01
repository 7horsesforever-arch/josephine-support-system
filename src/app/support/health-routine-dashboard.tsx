"use client";

import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  buildDayWindow,
  calculateRoutineCompletion,
  calculateWeeklyRewards,
  currentRewardThreshold,
  defaultRewardState,
  dayKey,
  isCompletion,
  normalizeRewardState,
  rewardRoutines,
  rewardStateStorageKey,
  routineDashboardWindowDays,
  startOfLocalDay,
  type ActionType,
  type HistoryEntry,
  type RewardState,
} from "./routine-rewards";

type SupportHistoryRow = {
  id: string;
  task_id: string | null;
  task_title: string;
  action_type: ActionType;
  created_at: string;
};

type LoadState = "loading" | "ready" | "empty";

const storageKey = "josephine-support-state-v1";

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

function readRewardState() {
  const storedState = window.localStorage.getItem(rewardStateStorageKey);
  if (!storedState) return defaultRewardState;

  try {
    return normalizeRewardState(JSON.parse(storedState) as Partial<RewardState>);
  } catch {
    return defaultRewardState;
  }
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
  const [rewardState, setRewardState] =
    useState<RewardState>(defaultRewardState);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let ignore = false;

    async function loadHistory() {
      const localHistory = readLocalHistory();
      setRewardState(readRewardState());

      if (isSupabaseConfigured && supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          const sinceDate = buildDayWindow(routineDashboardWindowDays)[0];
          const { data, error } = await supabase
            .from("support_history")
            .select("id,task_id,task_title,action_type,created_at")
            .in(
              "task_id",
              rewardRoutines.map((routine) => routine.id),
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
            rewardRoutines.some((routine) => routine.id === entry.taskId) &&
            isCompletion(entry),
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
    return buildDayWindow(routineDashboardWindowDays);
  }, []);
  const rewardSummary = useMemo(
    () => calculateWeeklyRewards(history, rewardState.settings),
    [history, rewardState.settings],
  );
  const rewardThreshold = currentRewardThreshold(rewardState.settings);

  return (
    <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-teal-800">
            Routine Dashboard
          </p>
          <h2 className="mt-2 text-2xl font-black">
            Scrub It!, Brush It!, and Wash It!
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

      <div className="mt-5 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">Stars this week</h3>
            <p className="mt-1 text-sm">
              Earn 1 star for each routine that reaches {rewardThreshold}%
              consistency this week.
            </p>
          </div>
          <strong className="text-3xl">
            {rewardSummary.starsEarned} / {rewardRoutines.length}
          </strong>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {rewardSummary.routineResults.map((result) => (
            <div
              className="rounded-md border border-yellow-200 bg-white p-3 text-sm"
              key={result.routine.id}
            >
              <div className="flex items-center justify-between gap-2">
                <strong>{result.routine.title}</strong>
                <span>{result.earnedStar ? "Star earned" : "Not yet"}</span>
              </div>
              <p className="mt-1 text-yellow-900">
                {result.consistency}% of {rewardThreshold}% needed
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {rewardRoutines.map((routine) => {
          const {
            completedDayKeys,
            completedDays,
            expectedCompletions,
            consistency,
            lastCompletedAt,
          } = calculateRoutineCompletion(
            history,
            routine,
            days,
            rewardThreshold,
          );
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
