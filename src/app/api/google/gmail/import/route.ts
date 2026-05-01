import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type GmailImportRequest = {
  gmailAccessToken?: string;
  maxResults?: number;
  query?: string;
};

type GmailListResponse = {
  messages?: Array<{
    id?: string;
    threadId?: string;
  }>;
};

type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailMessage = {
  id: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: GmailHeader[];
  };
};

type EmailRow = {
  user_id: string;
  source: "google_gmail";
  source_message_id: string;
  sender_name: string | null;
  sender_email: string | null;
  subject: string;
  body_preview: string | null;
  received_at: string | null;
  web_url: string | null;
  importance: string | null;
  is_read: boolean | null;
  imported_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const defaultGmailQuery = "in:anywhere newer_than:30d -category:promotions -category:social";

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

function clampMessageCount(value: number | undefined) {
  if (!value || Number.isNaN(value)) return 25;
  return Math.min(Math.max(Math.floor(value), 1), 50);
}

function getHeader(headers: GmailHeader[] | undefined, name: string) {
  return headers?.find((header) => header.name?.toLowerCase() === name)?.value ?? null;
}

function parseSender(fromHeader: string | null) {
  if (!fromHeader) return { name: null, email: null };

  const match = fromHeader.match(/^(?:"?([^"<]*)"?\s)?<?([^<>\s]+@[^<>\s]+)>?$/);

  if (!match) {
    return { name: null, email: fromHeader };
  }

  return {
    name: match[1]?.trim() || null,
    email: match[2]?.trim() || null,
  };
}

function formatGmailDate(message: GmailMessage, dateHeader: string | null) {
  if (message.internalDate) {
    return new Date(Number(message.internalDate)).toISOString();
  }

  if (dateHeader) {
    const parsedDate = new Date(dateHeader);
    if (!Number.isNaN(parsedDate.getTime())) return parsedDate.toISOString();
  }

  return null;
}

async function fetchGmailMessage(gmailAccessToken: string, id: string) {
  const query = new URLSearchParams({
    format: "metadata",
    metadataHeaders: "Subject",
  });
  query.append("metadataHeaders", "From");
  query.append("metadataHeaders", "Date");

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?${query.toString()}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${gmailAccessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) return null;

  return (await response.json()) as GmailMessage;
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const appAccessToken = authorization?.replace(/^Bearer\s+/i, "");

  if (!appAccessToken) {
    return NextResponse.json({ error: "Sign in before importing Gmail." }, { status: 401 });
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

  let body: GmailImportRequest;
  try {
    body = (await request.json()) as GmailImportRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.gmailAccessToken) {
    return NextResponse.json(
      { error: "gmailAccessToken is required. Use Google OAuth, not a password." },
      { status: 400 },
    );
  }

  const listQuery = new URLSearchParams({
    maxResults: String(clampMessageCount(body.maxResults)),
    q: body.query?.trim() || defaultGmailQuery,
  });

  const listResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${listQuery.toString()}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${body.gmailAccessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!listResponse.ok) {
    return NextResponse.json(
      { error: `Gmail returned ${listResponse.status}.` },
      { status: 502 },
    );
  }

  const listData = (await listResponse.json()) as GmailListResponse;
  const messageIds = (listData.messages ?? [])
    .map((message) => message.id)
    .filter((id): id is string => Boolean(id));

  const messages = (
    await Promise.all(
      messageIds.map((id) => fetchGmailMessage(body.gmailAccessToken!, id)),
    )
  ).filter((message): message is GmailMessage => Boolean(message));

  const now = new Date().toISOString();
  const rows: EmailRow[] = messages.map((message) => {
    const headers = message.payload?.headers;
    const sender = parseSender(getHeader(headers, "from"));
    const receivedAt = formatGmailDate(message, getHeader(headers, "date"));
    const labelIds = message.labelIds ?? [];

    return {
      user_id: user.id,
      source: "google_gmail",
      source_message_id: message.id,
      sender_name: sender.name,
      sender_email: sender.email,
      subject: getHeader(headers, "subject") ?? "(No subject)",
      body_preview: message.snippet ?? null,
      received_at: receivedAt,
      web_url: `https://mail.google.com/mail/u/0/#all/${message.id}`,
      importance: labelIds.includes("IMPORTANT") ? "high" : null,
      is_read: labelIds.includes("UNREAD") ? false : true,
      imported_at: now,
    };
  });

  if (rows.length > 0) {
    const { error } = await supabase.from("school_email_messages").upsert(rows, {
      onConflict: "user_id,source,source_message_id",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    imported: rows.length,
    source: "google_gmail",
  });
}
