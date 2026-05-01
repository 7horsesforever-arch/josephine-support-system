"use client";

import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  calculateWeeklyRewards,
  defaultRewardState,
  isCompletion,
  normalizeRewardState,
  rewardRoutines,
  rewardStateStorageKey,
  rewardThresholds,
  type ActionType,
  type HistoryEntry,
  type RewardPayout,
  type RewardState,
} from "../routine-rewards";

type SupportHistoryRow = {
  id: string;
  task_id: string | null;
  task_title: string;
  action_type: ActionType;
  created_at: string;
};

const supportStateStorageKey = "josephine-support-state-v1";

function historyFromRow(row: SupportHistoryRow): HistoryEntry {
  return {
    id: row.id,
    taskId: row.task_id,
    taskTitle: row.task_title,
    type: row.action_type,
    createdAt: row.created_at,
  };
}

function readLocalSupportHistory() {
  const storedState = window.localStorage.getItem(supportStateStorageKey);
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

function readRewardState() {
  const storedState = window.localStorage.getItem(rewardStateStorageKey);
  if (!storedState) return defaultRewardState;

  try {
    return normalizeRewardState(JSON.parse(storedState) as Partial<RewardState>);
  } catch {
    return defaultRewardState;
  }
}

function writeRewardState(state: RewardState) {
  window.localStorage.setItem(rewardStateStorageKey, JSON.stringify(state));
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `reward-${Date.now()}`;
}

export function RewardAdminPanel() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [rewardState, setRewardState] =
    useState<RewardState>(defaultRewardState);
  const [message, setMessage] = useState("Loading reward history...");

  useEffect(() => {
    let ignore = false;

    async function loadRewards() {
      const savedRewardState = readRewardState();
      const localHistory = readLocalSupportHistory();
      setRewardState(savedRewardState);

      if (isSupabaseConfigured && supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          const { data, error } = await supabase
            .from("support_history")
            .select("id,task_id,task_title,action_type,created_at")
            .in(
              "task_id",
              rewardRoutines.map((routine) => routine.id),
            )
            .in("action_type", ["done", "already_did_it"])
            .order("created_at", { ascending: false })
            .limit(200);

          if (!ignore && !error && data) {
            setHistory(data.map((row) => historyFromRow(row as SupportHistoryRow)));
            setMessage("Using saved support history when caregiver access is linked.");
            return;
          }
        }
      }

      if (!ignore) {
        setHistory(
          localHistory.filter(
            (entry) =>
              rewardRoutines.some((routine) => routine.id === entry.taskId) &&
              isCompletion(entry),
          ),
        );
        setMessage("Using local check-ins on this device for the reward preview.");
      }
    }

    void loadRewards();

    return () => {
      ignore = true;
    };
  }, []);

  const weeklyRewards = useMemo(
    () => calculateWeeklyRewards(history, rewardState.settings),
    [history, rewardState.settings],
  );
  const currentWeekBanked = rewardState.bankedWeekKeys.includes(
    weeklyRewards.weekKey,
  );
  const payoutReady =
    rewardState.bankedStars >= rewardState.settings.starsRequiredForPayout;
  const payoutAmount =
    rewardState.settings.starsRequiredForPayout *
    rewardState.settings.cashPerStar;

  function updateState(nextState: RewardState) {
    const normalizedState = normalizeRewardState(nextState);
    setRewardState(normalizedState);
    writeRewardState(normalizedState);
  }

  function updateCashPerStar(value: string) {
    updateState({
      ...rewardState,
      settings: {
        ...rewardState.settings,
        cashPerStar: Number(value),
      },
    });
  }

  function updateStarsRequiredForPayout(value: string) {
    updateState({
      ...rewardState,
      settings: {
        ...rewardState.settings,
        starsRequiredForPayout: Number(value),
      },
    });
  }

  function updateThresholdLevel(value: string) {
    updateState({
      ...rewardState,
      settings: {
        ...rewardState.settings,
        thresholdLevelIndex: Number(value),
      },
    });
  }

  function bankWeeklyStars() {
    if (currentWeekBanked || weeklyRewards.starsEarned === 0) return;

    updateState({
      ...rewardState,
      bankedStars: rewardState.bankedStars + weeklyRewards.starsEarned,
      bankedWeekKeys: [...rewardState.bankedWeekKeys, weeklyRewards.weekKey],
    });
  }

  function raiseThreshold() {
    updateState({
      ...rewardState,
      settings: {
        ...rewardState.settings,
        thresholdLevelIndex: Math.min(
          rewardThresholds.length - 1,
          rewardState.settings.thresholdLevelIndex + 1,
        ),
      },
    });
  }

  function recordManualPayout() {
    if (!payoutReady) return;

    const payout: RewardPayout = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      stars: rewardState.settings.starsRequiredForPayout,
      amount: payoutAmount,
      threshold: weeklyRewards.threshold,
      destination: rewardState.settings.payoutDestinationLabel,
    };

    updateState({
      ...rewardState,
      bankedStars:
        rewardState.bankedStars - rewardState.settings.starsRequiredForPayout,
      payouts: [payout, ...rewardState.payouts].slice(0, 8),
    });
  }

  return (
    <article className="rounded-lg border border-yellow-300 bg-yellow-50 p-5 shadow-sm md:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-yellow-950">Rewards</h2>
          <p className="mt-2 max-w-3xl text-sm text-yellow-950">
            Stars are earned for keeping up with Scrub It!, Brush It!, and Wash
            It! at the current threshold. Cash payouts are caregiver-approved
            and recorded here after you move money through the credit union.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-yellow-950">
          {rewardState.bankedStars} banked stars
        </span>
      </div>

      <p className="mt-3 text-sm text-yellow-900">{message}</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <section className="rounded-md border border-yellow-200 bg-white p-4">
          <h3 className="font-bold">This Week</h3>
          <p className="mt-2 text-3xl font-black">
            {weeklyRewards.starsEarned} / {rewardRoutines.length}
          </p>
          <p className="mt-1 text-sm text-stone-600">
            Stars at {weeklyRewards.threshold}% compliance.
          </p>
          <div className="mt-3 grid gap-2">
            {weeklyRewards.routineResults.map((result) => (
              <div
                className="flex items-center justify-between gap-2 rounded-md bg-stone-50 p-2 text-sm"
                key={result.routine.id}
              >
                <span>{result.routine.title}</span>
                <strong>
                  {result.earnedStar ? "Star earned" : `${result.consistency}%`}
                </strong>
              </div>
            ))}
          </div>
          <button
            className="mt-4 min-h-10 w-full rounded-md bg-yellow-600 px-4 text-sm font-semibold text-white hover:bg-yellow-700 disabled:cursor-not-allowed disabled:bg-stone-300"
            type="button"
            onClick={bankWeeklyStars}
            disabled={currentWeekBanked || weeklyRewards.starsEarned === 0}
          >
            {currentWeekBanked ? "Week already banked" : "Bank this week"}
          </button>
        </section>

        <section className="rounded-md border border-yellow-200 bg-white p-4">
          <h3 className="font-bold">Star Bar</h3>
          <label className="mt-3 grid gap-1 text-sm font-semibold text-stone-700">
            Compliance needed
            <select
              className="min-h-10 rounded-md border border-stone-300 px-3 font-normal"
              value={rewardState.settings.thresholdLevelIndex}
              onChange={(event) => updateThresholdLevel(event.target.value)}
            >
              {rewardThresholds.map((threshold, index) => (
                <option key={threshold} value={index}>
                  {threshold}%
                </option>
              ))}
            </select>
          </label>
          <button
            className="mt-3 min-h-10 w-full rounded-md border border-yellow-700 px-4 text-sm font-semibold text-yellow-900 hover:bg-yellow-100 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
            type="button"
            onClick={raiseThreshold}
            disabled={
              rewardState.settings.thresholdLevelIndex >=
              rewardThresholds.length - 1
            }
          >
            Raise bar after payout
          </button>
          <p className="mt-3 text-sm text-stone-600">
            Start easy, then step up gradually until stars require 100%
            compliance.
          </p>
        </section>

        <section className="rounded-md border border-yellow-200 bg-white p-4">
          <h3 className="font-bold">Cash Out</h3>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-stone-700">
              Cash per star
              <input
                className="min-h-10 rounded-md border border-stone-300 px-3 font-normal"
                min="0"
                step="0.25"
                type="number"
                value={rewardState.settings.cashPerStar}
                onChange={(event) => updateCashPerStar(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-stone-700">
              Stars needed
              <input
                className="min-h-10 rounded-md border border-stone-300 px-3 font-normal"
                min="1"
                step="1"
                type="number"
                value={rewardState.settings.starsRequiredForPayout}
                onChange={(event) =>
                  updateStarsRequiredForPayout(event.target.value)
                }
              />
            </label>
          </div>
          <p className="mt-3 text-sm text-stone-600">
            Ready payout: ${payoutAmount.toFixed(2)} to{" "}
            {rewardState.settings.payoutDestinationLabel}.
          </p>
          <button
            className="mt-3 min-h-10 w-full rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-300"
            type="button"
            onClick={recordManualPayout}
            disabled={!payoutReady}
          >
            Record manual payout
          </button>
        </section>
      </div>

      {rewardState.payouts.length > 0 ? (
        <section className="mt-5 rounded-md border border-yellow-200 bg-white p-4">
          <h3 className="font-bold">Recent Payouts</h3>
          <ol className="mt-3 grid gap-2 text-sm text-stone-700">
            {rewardState.payouts.map((payout) => (
              <li
                className="rounded-md border border-stone-200 bg-stone-50 p-3"
                key={payout.id}
              >
                <strong>${payout.amount.toFixed(2)}</strong> for {payout.stars}{" "}
                stars on {new Date(payout.createdAt).toLocaleDateString()}.
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="mt-5 rounded-md border border-amber-300 bg-amber-100 p-3 text-sm text-amber-950">
        The app does not transfer cash. Use the credit union directly, then
        record the payout here. A future production version can replace this
        local prototype with secure Supabase reward tables.
      </div>
    </article>
  );
}
