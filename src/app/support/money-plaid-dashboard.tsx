"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import type { PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type FinancialAccount = {
  plaid_account_id?: string;
  plaidAccountId?: string;
  name: string;
  official_name?: string | null;
  officialName?: string | null;
  mask: string | null;
  account_type?: string;
  accountType?: string;
  account_subtype?: string | null;
  accountSubtype?: string | null;
  available_balance?: number | null;
  availableBalance?: number | null;
  current_balance?: number | null;
  currentBalance?: number | null;
  iso_currency_code?: string | null;
  isoCurrencyCode?: string | null;
  updated_at?: string;
  updatedAt?: string;
};

type BalancePayload = {
  connected: boolean;
  institutionName: string | null;
  accounts: FinancialAccount[];
  lastSyncedAt: string | null;
  error?: string;
};

function formatMoney(amount: number | null | undefined, currency = "USD") {
  if (amount === null || amount === undefined) return "Not available";

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount);
}

function accountId(account: FinancialAccount) {
  return account.plaidAccountId ?? account.plaid_account_id ?? account.name;
}

function accountType(account: FinancialAccount) {
  return account.accountSubtype ?? account.account_subtype ?? account.accountType ?? account.account_type ?? "account";
}

function accountBalance(account: FinancialAccount) {
  return (
    account.availableBalance ??
    account.available_balance ??
    account.currentBalance ??
    account.current_balance ??
    null
  );
}

function accountCurrency(account: FinancialAccount) {
  return account.isoCurrencyCode ?? account.iso_currency_code ?? "USD";
}

export function MoneyPlaidDashboard() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [payload, setPayload] = useState<BalancePayload>({
    connected: false,
    institutionName: null,
    accounts: [],
    lastSyncedAt: null,
  });
  const [message, setMessage] = useState(
    "Connect Canvas Credit Union with Plaid for read-only balances.",
  );

  const getAppAccessToken = useCallback(async () => {
    if (!supabase) return null;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token ?? null;
  }, []);

  const refreshBalances = useCallback(async () => {
    const appAccessToken = await getAppAccessToken();
    if (!appAccessToken) {
      setMessage("Sign in before connecting Canvas Credit Union.");
      return;
    }

    setIsRefreshing(true);
    const response = await fetch("/api/financial/plaid/balances", {
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
      },
    });
    const nextPayload = (await response.json()) as BalancePayload;
    setIsRefreshing(false);

    if (!response.ok) {
      setMessage(nextPayload.error ?? "Balance refresh failed.");
      return;
    }

    setPayload(nextPayload);
    setMessage(
      nextPayload.connected
        ? "Canvas Credit Union is connected through Plaid."
        : "Canvas Credit Union is not connected yet.",
    );
  }, [getAppAccessToken]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const timeoutId = window.setTimeout(() => {
        setMessage("Supabase sign-in is required before Plaid can connect.");
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      void refreshBalances();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshBalances]);

  async function createLinkToken() {
    const appAccessToken = await getAppAccessToken();
    if (!appAccessToken) {
      setMessage("Sign in before opening Plaid.");
      return;
    }

    setIsLoading(true);
    const response = await fetch("/api/financial/plaid/link-token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
      },
    });
    const data = (await response.json()) as { linkToken?: string; error?: string };
    setIsLoading(false);

    if (!response.ok || !data.linkToken) {
      setMessage(data.error ?? "Plaid Link could not be started.");
      return;
    }

    setLinkToken(data.linkToken);
    setMessage("Plaid is ready. Continue to connect Canvas Credit Union.");
  }

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      const appAccessToken = await getAppAccessToken();
      if (!appAccessToken) {
        setMessage("Sign in again before saving the Plaid connection.");
        return;
      }

      setIsLoading(true);
      setMessage("Saving encrypted Plaid connection...");

      const response = await fetch("/api/financial/plaid/exchange", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicToken,
          metadata: {
            institution: metadata.institution,
          },
        }),
      });
      const nextPayload = (await response.json()) as BalancePayload;
      setIsLoading(false);

      if (!response.ok) {
        setMessage(nextPayload.error ?? "Plaid connection could not be saved.");
        return;
      }

      setPayload(nextPayload);
      setLinkToken(null);
      setMessage("Canvas Credit Union connected. Balances are read-only.");
    },
  });

  useEffect(() => {
    if (!linkToken || !ready) {
      return;
    }

    open();
  }, [linkToken, open, ready]);

  async function disconnectPlaid() {
    const appAccessToken = await getAppAccessToken();
    if (!appAccessToken) {
      setMessage("Sign in before disconnecting Plaid.");
      return;
    }

    setIsLoading(true);
    const response = await fetch("/api/financial/plaid/balances", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
      },
    });
    const data = (await response.json()) as { error?: string };
    setIsLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "Plaid could not be disconnected.");
      return;
    }

    setPayload({
      connected: false,
      institutionName: null,
      accounts: [],
      lastSyncedAt: null,
    });
    setMessage("Plaid connection removed.");
  }

  return (
    <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-teal-800">
            Canvas Credit Union
          </p>
          <h2 className="mt-2 text-2xl font-black">Plaid Connection</h2>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            Connect Canvas Credit Union through Plaid for read-only balance
            visibility. No banking passwords are stored in this app, and money
            movement stays inside the credit union.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            payload.connected
              ? "bg-teal-50 text-teal-800"
              : "bg-amber-50 text-amber-900"
          }`}
        >
          {payload.connected ? "Connected" : "Setup needed"}
        </span>
      </div>

      <div className="mt-5 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
        <strong className="block text-stone-950">
          {payload.institutionName ?? "Canvas Credit Union"}
        </strong>
        <span>
          {payload.lastSyncedAt
            ? `Last refreshed ${new Date(payload.lastSyncedAt).toLocaleString()}`
            : message}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button
          className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          type="button"
          onClick={linkToken ? () => open() : createLinkToken}
          disabled={isLoading || (Boolean(linkToken) && !ready)}
        >
          {linkToken ? "Open Plaid" : "Connect with Plaid"}
        </button>
        <button
          className="min-h-11 rounded-md border border-teal-700 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
          type="button"
          onClick={() => {
            void refreshBalances();
          }}
          disabled={isRefreshing || !payload.connected}
        >
          {isRefreshing ? "Refreshing" : "Refresh Balances"}
        </button>
        <button
          className="min-h-11 rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400"
          type="button"
          onClick={disconnectPlaid}
          disabled={isLoading || !payload.connected}
        >
          Disconnect
        </button>
      </div>

      {payload.accounts.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {payload.accounts.map((account) => (
            <article
              className="rounded-lg border border-stone-200 bg-stone-50 p-4"
              key={accountId(account)}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold">
                    {account.officialName ?? account.official_name ?? account.name}
                  </h3>
                  <p className="mt-1 text-sm capitalize text-stone-600">
                    {accountType(account)}
                    {account.mask ? ` ending ${account.mask}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-stone-600">
                  read-only
                </span>
              </div>
              <p className="mt-4 text-3xl font-black">
                {formatMoney(accountBalance(account), accountCurrency(account))}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                Available balance when Plaid provides it; otherwise current
                balance.
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Connect Canvas Credit Union to show accounts here. This page will not
          show account numbers, card numbers, usernames, or passwords.
        </div>
      )}
    </section>
  );
}
