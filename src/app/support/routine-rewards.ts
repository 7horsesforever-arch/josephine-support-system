export type ActionType =
  | "done"
  | "already_did_it"
  | "snooze"
  | "need_help"
  | "created";

export type HistoryEntry = {
  id: string;
  taskId: string | null;
  taskTitle: string;
  type: ActionType;
  createdAt: string;
};

export type RewardRoutine = {
  id: string;
  title: string;
  cadenceDays: number;
  maxGapDays: number;
  expectedLabel: string;
  helper: string;
};

export type RewardSettings = {
  thresholdLevelIndex: number;
  cashPerStar: number;
  starsRequiredForPayout: number;
  payoutDestinationLabel: string;
};

export type RewardPayout = {
  id: string;
  createdAt: string;
  stars: number;
  amount: number;
  threshold: number;
  destination: string;
};

export type RewardState = {
  settings: RewardSettings;
  bankedStars: number;
  bankedWeekKeys: string[];
  payouts: RewardPayout[];
};

export const rewardWindowDays = 7;
export const routineDashboardWindowDays = 14;
export const rewardStateStorageKey = "jojo-reward-state-v1";
export const rewardThresholds = [50, 60, 70, 80, 90, 100];

export const rewardRoutines: RewardRoutine[] = [
  {
    id: "shower",
    title: "Scrub It!",
    cadenceDays: 2,
    maxGapDays: 7,
    expectedLabel: "every couple days",
    helper: "Small resets count. The goal is keeping the body-care rhythm from disappearing.",
  },
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

export const defaultRewardSettings: RewardSettings = {
  thresholdLevelIndex: 0,
  cashPerStar: 1,
  starsRequiredForPayout: 10,
  payoutDestinationLabel: "Credit union account",
};

export const defaultRewardState: RewardState = {
  settings: defaultRewardSettings,
  bankedStars: 0,
  bankedWeekKeys: [],
  payouts: [],
};

export function startOfLocalDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekKey(date = new Date()) {
  const day = startOfLocalDay(date);
  const dayOfWeek = day.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return dayKey(addDays(day, mondayOffset));
}

export function buildDayWindow(days: number) {
  const today = startOfLocalDay(new Date());
  return Array.from({ length: days }, (_item, index) =>
    addDays(today, index - (days - 1)),
  );
}

export function currentRewardThreshold(settings: RewardSettings) {
  return (
    rewardThresholds[settings.thresholdLevelIndex] ??
    rewardThresholds[rewardThresholds.length - 1]
  );
}

export function normalizeRewardState(state: Partial<RewardState>): RewardState {
  return {
    settings: {
      ...defaultRewardSettings,
      ...(state.settings ?? {}),
      thresholdLevelIndex: Math.min(
        rewardThresholds.length - 1,
        Math.max(
          0,
          Math.round(
            state.settings?.thresholdLevelIndex ??
              defaultRewardSettings.thresholdLevelIndex,
          ),
        ),
      ),
      cashPerStar: Math.max(
        0,
        Number(state.settings?.cashPerStar ?? defaultRewardSettings.cashPerStar),
      ),
      starsRequiredForPayout: Math.max(
        1,
        Math.round(
          Number(
            state.settings?.starsRequiredForPayout ??
              defaultRewardSettings.starsRequiredForPayout,
          ),
        ),
      ),
    },
    bankedStars: Math.max(0, Math.round(Number(state.bankedStars ?? 0))),
    bankedWeekKeys: Array.isArray(state.bankedWeekKeys)
      ? state.bankedWeekKeys
      : [],
    payouts: Array.isArray(state.payouts) ? state.payouts : [],
  };
}

export function isCompletion(entry: HistoryEntry) {
  return entry.type === "done" || entry.type === "already_did_it";
}

export function calculateRoutineCompletion(
  history: HistoryEntry[],
  routine: RewardRoutine,
  days: Date[],
  threshold: number,
) {
  const routineHistory = history.filter(
    (entry) => entry.taskId === routine.id && isCompletion(entry),
  );
  const completedDayKeys = new Set(
    routineHistory.map((entry) => dayKey(new Date(entry.createdAt))),
  );
  const completedDays = days.filter((day) =>
    completedDayKeys.has(dayKey(day)),
  ).length;
  const expectedCompletions = Math.ceil(days.length / routine.cadenceDays);
  const consistency = Math.min(
    100,
    Math.round((completedDays / expectedCompletions) * 100),
  );
  const earnedStar = consistency >= threshold;
  const lastCompletedAt = routineHistory
    .map((entry) => new Date(entry.createdAt))
    .sort((first, second) => second.getTime() - first.getTime())[0];

  return {
    completedDayKeys,
    completedDays,
    expectedCompletions,
    consistency,
    earnedStar,
    lastCompletedAt,
  };
}

export function calculateWeeklyRewards(
  history: HistoryEntry[],
  settings: RewardSettings,
) {
  const days = buildDayWindow(rewardWindowDays);
  const threshold = currentRewardThreshold(settings);
  const routineResults = rewardRoutines.map((routine) => ({
    routine,
    ...calculateRoutineCompletion(history, routine, days, threshold),
  }));

  return {
    days,
    threshold,
    weekKey: getWeekKey(),
    routineResults,
    starsEarned: routineResults.filter((result) => result.earnedStar).length,
  };
}
