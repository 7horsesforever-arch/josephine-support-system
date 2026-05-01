import { NextRequest, NextResponse } from "next/server";
import {
  createCloudStorageState,
  getCloudStorageConfig,
  getCloudStorageRedirectUri,
  isCloudStorageProvider,
} from "@/lib/server/cloud-storage-oauth";
import { getAuthenticatedSupabase } from "@/lib/server/supabase-request";

type StartOAuthRequest = {
  provider?: string;
  returnTo?: string;
};

export async function POST(request: NextRequest) {
  const context = await getAuthenticatedSupabase(request);
  if (context.error) return context.error;

  let body: StartOAuthRequest;
  try {
    body = (await request.json()) as StartOAuthRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isCloudStorageProvider(body.provider)) {
    return NextResponse.json({ error: "Valid provider is required." }, { status: 400 });
  }

  let config;
  try {
    config = getCloudStorageConfig(body.provider);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OAuth is not configured." },
      { status: 503 },
    );
  }

  let state: string;
  try {
    state = createCloudStorageState(
      body.provider,
      context.user!.id,
      body.returnTo ?? "/support/docs",
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OAuth state could not be created." },
      { status: 503 },
    );
  }

  const redirectUri = getCloudStorageRedirectUri(
    request.nextUrl.origin,
    body.provider,
  );
  const authorizationUrl = new URL(config.authUrl);
  authorizationUrl.searchParams.set("client_id", config.clientId);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", config.scopes.join(" "));
  authorizationUrl.searchParams.set("state", state);

  if (body.provider === "google_drive") {
    authorizationUrl.searchParams.set("access_type", "offline");
    authorizationUrl.searchParams.set("include_granted_scopes", "true");
    authorizationUrl.searchParams.set("prompt", "consent");
  }

  return NextResponse.json({
    authorizationUrl: authorizationUrl.toString(),
  });
}
