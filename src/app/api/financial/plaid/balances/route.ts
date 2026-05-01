import { AccountBase } from "plaid";
import { NextRequest, NextResponse } from "next/server";
import { decryptSecret } from "@/lib/server/encryption";
import { getPlaidClient } from "@/lib/server/plaid";
import { getAuthenticatedSupabase } from "@/lib/server/supabase-request";

type FinancialConnectionRow = {
  institution_name: string | null;
  encrypted_access_token: string;
  token_iv: string;
  token_auth_tag: string;
  last_synced_at: string | null;
};

function accountToRow(account: AccountBase, userId: string) {
  return {
    user_id: userId,
    plaid_account_id: account.account_id,
    name: account.name,
    official_name: account.official_name,
    mask: account.mask,
    account_type: account.type,
    account_subtype: account.subtype,
    available_balance: account.balances.available,
    current_balance: account.balances.current,
    iso_currency_code: account.balances.iso_currency_code,
    updated_at: new Date().toISOString(),
  };
}

async function getSavedConnection(request: NextRequest) {
  const context = await getAuthenticatedSupabase(request);
  if (context.error) return { error: context.error };

  const { data, error } = await context.supabase!
    .from("financial_connections")
    .select("institution_name,encrypted_access_token,token_iv,token_auth_tag,last_synced_at")
    .eq("user_id", context.user!.id)
    .eq("provider", "plaid")
    .maybeSingle();

  if (error) {
    return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  }

  return {
    supabase: context.supabase!,
    user: context.user!,
    connection: data as FinancialConnectionRow | null,
  };
}

export async function GET(request: NextRequest) {
  const context = await getSavedConnection(request);
  if (context.error) return context.error;

  if (!context.connection) {
    return NextResponse.json({
      connected: false,
      institutionName: null,
      accounts: [],
      lastSyncedAt: null,
    });
  }

  let plaid;
  try {
    plaid = getPlaidClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Plaid is not configured." },
      { status: 503 },
    );
  }

  let accessToken: string;
  try {
    accessToken = decryptSecret(
      {
        encryptedValue: context.connection.encrypted_access_token,
        iv: context.connection.token_iv,
        authTag: context.connection.token_auth_tag,
      },
      "PLAID_TOKEN_ENCRYPTION_KEY",
    );
  } catch {
    return NextResponse.json(
      { error: "Saved credit union connection could not be decrypted. Reconnect Plaid." },
      { status: 500 },
    );
  }

  try {
    const accountsResponse = await plaid.accountsGet({ access_token: accessToken });
    const accountRows = accountsResponse.data.accounts.map((account) =>
      accountToRow(account, context.user!.id),
    );
    const now = new Date().toISOString();

    if (accountRows.length > 0) {
      const { error } = await context.supabase
        .from("financial_accounts")
        .upsert(accountRows, {
          onConflict: "user_id,plaid_account_id",
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    await context.supabase
      .from("financial_connections")
      .update({ last_synced_at: now, updated_at: now })
      .eq("user_id", context.user!.id)
      .eq("provider", "plaid");

    return NextResponse.json({
      connected: true,
      institutionName: context.connection.institution_name,
      accounts: accountRows,
      lastSyncedAt: now,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Plaid balance refresh failed." },
      { status: 502 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const context = await getSavedConnection(request);
  if (context.error) return context.error;

  if (!context.connection) {
    return NextResponse.json({ connected: false });
  }

  try {
    const plaid = getPlaidClient();
    const accessToken = decryptSecret(
      {
        encryptedValue: context.connection.encrypted_access_token,
        iv: context.connection.token_iv,
        authTag: context.connection.token_auth_tag,
      },
      "PLAID_TOKEN_ENCRYPTION_KEY",
    );

    await plaid.itemRemove({ access_token: accessToken });
  } catch {
    // Continue deleting local access if Plaid revoke fails; local token removal is the safety priority.
  }

  const { error: accountsError } = await context.supabase
    .from("financial_accounts")
    .delete()
    .eq("user_id", context.user!.id);

  if (accountsError) {
    return NextResponse.json({ error: accountsError.message }, { status: 500 });
  }

  const { error: connectionError } = await context.supabase
    .from("financial_connections")
    .delete()
    .eq("user_id", context.user!.id)
    .eq("provider", "plaid");

  if (connectionError) {
    return NextResponse.json({ error: connectionError.message }, { status: 500 });
  }

  return NextResponse.json({ connected: false });
}
