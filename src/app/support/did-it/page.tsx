"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  isSupabaseConfigured,
  supabase,
} from "@/lib/supabase";

type ActionType = "done" | "already_did_it" | "snooze" | "need_help" | "created";

type HistoryEntry = {
  id: string;
  taskId: string | null;
  taskTitle: string;
  type: ActionType;
  createdAt: string;
};

type HistoryRow = {
  id: string;
  user_id: string;
  task_id: string | null;
  task_title: string;
  action_type: ActionType;
  created_at: string;
};

const storageKey = "josephine-support-state-v1";

function formatDateTime(isoDate: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

function actionLabel(type: ActionType) {
  return {
    done: "Did it",
    already_did_it: "Already did it",
    snooze: "Snoozed",
    need_help: "Asked for help",
    created: "Created",
  }[type];
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

export default function DidItPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [statusMessage, setStatusMessage] = useState("Loading Did it...");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadHistory() {
      if (!isSupabaseConfigured || !supabase) {
        if (ignore) return;
        setHistory(readLocalHistory());
        setStatusMessage("Showing the Did it list saved in this browser.");
        setIsLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (ignore) return;
        setHistory([]);
        setStatusMessage(
          "Sign in from the dashboard first, then come back here to see the private Did it list.",
        );
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("support_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (ignore) return;

      if (error) {
        setHistory([]);
        setStatusMessage(
          "Did it is connected, but the saved activity table needs the secure schema.",
        );
      } else {
        setHistory((data ?? []).map((row) => historyFromRow(row as HistoryRow)));
        setStatusMessage("Showing Josephine's private Did it list.");
      }

      setIsLoading(false);
    }

    void loadHistory();

    return () => {
      ignore = true;
    };
  }, []);

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
            Progress
          </p>
          <h1 className="mt-2 text-4xl font-black leading-tight sm:text-6xl">
            Did it
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-stone-600">
            A quiet record of what got handled, what was snoozed, and where help
            was asked for.
          </p>
        </header>

        <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Recent activity</h2>
              <p className="mt-1 text-sm text-stone-600">{statusMessage}</p>
            </div>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
              {history.length} items
            </span>
          </div>

          {isLoading ? (
            <p className="mt-5 text-sm text-stone-600">Loading...</p>
          ) : history.length > 0 ? (
            <ol className="mt-5 grid gap-3">
              {history.map((entry) => (
                <li
                  className="rounded-md border border-stone-200 bg-stone-50 p-4"
                  key={entry.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <strong className="block text-stone-950">
                        {entry.taskTitle}
                      </strong>
                      <span className="mt-1 block text-sm text-stone-600">
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-teal-800">
                      {actionLabel(entry.type)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-5 rounded-md border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
              Nothing is logged here yet. When Josephine taps Did It, Already
              Did It, Snooze, or Need Help on the dashboard, it will show up
              here.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
