import { NextRequest, NextResponse } from "next/server";
import {
  CloudStorageProvider,
  cloudStorageProviders,
  isCloudStorageProvider,
} from "@/lib/server/cloud-storage-oauth";
import { getAuthenticatedSupabase } from "@/lib/server/supabase-request";

type CloudStorageConnectionRow = {
  provider: CloudStorageProvider;
  account_email: string | null;
  display_name: string | null;
  scopes: string[] | null;
  expires_at: string | null;
  last_verified_at: string | null;
  updated_at: string;
};

export async function GET(request: NextRequest) {
  const context = await getAuthenticatedSupabase(request);
  if (context.error) return context.error;

  const { data, error } = await context.supabase!
    .from("cloud_storage_connections")
    .select("provider,account_email,display_name,scopes,expires_at,last_verified_at,updated_at")
    .eq("user_id", context.user!.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as CloudStorageConnectionRow[];
  const connections = Object.entries(cloudStorageProviders).map(
    ([provider, config]) => {
      const connection = rows.find((row) => row.provider === provider);

      return {
        provider,
        label: config.label,
        connected: Boolean(connection),
        accountEmail: connection?.account_email ?? null,
        displayName: connection?.display_name ?? null,
        scopes: connection?.scopes ?? [],
        expiresAt: connection?.expires_at ?? null,
        lastVerifiedAt: connection?.last_verified_at ?? null,
        updatedAt: connection?.updated_at ?? null,
      };
    },
  );

  return NextResponse.json({ connections });
}

export async function DELETE(request: NextRequest) {
  const context = await getAuthenticatedSupabase(request);
  if (context.error) return context.error;

  const provider = request.nextUrl.searchParams.get("provider");
  if (!isCloudStorageProvider(provider)) {
    return NextResponse.json({ error: "Valid provider is required." }, { status: 400 });
  }

  const { error } = await context.supabase!
    .from("cloud_storage_connections")
    .delete()
    .eq("user_id", context.user!.id)
    .eq("provider", provider);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ disconnected: true, provider });
}
