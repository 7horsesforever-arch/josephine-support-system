"use client";

import type { Session } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  isSupabaseConfigured,
  registerDevicePasskey,
  signInWithDevicePasskey,
  supabase,
} from "@/lib/supabase";

type TaskCategory = "hygiene" | "school" | "admin" | "health" | "life";
type TaskStatus = "ok" | "due" | "snoozed" | "needs_help" | "escalated";
type ActionType = "done" | "already_did_it" | "snooze" | "need_help" | "created";
type SyncStatus = "loading" | "local" | "supabase" | "syncing" | "error";

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
  taskId: string | null;
  taskTitle: string;
  type: ActionType;
  createdAt: string;
};

type TaskRow = {
  id: string;
  assigned_user_id: string;
  created_by: string;
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
  user_id: string;
  task_id: string | null;
  task_title: string;
  action_type: ActionType;
  created_at: string;
};

type SchoolAssignment = {
  id: string;
  courseName: string;
  title: string;
  dueAt: string | null;
  url: string | null;
  pointsPossible: number | null;
  workflowState: string | null;
};

type SchoolAssignmentRow = {
  id: string;
  course_name: string;
  title: string;
  due_at: string | null;
  url: string | null;
  points_possible: number | null;
  workflow_state: string | null;
};

const dayMs = 24 * 60 * 60 * 1000;
const storageKey = "josephine-support-state-v1";
const primaryAccessEmail = "chilton18@gmail.com";
const devicePasskeyName = "Josephine MacBook Touch ID";
const defaultCanvasBaseUrl = "https://colostate.instructure.com";

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
      taskId: "shower",
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

function taskToRow(task: SupportTask, userId: string): TaskRow {
  return {
    id: task.id,
    assigned_user_id: userId,
    created_by: userId,
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
    taskId: row.task_id,
    taskTitle: row.task_title,
    type: row.action_type,
    createdAt: row.created_at,
  };
}

function historyToRow(entry: HistoryEntry, userId: string): HistoryRow {
  return {
    id: entry.id,
    user_id: userId,
    task_id: entry.taskId,
    task_title: entry.taskTitle,
    action_type: entry.type,
    created_at: entry.createdAt,
  };
}

function assignmentFromRow(row: SchoolAssignmentRow): SchoolAssignment {
  return {
    id: row.id,
    courseName: row.course_name,
    title: row.title,
    dueAt: row.due_at,
    url: row.url,
    pointsPossible: row.points_possible,
    workflowState: row.workflow_state,
  };
}

