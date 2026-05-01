import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type EmailSource = "microsoft_graph" | "google_gmail";
type EmailPriority = "low" | "normal" | "high" | "urgent";
type EmailCategory = "deadline" | "meeting" | "admin" | "coursework" | "support" | "other";

type EmailDraftRequest = {
  limit?: number;
};

type EmailMessage = {
  source: EmailSource;
  source_message_id: string;
  sender_name: string | null;
  sender_email: string | null;
  subject: string;
  body_preview: string | null;
};

type EmailTriage = {
  source: EmailSource;
  source_message_id: string;
  priority: EmailPriority;
  category: EmailCategory;
  summary: string;
  suggested_action: string;
  due_hint: string | null;
};

type EmailDraftRow = {
  user_id: string;
  source: EmailSource;
  source_message_id: string;
  recipient_email: string | null;
  subject: string;
  body: string;
  status: "needs_review";
  created_by_agent: "communications_drafting_agent_v1";
  updated_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

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
  if (!value || Number.isNaN(value)) return 5;
  return Math.min(Math.max(Math.floor(value), 1), 10);
}

function firstName(value: string | null) {
  return value?.split(/\s+/)[0]?.replace(/[^\w'-]/g, "") || "there";
}

function replySubject(subject: string) {
  return /^re:/i.test(subject) ? subject : `Re: ${subject}`;
}

function sourceLabel(source: EmailSource) {
  return source === "google_gmail" ? "Gmail" : "CSU email";
}

function bodyForDraft(message: EmailMessage, triage: EmailTriage) {
  const greeting = `Hi ${firstName(message.sender_name)},`;
  const context = `I saw your message about "${message.subject}".`;
  const dueLine = triage.due_hint ? ` I noticed the timing may be ${triage.due_hint}.` : "";

  const nextStep = {
    deadline:
      "I am checking the assignment details now and will follow up with what I can complete and any questions I have.",
    meeting:
      "I am checking my calendar and will reply with a time that works or ask for another option.",
    admin:
      "I am reviewing this with support before taking action, so I do not miss an important step.",
    coursework:
      "I am opening the course materials and will confirm what I need to do next.",
    support:
      "Thank you for the support. I am reviewing this carefully and will follow up with any questions.",
    other:
      "I am reviewing this and will follow up if there is anything I need to do.",
  }[triage.category];

  return [
    greeting,
    "",
    `${context}${dueLine}`,
    nextStep,
    "",
    "Thank you,",
    "Josephine",
  ].join("\n");
}

function draftFrom(message: EmailMessage, triage: EmailTriage, userId: string): EmailDraftRow {
  return {
    user_id: userId,
    source: triage.source,
    source_message_id: triage.source_message_id,
    recipient_email: message.sender_email,
    subject: replySubject(message.subject),
    body: bodyForDraft(message, triage),
    status: "needs_review",
    created_by_agent: "communications_drafting_agent_v1",
    updated_at: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const appAccessToken = authorization?.replace(/^Bearer\s+/i, "");

  if (!appAccessToken) {
    return NextResponse.json({ error: "Sign in before drafting email." }, { status: 401 });
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

  let body: EmailDraftRequest = {};
  try {
    body = (await request.json()) as EmailDraftRequest;
  } catch {
    body = {};
  }

  const { data: triageRows, error: triageError } = await supabase
    .from("school_email_triage")
    .select("source,source_message_id,priority,category,summary,suggested_action,due_hint")
    .eq("user_id", user.id)
    .in("priority", ["urgent", "high", "normal"])
    .order("created_at", { ascending: false })
    .limit(clampLimit(body.limit));

  if (triageError) {
    return NextResponse.json({ error: triageError.message }, { status: 500 });
  }

  const triageItems = (triageRows ?? []) as EmailTriage[];
  if (triageItems.length === 0) {
    return NextResponse.json({
      drafted: 0,
      drafts: [],
      message: "No triaged email is ready for drafting yet.",
    });
  }

  const messageIds = triageItems.map((item) => item.source_message_id);
  const { data: messages, error: messagesError } = await supabase
    .from("school_email_messages")
    .select("source,source_message_id,sender_name,sender_email,subject,body_preview")
    .eq("user_id", user.id)
    .in("source_message_id", messageIds);

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  const messageByKey = new Map(
    ((messages ?? []) as EmailMessage[]).map((message) => [
      `${message.source}:${message.source_message_id}`,
      message,
    ]),
  );

  const drafts = triageItems
    .map((triage) => {
      const message = messageByKey.get(`${triage.source}:${triage.source_message_id}`);
      return message ? draftFrom(message, triage, user.id) : null;
    })
    .filter((draft): draft is EmailDraftRow => Boolean(draft));

  if (drafts.length > 0) {
    const { error: upsertError } = await supabase
      .from("school_email_drafts")
      .upsert(drafts, {
        onConflict: "user_id,source,source_message_id",
      });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  const { data: savedDrafts, error: savedDraftsError } = await supabase
    .from("school_email_drafts")
    .select("id,source,recipient_email,subject,body,status,created_by_agent,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(5);

  if (savedDraftsError) {
    return NextResponse.json({ error: savedDraftsError.message }, { status: 500 });
  }

  return NextResponse.json({
    drafted: drafts.length,
    source: drafts.length > 0 ? sourceLabel(drafts[0].source) : null,
    drafts: savedDrafts ?? [],
  });
}
