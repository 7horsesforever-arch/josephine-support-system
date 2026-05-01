import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { encryptSecret } from "@/lib/server/encryption";

type CanvasConnectionRequest = {
  canvasBaseUrl?: string;
  canvasAccessToken?: string;
  expiresAt?: string;
};

type CanvasConnectionRow = {
  canvas_base_url: string;
  expires_at: string;
  last_imported_at: string | null;
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

function getAppAccessToken(request: NextRequest) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

function normalizeCanvasBaseUrl(value: string) {
  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error("Canvas URL must use HTTPS.");
  }

  const hostname = url.hostname.toLowerCase();
  const isAllowedHost =
    hostname === "canvas.colostate.edu" ||
    hostname.endsWith(".instructure.com");

  if (!isAllowedHost) {
    throw new Error("Canvas URL must be canvas.colostate.edu or an Instructure Canvas host.");
  }

  return url.origin;
}

function normalizeExpiration(value: string | undefined) {
  const fallback = new Date();
  fallback.setFullYear(fallback.getFullYear() + 1);

  if (!value) return fallback.toISOString();

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Canvas token expiration date is invalid.");
  }

  const now = new Date();
  if (parsedDate <= now) {
    throw new Error("Canvas token expiration date must be in the future.");
  }

  return parsedDate.toISOString();
}

async function getUserSupabase(request: NextRequest) {
  const appAccessToken = getAppAccessToken(request);
  if (!appAccessToken) {
    return {
      error: NextResponse.json(
        { error: "Sign in before changing Canvas connection." },
        { status: 401 },
      ),
    };
  }

  const supabase = getSupabaseForRequest(appAccessToken);
  if (!supabase) {
    return {
      error: NextResponse.json({ error: "Supabase is not configured." }, { status: 503 }),
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(appAccessToken);

  if (userError || !user) {
    return {
      error: NextResponse.json({ error: "Invalid app session." }, { status: 401 }),
    };
  }

  return { supabase, user };
}

export async function GET(request: NextRequest) {
  const context = await getUserSupabase(request);
  if (context.error) return context.error;

  const { data, error } = await context.supabase!
    .from("canvas_connections")
    .select("canvas_base_url,expires_at,last_imported_at,updated_at")
    .eq("user_id", context.user!.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const connection = data as CanvasConnectionRow | null;

  return NextResponse.json({
    connected: Boolean(connection),
    canvasBaseUrl: connection?.canvas_base_url ?? null,
    expiresAt: connection?.expires_at ?? null,
    lastImportedAt: connection?.last_imported_at ?? null,
    updatedAt: connection?.updated_at ?? null,
  });
}

export async function POST(request: NextRequest) {
  const context = await getUserSupabase(request);
  if (context.error) return context.error;

  let body: CanvasConnectionRequest;
  try {
    body = (await request.json()) as CanvasConnectionRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.canvasBaseUrl || !body.canvasAccessToken) {
    return NextResponse.json(
      { error: "canvasBaseUrl and canvasAccessToken are required." },
      { status: 400 },
    );
  }

  let canvasBaseUrl: string;
  let expiresAt: string;
  try {
    canvasBaseUrl = normalizeCanvasBaseUrl(body.canvasBaseUrl);
    expiresAt = normalizeExpiration(body.expiresAt);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid Canvas connection." },
      { status: 400 },
    );
  }

  let encryptedToken;
  try {
    encryptedToken = encryptSecret(body.canvasAccessToken);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Canvas token encryption failed." },
      { status: 500 },
    );
  }

  const now = new Date().toISOString();
  const { error } = await context.supabase!.from("canvas_connections").upsert({
    user_id: context.user!.id,
    canvas_base_url: canvasBaseUrl,
    encrypted_access_token: encryptedToken.encryptedValue,
    token_iv: encryptedToken.iv,
    token_auth_tag: encryptedToken.authTag,
    expires_at: expiresAt,
    updated_at: now,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    connected: true,
    canvasBaseUrl,
    expiresAt,
    lastImportedAt: null,
    updatedAt: now,
  });
}

export async function DELETE(request: NextRequest) {
  const context = await getUserSupabase(request);
  if (context.error) return context.error;

  const { error } = await context.supabase!
    .from("canvas_connections")
    .delete()
    .eq("user_id", context.user!.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ connected: false });
}
