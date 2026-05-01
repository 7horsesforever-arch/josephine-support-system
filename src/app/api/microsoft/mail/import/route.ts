import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type MicrosoftMailImportRequest = {
  graphAccessToken?: string;
  top?: number;
};

type GraphEmailAddress = {
  emailAddress?: {
    name?: string;
    address?: string;
  };
};

type GraphMessage = {
  id: string;
  subject?: string;
  bodyPreview?: string;
  webLink?: string;
  receivedDateTime?: string;
  lastModifiedDateTime?: string;
  from?: GraphEmailAddress;
  sender?: GraphEmailAddress;
  isRead?: boolean;
  importance?: "low" | "normal" | "high";
};

type GraphMessagesResponse = {
  value?: GraphMessage[];
};

type SchoolEmailRow = {
  user_id: string;
  source: "microsoft_graph";
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

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const appAccessToken = authorization?.replace(/^Bearer\s+/i, "");

  if (!appAccessToken) {
    return NextResponse.json({ error: "Sign in before importing email." }, { status: 401 });
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

  let body: MicrosoftMailImportRequest;
  try {
    body = (await request.json()) as MicrosoftMailImportRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.graphAccessToken) {
    return NextResponse.json(
      { error: "graphAccessToken is required. Use Microsoft OAuth, not a password." },
      { status: 400 },
    );
  }

  const top = clampMessageCount(body.top);
  const query = new URLSearchParams({
    "$top": String(top),
    "$orderby": "receivedDateTime desc",
    "$select":
      "id,subject,bodyPreview,webLink,receivedDateTime,lastModifiedDateTime,from,sender,isRead,importance",
  });

  const graphResponse = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?${query.toString()}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${body.graphAccessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!graphResponse.ok) {
    return NextResponse.json(
      { error: `Microsoft Graph returned ${graphResponse.status}.` },
      { status: 502 },
    );
  }

  const graphData = (await graphResponse.json()) as GraphMessagesResponse;
  const messages = graphData.value ?? [];

  const rows: SchoolEmailRow[] = messages.map((message) => {
    const sender = message.from?.emailAddress ?? message.sender?.emailAddress;

    return {
      user_id: user.id,
      source: "microsoft_graph",
      source_message_id: message.id,
      sender_name: sender?.name ?? null,
      sender_email: sender?.address ?? null,
      subject: message.subject ?? "(No subject)",
      body_preview: message.bodyPreview ?? null,
      received_at: message.receivedDateTime ?? null,
      web_url: message.webLink ?? null,
      importance: message.importance ?? null,
      is_read: message.isRead ?? null,
      imported_at: new Date().toISOString(),
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
  });
}
