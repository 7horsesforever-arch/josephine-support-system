import { AccountBase } from "plaid";
import { NextRequest, NextResponse } from "next/server";
import { encryptSecret } from "@/lib/server/encryption";
import { getPlaidClient } from "@/lib/server/plaid";
import { getAuthenticatedSupabase } from "@/lib/server/supabase-request";

type PlaidExchangeRequest = {
  publicToken?: string;
  metadata?: {
    institution?: {
      institution_id?: string;
      name?: string;
    };
  };
};

type FinancialAccountRow = {
  user_id: string;
  plaid_account_id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  account_type: string;
  account_subtype: string | null;
  available_balance: number | null;
  current_balance: number | null;
  iso_currency_code: string | null;
  updated_at: string;
};

function accountToRow(account: AccountBase, userId: string): FinancialAccountRow {
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

export async function POST(request: NextRequest) {
  const context = await getAuthenticatedSupabase(request);
  if (context.error) return context.error;

  let body: PlaidExchangeRequest;
  try {
    body = (await request.json()) as PlaidExchangeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.publicToken) {
    return NextResponse.json({ error: "publicToken is required." }, { status: 400 });
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

  try {
    const exchangeResponse = await plaid.itemPublicTokenExchange({
      public_token: body.publicToken,
    });
    const { access_token: accessToken, item_id: itemId } = exchangeResponse.data;
    const encryptedToken = encryptSecret(accessToken, "PLAID_TOKEN_ENCRYPTION_KEY");
    const now = new Date().toISOString();

    const { error: connectionError } = await context.supabase!
      .from("financial_connections")
      .upsert({
        user_id: context.user!.id,
        provider: "plaid",
        institution_id: body.metadata?.institution?.institution_id ?? null,
        institution_name: body.metadata?.institution?.name ?? "Canvas Credit Union",
        plaid_item_id: itemId,
        encrypted_access_token: encryptedToken.encryptedValue,
        token_iv: encryptedToken.iv,
        token_auth_tag: encryptedToken.authTag,
        last_synced_at: now,
        updated_at: now,
      });

    if (connectionError) {
      return NextResponse.json({ error: connectionError.message }, { status: 500 });
    }

    const accountsResponse = await plaid.accountsGet({ access_token: accessToken });
    const accountRows = accountsResponse.data.accounts.map((account) =>
      accountToRow(account, context.user!.id),
    );

    if (accountRows.length > 0) {
      const { error: accountsError } = await context.supabase!
        .from("financial_accounts")
        .upsert(accountRows, {
          onConflict: "user_id,plaid_account_id",
        });

      if (accountsError) {
        return NextResponse.json({ error: accountsError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      connected: true,
      institutionName: body.metadata?.institution?.name ?? "Canvas Credit Union",
      accounts: accountRows,
      lastSyncedAt: now,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Plaid connection failed." },
      { status: 502 },
    );
  }
}
