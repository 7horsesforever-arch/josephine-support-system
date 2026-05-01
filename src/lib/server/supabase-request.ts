import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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

export async function getAuthenticatedSupabase(request: NextRequest) {
  const appAccessToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!appAccessToken) {
    return {
      error: NextResponse.json({ error: "Sign in before continuing." }, { status: 401 }),
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
