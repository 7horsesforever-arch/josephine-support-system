"use client";

import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type StorageProvider = "google_drive" | "onedrive";

type CloudStorageConnection = {
  provider: StorageProvider;
  label: string;
  connected: boolean;
  accountEmail: string | null;
  displayName: string | null;
  scopes: string[];
  expiresAt: string | null;
  lastVerifiedAt: string | null;
  updatedAt: string | null;
};

type ConnectionsPayload = {
  connections?: CloudStorageConnection[];
  error?: string;
};

const providerCopy: Record<
  StorageProvider,
  {
    purpose: string;
    safeScope: string;
  }
> = {
  google_drive: {
    purpose: "Store and find Docs & Packing files in Josephine's Google Drive.",
    safeScope: "Uses Google Drive app-file access so the app can work with files she chooses or creates.",
  },
  onedrive: {
    purpose: "Store school-related copies and packing documents in OneDrive.",
    safeScope: "Uses Microsoft app-folder file access plus profile info for account labeling.",
  },
};

function formatDate(value: string | null) {
  if (!value) return "Not checked yet";
  return new Date(value).toLocaleString();
}

export function CloudStorageConnections() {
  const [connections, setConnections] = useState<CloudStorageConnection[]>([
    {
      provider: "google_drive",
      label: "Google Drive",
      connected: false,
      accountEmail: null,
      displayName: null,
      scopes: [],
      expiresAt: null,
      lastVerifiedAt: null,
      updatedAt: null,
    },
    {
      provider: "onedrive",
      label: "OneDrive",
      connected: false,
      accountEmail: null,
      displayName: null,
      scopes: [],
      expiresAt: null,
      lastVerifiedAt: null,
      updatedAt: null,
    },
  ]);
  const [message, setMessage] = useState(
    "Connect once here so Docs & Packing can keep using Drive and OneDrive without repeated logins.",
  );
  const [busyProvider, setBusyProvider] = useState<StorageProvider | null>(null);

  const getAppAccessToken = useCallback(async () => {
    if (!supabase) return null;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token ?? null;
  }, []);

  const refreshConnections = useCallback(async () => {
    const appAccessToken = await getAppAccessToken();
    if (!appAccessToken) {
      setMessage("Sign in before connecting document storage.");
      return;
    }

    const response = await fetch("/api/storage/connections", {
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
      },
    });
    const payload = (await response.json()) as ConnectionsPayload;

    if (!response.ok || !payload.connections) {
      setMessage(
        payload.error ??
          "Storage connections need the latest Supabase schema before they can load.",
      );
      return;
    }

    setConnections(payload.connections);
    setMessage("Docs & Packing storage connection status is current.");
  }, [getAppAccessToken]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const timeoutId = window.setTimeout(() => {
        setMessage("Supabase sign-in is required before storage can connect.");
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const storageMessage = params.get("storageMessage");
      if (storageMessage) {
        setMessage(storageMessage);
        window.history.replaceState(null, "", window.location.pathname);
      }

      void refreshConnections();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshConnections]);

  async function connectProvider(provider: StorageProvider) {
    const appAccessToken = await getAppAccessToken();
    if (!appAccessToken) {
      setMessage("Sign in before connecting document storage.");
      return;
    }

    setBusyProvider(provider);
    const response = await fetch("/api/storage/oauth/start", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider,
        returnTo: "/support/docs",
      }),
    });
    const payload = (await response.json()) as {
      authorizationUrl?: string;
      error?: string;
    };
    setBusyProvider(null);

    if (!response.ok || !payload.authorizationUrl) {
      setMessage(payload.error ?? "Storage login could not start.");
      return;
    }

    window.location.assign(payload.authorizationUrl);
  }

  async function disconnectProvider(provider: StorageProvider) {
    const appAccessToken = await getAppAccessToken();
    if (!appAccessToken) {
      setMessage("Sign in before disconnecting document storage.");
      return;
    }

    setBusyProvider(provider);
    const response = await fetch(`/api/storage/connections?provider=${provider}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
      },
    });
    const payload = (await response.json()) as { error?: string };
    setBusyProvider(null);

    if (!response.ok) {
      setMessage(payload.error ?? "Storage connection could not be removed.");
      return;
    }

    setMessage("Storage connection removed.");
    await refreshConnections();
  }

  return (
    <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-teal-800">
            Cloud Storage
          </p>
          <h2 className="mt-2 text-2xl font-black">Drive + OneDrive Logins</h2>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            Connect each account once. The app stores refresh access encrypted
            on the server so document folders and packing files can stay
            available across the semester without making Josephine sign in over
            and over.
          </p>
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
          Persistent login
        </span>
      </div>

      <div className="mt-5 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
        {message}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {connections.map((connection) => {
          const copy = providerCopy[connection.provider];
          const isBusy = busyProvider === connection.provider;

          return (
            <article
              className="rounded-lg border border-stone-200 bg-stone-50 p-4"
              key={connection.provider}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold">{connection.label}</h3>
                  <p className="mt-1 text-sm text-stone-600">{copy.purpose}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-bold ${
                    connection.connected
                      ? "bg-teal-100 text-teal-800"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {connection.connected ? "Connected" : "Setup needed"}
                </span>
              </div>

              <dl className="mt-4 grid gap-2 text-sm text-stone-700">
                <div className="rounded-md bg-white p-3">
                  <dt className="text-xs font-bold uppercase text-stone-500">
                    Account
                  </dt>
                  <dd className="mt-1 font-semibold text-stone-950">
                    {connection.accountEmail ??
                      connection.displayName ??
                      "Not connected yet"}
                  </dd>
                </div>
                <div className="rounded-md bg-white p-3">
                  <dt className="text-xs font-bold uppercase text-stone-500">
                    Last checked
                  </dt>
                  <dd className="mt-1">{formatDate(connection.lastVerifiedAt)}</dd>
                </div>
              </dl>

              <p className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-950">
                {copy.safeScope}
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                  type="button"
                  onClick={() => {
                    void connectProvider(connection.provider);
                  }}
                  disabled={isBusy}
                >
                  {connection.connected ? "Reconnect" : "Connect"}
                </button>
                <button
                  className="min-h-11 rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400"
                  type="button"
                  onClick={() => {
                    void disconnectProvider(connection.provider);
                  }}
                  disabled={isBusy || !connection.connected}
                >
                  Disconnect
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <h3 className="font-bold">Privacy rule</h3>
        <p className="mt-2">
          This connection is for document storage only. Do not store Google or
          Microsoft passwords in the app, and keep document content inside the
          chosen Drive or OneDrive folders unless Josephine chooses to import a
          specific file.
        </p>
      </div>
    </section>
  );
}
