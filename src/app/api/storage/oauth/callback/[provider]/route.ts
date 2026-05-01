import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  CloudStorageProvider,
  getCloudStorageConfig,
  getCloudStorageRedirectUri,
  isCloudStorageProvider,
  verifyCloudStorageState,
} from "@/lib/server/cloud-storage-oauth";
import { encryptSecret } from "@/lib/server/encryption";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type AccountProfile = {
  accountId: string | null;
  accountEmail: string | null;
  displayName: string | null;
};

function redirectWithStatus(
  request: NextRequest,
  returnTo: string,
  status: "connected" | "error",
  message: string,
) {
  const redirectUrl = new URL(returnTo.startsWith("/") ? returnTo : "/support/docs", request.nextUrl.origin);
  redirectUrl.searchParams.set("storage", status);
  redirectUrl.searchParams.set("storageMessage", message.slice(0, 180));
  return NextResponse.redirect(redirectUrl);
}

function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to save cloud storage logins.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function exchangeCodeForTokens(
  request: NextRequest,
  provider: CloudStorageProvider,
  code: string,
) {
  const config = getCloudStorageConfig(provider);
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: getCloudStorageRedirectUri(request.nextUrl.origin, provider),
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const tokenResponse = (await response.json()) as TokenResponse;

  if (!response.ok || !tokenResponse.access_token) {
    throw new Error(
      tokenResponse.error_description ??
        tokenResponse.error ??
        "Cloud storage token exchange failed.",
    );
  }

  return tokenResponse;
}

async function fetchAccountProfile(
  provider: CloudStorageProvider,
  accessToken: string,
): Promise<AccountProfile> {
  if (provider === "google_drive") {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      return { accountId: null, accountEmail: null, displayName: null };
    }

    const profile = (await response.json()) as {
      sub?: string;
      email?: string;
      name?: string;
    };

    return {
      accountId: profile.sub ?? null,
      accountEmail: profile.email ?? null,
      displayName: profile.name ?? null,
    };
  }

  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return { accountId: null, accountEmail: null, displayName: null };
  }

  const profile = (await response.json()) as {
    id?: string;
    mail?: string | null;
    userPrincipalName?: string;
    displayName?: string;
  };

  return {
    accountId: profile.id ?? null,
    accountEmail: profile.mail ?? profile.userPrincipalName ?? null,
    displayName: profile.displayName ?? null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerParam } = await params;
  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!state) {
    return redirectWithStatus(
      request,
      "/support/docs",
      "error",
      "Cloud storage login was missing state. Start again from Docs & Packing.",
    );
  }

  let verifiedState;
  try {
    verifiedState = verifyCloudStorageState(state);
  } catch (stateError) {
    return redirectWithStatus(
      request,
      "/support/docs",
      "error",
      stateError instanceof Error ? stateError.message : "Cloud storage login state failed.",
    );
  }

  if (!isCloudStorageProvider(providerParam) || providerParam !== verifiedState.provider) {
    return redirectWithStatus(
      request,
      verifiedState.returnTo,
      "error",
      "Cloud storage provider did not match the login request.",
    );
  }

  if (error) {
    return redirectWithStatus(
      request,
      verifiedState.returnTo,
      "error",
      `Cloud storage login was canceled or blocked: ${error}.`,
    );
  }

  if (!code) {
    return redirectWithStatus(
      request,
      verifiedState.returnTo,
      "error",
      "Cloud storage login did not return an authorization code.",
    );
  }

  try {
    const provider = providerParam;
    const config = getCloudStorageConfig(provider);
    const tokenResponse = await exchangeCodeForTokens(request, provider, code);
    const encryptedAccessToken = encryptSecret(
      tokenResponse.access_token!,
      config.tokenEnvName,
    );
    const encryptedRefreshToken = tokenResponse.refresh_token
      ? encryptSecret(tokenResponse.refresh_token, config.tokenEnvName)
      : null;
    const profile = await fetchAccountProfile(provider, tokenResponse.access_token!);
    const now = new Date();
    const expiresAt = tokenResponse.expires_in
      ? new Date(now.getTime() + tokenResponse.expires_in * 1000).toISOString()
      : null;
    const serviceSupabase = getServiceSupabase();

    const { error: saveError } = await serviceSupabase
      .from("cloud_storage_connections")
      .upsert({
        user_id: verifiedState.userId,
        provider,
        account_id: profile.accountId,
        account_email: profile.accountEmail,
        display_name: profile.displayName,
        encrypted_access_token: encryptedAccessToken.encryptedValue,
        access_token_iv: encryptedAccessToken.iv,
        access_token_auth_tag: encryptedAccessToken.authTag,
        encrypted_refresh_token: encryptedRefreshToken?.encryptedValue ?? null,
        refresh_token_iv: encryptedRefreshToken?.iv ?? null,
        refresh_token_auth_tag: encryptedRefreshToken?.authTag ?? null,
        token_type: tokenResponse.token_type ?? "Bearer",
        scopes: tokenResponse.scope?.split(" ") ?? config.scopes,
        expires_at: expiresAt,
        last_verified_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

    if (saveError) {
      throw new Error(saveError.message);
    }

    return redirectWithStatus(
      request,
      verifiedState.returnTo,
      "connected",
      `${config.label} connected and will stay signed in for Docs & Packing.`,
    );
  } catch (callbackError) {
    return redirectWithStatus(
      request,
      verifiedState.returnTo,
      "error",
      callbackError instanceof Error
        ? callbackError.message
        : "Cloud storage login could not be saved.",
    );
  }
}
