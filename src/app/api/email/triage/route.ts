import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type SchoolEmailMessage = {
  id: string;
  source: "microsoft_graph" | "google_gmail";
  source_message_id: string;
  sender_name: string | null;
  sender_email: string | null;
  subject: string;
  body_preview: string | null;
  received_at: string | null;
  importance: string | null;
};

type EmailTriageRow = {
  user_id: string;
  source: SchoolEmailMessage["source"];
  source_message_id: string;
  priority: "low" | "normal" | "high" | "urgent";
  category: "deadline" | "meeting" | "admin" | "coursework" | "support" | "other";
  summary: string;
  suggested_action: string;
  due_hint: string | null;
  created_at: string;
};

type EmailTriageRequest = {
  limit?: number;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const categoryRules: Array<{
  category: EmailTriageRow["category"];
  keywords: string[];
}> = [
  {
    category: "deadline",
    keywords: ["deadline", "due", "submit", "submission", "late", "missing"],
  },
  {
    category: "meeting",
    keywords: ["meeting", "appointment", "office hours", "conference", "schedule"],
  },
  {
    category: "admin",
    keywords: ["tuition", "billing", "financial", "registrar", "ramweb", "form"],
  },
  {
    category: "coursework",
    keywords: ["assignment", "quiz", "exam", "test", "paper", "project", "canvas"],
  },
  {
    category: "support",
    keywords: ["accommodation", "accessibility", "advisor", "tutor", "support"],
  },
];

function getSupabaseForRequest(accessToken: string) {
  if (!supabaseUrl || !supabasePublishableKey) return null;

  return createClient(supabaseUrl, supabasePublishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

function clampLimit(value: number | undefined) {
  if (!value || Number.isNaN(value)) return 25;
  return Math.min(Math.max(Math.floor(value), 1), 50);
}

function normalizeText(message: SchoolEmailMessage) {
  return `${message.subject} ${message.body_preview ?? ""}`.toLowerCase();
}

function chooseCategory(text: string): EmailTriageRow["category"] {
  return categoryRules.find((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword)),
  )?.category ?? "other";
}

function choosePriority(message: SchoolEmailMessage, text: string) {
  if (
    message.importance === "high" ||
    ["urgent", "asap", "overdue", "missing", "final notice"].some((word) =>
      text.includes(word),
    )
  ) {
    return "urgent";
  }

  if (
    ["deadline", "due", "exam", "quiz", "appointment", "required"].some((word) =>
      text.includes(word),
    )
  ) {
    return "high";
  }

  if (["reminder", "update", "announcement"].some((word) => text.includes(word))) {
    return "normal";
  }

  return "low";
}

function findDueHint(text: string) {
  const weekdayMatch = text.match(
    /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  );
  if (weekdayMatch) return weekdayMatch[0];

  const dateMatch = text.match(
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\b/i,
  );
  return dateMatch?.[0] ?? null;
}

function summarize(message: SchoolEmailMessage) {
  const sender = message.sender_name || message.sender_email || "Someone";
  const subject = message.subject || "No subject";
  const preview = message.body_preview?.replace(/\s+/g, " ").trim();
  const shortPreview = preview ? preview.slice(0, 160) : "No preview available.";

  return `${sender} sent: ${subject}. ${shortPreview}`;
}

function suggestedAction(category: EmailTriageRow["category"], priority: EmailTriageRow["priority"]) {
  if (priority === "urgent") return "Review now and ask for help if it is unclear.";

  return {
    deadline: "Check the due date and add or update a task.",
    meeting: "Confirm the time and add it to the daily plan.",
    admin: "Review with caregiver support before acting.",
    coursework: "Open Canvas or the course page and check the assignment details.",
    support: "Save for caregiver/advisor review.",
    other: "Read when the high-priority items are done.",
  }[category];
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const appAccessToken = authorization?.replace(/^Bearer\s+/i, "");

  if (!appAccessToken) {
    return NextResponse.json({ error: "Sign in before triaging email." }, { status: 401 });
  }

  const supabase = getSupabaseForRequest(appAccessToken);
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(appAccessToken);

  if (userError || !user) {
    return NextResponse.json({ error: "Invalid app session." }, { status: 401 });
  }

  let body: EmailTriageRequest = {};
  try {
    body = (await request.json()) as EmailTriageRequest;
  } catch {
    body = {};
  }

  const { data: messages, error: messagesError } = await supabase
    .from("school_email_messages")
    .select("id,source,source_message_id,sender_name,sender_email,subject,body_preview,received_at,importance")
    .eq("user_id", user.id)
    .order("received_at", { ascending: false })
    .limit(clampLimit(body.limit));

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  const triageRows: EmailTriageRow[] = (messages ?? []).map((message) => {
    const typedMessage = message as SchoolEmailMessage;
    const text = normalizeText(typedMessage);
    const category = chooseCategory(text);
    const priority = choosePriority(typedMessage, text);

    return {
      user_id: user.id,
      source: typedMessage.source,
      source_message_id: typedMessage.source_message_id,
      priority,
      category,
      summary: summarize(typedMessage),
      suggested_action: suggestedAction(category, priority),
      due_hint: findDueHint(text),
      created_at: new Date().toISOString(),
    };
  });

  if (triageRows.length > 0) {
    const { error: upsertError } = await supabase
      .from("school_email_triage")
      .upsert(triageRows, {
        onConflict: "user_id,source,source_message_id",
      });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    triaged: triageRows.length,
    urgent: triageRows.filter((row) => row.priority === "urgent").length,
    high: triageRows.filter((row) => row.priority === "high").length,
  });
}
