import { NextRequest, NextResponse } from "next/server";
import {
  getPlaidClient,
  plaidCountryCodes,
  plaidProducts,
} from "@/lib/server/plaid";
import { getAuthenticatedSupabase } from "@/lib/server/supabase-request";

export async function POST(request: NextRequest) {
  const context = await getAuthenticatedSupabase(request);
  if (context.error) return context.error;

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
    const response = await plaid.linkTokenCreate({
      user: {
        client_user_id: context.user!.id,
      },
      client_name: "Josephine Daily Support",
      products: plaidProducts(),
      country_codes: plaidCountryCodes(),
      language: "en",
    });

    return NextResponse.json({
      linkToken: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Plaid link token failed." },
      { status: 502 },
    );
  }
}
