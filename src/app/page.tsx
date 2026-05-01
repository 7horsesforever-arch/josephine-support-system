"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type TaskCategory = "hygiene" | "school" | "admin" | "health" | "life";
type TaskStatus = "ok" | "due" | "snoozed" | "needs_help" | "escalated";
type ActionType = "done" | "already_did_it" | "snooze" | "need_help" | "created";

type SupportTask = {
  id: string;
  title: string;
  category: TaskCategory;
  description: string;
  normalIntervalDays: number;
  maxGapDays: number;
  lastCompletedAt: string;
  status: TaskStatus;
};

type HistoryEntry = {
  id: string;
  taskTitle: string;
  type: ActionType;
  createdAt: string;
};

const dayMs = 24 * 60 * 60 * 1000;
const storageKey = "josephine-support-state-v1";

type SyncStatus = "loading" | "local" | "supabase" | "syncing" | "error";

type TaskRow = {
  id: string;
  title: string;
  category: TaskCategory;
  description: string;
  normal_interval_days: number;
  max_gap_days: number;
  last_completed_at: string;
  status: TaskStatus;
  updated_at?: string;
};

type HistoryRow = {
  id: string;
  task_title: string;
  action_type: ActionType;
  created_at: string;
};

function daysAgo(count: number) {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  date.setDate(date.getDate() - count);
  return date.toISOString();
}

function createStarterTasks(): SupportTask[] {
  return [
    {
      id: "shower",
      title: "Shower",
      category: "hygiene",
      description:
        "Normal reminder 2 days after completion. Fail-safe at 7 days.",
      normalIntervalDays: 2,
      maxGapDays: 7,
      lastCompletedAt: daysAgo(3),
      status: "due",
    },
    {
      id: "brush-teeth-night",
      title: "Brush teeth at night",
      category: "hygiene",
      description:
        "Normal reminder 1 day after completion. Fail-safe at 2 days.",
      normalIntervalDays: 1,
      maxGapDays: 2,
      lastCompletedAt: daysAgo(1),
      status: "due",
    },
    {
      id: "laundry",
      title: "Laundry",
      category: "life",
      description:
        "Normal reminder 7 days after completion. Fail-safe at 14 days.",
      normalIntervalDays: 7,
      maxGapDays: 14,
      lastCompletedAt: daysAgo(5),
      status: "ok",
    },
  ];
}

function createInitialHistory(): HistoryEntry[] {
  return [
    {
      id: "initial-shower",
      taskTitle: "Shower",
      type: "done",
      createdAt: daysAgo(3),
    },
  ];
}

