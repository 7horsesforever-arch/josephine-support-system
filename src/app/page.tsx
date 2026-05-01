"use client";

import type { Session } from "@supabase/supabase-js";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  isSupabaseConfigured,
  registerDevicePasskey,
  signInWithDevicePasskey,
  supabase,
} from "@/lib/supabase";

type TaskCategory =
  | "school"
  | "communications"
  | "financial"
  | "housing"
  | "food"
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

const dayMs = 24 * 60 * 60 * 1000;
const storageKey = "josephine-support-state-v1";
const primaryAccessEmail = "chilton18@gmail.com";
const devicePasskeyName = "Josephine MacBook Touch ID";
const defaultCanvasBaseUrl = "https://colostate.instructure.com";
const creditUnionUrl = process.env.NEXT_PUBLIC_CREDIT_UNION_URL?.trim() ?? "";
const diningHoursUrl = "https://housing.colostate.edu/dining/";
const grubhubCampusUrl = "https://www.grubhub.com/campus";
const authNetworkErrorMessage =
  "Could not reach Supabase Auth. Check NEXT_PUBLIC_SUPABASE_URL in .env.local, restart the dev server, then try again.";

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
    name: "Allison Café",
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
      category: "health",
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
      category: "health",
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
    {
      id: "money-bills-check",
      title: "Money and bills check",
      category: "financial",
      description:
        "Normal reminder 7 days after completion. Fail-safe at 14 days.",
      normalIntervalDays: 7,
      maxGapDays: 14,
      lastCompletedAt: daysAgo(6),
      status: "ok",
    },
    {
      id: "housing-documents-check",
      title: "Housing documents check",
      category: "housing",
      description:
        "Normal reminder 14 days after completion. Fail-safe at 30 days.",
      normalIntervalDays: 14,
      maxGapDays: 30,
      lastCompletedAt: daysAgo(10),
      status: "ok",
    },
    {
      id: "mini-fridge-restock",
      title: "Mini-fridge restock",
      category: "food",
      description:
        "Normal reminder 14 days after completion. Fail-safe at 21 days.",
      normalIntervalDays: 14,
      maxGapDays: 21,
      lastCompletedAt: daysAgo(12),
      status: "due",
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

function normalizeTaskCategory(category: string): TaskCategory {
  if (category === "hygiene") return "health";
  if (
    category === "school" ||
    category === "communications" ||
    category === "financial" ||
    category === "housing" ||
    category === "food" ||
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
  const [canvasTokenExpiresAt, setCanvasTokenExpiresAt] = useState(schoolYearExpiration);
  const [canvasConnection, setCanvasConnection] = useState<CanvasConnection | null>(null);
  const [canvasMessage, setCanvasMessage] = useState(
    "Canvas assignment import is ready. Save a Canvas API token once, then import without re-entering it.",
  );
  const [isCanvasImporting, setIsCanvasImporting] = useState(false);
  const [isCanvasConnectionSaving, setIsCanvasConnectionSaving] = useState(false);
  const [emailDraftMessage, setEmailDraftMessage] = useState(
    "Communications drafting agents will prepare replies for review after email is imported and triaged.",
  );
  const [isEmailDrafting, setIsEmailDrafting] = useState(false);
  const [housingMessage, setHousingMessage] = useState(
    "Housing documents will live in private storage with reminders for contracts, move-in steps, and renewal dates.",
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
              parsedState.tasks.map((task: SupportTask) => ({
                ...task,
                category: normalizeTaskCategory(task.category),
              })),
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

      const { data: savedEmailDrafts, error: emailDraftsError } =
        await supabase!
          .from("school_email_drafts")
          .select("id,source,recipient_email,subject,body,status,created_by_agent,updated_at")
          .order("updated_at", { ascending: false })
          .limit(5);

      if (!ignore && emailDraftsError) {
        setEmailDraftMessage("Email drafting needs the latest Supabase schema.");
      }

      if (!ignore && savedEmailDrafts) {
        setEmailDrafts(savedEmailDrafts.map((row) => emailDraftFromRow(row as EmailDraftRow)));
      }

      const { data: savedHousingDocuments, error: housingDocumentsError } =
        await supabase!
          .from("housing_documents")
          .select("id,title,document_type,status,storage_path,file_url,important_date,notes,updated_at")
          .order("important_date", { ascending: true, nullsFirst: false })
          .limit(10);

      if (!ignore && housingDocumentsError) {
        setHousingMessage("Housing documents need the latest Supabase schema.");
      }

      if (!ignore && savedHousingDocuments) {
        setHousingDocuments(
          savedHousingDocuments.map((row) =>
            housingDocumentFromRow(row as HousingDocumentRow),
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
      setSyncMessage("Private data saved to Supabase.");
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

  async function refreshEmailDrafts() {
    if (!supabase || !userId || syncStatus === "local" || syncStatus === "error") {
      return;
    }

    const { data, error } = await supabase
      .from("school_email_drafts")
      .select("id,source,recipient_email,subject,body,status,created_by_agent,updated_at")
      .order("updated_at", { ascending: false })
      .limit(5);

    if (error) {
      setEmailDraftMessage("Email drafts could not be refreshed from Supabase.");
      return;
    }

    setEmailDrafts((data ?? []).map((row) => emailDraftFromRow(row as EmailDraftRow)));
  }

  async function generateEmailDrafts() {
    if (!supabase || !userId) {
      setEmailDraftMessage("Sign in before generating email drafts.");
      return;
    }

    const appAccessToken = await getCurrentAppAccessToken();
    if (!appAccessToken) {
      setEmailDraftMessage("App session expired. Sign in again before drafting email.");
      return;
    }

    setIsEmailDrafting(true);
    setEmailDraftMessage("Drafting replies from triaged communications...");

    const response = await fetch("/api/email/drafts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit: 5 }),
    });

    const payload = (await response.json()) as {
      drafted?: number;
      drafts?: EmailDraftRow[];
      message?: string;
      error?: string;
    };

    setIsEmailDrafting(false);

    if (!response.ok) {
      setEmailDraftMessage(payload.error ?? "Email drafts could not be generated.");
      return;
    }

    if (payload.drafts) {
      setEmailDrafts(payload.drafts.map(emailDraftFromRow));
    } else {
      await refreshEmailDrafts();
    }

    setEmailDraftMessage(
      payload.message ??
        `Prepared ${payload.drafted ?? 0} email draft${payload.drafted === 1 ? "" : "s"} for review. Nothing was sent.`,
    );
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
              defaultValue="health"
            >
              <option value="health">Health</option>
              <option value="school">School</option>
              <option value="communications">Communications</option>
              <option value="financial">Financial</option>
              <option value="housing">Housing</option>
              <option value="food">Food</option>
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
                Save Canvas once for the semester or school year. The token is
                encrypted server-side, never saved in this browser, and can be
                removed here.
              </p>
              <div className="mt-3 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
                <strong className="block text-stone-950">
                  {canvasConnection?.connected
                    ? "Canvas is saved"
                    : "Canvas is not saved yet"}
                </strong>
                {canvasConnection?.connected ? (
                  <span>
                    Expires{" "}
                    {canvasConnection.expiresAt
                      ? formatDate(new Date(canvasConnection.expiresAt))
                      : "later"}
                    {canvasConnection.lastImportedAt
                      ? ` · Last import ${formatDateTime(canvasConnection.lastImportedAt)}`
                      : ""}
                  </span>
                ) : (
                  <span>
                    Paste a Canvas API token once, choose an expiration, then
                    save or import.
                  </span>
                )}
              </div>
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
                  Canvas API token {canvasConnection?.connected ? "(only to replace saved token)" : ""}
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
                    {isCanvasConnectionSaving ? "Saving" : "Save Connection"}
                  </button>
                  <button
                    className="min-h-10 rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400"
                    type="button"
                    onClick={revokeCanvasConnection}
                    disabled={!canvasConnection?.connected}
                  >
                    Remove Saved
                  </button>
                </div>
                <button
                  className="min-h-10 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                  type="submit"
                  disabled={isCanvasImporting}
                >
                  {isCanvasImporting
                    ? "Importing"
                    : canvasConnection?.connected && !canvasAccessToken.trim()
                      ? "Import With Saved Canvas"
                      : "Save And Import Assignments"}
                </button>
              </form>
              <p className="mt-3 text-xs text-stone-500">
                Canvas QR login is still only for the mobile app. This connection
                uses a Canvas API token and should be revoked in Canvas if the
                token is ever pasted somewhere unsafe.
              </p>
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Food</h2>
                  <p className="mt-2 text-sm text-stone-600">
                    Plan meals around Braiden, campus dining backups, robot
                    delivery, and a bi-weekly mini-fridge restock.
                  </p>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
                  Braiden first
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                {campusDiningLocations.map((location) => (
                  <article
                    className="rounded-md border border-stone-200 bg-stone-50 p-3"
                    key={location.name}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm">{location.name}</strong>
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                        {location.focus}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-stone-700">{location.schedule}</p>
                    <p className="mt-1 text-xs text-stone-500">{location.note}</p>
                  </article>
                ))}
              </div>

              <a
                className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-teal-700 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50"
                href={diningHoursUrl}
                target="_blank"
                rel="noreferrer"
              >
                Verify Today&apos;s Dining Hours
              </a>

              <div className="mt-5 border-t border-stone-200 pt-4">
                <h3 className="text-sm font-bold uppercase text-stone-500">
                  Robot Delivery
                </h3>
                <ol className="mt-3 grid gap-2 text-sm text-stone-700">
                  {robotDeliverySteps.map((step) => (
                    <li className="rounded-md bg-stone-50 p-2" key={step}>
                      {step}
                    </li>
                  ))}
                </ol>
                <a
                  className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
                  href={grubhubCampusUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Grubhub Campus
                </a>
              </div>

              <div className="mt-5 border-t border-stone-200 pt-4">
                <h3 className="text-sm font-bold uppercase text-stone-500">
                  Bi-weekly Mini-fridge List
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-stone-700">
                  {miniFridgeShoppingList.map((item) => (
                    <span className="rounded-md bg-stone-50 p-2" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Money & Bills</h2>
              <p className="mt-2 text-sm text-stone-600">
                Open the credit union in a separate secure tab for balances,
                transfers, and bill pay. This app should not store banking
                passwords, account numbers, or bill-pay credentials.
              </p>
              {creditUnionUrl ? (
                <a
                  className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
                  href={creditUnionUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Credit Union
                </a>
              ) : (
                <button
                  className="mt-4 min-h-10 w-full cursor-not-allowed rounded-md bg-stone-300 px-4 text-sm font-semibold text-stone-600"
                  type="button"
                  disabled
                >
                  Credit Union Link Not Set
                </button>
              )}
              <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
                <strong className="block text-stone-950">Weekly routine</strong>
                <span>
                  Check balance, confirm upcoming bills, and ask for support
                  before moving money or changing payment settings.
                </span>
              </div>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Housing</h2>
              <p className="mt-2 text-sm text-stone-600">
                Keep residence hall contracts, move-in information, billing
                notices, maintenance notes, and renewal dates in one protected
                place.
              </p>
              <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
                <strong className="block text-stone-950">Document storage</strong>
                <span>
                  Store PDFs in private Supabase Storage or another
                  access-controlled folder. This app should save document
                  metadata and private storage paths, not public copies.
                </span>
              </div>
              <p className="mt-3 text-sm text-stone-600">{housingMessage}</p>
              {housingDocuments.length > 0 ? (
                <ol className="mt-4 grid gap-3">
                  {housingDocuments.map((document) => (
                    <li
                      className="rounded-md border border-stone-200 bg-stone-50 p-3"
                      key={document.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-sm">{document.title}</strong>
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold capitalize text-blue-800">
                          {document.status.replace("_", " ")}
                        </span>
                      </div>
                      <span className="mt-1 block text-xs capitalize text-stone-500">
                        {document.documentType.replace("_", " ")}
                        {document.importantDate
                          ? ` · Date ${formatDate(new Date(document.importantDate))}`
                          : ""}
                      </span>
                      {document.notes ? (
                        <p className="mt-2 text-sm text-stone-700">{document.notes}</p>
                      ) : null}
                      {document.fileUrl ? (
                        <a
                          className="mt-2 inline-block text-sm font-semibold text-teal-800 hover:text-teal-950"
                          href={document.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open Document
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 text-sm text-stone-600">
                  No housing documents are stored yet. The attached CSU contract
                  should be uploaded through private storage, not committed into
                  the codebase.
                </p>
              )}
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Communications Agent</h2>
                  <p className="mt-2 text-sm text-stone-600">
                    Draft replies from triaged CSU email and Gmail. Drafts stay
                    in review until Josephine edits and approves them.
                  </p>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
                  Review first
                </span>
              </div>
              <button
                className="mt-4 min-h-10 w-full rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                type="button"
                onClick={generateEmailDrafts}
                disabled={isEmailDrafting}
              >
                {isEmailDrafting ? "Drafting" : "Generate Draft Replies"}
              </button>
              <p className="mt-3 text-sm text-stone-600">{emailDraftMessage}</p>
              {emailDrafts.length > 0 ? (
                <ol className="mt-4 grid gap-3">
                  {emailDrafts.map((draft) => (
                    <li
                      className="rounded-md border border-stone-200 bg-stone-50 p-3"
                      key={draft.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-sm">{draft.subject}</strong>
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                          {draft.status.replace("_", " ")}
                        </span>
                      </div>
                      <span className="mt-1 block text-xs text-stone-500">
                        To {draft.recipientEmail ?? "sender"} ·{" "}
                        {draft.source === "google_gmail" ? "Gmail" : "CSU email"}
                      </span>
                      <p className="mt-3 whitespace-pre-line text-sm text-stone-700">
                        {draft.body}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : null}
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
