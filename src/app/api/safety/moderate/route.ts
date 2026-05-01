import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  safetyAlertConfig,
  safetyAlertThreshold,
} from "@/lib/safety/reviewable-config";

type SafetyModerationRequest = {
  text?: string;
};

type OpenAIModerationResult = {
  flagged?: boolean;
  categories?: Record<string, boolean>;
  category_scores?: Record<string, number>;
};

type OpenAIModerationResponse = {
  results?: OpenAIModerationResult[];
  error?: {
    message?: string;
  };
};

const openAiApiKey = process.env.OPENAI_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const maxModerationTextLength = 4_000;

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

function selectedCategoryScores(result: OpenAIModerationResult | undefined) {
  const scores = result?.category_scores ?? {};

  return safetyAlertConfig.moderationCategories.map((category) => ({
    category,
    score: scores[category] ?? 0,
    flagged: Boolean(result?.categories?.[category]),
  }));
}

export async function POST(request: NextRequest) {
  if (supabaseUrl && supabasePublishableKey) {
    const authorization = request.headers.get("authorization");
    const appAccessToken = authorization?.replace(/^Bearer\s+/i, "");

    if (!appAccessToken) {
      return NextResponse.json(
        { error: "Sign in before using safety moderation." },
        { status: 401 },
      );
    }

    const supabase = getSupabaseForRequest(appAccessToken);
    const {
      data: { user },
      error: userError,
    } = await supabase!.auth.getUser(appAccessToken);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid app session." }, { status: 401 });
    }
  }

  if (!openAiApiKey) {
    return NextResponse.json(
      {
        enabled: false,
        safetyAlert: false,
        reason: "OPENAI_API_KEY is not configured.",
      },
      { status: 503 },
    );
  }

  let body: SafetyModerationRequest = {};
  try {
    body = (await request.json()) as SafetyModerationRequest;
  } catch {
    body = {};
  }

  const text = body.text?.trim().slice(0, maxModerationTextLength) ?? "";

  if (!text) {
    return NextResponse.json({
      enabled: true,
      safetyAlert: false,
      confidenceLevel: safetyAlertConfig.confidenceLevel,
      threshold: safetyAlertThreshold(),
      categories: [],
    });
  }

  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text,
      model: safetyAlertConfig.moderationModel,
    }),
  });

  const payload = (await response.json()) as OpenAIModerationResponse;

  if (!response.ok) {
    return NextResponse.json(
      {
        enabled: true,
        safetyAlert: false,
        error: payload.error?.message ?? "OpenAI moderation failed.",
      },
      { status: response.status },
    );
  }

  const result = payload.results?.[0];
  const categories = selectedCategoryScores(result);
  const threshold = safetyAlertThreshold();
  const matchedCategory = categories.find(
    (category) => category.flagged || category.score >= threshold,
  );

  return NextResponse.json({
    enabled: true,
    safetyAlert: Boolean(matchedCategory),
    confidenceLevel: safetyAlertConfig.confidenceLevel,
    threshold,
    matchedCategory: matchedCategory?.category ?? null,
    categories,
  });
}