export default function Home() {
  const [tasks, setTasks] = useState(createStarterTasks);
  const [history, setHistory] = useState(createInitialHistory);
  const [assignments, setAssignments] = useState<SchoolAssignment[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [syncMessage, setSyncMessage] = useState("Checking saved data...");
  const [passkeyStatus, setPasskeyStatus] = useState(
    "This MacBook can become the primary access device after one secure email sign-in.",
  );
  const [isPasskeySubmitting, setIsPasskeySubmitting] = useState(false);
  const [canvasBaseUrl, setCanvasBaseUrl] = useState(defaultCanvasBaseUrl);
  const [canvasAccessToken, setCanvasAccessToken] = useState("");
  const [canvasMessage, setCanvasMessage] = useState(
    "Canvas assignment import is ready. Use OAuth or a short-lived Canvas API token, not the mobile QR code.",
  );
  const [isCanvasImporting, setIsCanvasImporting] = useState(false);

  const userId = session?.user.id;

  useEffect(() => {
    if (isSupabaseConfigured) return;

    const storedState = window.localStorage.getItem(storageKey);
    if (storedState) {
      try {
        const parsedState = JSON.parse(storedState) as {
          tasks?: SupportTask[];
          history?: HistoryEntry[];
        };

        window.queueMicrotask(() => {
          if (Array.isArray(parsedState.tasks)) setTasks(parsedState.tasks);
          if (Array.isArray(parsedState.history)) setHistory(parsedState.history);
        });
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    window.queueMicrotask(() => {
      setSyncStatus("local");
      setSyncMessage("Saved in this browser. Supabase is not configured yet.");
    });
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured || syncStatus !== "local") return;

    window.localStorage.setItem(storageKey, JSON.stringify({ tasks, history }));
  }, [history, syncStatus, tasks]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let ignore = false;

    async function loadAuth() {
      const {
        data: { session: currentSession },
      } = await supabase!.auth.getSession();

      if (!ignore) {
        setSession(currentSession);
        setAuthReady(true);
      }
    }

    loadAuth();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !authReady || !userId) return;

    let ignore = false;
    const activeUserId = userId;

    async function loadUserData() {
      setSyncStatus("loading");
      setSyncMessage("Loading private task data...");
      window.localStorage.removeItem(storageKey);

      const { error: profileError } = await supabase!.from("profiles").upsert({
        id: activeUserId,
        email: session?.user.email ?? null,
        display_name: session?.user.email?.split("@")[0] ?? "Josephine",
      });

      if (profileError && !ignore) {
        setSyncStatus("error");
        setSyncMessage("Sign-in works, but the private database schema needs setup.");
        return;
      }

      const { data: savedTasks, error: tasksError } = await supabase!
        .from("support_tasks")
        .select("*")
        .order("title");

      if (ignore) return;

      if (tasksError) {
        setSyncStatus("error");
        setSyncMessage("Sign-in works, but support_tasks needs the secure schema.");
        return;
      }

      const { data: savedHistory, error: historyError } = await supabase!
        .from("support_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);

      if (ignore) return;

      if (historyError) {
        setSyncStatus("error");
        setSyncMessage("Sign-in works, but support_history needs the secure schema.");
        return;
      }

      if ((savedTasks ?? []).length > 0) {
        setTasks(savedTasks.map(taskFromRow));
      } else {
        const starterTasks = createStarterTasks();
        setTasks(starterTasks);
        await supabase!
          .from("support_tasks")
          .upsert(starterTasks.map((task) => taskToRow(task, activeUserId)));
      }

      if ((savedHistory ?? []).length > 0) {
        setHistory(savedHistory.map(historyFromRow));
      } else {
        const starterHistory = createInitialHistory();
        setHistory(starterHistory);
        await supabase!
          .from("support_history")
          .upsert(
            starterHistory.map((entry) => historyToRow(entry, activeUserId)),
          );
      }

      const { data: savedAssignments, error: assignmentsError } = await supabase!
        .from("school_assignments")
        .select("id,course_name,title,due_at,url,points_possible,workflow_state")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(8);

      if (!ignore && assignmentsError) {
        setCanvasMessage("Canvas table needs the latest Supabase schema before assignments can load.");
      }

      if (!ignore && savedAssignments) {
        setAssignments(savedAssignments.map((row) => assignmentFromRow(row as SchoolAssignmentRow)));
      }

      setSyncStatus("supabase");
      setSyncMessage("Private data saved to Supabase.");
    }

    loadUserData();

    return () => {
      ignore = true;
    };
  }, [authReady, session?.user.email, userId]);

  async function refreshAssignments() {
    if (!supabase || !userId || syncStatus === "local" || syncStatus === "error") {
      return;
    }

    const { data, error } = await supabase
      .from("school_assignments")
      .select("id,course_name,title,due_at,url,points_possible,workflow_state")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(8);

    if (error) {
      setCanvasMessage("Imported, but assignments could not be refreshed from Supabase.");
      return;
    }

    setAssignments((data ?? []).map((row) => assignmentFromRow(row as SchoolAssignmentRow)));
  }

  async function saveTaskToSupabase(task: SupportTask) {
    if (!supabase || !userId || syncStatus === "local" || syncStatus === "error") {
      return;
    }

    setSyncStatus("syncing");
    const { error } = await supabase
      .from("support_tasks")
      .upsert(taskToRow(task, userId));
    if (error) {
      setSyncStatus("error");
      setSyncMessage("Saved on screen. Supabase sync needs attention.");
      return;
    }

    setSyncStatus("supabase");
    setSyncMessage("Private data saved to Supabase.");
  }

  async function saveHistoryToSupabase(entry: HistoryEntry) {
    if (!supabase || !userId || syncStatus === "local" || syncStatus === "error") {
      return;
    }

    setSyncStatus("syncing");
    const { error } = await supabase
      .from("support_history")
      .insert(historyToRow(entry, userId));
    if (error) {
      setSyncStatus("error");
      setSyncMessage("Saved on screen. Supabase sync needs attention.");
      return;
    }

    setSyncStatus("supabase");
    setSyncMessage("Private data saved to Supabase.");
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

    const updatedTask =
      type === "done" || type === "already_did_it"
        ? { ...task, lastCompletedAt: now, status: "ok" as TaskStatus }
        : type === "snooze"
          ? { ...task, status: "snoozed" as TaskStatus }
          : type === "need_help"
            ? { ...task, status: "needs_help" as TaskStatus }
            : task;

    setTasks((currentTasks) =>
      currentTasks.map((item) => (item.id === taskId ? updatedTask : item)),
    );

    const historyEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      taskId,
      taskTitle: task.title,
      type,
      createdAt: now,
    };

    setHistory((currentHistory) => [historyEntry, ...currentHistory]);
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

    const historyEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      taskId: task.id,
      taskTitle: title,
      type: "created",
      createdAt: now,
    };

    setTasks((currentTasks) => [...currentTasks, task]);
    setHistory((currentHistory) => [historyEntry, ...currentHistory]);
    void saveTaskToSupabase(task);
    void saveHistoryToSupabase(historyEntry);
    event.currentTarget.reset();
  }

  async function resetDemoData() {
    const starterTasks = createStarterTasks();
    const starterHistory = createInitialHistory();

    setTasks(starterTasks);
    setHistory(starterHistory);

    if (!supabase || !userId || syncStatus === "local" || syncStatus === "error") {
      return;
    }

    setSyncStatus("syncing");
    const { error: deleteHistoryError } = await supabase
      .from("support_history")
      .delete()
      .eq("user_id", userId);
    const { error: deleteTasksError } = await supabase
      .from("support_tasks")
      .delete()
      .eq("assigned_user_id", userId);
    const { error: taskError } = await supabase
      .from("support_tasks")
      .upsert(starterTasks.map((task) => taskToRow(task, userId)));
    const { error: historyError } = await supabase
      .from("support_history")
      .upsert(starterHistory.map((entry) => historyToRow(entry, userId)));

    if (deleteHistoryError || deleteTasksError || taskError || historyError) {
      setSyncStatus("error");
      setSyncMessage("Reset on screen. Supabase sync needs attention.");
      return;
    }

    setSyncStatus("supabase");
    setSyncMessage("Private data saved to Supabase.");
  }

  async function setUpDevicePasskey() {
    setIsPasskeySubmitting(true);
    setPasskeyStatus("Starting Touch ID passkey setup...");

    const { error } = await registerDevicePasskey(devicePasskeyName);

    setIsPasskeySubmitting(false);
    setPasskeyStatus(
      error?.message
        ? error.message
        : "Touch ID passkey is ready on this MacBook. Keep the secure email link as backup.",
    );
  }

  async function importCanvasAssignments(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !userId) {
      setCanvasMessage("Sign in before importing Canvas assignments.");
      return;
    }

    const trimmedBaseUrl = canvasBaseUrl.trim();
    const trimmedToken = canvasAccessToken.trim();

    if (!trimmedBaseUrl || !trimmedToken) {
      setCanvasMessage("Enter the Canvas URL and a Canvas API access token.");
      return;
    }

    setIsCanvasImporting(true);
    setCanvasMessage("Importing upcoming Canvas assignments...");

    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (!currentSession?.access_token) {
      setIsCanvasImporting(false);
      setCanvasMessage("App session expired. Sign in again before importing Canvas.");
      return;
    }

    const response = await fetch("/api/canvas/import", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        canvasBaseUrl: trimmedBaseUrl,
        canvasAccessToken: trimmedToken,
      }),
    });

    const payload = (await response.json()) as {
      imported?: number;
      coursesChecked?: number;
      error?: string;
    };

    setIsCanvasImporting(false);

    if (!response.ok) {
      setCanvasMessage(payload.error ?? "Canvas import failed.");
      return;
    }

    setCanvasAccessToken("");
    setCanvasMessage(
      `Imported ${payload.imported ?? 0} assignments from ${payload.coursesChecked ?? 0} Canvas courses. Token cleared from this screen.`,
    );
    await refreshAssignments();
  }

  if (isSupabaseConfigured && !authReady) {
    return <LoadingScreen />;
  }

  if (isSupabaseConfigured && !session) {
    return <AuthGate />;
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
          <div className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm sm:min-w-64 sm:text-right">
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
            {session ? (
              <div className="mt-3 grid gap-3 border-t border-stone-200 pt-3">
                <div className="text-sm text-stone-600">
                  <strong className="block text-stone-950">
                    Device-first access
                  </strong>
                  <span>{passkeyStatus}</span>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    className="min-h-9 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                    type="button"
                    onClick={setUpDevicePasskey}
                    disabled={isPasskeySubmitting}
                  >
                    {isPasskeySubmitting ? "Starting" : "Set Up Touch ID"}
                  </button>
                  <button
                    className="min-h-9 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-100"
                    type="button"
                    onClick={() => supabase?.auth.signOut()}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : null}
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
              ? "Private mode"
              : syncStatus === "syncing"
                ? "Syncing"
                : syncStatus === "loading"
                  ? "Loading"
                  : syncStatus === "error"
                    ? "Setup needed"
                    : "Local mode"}
          </span>
          <span className="ml-2">{syncMessage}</span>
        </section>

        <section className="rounded-lg border border-stone-300 bg-white p-3">
          <form
            className="grid gap-2 lg:grid-cols-[1fr_150px_100px_100px_80px]"
            onSubmit={addTask}
          >
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

          <aside className="grid gap-4">
            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">School Connections</h2>
              <p className="mt-2 text-sm text-stone-600">
                Canvas QR login is for the mobile app and expires quickly. This
                import uses a Canvas API token only for this request, then clears
                it from the screen.
              </p>
              <form className="mt-4 grid gap-3" onSubmit={importCanvasAssignments}>
                <label className="grid gap-1 text-sm font-semibold text-stone-700">
                  Canvas URL
                  <input
                    className="min-h-10 rounded-md border border-stone-300 px-3 font-normal"
                    value={canvasBaseUrl}
                    onChange={(event) => setCanvasBaseUrl(event.target.value)}
                    inputMode="url"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-stone-700">
                  Canvas API token
                  <input
                    className="min-h-10 rounded-md border border-stone-300 px-3 font-normal"
                    value={canvasAccessToken}
                    onChange={(event) => setCanvasAccessToken(event.target.value)}
                    type="password"
                    autoComplete="off"
                    placeholder="Paste token for one import"
                  />
                </label>
                <button
                  className="min-h-10 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                  type="submit"
                  disabled={isCanvasImporting}
                >
                  {isCanvasImporting ? "Importing" : "Import Assignments"}
                </button>
              </form>
              <p className="mt-3 text-sm text-stone-600">{canvasMessage}</p>

              <div className="mt-5 border-t border-stone-200 pt-4">
                <h3 className="text-sm font-bold uppercase text-stone-500">
                  Upcoming From Canvas
                </h3>
                {assignments.length > 0 ? (
                  <ol className="mt-3 grid gap-3">
                    {assignments.map((assignment) => (
                      <li
                        className="border-b border-stone-200 pb-3 last:border-0 last:pb-0"
                        key={assignment.id}
                      >
                        <strong className="block">{assignment.title}</strong>
                        <span className="block text-sm text-stone-600">
                          {assignment.courseName}
                        </span>
                        <span className="block text-sm text-stone-500">
                          {assignment.dueAt
                            ? `Due ${formatDateTime(assignment.dueAt)}`
                            : "No due date listed"}
                        </span>
                        {assignment.url ? (
                          <a
                            className="mt-1 inline-block text-sm font-semibold text-teal-800 hover:text-teal-950"
                            href={assignment.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open in Canvas
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-3 text-sm text-stone-600">
                    No assignments imported yet.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold">History</h2>
              <ol className="grid gap-3">
                {history.slice(0, 12).map((entry) => (
                  <li
                    className="border-b border-stone-200 pb-3 last:border-0 last:pb-0"
                    key={entry.id}
                  >
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
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function AuthGate() {
  const [email, setEmail] = useState(primaryAccessEmail);
  const [message, setMessage] = useState("Sign in to open private task data.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasskeySubmitting, setIsPasskeySubmitting] = useState(false);

  async function requestMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin,
      },
    });

    setIsSubmitting(false);
    setMessage(
      error
        ? error.message
        : "Check your email for a secure sign-in link, then return here.",
    );
  }

  async function signInWithPasskey() {
    setIsPasskeySubmitting(true);
    setMessage("Checking for a passkey on this device...");

    const { error } = await signInWithDevicePasskey(email.trim() || undefined);

    setIsPasskeySubmitting(false);
    setMessage(
      error?.message
        ? error.message
        : "Passkey accepted. Opening private support workspace...",
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4 text-stone-950">
      <section className="w-full max-w-md rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase text-teal-800">
          Private Daily Support
        </p>
        <h1 className="mt-2 text-3xl font-black">Sign in</h1>
        <p className="mt-2 text-stone-600">{message}</p>
        <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950">
          <strong className="block">Device-first access</strong>
          <span>
            Josephine&apos;s MacBook with Touch ID should be the easiest way
            back in. Use the secure email link once, then set up a passkey on
            this device. School passwords are never stored here.
          </span>
        </div>
        <button
          className="mt-5 min-h-11 w-full rounded-md border border-teal-700 px-4 font-semibold text-teal-800 hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
          type="button"
          onClick={signInWithPasskey}
          disabled={isPasskeySubmitting}
        >
          {isPasskeySubmitting ? "Checking" : "Use Touch ID passkey"}
        </button>
        <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase text-stone-500">
          <span className="h-px flex-1 bg-stone-200" />
          Secure email backup
          <span className="h-px flex-1 bg-stone-200" />
        </div>
        <form className="mt-5 grid gap-3" onSubmit={requestMagicLink}>
          <input
            className="min-h-11 rounded-md border border-stone-300 px-3"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={primaryAccessEmail}
            required
          />
          <button
            className="min-h-11 rounded-md bg-teal-700 px-4 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending" : "Send secure sign-in link"}
          </button>
        </form>
      </section>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4 text-stone-950">
      <section className="rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
        <p className="font-semibold">Opening private support workspace...</p>
      </section>
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
