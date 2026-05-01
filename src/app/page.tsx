"use client";

import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  isSupabaseConfigured,
  registerDevicePasskey,
  signInWithDevicePasskey,
  supabase,
} from "@/lib/supabase";
import {
  localSafetyAlertPatterns,
} from "@/lib/safety/reviewable-config";
import { supportModules } from "./support/module-data";

type TaskCategory =
  | "school"
  | "communications"
  | "financial"
  | "housing"
  | "food"
  | "vehicle"
  | "work"
  | "medical"
  | "emergency"
  | "logistics"
  | "calendar"
  | "documents"
  | "travel"
  | "social"
  | "admin"
  | "health"
  | "life";
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

type DeadlineTaskItem = {
  task: SupportTask;
  schedule: ReturnType<typeof getTaskSchedule>;
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

type EmailDraft = {
  id: string;
  source: string;
  recipientEmail: string | null;
  subject: string;
  body: string;
  status: string;
  createdByAgent: string;
  updatedAt: string;
};

type EmailDraftRow = {
  id: string;
  source: string;
  recipient_email: string | null;
  subject: string;
  body: string;
  status: string;
  created_by_agent: string;
  updated_at: string;
};

type HousingDocument = {
  id: string;
  title: string;
  documentType: string;
  status: string;
  storagePath: string | null;
  fileUrl: string | null;
  importantDate: string | null;
  notes: string | null;
  updatedAt: string;
};

type HousingDocumentRow = {
  id: string;
  title: string;
  document_type: string;
  status: string;
  storage_path: string | null;
  file_url: string | null;
  important_date: string | null;
  notes: string | null;
  updated_at: string;
};

type FinancialAccount = {
  plaidAccountId: string;
  name: string;
  officialName: string | null;
  mask: string | null;
  accountType: string;
  accountSubtype: string | null;
  availableBalance: number | null;
  currentBalance: number | null;
  isoCurrencyCode: string | null;
  updatedAt: string;
};

type FinancialAccountRow = {
  plaid_account_id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  account_type: string;
  account_subtype: string | null;
  available_balance: number | null;
  current_balance: number | null;
  iso_currency_code: string | null;
  updated_at: string;
};

type CanvasConnection = {
  connected: boolean;
  canvasBaseUrl: string | null;
  expiresAt: string | null;
  lastImportedAt: string | null;
  updatedAt: string | null;
};

type CanvasConnectionStatusRow = {
  canvas_base_url: string;
  expires_at: string;
  last_imported_at: string | null;
  updated_at: string;
};

type AskJojoSource = {
  title: string;
  category: string;
  text: string;
  href?: string;
  priority?: number;
};

type AskJojoAnswer = {
  intro: string;
  steps: string[];
  sources: AskJojoSource[];
};

type SafetyModerationState = {
  safetyAlert: boolean;
  source: "openai_moderation";
  matchedCategory: string | null;
  confidenceLevel: string;
  threshold: number;
  error?: string;
};

const dayMs = 24 * 60 * 60 * 1000;
const storageKey = "josephine-support-state-v1";
const primaryAccessEmail = "chilton18@gmail.com";
const devicePasskeyName = "Josephine MacBook Touch ID";
const defaultCanvasBaseUrl = "https://colostate.instructure.com";
const amazonDormSuppliesUrl =
  "https://www.amazon.com/s?k=dorm+room+cleaning+supplies";
const lifelineUrl = "https://988lifeline.org/";
const lifelineChatUrl = "https://988lifeline.org/chat/";
const csuTellSomeoneUrl = "https://supportandsafety.colostate.edu/tell-someone/";
const helpCompassUrl = "https://helpcompass.colostate.edu/";
const authNetworkErrorMessage =
  "Could not reach Supabase Auth. Check NEXT_PUBLIC_SUPABASE_URL in .env.local, restart the dev server, then try again.";

const dailyAffirmations = [
  "I do not have to do everything at once. One clear next step counts.",
  "My brain is allowed to work differently, and I can still build a good day.",
  "Asking for help is a college skill, not a failure.",
  "I can pause, reset, and choose the next right thing.",
  "I belong here, even on days that feel messy.",
  "Progress can be small and still be real.",
  "I can use my supports without apologizing for needing them.",
  "A hard moment is not the whole day.",
  "I can make things easier for future me with one tiny action now.",
  "I am learning the system, and I do not have to know it all today.",
  "My needs are real, and planning for them is responsible.",
  "I can be kind to myself while I figure this out.",
  "Done imperfectly is still data, progress, and proof that I tried.",
  "I am allowed to take up space, ask questions, and be understood.",
];

const dashboardJumpLinks = [
  { label: "Today", href: "#today-list" },
  { label: "Deadlines", href: "#deadline-watch" },
  { label: "Pages", href: "#page-bookmarks" },
  { label: "Add Task", href: "#add-task" },
];

const supportPageShortcuts = [
  { label: "Messages", href: "/support/messages" },
  { label: "School", href: "/support/school" },
  { label: "Adulting", href: "/support/adulting" },
  { label: "Health", href: "/support/health" },
  { label: "Food", href: "/support/food" },
  { label: "Money", href: "/support/money" },
  { label: "Campus", href: "/support/campus" },
  { label: "Docs", href: "/support/docs" },
  { label: "Housing", href: "/support/housing" },
  { label: "Vehicle", href: "/support/vehicle" },
  { label: "Work", href: "/support/work" },
  { label: "Viper", href: "/support/viper" },
  { label: "Safety", href: "/support/safety" },
];

const safetyAlertResponseSteps = [
  "If Josephine or someone else may be in immediate danger, call or text 911 now and say there is a mental wellness concern.",
  "For suicidal thoughts, self-harm urges, or emotional crisis support, call or text 988 or use 988 chat.",
  "If this is a CSU concern but not immediate danger, use Tell Someone or contact Student Case Management.",
  "A caregiver alert should share only the safety concern and next support step, not private messages or search history.",
];

const roomResetItems = [
  "Trash and recycling out",
  "Dishes, cups, and bottles handled",
  "Laundry gathered",
  "Sheets or towels checked",
  "Desk and floor cleared enough to think",
  "Mini-fridge checked for old food",
];

const roomSupplyCheckItems = [
  "Trash bags",
  "Laundry detergent or dryer sheets",
  "Cleaning wipes or spray",
  "Paper towels or tissues",
  "Toiletries, period supplies, or medicine basics",
  "Mini-fridge snacks and drinks",
];

function DashboardModuleCard({
  id,
  title,
  summary,
  href,
  badge,
  children,
}: {
  id: string;
  title: string;
  summary: string;
  href: string;
  badge?: string;
  children?: ReactNode;
}) {
  return (
    <section
      className="scroll-mt-6 rounded-lg border border-stone-300 bg-white p-4 shadow-sm"
      id={id}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mt-1 text-sm text-stone-600">{summary}</p>
        </div>
        {badge ? (
          <span className="shrink-0 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
            {badge}
          </span>
        ) : null}
      </div>
      {children}
      <Link
        className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-teal-700 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50"
        href={href}
      >
        Open full page
      </Link>
    </section>
  );
}

function DeadlineTaskList({
  items,
  emptyMessage,
}: {
  items: DeadlineTaskItem[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="mt-3 text-sm text-stone-600">{emptyMessage}</p>;
  }

  return (
    <ol className="mt-4 grid gap-3">
      {items.map(({ task, schedule }) => (
        <li
          className="rounded-md border border-stone-200 bg-stone-50 p-3"
          key={task.id}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-sm">{task.title}</strong>
            <span
              className={`rounded-full px-2 py-1 text-xs font-bold ${statusClasses(schedule.status)}`}
            >
              {statusLabel(schedule.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-stone-700">{task.description}</p>
          <span className="mt-2 block text-xs font-semibold text-teal-800">
            Due {formatDate(schedule.nextDueAt)} · backup{" "}
            {formatDate(schedule.escalateAfterAt)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function getDailyAffirmation(date: Date) {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / dayMs,
  );
  return dailyAffirmations[dayNumber % dailyAffirmations.length];
}

function hasSafetyAlertSignal(input: string) {
  return localSafetyAlertPatterns().some((pattern) => pattern.test(input));
}

const askJojoStopWords = new Set([
  "a",
  "about",
  "and",
  "are",
  "can",
  "do",
  "for",
  "from",
  "her",
  "how",
  "i",
  "in",
  "is",
  "it",
  "jojo",
  "me",
  "my",
  "of",
  "on",
  "or",
  "she",
  "should",
  "the",
  "to",
  "what",
  "when",
  "where",
  "with",
]);

function tokenizeAskJojoText(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !askJojoStopWords.has(word));
}

function firstUsefulSentence(text: string) {
  const [firstSentence] = text.split(/[.!?]\s+/);
  return firstSentence.length > 180
    ? `${firstSentence.slice(0, 177).trim()}...`
    : firstSentence;
}

function answerAskJojo(
  question: string,
  sources: AskJojoSource[],
  moderationState: SafetyModerationState | null,
): AskJojoAnswer {
  const trimmedQuestion = question.trim();

  if (hasSafetyAlertSignal(trimmedQuestion) || moderationState?.safetyAlert) {
    return {
      intro:
        "This sounds safety-related. Pause here and use real support now instead of trying to solve it alone in the app.",
      steps: safetyAlertResponseSteps,
      sources: [
        {
          title: "Call or text 988",
          category: "Crisis support",
          text: "Free, confidential crisis support is available by calling or texting 988.",
          href: lifelineUrl,
          priority: 10,
        },
        {
          title: "988 chat",
          category: "Crisis support",
          text: "Use 988 chat if typing feels easier than calling.",
          href: lifelineChatUrl,
          priority: 10,
        },
        {
          title: "CSU Tell Someone",
          category: "Campus safety",
          text: "Use Tell Someone for CSU health, well-being, or safety concerns when it is not an immediate emergency.",
          href: csuTellSomeoneUrl,
          priority: 9,
        },
        {
          title: "HelpCompass",
          category: "Campus safety",
          text: "Use HelpCompass for anonymous crisis navigation and help finding the right support.",
          href: helpCompassUrl,
          priority: 9,
        },
        {
          title: "Help Now",
          category: "Emergency",
          text: "Use the app's Help Now section for emergency numbers and campus safety steps.",
          href: "#help-now",
          priority: 9,
        },
      ],
    };
  }

  if (!trimmedQuestion) {
    return {
      intro: "Ask JoJo can look across tasks, school, messages, housing, money, food, health, safety, and the support pages.",
      steps: [
        "Try: What is due soon?",
        "Try: How do I schedule an SDC test?",
        "Try: What should I do if an email feels confusing?",
      ],
      sources: sources.slice(0, 3),
    };
  }

  const tokens = tokenizeAskJojoText(trimmedQuestion);
  const scoredSources = sources
    .map((source, index) => {
      const searchableText = `${source.title} ${source.category} ${source.text}`.toLowerCase();
      const score =
        tokens.reduce((total, token) => {
          if (source.title.toLowerCase().includes(token)) return total + 5;
          if (source.category.toLowerCase().includes(token)) return total + 3;
          return searchableText.includes(token) ? total + 1 : total;
        }, source.priority ?? 0) - index * 0.001;

      return { source, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map(({ source }) => source);

  if (scoredSources.length === 0) {
    return {
      intro:
        "I do not see a strong match in the app yet. Try asking with a section name like school, Canvas, SDC, housing, food, money, messages, Viper, car, or health.",
      steps: [
        "If this is urgent or safety-related, use Help Now instead of waiting on the app.",
        "If this is a new area, add it as a task or module note so JoJo can find it next time.",
      ],
      sources: sources.slice(0, 3),
    };
  }

  return {
    intro: `Here is what JoJo found for "${trimmedQuestion}".`,
    steps: scoredSources.slice(0, 3).map((source) => firstUsefulSentence(source.text)),
    sources: scoredSources,
  };
}

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
      title: "Scrub It!",
      category: "health",
      description:
        "Shower reset. Hair, face, underarms, body, feet, and clean clothes after.",
      normalIntervalDays: 2,
      maxGapDays: 7,
      lastCompletedAt: daysAgo(3),
      status: "due",
    },
    {
      id: "brush-teeth-night",
      title: "Brush It!",
      category: "health",
      description:
        "Dentist-backed night reset: two minutes, gumline, tongue, and fluoride left to work.",
      normalIntervalDays: 1,
      maxGapDays: 2,
      lastCompletedAt: daysAgo(1),
      status: "due",
    },
    {
      id: "laundry",
      title: "Wash It!",
      category: "life",
      description:
        "Weekly-ish clothes, towel, and sheet reset so laundry does not become an emergency.",
      normalIntervalDays: 7,
      maxGapDays: 14,
      lastCompletedAt: daysAgo(5),
      status: "ok",
    },
    {
      id: "money-bills-check",
      title: "Money check-in",
      category: "financial",
      description:
        "Quick look at balance, bills, and anything that needs backup before it gets stressful.",
      normalIntervalDays: 7,
      maxGapDays: 14,
      lastCompletedAt: daysAgo(6),
      status: "ok",
    },
    {
      id: "housing-documents-check",
      title: "Housing paperwork check",
      category: "housing",
      description:
        "Keep contracts, move-in notes, room info, and housing dates from getting buried.",
      normalIntervalDays: 14,
      maxGapDays: 30,
      lastCompletedAt: daysAgo(10),
      status: "ok",
    },
    {
      id: "weekly-room-reset",
      title: "Room reset",
      category: "housing",
      description:
        "Weekly room clean and supply check: trash, laundry, sheets/towels, desk, floor, fridge, and anything that needs to go on the Amazon list.",
      normalIntervalDays: 7,
      maxGapDays: 14,
      lastCompletedAt: daysAgo(8),
      status: "due",
    },
    {
      id: "mini-fridge-restock",
      title: "Mini-fridge restock",
      category: "food",
      description:
        "Restock easy snacks, backup meals, and drinks for low-energy days.",
      normalIntervalDays: 14,
      maxGapDays: 21,
      lastCompletedAt: daysAgo(12),
      status: "due",
    },
    {
      id: "monthly-mileage-check",
      title: "Monthly mileage check",
      category: "vehicle",
      description:
        "Record the Touareg odometer, fuel level, warning lights, tire pressure concerns, and any new noises.",
      normalIntervalDays: 30,
      maxGapDays: 45,
      lastCompletedAt: daysAgo(34),
      status: "due",
    },
    {
      id: "fuel-check",
      title: "Check gas level",
      category: "vehicle",
      description:
        "Look at the tank before the week starts and refill before it gets below one quarter.",
      normalIntervalDays: 7,
      maxGapDays: 10,
      lastCompletedAt: daysAgo(6),
      status: "ok",
    },
    {
      id: "car-wash-cleanout",
      title: "Wash and clean out car",
      category: "vehicle",
      description:
        "Monthly reset for the Touareg: wash exterior, clear trash, check wipers, and refill washer fluid if low.",
      normalIntervalDays: 30,
      maxGapDays: 45,
      lastCompletedAt: daysAgo(32),
      status: "due",
    },
    {
      id: "oil-service-plan",
      title: "Plan oil service",
      category: "vehicle",
      description:
        "Use odometer notes to schedule oil and filter service around every 10,000 miles or 12 months.",
      normalIntervalDays: 90,
      maxGapDays: 180,
      lastCompletedAt: daysAgo(96),
      status: "due",
    },
    {
      id: "work-job-search-check",
      title: "Check job options",
      category: "work",
      description:
        "Review Handshake for part-time roles and save anything that fits school schedule, transportation, and energy.",
      normalIntervalDays: 7,
      maxGapDays: 14,
      lastCompletedAt: daysAgo(8),
      status: "due",
    },
    {
      id: "work-hours-check",
      title: "Track work hours",
      category: "work",
      description:
        "When employed, record weekly hours and flag any schedule that crowds assignments, sleep, meals, or accommodations.",
      normalIntervalDays: 7,
      maxGapDays: 14,
      lastCompletedAt: daysAgo(6),
      status: "ok",
    },
    {
      id: "work-documents-check",
      title: "Store work documents",
      category: "work",
      description:
        "Put resumes, offer letters, onboarding forms, schedules, pay stubs, and tax forms in the Work folder in Google Drive.",
      normalIntervalDays: 30,
      maxGapDays: 60,
      lastCompletedAt: daysAgo(31),
      status: "due",
    },
    {
      id: "medical-insurance-check",
      title: "Health insurance check",
      category: "medical",
      description:
        "Confirm insurance requirement status, insurance card, pharmacy card, and CSU Health Network portal access.",
      normalIntervalDays: 120,
      maxGapDays: 180,
      lastCompletedAt: daysAgo(130),
      status: "due",
    },
    {
      id: "prescription-refill-check",
      title: "Medication refill check",
      category: "medical",
      description:
        "Check refill dates, remaining doses, pharmacy location, and whether support is needed before anything runs low.",
      normalIntervalDays: 30,
      maxGapDays: 40,
      lastCompletedAt: daysAgo(28),
      status: "ok",
    },
    {
      id: "oura-charge-check",
      title: "Charge Oura Ring",
      category: "health",
      description:
        "Weekly battery check so sleep and readiness data keep flowing without Josephine having to remember it at bedtime.",
      normalIntervalDays: 7,
      maxGapDays: 10,
      lastCompletedAt: daysAgo(8),
      status: "due",
    },
    {
      id: "emergency-plan-review",
      title: "Review emergency plan",
      category: "emergency",
      description:
        "Confirm emergency contacts, CSU Police, SafeWalk, RA/front desk, and what to do when help is needed now.",
      normalIntervalDays: 90,
      maxGapDays: 120,
      lastCompletedAt: daysAgo(95),
      status: "due",
    },
    {
      id: "campus-alerts-check",
      title: "Check campus safety alerts",
      category: "emergency",
      description:
        "Confirm CSU safety alerts are set up and the SafeWalk number is easy to find.",
      normalIntervalDays: 120,
      maxGapDays: 180,
      lastCompletedAt: daysAgo(122),
      status: "due",
    },
    {
      id: "campus-logistics-check",
      title: "Campus basics check",
      category: "logistics",
      description:
        "Check RamCard, parking permit, transit backup, laundry, mail/packages, and package pickup routine.",
      normalIntervalDays: 30,
      maxGapDays: 45,
      lastCompletedAt: daysAgo(33),
      status: "due",
    },
    {
      id: "weekly-planning-review",
      title: "Weekly reset",
      category: "calendar",
      description:
        "Balance assignments, meals, sleep, work, appointments, transportation, and social plans for the week.",
      normalIntervalDays: 7,
      maxGapDays: 10,
      lastCompletedAt: daysAgo(7),
      status: "due",
    },
    {
      id: "semester-launch-checklist",
      title: "Semester launch",
      category: "school",
      description:
        "Review syllabi, textbooks, accommodation letters, exam dates, office hours, and Canvas imports at the start of term.",
      normalIntervalDays: 120,
      maxGapDays: 150,
      lastCompletedAt: daysAgo(125),
      status: "due",
    },
    {
      id: "important-documents-check",
      title: "Organize docs",
      category: "documents",
      description:
        "Make sure IDs, insurance, SDC, housing, financial, vehicle, work, and travel documents are in the right Drive folders.",
      normalIntervalDays: 30,
      maxGapDays: 60,
      lastCompletedAt: daysAgo(37),
      status: "due",
    },
    {
      id: "room-inventory-check",
      title: "Room inventory",
      category: "logistics",
      description:
        "Update what she has, what she needs, what is stored at home, and what should travel back to school.",
      normalIntervalDays: 60,
      maxGapDays: 90,
      lastCompletedAt: daysAgo(66),
      status: "due",
    },
    {
      id: "travel-home-plan",
      title: "Plan travel home or Viper visit",
      category: "travel",
      description:
        "Plan travel around deadlines, transportation, packing, recovery time, and Viper visit hopes.",
      normalIntervalDays: 60,
      maxGapDays: 90,
      lastCompletedAt: daysAgo(61),
      status: "due",
    },
    {
      id: "social-belonging-check",
      title: "Try one social connection",
      category: "social",
      description:
        "Pick one low-pressure event, Key LLC activity, club, or community connection to try this week.",
      normalIntervalDays: 7,
      maxGapDays: 14,
      lastCompletedAt: daysAgo(9),
      status: "due",
    },
    {
      id: "help-script-check",
      title: "Draft one help message",
      category: "communications",
      description:
        "Use a plain-language script for a professor, RA, SDC, supervisor, caregiver, or support person when stuck.",
      normalIntervalDays: 14,
      maxGapDays: 30,
      lastCompletedAt: daysAgo(16),
      status: "due",
    },
    {
      id: "social-decoder-review",
      title: "Decode one confusing message",
      category: "social",
      description:
        "Use the Social Decoder on a text or email that feels unclear before replying or ignoring it.",
      normalIntervalDays: 7,
      maxGapDays: 14,
      lastCompletedAt: daysAgo(8),
      status: "due",
    },
    {
      id: "request-atrc-meeting",
      title: "Request ATRC meeting",
      category: "school",
      description:
        "Follow up on the assistive technology referral before assignments get busy.",
      normalIntervalDays: 7,
      maxGapDays: 14,
      lastCompletedAt: daysAgo(8),
      status: "due",
    },
    {
      id: "send-accommodation-letters",
      title: "Send accommodation letters",
      category: "school",
      description:
        "Send letters through the SDC portal early so support is ready before it is needed.",
      normalIntervalDays: 120,
      maxGapDays: 150,
      lastCompletedAt: daysAgo(130),
      status: "due",
    },
    {
      id: "review-sdc-eligibilities",
      title: "Review SDC eligibilities",
      category: "school",
      description:
        "Check My Eligibilities in the SDC portal and make sure the support system reflects current approved accommodations.",
      normalIntervalDays: 120,
      maxGapDays: 150,
      lastCompletedAt: daysAgo(118),
      status: "ok",
    },
    {
      id: "check-sdc-email",
      title: "Check SDC email",
      category: "school",
      description:
        "Look for SDC messages in CSU email and respond quickly when action is needed.",
      normalIntervalDays: 7,
      maxGapDays: 14,
      lastCompletedAt: daysAgo(10),
      status: "due",
    },
    {
      id: "schedule-sdc-exams",
      title: "Schedule accommodated exams",
      category: "school",
      description:
        "Use the SDC portal when accommodation letters and exam dates are available. Regular exams need 7 days notice; finals need 1 month.",
      normalIntervalDays: 14,
      maxGapDays: 30,
      lastCompletedAt: daysAgo(16),
      status: "due",
    },
    {
      id: "confirm-housing-accommodation",
      title: "Confirm housing accommodation",
      category: "housing",
      description:
        "Single room in a suite is approved. Confirm whether SDC or Housing needs annual follow-up before room selection or renewal.",
      normalIntervalDays: 180,
      maxGapDays: 365,
      lastCompletedAt: daysAgo(210),
      status: "due",
    },
    {
      id: "community-interest-alerts",
      title: "Set community interest alerts",
      category: "communications",
      description:
        "Watch CSU email, campus announcements, and cultural center updates for Black Student Union and Delta Sigma Theta opportunities.",
      normalIntervalDays: 14,
      maxGapDays: 30,
      lastCompletedAt: daysAgo(18),
      status: "due",
    },
    {
      id: "monthly-app-maintenance",
      title: "Monthly app maintenance",
      category: "admin",
      description:
        "Check Canvas import, email drafting, Plaid balances, overdue tasks, broken links, and whether the dashboard feels too noisy.",
      normalIntervalDays: 30,
      maxGapDays: 45,
      lastCompletedAt: daysAgo(33),
      status: "due",
    },
    {
      id: "semester-reset-review",
      title: "Semester reset review",
      category: "admin",
      description:
        "Before each term, refresh classes, syllabi, accommodation letters, exam dates, housing, parking, food, and campus routines.",
      normalIntervalDays: 120,
      maxGapDays: 150,
      lastCompletedAt: daysAgo(125),
      status: "due",
    },
    {
      id: "biannual-agent-review",
      title: "Biannual agent review",
      category: "admin",
      description:
        "Review privacy, security, stale content, integrations, app complexity, and whether Ask JoJo is answering from the right places.",
      normalIntervalDays: 180,
      maxGapDays: 210,
      lastCompletedAt: daysAgo(181),
      status: "due",
    },
    {
      id: "annual-production-review",
      title: "Annual production review",
      category: "admin",
      description:
        "Rotate old tokens, verify backups, review OAuth/Plaid/Supabase settings, confirm costs, and re-confirm connected-service consent.",
      normalIntervalDays: 365,
      maxGapDays: 395,
      lastCompletedAt: daysAgo(366),
      status: "due",
    },
    {
      id: "caregiver-check-in",
      title: "Caregiver check-in",
      category: "admin",
      description:
        "Do a consent-based support check-in: what helped, what is noisy, what feels stuck, and what should be simplified.",
      normalIntervalDays: 14,
      maxGapDays: 30,
      lastCompletedAt: daysAgo(15),
      status: "due",
    },
  ];
}

function addMissingStarterTasks(currentTasks: SupportTask[]) {
  const existingIds = new Set(currentTasks.map((task) => task.id));
  const missingStarterTasks = createStarterTasks().filter(
    (task) => !existingIds.has(task.id),
  );

  return [...currentTasks, ...missingStarterTasks];
}

function createInitialHistory(): HistoryEntry[] {
  return [
    {
      id: "initial-shower",
      taskId: "shower",
      taskTitle: "Scrub It!",
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

function formatCurrency(value: number | null, currencyCode: string | null) {
  if (value === null) return "Not available";

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode ?? "USD",
  }).format(value);
}

function statusLabel(status: TaskStatus) {
  return {
    ok: "On track",
    due: "Ready",
    snoozed: "Snoozed",
    needs_help: "Needs help",
    escalated: "Backup check",
  }[status];
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

function normalizeTaskCategory(category: string): TaskCategory {
  if (category === "hygiene") return "health";
  if (
    category === "school" ||
    category === "communications" ||
    category === "financial" ||
    category === "housing" ||
    category === "food" ||
    category === "vehicle" ||
    category === "work" ||
    category === "medical" ||
    category === "emergency" ||
    category === "logistics" ||
    category === "calendar" ||
    category === "documents" ||
    category === "travel" ||
    category === "social" ||
    category === "admin" ||
    category === "health" ||
    category === "life"
  ) {
    return category;
  }

  return "health";
}

function categoryLabel(category: TaskCategory) {
  return {
    school: "School",
    communications: "Communications",
    financial: "Financial",
    housing: "Housing",
    food: "Food",
    vehicle: "Vehicle",
    work: "Work",
    medical: "Medical",
    emergency: "Emergency",
    logistics: "Logistics",
    calendar: "Calendar",
    documents: "Documents",
    travel: "Travel",
    social: "Social",
    admin: "Admin",
    health: "Health",
    life: "Life",
  }[category];
}

function taskFromRow(row: TaskRow): SupportTask {
  return {
    id: row.id,
    title: row.title,
    category: normalizeTaskCategory(row.category),
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
    category: normalizeTaskCategory(task.category),
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

function emailDraftFromRow(row: EmailDraftRow): EmailDraft {
  return {
    id: row.id,
    source: row.source,
    recipientEmail: row.recipient_email,
    subject: row.subject,
    body: row.body,
    status: row.status,
    createdByAgent: row.created_by_agent,
    updatedAt: row.updated_at,
  };
}

function housingDocumentFromRow(row: HousingDocumentRow): HousingDocument {
  return {
    id: row.id,
    title: row.title,
    documentType: row.document_type,
    status: row.status,
    storagePath: row.storage_path,
    fileUrl: row.file_url,
    importantDate: row.important_date,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

function financialAccountFromRow(row: FinancialAccountRow): FinancialAccount {
  return {
    plaidAccountId: row.plaid_account_id,
    name: row.name,
    officialName: row.official_name,
    mask: row.mask,
    accountType: row.account_type,
    accountSubtype: row.account_subtype,
    availableBalance: row.available_balance,
    currentBalance: row.current_balance,
    isoCurrencyCode: row.iso_currency_code,
    updatedAt: row.updated_at,
  };
}

function schoolYearExpiration() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  date.setHours(23, 59, 59, 999);
  return date.toISOString().slice(0, 10);
}

export default function Home() {
  const [tasks, setTasks] = useState(createStarterTasks);
  const [history, setHistory] = useState(createInitialHistory);
  const [assignments, setAssignments] = useState<SchoolAssignment[]>([]);
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([]);
  const [housingDocuments, setHousingDocuments] = useState<HousingDocument[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [syncMessage, setSyncMessage] = useState("Checking your saved setup...");
  const [passkeyStatus, setPasskeyStatus] = useState(
    "This MacBook can become the primary access device after one secure email sign-in.",
  );
  const [isPasskeySubmitting, setIsPasskeySubmitting] = useState(false);
  const [canvasBaseUrl, setCanvasBaseUrl] = useState(defaultCanvasBaseUrl);
  const [canvasAccessToken, setCanvasAccessToken] = useState("");
  const [canvasTokenExpiresAt, setCanvasTokenExpiresAt] = useState(schoolYearExpiration);
  const [canvasConnection, setCanvasConnection] = useState<CanvasConnection | null>(null);
  const [canvasMessage, setCanvasMessage] = useState(
    "Canvas is ready when you are. Save it once, then pull assignments without doing the setup again.",
  );
  const [isCanvasImporting, setIsCanvasImporting] = useState(false);
  const [isCanvasConnectionSaving, setIsCanvasConnectionSaving] = useState(false);
  const [roomResetMessage, setRoomResetMessage] = useState(
    "After the room reset, JoJo will ask what needs to be added to the Amazon list.",
  );
  const [askJojoQuestion, setAskJojoQuestion] = useState("");
  const [safetyModeration, setSafetyModeration] =
    useState<SafetyModerationState | null>(null);
  const [safetyModerationMessage, setSafetyModerationMessage] = useState(
    "Safety checks use a local trigger list plus OpenAI moderation when configured.",
  );

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
          if (Array.isArray(parsedState.tasks)) {
            setTasks(
              addMissingStarterTasks(
                parsedState.tasks.map((task: SupportTask) => ({
                  ...task,
                  category: normalizeTaskCategory(task.category),
                })),
              ),
            );
          }
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
      setSyncMessage("Loading your dashboard...");
      window.localStorage.removeItem(storageKey);

      const { error: profileError } = await supabase!.from("profiles").upsert({
        id: activeUserId,
        email: session?.user.email ?? null,
        display_name: session?.user.email?.split("@")[0] ?? "Josephine",
      });

      if (profileError && !ignore) {
        setSyncStatus("error");
        setSyncMessage("Sign-in works. The database setup still needs one update.");
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
        const currentTasks = savedTasks.map(taskFromRow);
        const nextTasks = addMissingStarterTasks(currentTasks);
        const currentTaskIds = new Set(currentTasks.map((task) => task.id));
        const missingTasks = nextTasks.filter((task) => !currentTaskIds.has(task.id));

        setTasks(nextTasks);

        if (missingTasks.length > 0) {
          await supabase!
            .from("support_tasks")
            .upsert(missingTasks.map((task) => taskToRow(task, activeUserId)));
        }
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

      const { data: savedEmailDrafts } = await supabase!
          .from("school_email_drafts")
          .select("id,source,recipient_email,subject,body,status,created_by_agent,updated_at")
          .order("updated_at", { ascending: false })
          .limit(5);

      if (!ignore && savedEmailDrafts) {
        setEmailDrafts(savedEmailDrafts.map((row) => emailDraftFromRow(row as EmailDraftRow)));
      }

      const { data: savedHousingDocuments } = await supabase!
          .from("housing_documents")
          .select("id,title,document_type,status,storage_path,file_url,important_date,notes,updated_at")
          .order("important_date", { ascending: true, nullsFirst: false })
          .limit(10);

      if (!ignore && savedHousingDocuments) {
        setHousingDocuments(
          savedHousingDocuments.map((row) =>
            housingDocumentFromRow(row as HousingDocumentRow),
          ),
        );
      }

      const { data: savedFinancialAccounts } = await supabase!
          .from("financial_accounts")
          .select("plaid_account_id,name,official_name,mask,account_type,account_subtype,available_balance,current_balance,iso_currency_code,updated_at")
          .order("updated_at", { ascending: false });

      if (!ignore && savedFinancialAccounts) {
        setFinancialAccounts(
          savedFinancialAccounts.map((row) =>
            financialAccountFromRow(row as FinancialAccountRow),
          ),
        );
      }

      const { data: savedCanvasConnection, error: canvasConnectionError } =
        await supabase!
          .from("canvas_connections")
          .select("canvas_base_url,expires_at,last_imported_at,updated_at")
          .eq("user_id", activeUserId)
          .maybeSingle();

      if (!ignore && canvasConnectionError) {
        setCanvasMessage("Canvas saved connection needs the latest Supabase schema.");
      }

      if (!ignore && !canvasConnectionError) {
        const connection = savedCanvasConnection as CanvasConnectionStatusRow | null;
        setCanvasConnection({
          connected: Boolean(connection),
          canvasBaseUrl: connection?.canvas_base_url ?? null,
          expiresAt: connection?.expires_at ?? null,
          lastImportedAt: connection?.last_imported_at ?? null,
          updatedAt: connection?.updated_at ?? null,
        });
        if (connection?.canvas_base_url) setCanvasBaseUrl(connection.canvas_base_url);
        if (connection?.expires_at) setCanvasTokenExpiresAt(connection.expires_at.slice(0, 10));
      }

      setSyncStatus("supabase");
      setSyncMessage("Saved.");
    }

    loadUserData();

    return () => {
      ignore = true;
    };
  }, [authReady, session?.user.email, userId]);

  const getCurrentAppAccessToken = useCallback(async () => {
    if (!supabase) return null;

    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    return currentSession?.access_token ?? null;
  }, []);

  const loadCanvasConnection = useCallback(async () => {
    const appAccessToken = await getCurrentAppAccessToken();
    if (!appAccessToken) return;

    const response = await fetch("/api/canvas/connection", {
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
      },
    });

    const payload = (await response.json()) as CanvasConnection & {
      error?: string;
    };

    if (!response.ok) {
      setCanvasMessage(payload.error ?? "Canvas connection status could not be loaded.");
      return;
    }

    setCanvasConnection(payload);
    if (payload.canvasBaseUrl) setCanvasBaseUrl(payload.canvasBaseUrl);
    if (payload.expiresAt) setCanvasTokenExpiresAt(payload.expiresAt.slice(0, 10));
  }, [getCurrentAppAccessToken]);

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
      setSyncMessage("Saved here. Cloud sync needs a quick look.");
      return;
    }

    setSyncStatus("supabase");
    setSyncMessage("Saved.");
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
      setSyncMessage("Saved here. Cloud sync needs a quick look.");
      return;
    }

    setSyncStatus("supabase");
    setSyncMessage("Saved.");
  }

  useEffect(() => {
    const trimmedQuestion = askJojoQuestion.trim();

    if (!trimmedQuestion) {
      const timeoutId = window.setTimeout(() => {
        setSafetyModeration(null);
        setSafetyModerationMessage(
          "Safety checks use a local trigger list plus OpenAI moderation when configured.",
        );
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    if (hasSafetyAlertSignal(trimmedQuestion)) {
      const timeoutId = window.setTimeout(() => {
        setSafetyModeration(null);
        setSafetyModerationMessage("Local safety trigger matched.");
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const appAccessToken = await getCurrentAppAccessToken();

        if (isSupabaseConfigured && !appAccessToken) {
          setSafetyModeration(null);
          setSafetyModerationMessage("Sign in before OpenAI safety moderation runs.");
          return;
        }

        try {
          const response = await fetch("/api/safety/moderate", {
            method: "POST",
            headers: {
              ...(appAccessToken
                ? { Authorization: `Bearer ${appAccessToken}` }
                : {}),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: trimmedQuestion }),
            signal: controller.signal,
          });

          const payload = (await response.json()) as {
            safetyAlert?: boolean;
            matchedCategory?: string | null;
            confidenceLevel?: string;
            threshold?: number;
            enabled?: boolean;
            error?: string;
            reason?: string;
          };

          if (!response.ok || payload.enabled === false) {
            setSafetyModeration(null);
            setSafetyModerationMessage(
              payload.error ??
                payload.reason ??
                "OpenAI safety moderation is not configured.",
            );
            return;
          }

          setSafetyModeration({
            safetyAlert: Boolean(payload.safetyAlert),
            source: "openai_moderation",
            matchedCategory: payload.matchedCategory ?? null,
            confidenceLevel: payload.confidenceLevel ?? "medium",
            threshold: payload.threshold ?? 0.35,
          });
          setSafetyModerationMessage(
            payload.safetyAlert
              ? `OpenAI moderation matched ${payload.matchedCategory ?? "a self-harm category"} at ${payload.confidenceLevel ?? "medium"} confidence.`
              : `OpenAI moderation checked at ${payload.confidenceLevel ?? "medium"} confidence.`,
          );
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;

          setSafetyModeration(null);
          setSafetyModerationMessage("OpenAI safety moderation could not be reached.");
        }
      })();
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [askJojoQuestion, getCurrentAppAccessToken]);

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

  const dailyAffirmation = getDailyAffirmation(new Date());

  const askJojoSources = useMemo<AskJojoSource[]>(() => {
    const moduleSources = supportModules.flatMap((supportModule) => [
      {
        title: supportModule.title,
        category: supportModule.eyebrow,
        text: supportModule.summary,
        href: `/support/${supportModule.slug}`,
        priority: 1,
      },
      ...supportModule.sections.map((section) => ({
        title: `${supportModule.title}: ${section.title}`,
        category: supportModule.eyebrow,
        text: section.items.join(" "),
        href: `/support/${supportModule.slug}`,
        priority: 2,
      })),
    ]);

    const taskSources = tasks.map((task) => {
      const schedule = getTaskSchedule(task);
      return {
        title: `Task: ${task.title}`,
        category: categoryLabel(task.category),
        text: `${task.description} Status: ${statusLabel(schedule.status)}. Comes back ${formatDate(schedule.nextDueAt)}. Backup check ${formatDate(schedule.escalateAfterAt)}.`,
        priority: schedule.status === "escalated" ? 4 : schedule.status === "due" ? 3 : 1,
      };
    });

    const assignmentSources = assignments.map((assignment) => ({
      title: `Assignment: ${assignment.title}`,
      category: "Canvas",
      text: `${assignment.courseName}. ${
        assignment.dueAt
          ? `Due ${formatDateTime(assignment.dueAt)}.`
          : "No due date listed."
      } ${assignment.pointsPossible ? `${assignment.pointsPossible} points.` : ""}`,
      href: assignment.url ?? undefined,
      priority: 5,
    }));

    const emailSources = emailDrafts.map((draft) => ({
      title: `Draft: ${draft.subject}`,
      category: draft.source === "google_gmail" ? "Gmail" : "CSU email",
      text: `Draft status: ${draft.status}. To ${draft.recipientEmail ?? "sender"}. ${draft.body}`,
      priority: 4,
    }));

    const housingSources = housingDocuments.map((document) => ({
      title: `Housing doc: ${document.title}`,
      category: "Housing",
      text: `${document.documentType}. Status: ${document.status}. ${
        document.importantDate ? `Important date: ${formatDate(new Date(document.importantDate))}.` : ""
      } ${document.notes ?? ""}`,
      href: document.fileUrl ?? undefined,
      priority: 3,
    }));

    const financialSources = financialAccounts.map((account) => ({
      title: `Money: ${account.name}`,
      category: "Financial",
      text: `${account.officialName ?? account.name}. Available balance: ${formatCurrency(account.availableBalance, account.isoCurrencyCode)}. Current balance: ${formatCurrency(account.currentBalance, account.isoCurrencyCode)}. Read-only balance view.`,
      priority: 4,
    }));

    return [
      {
        title: "Today's affirmation",
        category: "Encouragement",
        text: dailyAffirmation,
        priority: 3,
      },
      ...assignmentSources,
      ...taskSources,
      ...emailSources,
      ...housingSources,
      ...financialSources,
      ...moduleSources,
    ];
  }, [
    assignments,
    dailyAffirmation,
    emailDrafts,
    financialAccounts,
    housingDocuments,
    tasks,
  ]);

  const askJojoAnswer = useMemo(
    () => answerAskJojo(askJojoQuestion, askJojoSources, safetyModeration),
    [askJojoQuestion, askJojoSources, safetyModeration],
  );

  const upcomingAssignments = useMemo(
    () =>
      [...assignments]
        .filter((assignment) => assignment.dueAt)
        .sort(
          (first, second) =>
            new Date(first.dueAt ?? 0).getTime() -
            new Date(second.dueAt ?? 0).getTime(),
        )
        .slice(0, 5),
    [assignments],
  );

  const datedHousingDocuments = useMemo(
    () =>
      [...housingDocuments]
        .filter((document) => document.importantDate)
        .sort(
          (first, second) =>
            new Date(first.importantDate ?? 0).getTime() -
            new Date(second.importantDate ?? 0).getTime(),
        )
        .slice(0, 3),
    [housingDocuments],
  );

  const deadlineTasks = useMemo(
    () =>
      tasks
        .map((task) => ({ task, schedule: getTaskSchedule(task) }))
        .filter(({ schedule }) => schedule.status !== "ok")
        .sort(
          (first, second) =>
            first.schedule.nextDueAt.getTime() -
            second.schedule.nextDueAt.getTime(),
        ),
    [tasks],
  );

  const communicationDeadlineTasks = useMemo(
    () =>
      deadlineTasks
        .filter(({ task }) => task.category === "communications")
        .slice(0, 4),
    [deadlineTasks],
  );

  const schoolDeadlineTasks = useMemo(
    () =>
      deadlineTasks
        .filter(({ task }) => task.category === "school")
        .slice(0, 4),
    [deadlineTasks],
  );

  const workDeadlineTasks = useMemo(
    () =>
      deadlineTasks
        .filter(({ task }) => task.category === "work")
        .slice(0, 4),
    [deadlineTasks],
  );

  const adultingDeadlineTasks = useMemo(
    () =>
      deadlineTasks
        .filter(
          ({ task }) =>
            task.category !== "communications" &&
            task.category !== "school" &&
            task.category !== "work" &&
            task.category !== "admin",
        )
        .slice(0, 5),
    [deadlineTasks],
  );

  const communicationsDeadlineCount =
    communicationDeadlineTasks.length + emailDrafts.length;
  const schoolDeadlineCount =
    schoolDeadlineTasks.length + upcomingAssignments.length;
  const workDeadlineCount = workDeadlineTasks.length;
  const adultingDeadlineCount =
    adultingDeadlineTasks.length + datedHousingDocuments.length;

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

    if (taskId === "weekly-room-reset") {
      if (type === "done" || type === "already_did_it") {
        setRoomResetMessage(
          "Room reset logged. Quick supply check: does anything need to be added to the Amazon list before the week gets busy?",
        );
      } else if (type === "need_help") {
        setRoomResetMessage(
          "Room reset needs backup. Ask for help with one small part first: trash, laundry, desk, floor, or supplies.",
        );
      } else if (type === "snooze") {
        setRoomResetMessage(
          "Room reset snoozed. Pick the smallest version later: trash out, laundry gathered, or one surface cleared.",
        );
      }
    }

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
      description: `Comes back ${normalIntervalDays} day(s) after it is done. Backup check at ${maxGapDays} day(s).`,
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
      setSyncMessage("Reset here. Cloud sync needs a quick look.");
      return;
    }

    setSyncStatus("supabase");
    setSyncMessage("Saved.");
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

  async function importCanvasAssignments(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!supabase || !userId) {
      setCanvasMessage("Sign in before importing Canvas assignments.");
      return;
    }

    const trimmedBaseUrl = canvasBaseUrl.trim();
    const trimmedToken = canvasAccessToken.trim();
    const hasSavedConnection = Boolean(canvasConnection?.connected);

    if (!trimmedBaseUrl || (!trimmedToken && !hasSavedConnection)) {
      setCanvasMessage("Save a Canvas token once, or enter one for this import.");
      return;
    }

    setIsCanvasImporting(true);
    setCanvasMessage(
      trimmedToken
        ? "Saving Canvas connection and importing assignments..."
        : "Importing upcoming Canvas assignments with the saved connection...",
    );

    const appAccessToken = await getCurrentAppAccessToken();

    if (!appAccessToken) {
      setIsCanvasImporting(false);
      setCanvasMessage("App session expired. Sign in again before importing Canvas.");
      return;
    }

    if (trimmedToken) {
      const saveResponse = await fetch("/api/canvas/connection", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          canvasBaseUrl: trimmedBaseUrl,
          canvasAccessToken: trimmedToken,
          expiresAt: canvasTokenExpiresAt,
        }),
      });

      const savePayload = (await saveResponse.json()) as CanvasConnection & {
        error?: string;
      };

      if (!saveResponse.ok) {
        setIsCanvasImporting(false);
        setCanvasMessage(savePayload.error ?? "Canvas connection could not be saved.");
        return;
      }

      setCanvasConnection(savePayload);
      setCanvasAccessToken("");
    }

    const savedUntil = trimmedToken
      ? canvasTokenExpiresAt
      : (canvasConnection?.expiresAt?.slice(0, 10) ?? canvasTokenExpiresAt);

    const response = await fetch("/api/canvas/import", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        canvasBaseUrl: trimmedBaseUrl,
      }),
    });

    const payload = (await response.json()) as {
      imported?: number;
      coursesChecked?: number;
      usedSavedConnection?: boolean;
      error?: string;
    };

    setIsCanvasImporting(false);

    if (!response.ok) {
      setCanvasMessage(payload.error ?? "Canvas import failed.");
      return;
    }

    setCanvasAccessToken("");
    setCanvasMessage(
      `Imported ${payload.imported ?? 0} assignments from ${payload.coursesChecked ?? 0} Canvas courses. Canvas connection is saved until ${formatDate(new Date(savedUntil))}.`,
    );
    await loadCanvasConnection();
    await refreshAssignments();
  }

  async function saveCanvasConnection() {
    if (!supabase || !userId) {
      setCanvasMessage("Sign in before saving Canvas.");
      return;
    }

    const trimmedBaseUrl = canvasBaseUrl.trim();
    const trimmedToken = canvasAccessToken.trim();

    if (!trimmedBaseUrl || !trimmedToken) {
      setCanvasMessage("Enter the Canvas URL and token before saving.");
      return;
    }

    const appAccessToken = await getCurrentAppAccessToken();
    if (!appAccessToken) {
      setCanvasMessage("App session expired. Sign in again before saving Canvas.");
      return;
    }

    setIsCanvasConnectionSaving(true);
    setCanvasMessage("Saving encrypted Canvas connection...");

    const response = await fetch("/api/canvas/connection", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        canvasBaseUrl: trimmedBaseUrl,
        canvasAccessToken: trimmedToken,
        expiresAt: canvasTokenExpiresAt,
      }),
    });

    const payload = (await response.json()) as CanvasConnection & {
      error?: string;
    };

    setIsCanvasConnectionSaving(false);

    if (!response.ok) {
      setCanvasMessage(payload.error ?? "Canvas connection could not be saved.");
      return;
    }

    setCanvasConnection(payload);
    setCanvasAccessToken("");
    setCanvasMessage(
      `Canvas connection saved until ${formatDate(new Date(payload.expiresAt ?? canvasTokenExpiresAt))}.`,
    );
  }

  async function revokeCanvasConnection() {
    if (!window.confirm("Remove the saved Canvas connection from this app?")) {
      return;
    }

    const appAccessToken = await getCurrentAppAccessToken();
    if (!appAccessToken) {
      setCanvasMessage("App session expired. Sign in again before removing Canvas.");
      return;
    }

    const response = await fetch("/api/canvas/connection", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
      },
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setCanvasMessage(payload.error ?? "Canvas connection could not be removed.");
      return;
    }

    setCanvasConnection({
      connected: false,
      canvasBaseUrl: null,
      expiresAt: null,
      lastImportedAt: null,
      updatedAt: null,
    });
    setCanvasMessage("Saved Canvas connection removed.");
  }

  if (isSupabaseConfigured && !authReady) {
    return <LoadingScreen />;
  }

  if (isSupabaseConfigured && !session) {
    return <AuthGate />;
  }

  return (
    <main className="min-h-screen bg-stone-100 text-stone-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="grid gap-4 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-teal-800">
              My Campus Hub
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
                    This MacBook
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
            label="Backup checks"
            danger
          />
          <SummaryMetric value={history.length} label="Did it" />
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
                    ? "Needs setup"
                    : "Local mode"}
          </span>
          <span className="ml-2">{syncMessage}</span>
        </section>

        <section className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-amber-900">
            Today&apos;s affirmation
          </p>
          <p className="mt-2 text-xl font-bold leading-snug text-stone-950">
            {dailyAffirmation}
          </p>
        </section>

        <section className="rounded-lg border border-teal-700 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <p className="text-xs font-bold uppercase text-teal-800">
                Agent helper
              </p>
              <h2 className="mt-1 text-3xl font-black">Ask JoJo</h2>
              <p className="mt-2 text-sm text-stone-600">
                Ask one plain-language question and JoJo will look across the
                app: tasks, Canvas, messages, money, housing, support pages, and
                safety notes.
              </p>
              <label className="mt-4 block text-sm font-semibold text-stone-700">
                What do you need help finding?
                <input
                  className="mt-2 min-h-12 w-full rounded-md border border-stone-300 px-3 text-base font-normal"
                  value={askJojoQuestion}
                  onChange={(event) => setAskJojoQuestion(event.target.value)}
                  placeholder="Ask JoJo about SDC tests, assignments, food, money, emails..."
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "What is due soon?",
                  "How do I schedule an SDC test?",
                  "What if an email feels confusing?",
                ].map((question) => (
                  <button
                    className="min-h-9 rounded-md border border-teal-700 px-3 text-sm font-semibold text-teal-800 hover:bg-teal-50"
                    key={question}
                    type="button"
                    onClick={() => setAskJojoQuestion(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
              <strong className="text-sm text-stone-950">JoJo says</strong>
              <p className="mt-2 text-sm text-stone-700">{askJojoAnswer.intro}</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-stone-700">
                {askJojoAnswer.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
              <div className="mt-4 border-t border-stone-200 pt-3">
                <span className="text-xs font-bold uppercase text-stone-500">
                  Pulled from
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {askJojoAnswer.sources.slice(0, 5).map((source) =>
                    source.href ? (
                      <a
                        className="inline-flex min-h-8 items-center rounded-md bg-white px-3 text-xs font-semibold text-teal-800 ring-1 ring-stone-200 hover:bg-teal-50"
                        href={source.href}
                        key={`${source.title}-${source.href}`}
                        target={source.href.startsWith("http") ? "_blank" : undefined}
                        rel={source.href.startsWith("http") ? "noreferrer" : undefined}
                      >
                        {source.title}
                      </a>
                    ) : (
                      <span
                        className="inline-flex min-h-8 items-center rounded-md bg-white px-3 text-xs font-semibold text-stone-700 ring-1 ring-stone-200"
                        key={source.title}
                      >
                        {source.title}
                      </span>
                    ),
                  )}
                </div>
              </div>
              <p className="mt-3 text-xs text-stone-500">
                JoJo only answers from information already in this app. It does
                not send messages, change accounts, or contact anyone.
              </p>
              <p className="mt-2 text-xs text-stone-500">
                {safetyModerationMessage}
              </p>
            </div>
          </div>
          <nav
            className="mt-5 border-t border-stone-200 pt-4"
            aria-label="Dashboard jump links"
          >
            <span className="text-xs font-bold uppercase text-stone-500">
              Jump to
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {dashboardJumpLinks.map((link) => (
                <a
                  className="inline-flex min-h-9 items-center rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800"
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </nav>
        </section>

        <section
          className="scroll-mt-6 rounded-lg border border-stone-300 bg-white p-5 shadow-sm"
          id="page-bookmarks"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">All Pages</h2>
              <p className="mt-1 text-sm text-stone-600">
                These are bookmarks to the full support pages. They are links
                only, so the dashboard stays focused on deadlines.
              </p>
            </div>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
              Bookmarks
            </span>
          </div>
          <nav
            className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Full support pages"
          >
            {supportPageShortcuts.map((shortcut) => (
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-teal-700 bg-white px-3 text-sm font-semibold text-teal-800 hover:bg-teal-50"
                href={shortcut.href}
                key={shortcut.href}
              >
                {shortcut.label}
              </Link>
            ))}
          </nav>
        </section>

        <section
          className="scroll-mt-6 rounded-lg border border-stone-300 bg-white p-3"
          id="add-task"
        >
          <form
            className="grid gap-2 lg:grid-cols-[1fr_150px_100px_100px_80px]"
            onSubmit={addTask}
          >
            <input
              className="min-h-10 rounded-md border border-stone-300 px-3"
              name="title"
              placeholder="Add something to remember"
              required
            />
            <select
              className="min-h-10 rounded-md border border-stone-300 px-3"
              name="category"
              aria-label="Task category"
              defaultValue="health"
            >
              <option value="health">Health & Wellness</option>
              <option value="school">School</option>
              <option value="communications">Communications</option>
              <option value="financial">Financial</option>
              <option value="housing">Housing</option>
              <option value="food">Food</option>
              <option value="vehicle">Vehicle</option>
              <option value="work">Work</option>
              <option value="medical">Medical</option>
              <option value="emergency">Emergency</option>
              <option value="logistics">Logistics</option>
              <option value="calendar">Calendar</option>
              <option value="documents">Documents</option>
              <option value="travel">Travel</option>
              <option value="social">Social</option>
              <option value="admin">Admin</option>
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
              aria-label="Backup check interval in days"
            />
            <button
              className="min-h-10 rounded-md bg-teal-700 px-4 font-semibold text-white hover:bg-teal-800"
              type="submit"
            >
              Add
            </button>
          </form>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="scroll-mt-6" id="today-list">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Today&apos;s List</h2>
              <button
                className="min-h-10 rounded-md border border-stone-300 px-4 text-sm font-semibold text-teal-800 hover:bg-stone-200"
                type="button"
                onClick={resetDemoData}
              >
                Reset starter list
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
                          {categoryLabel(task.category)}
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
                      Comes back {formatDate(schedule.nextDueAt)} · backup check{" "}
                      {formatDate(schedule.escalateAfterAt)}
                    </p>

                    {task.id === "weekly-room-reset" ? (
                      <div className="mt-4 rounded-md border border-teal-100 bg-teal-50/70 p-3">
                        <strong className="text-sm text-teal-950">
                          After you clean
                        </strong>
                        <p className="mt-1 text-sm text-teal-950">
                          {roomResetMessage}
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <span className="text-xs font-bold uppercase text-teal-900">
                              Room check
                            </span>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
                              {roomResetItems.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="text-xs font-bold uppercase text-teal-900">
                              Supplies to scan
                            </span>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
                              {roomSupplyCheckItems.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                            <a
                              className="mt-3 inline-block text-sm font-semibold text-teal-800 hover:text-teal-950"
                              href={amazonDormSuppliesUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open Amazon search
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : null}

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

          <aside
            className="grid scroll-mt-6 content-start gap-4 md:grid-cols-2"
            id="deadline-watch"
          >
            <div className="md:col-span-2">
              <h2 className="text-lg font-bold">Deadline Watch</h2>
              <p className="mt-1 text-sm text-stone-600">
                Only dated things live here. Everything else is on its full
                support page.
              </p>
            </div>

            <DashboardModuleCard
              id="communications-deadlines"
              title="Communications"
              summary="Email drafts, confusing messages, and communication tasks stay visible because replies can get urgent fast."
              href="/support/messages"
              badge={
                communicationsDeadlineCount > 0
                  ? `${communicationsDeadlineCount} pressing`
                  : "always pressing"
              }
            >
              <DeadlineTaskList
                items={communicationDeadlineTasks}
                emptyMessage="No communication tasks are due right now."
              />
              {emailDrafts.length > 0 ? (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                  <strong className="block">Drafts waiting</strong>
                  <p className="mt-1">
                    {emailDrafts.length} draft
                    {emailDrafts.length === 1 ? "" : "s"} need review before
                    sending.
                  </p>
                  <ol className="mt-2 grid gap-1">
                    {emailDrafts.slice(0, 2).map((draft) => (
                      <li key={draft.id}>{draft.subject}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </DashboardModuleCard>

            <DashboardModuleCard
              id="school-help"
              title="School Deadlines"
              summary="Canvas due dates and assignment import stay visible because they drive the daily task flow."
              href="/support/school"
              badge={`${schoolDeadlineCount} due`}
            >
              <DeadlineTaskList
                items={schoolDeadlineTasks}
                emptyMessage="No school support tasks are due right now."
              />
              <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
                <strong className="block text-stone-950">
                  {canvasConnection?.connected
                    ? "Canvas connected"
                    : "Canvas setup needed"}
                </strong>
                <span>
                  {canvasConnection?.lastImportedAt
                    ? `Last import ${formatDateTime(canvasConnection.lastImportedAt)}`
                    : "Use the setup drawer only when the token changes."}
                </span>
              </div>
              <button
                className="mt-3 min-h-10 w-full rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                type="button"
                onClick={() => {
                  void importCanvasAssignments();
                }}
                disabled={isCanvasImporting}
              >
                {isCanvasImporting ? "Importing" : "Import Assignments"}
              </button>
              {upcomingAssignments.length > 0 ? (
                <ol className="mt-4 grid gap-3">
                  {upcomingAssignments.map((assignment) => (
                    <li
                      className="rounded-md border border-stone-200 bg-stone-50 p-3"
                      key={assignment.id}
                    >
                      <strong className="block text-sm">{assignment.title}</strong>
                      <span className="mt-1 block text-xs text-stone-600">
                        {assignment.courseName}
                      </span>
                      <span className="mt-1 block text-xs font-bold text-teal-800">
                        Due {formatDateTime(assignment.dueAt ?? "")}
                      </span>
                      {assignment.url ? (
                        <a
                          className="mt-2 inline-block text-sm font-semibold text-teal-800 hover:text-teal-950"
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
                  No dated Canvas assignments are showing yet.
                </p>
              )}
              <details className="mt-3 rounded-md border border-stone-200 bg-white p-3">
                <summary className="cursor-pointer text-sm font-semibold text-teal-800">
                  Canvas setup
                </summary>
                <form className="mt-3 grid gap-3" onSubmit={importCanvasAssignments}>
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
                      placeholder={
                        canvasConnection?.connected
                          ? "Leave blank to use saved token"
                          : "Paste token to save"
                      }
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-stone-700">
                    Save until
                    <input
                      className="min-h-10 rounded-md border border-stone-300 px-3 font-normal"
                      value={canvasTokenExpiresAt}
                      onChange={(event) => setCanvasTokenExpiresAt(event.target.value)}
                      type="date"
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      className="min-h-10 rounded-md border border-teal-700 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
                      type="button"
                      onClick={saveCanvasConnection}
                      disabled={isCanvasConnectionSaving || !canvasAccessToken.trim()}
                    >
                      {isCanvasConnectionSaving ? "Saving" : "Save Canvas"}
                    </button>
                    <button
                      className="min-h-10 rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400"
                      type="button"
                      onClick={revokeCanvasConnection}
                      disabled={!canvasConnection?.connected}
                    >
                      Remove
                    </button>
                  </div>
                </form>
              </details>
              <p className="mt-3 text-sm text-stone-600">{canvasMessage}</p>
            </DashboardModuleCard>

            <DashboardModuleCard
              id="work-deadlines"
              title="Work Deadlines"
              summary="Job applications, shifts, onboarding, and paycheck dates can surface here when they become time-sensitive."
              href="/support/work"
              badge={`${workDeadlineCount} due`}
            >
              <DeadlineTaskList
                items={workDeadlineTasks}
                emptyMessage="No work deadlines are due right now."
              />
            </DashboardModuleCard>

            <DashboardModuleCard
              id="adulting-deadlines"
              title="Adulting"
              summary="Time-sensitive health, car, housing, money, food, campus, travel, and document items roll up here."
              href="/support/adulting"
              badge={`${adultingDeadlineCount} due`}
            >
              <DeadlineTaskList
                items={adultingDeadlineTasks}
                emptyMessage="No adulting deadlines are due right now."
              />
              {datedHousingDocuments.length > 0 ? (
                <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
                  <strong className="block text-sm">Housing dates</strong>
                  <ol className="mt-4 grid gap-3">
                    {datedHousingDocuments.map((document) => (
                      <li
                        className="rounded-md border border-stone-200 bg-white p-3"
                        key={document.id}
                      >
                        <strong className="block text-sm">
                          {document.title}
                        </strong>
                        <span className="mt-1 block text-xs capitalize text-stone-600">
                          {document.documentType.replace("_", " ")}
                        </span>
                        <span className="mt-1 block text-xs font-bold text-teal-800">
                          Date{" "}
                          {formatDate(new Date(document.importantDate ?? ""))}
                        </span>
                        {document.fileUrl ? (
                          <a
                            className="mt-2 inline-block text-sm font-semibold text-teal-800 hover:text-teal-950"
                            href={document.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open document
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </DashboardModuleCard>
          </aside>
        </section>
        <footer className="grid gap-3 pb-2 pt-4">
          <div className="flex justify-end gap-2">
            <Link
              className="rounded-md border border-stone-300 bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-500 hover:bg-white hover:text-stone-700"
              href="/support/did-it"
            >
              Did it
            </Link>
            <Link
              className="rounded-md border border-stone-300 bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-500 hover:bg-white hover:text-stone-700"
              href="/support/admin"
            >
              Caregiver/admin
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

function AuthGate() {
  const [email, setEmail] = useState(primaryAccessEmail);
  const [message, setMessage] = useState("Sign in to open Josephine's dashboard.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasskeySubmitting, setIsPasskeySubmitting] = useState(false);

  async function requestMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setIsSubmitting(true);
    setMessage("Sending secure sign-in link...");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin,
        },
      });

      setMessage(
        error
          ? error.message
          : "Check your email for a secure sign-in link, then return here.",
      );
    } catch (error) {
      setMessage(
        error instanceof TypeError
          ? authNetworkErrorMessage
          : "Sign-in failed. Check Supabase Auth settings and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signInWithPasskey() {
    setIsPasskeySubmitting(true);
    setMessage("Checking for a passkey on this device...");

    const { error } = await signInWithDevicePasskey(email.trim() || undefined);

    setIsPasskeySubmitting(false);
    setMessage(
      error?.message
        ? error.message
        : "Passkey accepted. Opening Josephine's dashboard...",
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4 text-stone-950">
      <section className="w-full max-w-md rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase text-teal-800">
          Josephine&apos;s Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-black">Sign in</h1>
        <p className="mt-2 text-stone-600">{message}</p>
        <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950">
          <strong className="block">MacBook-first access</strong>
          <span>
            Josephine&apos;s MacBook with Touch ID should be the easy way back in.
            Use the secure email link once, then set up a passkey here. School
            passwords are never stored.
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
        <p className="font-semibold">Opening Josephine&apos;s dashboard...</p>
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