function addDays(isoDate: string, days: number) {
  return new Date(new Date(isoDate).getTime() + days * dayMs);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function getTaskSchedule(task: SupportTask) {
  const nextDueAt = addDays(task.lastCompletedAt, task.normalIntervalDays);
  const escalateAfterAt = addDays(task.lastCompletedAt, task.maxGapDays);
  const now = new Date();

  let status: TaskStatus = "ok";
  if (escalateAfterAt <= now) {
    status = "escalated";
  } else if (
    nextDueAt <= startOfToday() ||
    task.status === "snoozed" ||
    task.status === "needs_help"
  ) {
    status = task.status === "needs_help" ? "needs_help" : "due";
  }

  return { nextDueAt, escalateAfterAt, status };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(isoDate: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

function statusLabel(status: TaskStatus) {
  return {
    ok: "On track",
    due: "Ready",
    snoozed: "Snoozed",
    needs_help: "Needs help",
    escalated: "Fail-safe",
  }[status];
}

function historyLabel(type: ActionType) {
  return {
    done: "marked done",
    already_did_it: "already did it",
    snooze: "snoozed",
    need_help: "asked for help",
    created: "created",
  }[type];
}

function actionClasses(type: ActionType) {
  return {
    done: "bg-teal-700 hover:bg-teal-800",
    already_did_it: "bg-blue-700 hover:bg-blue-800",
    snooze: "bg-amber-700 hover:bg-amber-800",
    need_help: "bg-orange-900 hover:bg-orange-950",
    created: "bg-teal-700 hover:bg-teal-800",
  }[type];
}

function statusClasses(status: TaskStatus) {
  if (status === "escalated") return "bg-red-100 text-red-800";
  if (status === "due" || status === "needs_help" || status === "snoozed") {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-blue-100 text-blue-800";
}

function taskFromRow(row: TaskRow): SupportTask {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    normalIntervalDays: row.normal_interval_days,
    maxGapDays: row.max_gap_days,
    lastCompletedAt: row.last_completed_at,
    status: row.status,
  };
}

function taskToRow(task: SupportTask): TaskRow {
  return {
    id: task.id,
    title: task.title,
    category: task.category,
    description: task.description,
    normal_interval_days: task.normalIntervalDays,
    max_gap_days: task.maxGapDays,
    last_completed_at: task.lastCompletedAt,
    status: task.status,
    updated_at: new Date().toISOString(),
  };
}

function historyFromRow(row: HistoryRow): HistoryEntry {
  return {
    id: row.id,
    taskTitle: row.task_title,
    type: row.action_type,
    createdAt: row.created_at,
  };
}

function historyToRow(entry: HistoryEntry): HistoryRow {
  return {
    id: entry.id,
    task_title: entry.taskTitle,
    action_type: entry.type,
    created_at: entry.createdAt,
  };
}

export default function Home() {
  const [tasks, setTasks] = useState(createStarterTasks);
  const [history, setHistory] = useState(createInitialHistory);
  const [storageReady, setStorageReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [syncMessage, setSyncMessage] = useState("Checking saved data...");

  useEffect(() => {
    let ignore = false;

    async function loadSavedState() {
      const storedState = window.localStorage.getItem(storageKey);

      if (storedState) {
        try {
          const parsedState = JSON.parse(storedState) as {
            tasks?: SupportTask[];
            history?: HistoryEntry[];
          };

          if (Array.isArray(parsedState.tasks)) {
            setTasks(parsedState.tasks);
          }

          if (Array.isArray(parsedState.history)) {
            setHistory(parsedState.history);
          }
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      }

      if (!isSupabaseConfigured || !supabase) {
        setSyncStatus("local");
        setSyncMessage("Saved in this browser. Supabase is not configured yet.");
        setStorageReady(true);
        return;
      }

      const { data: savedTasks, error: tasksError } = await supabase
        .from("support_tasks")
        .select("*")
        .order("title");

      if (ignore) return;

      if (tasksError) {
        setSyncStatus("local");
        setSyncMessage("Saved in this browser. Supabase tables are not connected yet.");
        setStorageReady(true);
        return;
      }

      const { data: savedHistory, error: historyError } = await supabase
        .from("support_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);

      if (ignore) return;

      if (historyError) {
        setSyncStatus("local");
        setSyncMessage("Saved in this browser. Supabase history is not connected yet.");
        setStorageReady(true);
        return;
      }

      if ((savedTasks ?? []).length > 0) {
        setTasks(savedTasks.map(taskFromRow));
      } else {
        const starter = createStarterTasks();
        setTasks(starter);
        await supabase.from("support_tasks").upsert(starter.map(taskToRow));
      }

      if ((savedHistory ?? []).length > 0) {
        setHistory(savedHistory.map(historyFromRow));
      } else {
        const starterHistory = createInitialHistory();
        setHistory(starterHistory);
        await supabase
          .from("support_history")
          .upsert(starterHistory.map(historyToRow));
      }

      setSyncStatus("supabase");
      setSyncMessage("Saved to Supabase.");
      setStorageReady(true);
    }

    loadSavedState();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) return;

    window.localStorage.setItem(storageKey, JSON.stringify({ tasks, history }));
  }, [history, storageReady, tasks]);

  async function saveTaskToSupabase(task: SupportTask) {
    if (!supabase) return;
    if (syncStatus === "local" || syncStatus === "error") return;

    setSyncStatus("syncing");
    const { error } = await supabase.from("support_tasks").upsert(taskToRow(task));
    if (error) {
      setSyncStatus("error");
      setSyncMessage("Saved in this browser. Supabase sync needs attention.");
      return;
    }

    setSyncStatus("supabase");
    setSyncMessage("Saved to Supabase.");
  }

  async function saveHistoryToSupabase(entry: HistoryEntry) {
    if (!supabase) return;
    if (syncStatus === "local" || syncStatus === "error") return;

    setSyncStatus("syncing");
    const { error } = await supabase
      .from("support_history")
      .insert(historyToRow(entry));
    if (error) {
      setSyncStatus("error");
      setSyncMessage("Saved in this browser. Supabase sync needs attention.");
      return;
    }

    setSyncStatus("supabase");
    setSyncMessage("Saved to Supabase.");
  }

  const summary = useMemo(() => {
    return tasks.reduce(
      (counts, task) => {
        const { status } = getTaskSchedule(task);
        if (status === "due" || status === "needs_help") counts.ready += 1;
        if (status === "escalated") counts.failsafe += 1;
        return counts;
      },
      { ready: 0, failsafe: 0 },
    );
  }, [tasks]);

  function recordAction(taskId: string, type: ActionType) {
    const now = new Date().toISOString();
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    let updatedTask = task;
    setTasks((currentTasks) =>
      currentTasks.map((item) => {
        if (item.id !== taskId) return item;

        if (type === "done" || type === "already_did_it") {
          updatedTask = { ...item, lastCompletedAt: now, status: "ok" };
          return updatedTask;
        }

        if (type === "snooze") {
          updatedTask = { ...item, status: "snoozed" };
          return updatedTask;
        }

        if (type === "need_help") {
          updatedTask = { ...item, status: "needs_help" };
          return updatedTask;
        }

        return item;
      }),
    );

    const historyEntry = {
      id: crypto.randomUUID(),
      taskTitle: task.title,
      type,
      createdAt: now,
    };

    setHistory((currentHistory) => [
      historyEntry,
      ...currentHistory,
    ]);
    void saveTaskToSupabase(updatedTask);
    void saveHistoryToSupabase(historyEntry);
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) return;

    const normalIntervalDays = Number(form.get("normalDays"));
    const maxGapDays = Math.max(Number(form.get("maxDays")), normalIntervalDays);
    const now = new Date().toISOString();

    const task: SupportTask = {
      id: crypto.randomUUID(),
      title,
      category: String(form.get("category")) as TaskCategory,
      description: `Normal reminder ${normalIntervalDays} day(s) after completion. Fail-safe at ${maxGapDays} day(s).`,
      normalIntervalDays,
      maxGapDays,
      lastCompletedAt: now,
      status: "ok",
    };

    setTasks((currentTasks) => [...currentTasks, task]);
    const historyEntry = {
      id: crypto.randomUUID(),
      taskTitle: title,
      type: "created" as ActionType,
      createdAt: now,
    };

    setHistory((currentHistory) => [
      historyEntry,
      ...currentHistory,
    ]);
    void saveTaskToSupabase(task);
    void saveHistoryToSupabase(historyEntry);
    event.currentTarget.reset();
  }

  async function resetDemoData() {
    const starterTasks = createStarterTasks();
    const starterHistory = createInitialHistory();

    setTasks(starterTasks);
    setHistory(starterHistory);

    if (syncStatus === "local" || syncStatus === "error") return;
    if (!supabase) return;

    setSyncStatus("syncing");
    const { error: deleteHistoryError } = await supabase
      .from("support_history")
      .delete()
      .neq("id", "");
    const { error: deleteTasksError } = await supabase
      .from("support_tasks")
      .delete()
      .neq("id", "");
    const { error: taskError } = await supabase
      .from("support_tasks")
      .upsert(starterTasks.map(taskToRow));
    const { error: historyError } = await supabase
      .from("support_history")
      .upsert(starterHistory.map(historyToRow));

    if (deleteHistoryError || deleteTasksError || taskError || historyError) {
      setSyncStatus("error");
      setSyncMessage("Reset locally. Supabase sync needs attention.");
      return;
    }

    setSyncStatus("supabase");
    setSyncMessage("Saved to Supabase.");
  }

  return (
    <main className="min-h-screen bg-stone-100 text-stone-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="grid gap-4 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-teal-800">
              Daily Support
            </p>
            <h1 className="text-5xl font-black leading-none sm:text-7xl">
              Josephine
            </h1>
          </div>
          <div className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm sm:min-w-56 sm:text-right">
            <span className="block text-sm text-stone-600">
              {new Intl.DateTimeFormat(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              }).format(new Date())}
            </span>
            <strong className="mt-1 block text-teal-800">
              {summary.ready + summary.failsafe} to review
            </strong>
          </div>
        </header>

        <section
          className="grid overflow-hidden rounded-lg border border-stone-300 bg-white sm:grid-cols-3"
          aria-label="Task summary"
        >
          <SummaryMetric value={summary.ready} label="Ready today" />
          <SummaryMetric
            value={summary.failsafe}
            label="Fail-safe checks"
            danger
          />
          <SummaryMetric value={history.length} label="History entries" />
        </section>

        <section className="rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm text-stone-700">
          <span className="font-semibold text-stone-950">
            {syncStatus === "supabase"
              ? "Supabase mode"
              : syncStatus === "syncing"
                ? "Syncing"
                : syncStatus === "loading"
                  ? "Loading"
                  : "Local mode"}
          </span>
          <span className="ml-2">{syncMessage}</span>
        </section>

        <section className="rounded-lg border border-stone-300 bg-white p-3">
          <form className="grid gap-2 lg:grid-cols-[1fr_150px_100px_100px_80px]" onSubmit={addTask}>
            <input
              className="min-h-10 rounded-md border border-stone-300 px-3"
              name="title"
              placeholder="Add a support task"
              required
            />
            <select
              className="min-h-10 rounded-md border border-stone-300 px-3"
              name="category"
              aria-label="Task category"
              defaultValue="hygiene"
            >
              <option value="hygiene">Hygiene</option>
              <option value="school">School</option>
              <option value="admin">Admin</option>
              <option value="health">Health</option>
              <option value="life">Life</option>
            </select>
            <input
              className="min-h-10 rounded-md border border-stone-300 px-3"
              name="normalDays"
              type="number"
              min="1"
              defaultValue="1"
              aria-label="Reminder interval in days"
            />
            <input
              className="min-h-10 rounded-md border border-stone-300 px-3"
              name="maxDays"
              type="number"
              min="1"
              defaultValue="3"
              aria-label="Fail-safe interval in days"
            />
            <button
              className="min-h-10 rounded-md bg-teal-700 px-4 font-semibold text-white hover:bg-teal-800"
              type="submit"
            >
              Add
            </button>
          </form>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Today&apos;s Tasks</h2>
              <button
                className="min-h-10 rounded-md border border-stone-300 px-4 text-sm font-semibold text-teal-800 hover:bg-stone-200"
                type="button"
                onClick={resetDemoData}
              >
                Reset demo data
              </button>
            </div>

            <div className="grid gap-3">
              {tasks.map((task) => {
                const schedule = getTaskSchedule(task);

                return (
                  <article
                    className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm"
                    key={task.id}
                  >
                    <div className="grid gap-3 sm:flex sm:items-start sm:justify-between">
                      <div>
                        <span className="inline-flex min-h-6 items-center rounded-full bg-teal-50 px-3 text-xs font-bold capitalize text-teal-800">
                          {task.category}
                        </span>
                        <h3 className="mt-3 text-2xl font-bold">{task.title}</h3>
                        <p className="mt-1 text-stone-600">
                          {task.description}
                        </p>
                      </div>
                      <span
                        className={`inline-flex min-h-6 w-max items-center rounded-full px-3 text-xs font-bold ${statusClasses(schedule.status)}`}
                      >
                        {statusLabel(schedule.status)}
                      </span>
                    </div>

                    <p className="mt-4 border-t border-stone-200 pt-4 text-sm text-stone-600">
                      Next reminder {formatDate(schedule.nextDueAt)} · fail-safe{" "}
                      {formatDate(schedule.escalateAfterAt)}
                    </p>

                    <div className="mt-4 grid gap-2 sm:grid-cols-4">
                      {(["done", "already_did_it", "snooze", "need_help"] as ActionType[]).map(
                        (action) => (
                          <button
                            className={`min-h-10 rounded-md px-3 text-sm font-semibold text-white ${actionClasses(action)}`}
                            key={action}
                            type="button"
                            onClick={() => recordAction(task.id, action)}
                          >
                            {action === "already_did_it"
                              ? "Already Did It"
                              : action === "need_help"
                                ? "Need Help"
                                : action === "snooze"
                                  ? "Snooze"
                                  : "Done"}
                          </button>
                        ),
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold">History</h2>
            <ol className="grid gap-3">
              {history.slice(0, 12).map((entry) => (
                <li className="border-b border-stone-200 pb-3 last:border-0 last:pb-0" key={entry.id}>
                  <strong className="block">{entry.taskTitle}</strong>
                  <span className="block text-stone-600">
                    {historyLabel(entry.type)}
                  </span>
                  <span className="block text-sm text-stone-500">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        </section>
      </div>
    </main>
  );
}

function SummaryMetric({
  value,
  label,
  danger = false,
}: {
  value: number;
  label: string;
  danger?: boolean;
}) {
  return (
    <div className="border-b border-stone-300 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <span
        className={`block text-4xl font-black ${danger ? "text-red-700" : "text-teal-800"}`}
      >
        {value}
      </span>
      <p className="mt-1 text-stone-600">{label}</p>
    </div>
  );
}
