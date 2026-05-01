"use client";

import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  safetyAlertConfig,
  safetyAlertThreshold,
} from "@/lib/safety/reviewable-config";
import { RewardAdminPanel } from "./reward-admin-panel";

const caregiverAdminEmail = "chilton18@gmail.com";

const reviewPlan = [
  {
    name: "Monthly maintenance",
    cadence: "Monthly",
    detail:
      "Check Canvas import, email drafting, Plaid balances, overdue tasks, broken links, and whether the dashboard feels too noisy.",
  },
  {
    name: "Semester reset",
    cadence: "Before each semester",
    detail:
      "Refresh classes, syllabi, accommodation letters, exam dates, tutoring resources, housing, parking, and campus routines.",
  },
  {
    name: "Biannual agent review",
    cadence: "Twice a year",
    detail:
      "Review privacy, security, stale content, integrations, app complexity, and whether Ask JoJo is answering from the right places.",
  },
  {
    name: "Annual production review",
    cadence: "Before each school year",
    detail:
      "Rotate old tokens, verify backups, review OAuth/Plaid/Supabase settings, confirm costs, and re-confirm connected-service consent.",
  },
];

const caregiverCheckInPrompts = [
  "What helped this week?",
  "What felt too noisy or annoying in the app?",
  "Is anything overdue because it is confusing, scary, or has too many steps?",
  "Do any accommodations, classes, housing, food, money, or health supports need follow-up?",
  "What should be removed, hidden, or made easier next?",
];

const caregiverBoundaryRules = [
  "Check-ins should be consent-based and focused on support, not surveillance.",
  "Do not expose private emails, messages, grades, bank details, or health details in caregiver summaries by default.",
  "Use high-level status: working, needs setup, needs help, stale, or review soon.",
  "Josephine should be able to see what is shared and turn off caregiver summaries later.",
];

const safetyAlertBoundaries = [
  "Only watch what Josephine types into this app, such as Ask JoJo or future in-app search.",
  "Do not monitor browser history, Mac activity, texts, email, or daily behavior in the background.",
  "Show Josephine the alert and resources immediately.",
  "External caregiver alerts should require explicit setup, clear consent, and an easy way to review or pause them.",
];

function isAllowedCaregiver(session: Session | null) {
  return session?.user.email?.toLowerCase() === caregiverAdminEmail;
}

export default function AdminCaregiverPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [message, setMessage] = useState(
    "Sign in with the caregiver Google account to open this page.",
  );
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let ignore = false;

    async function loadSession() {
      const {
        data: { session: currentSession },
      } = await supabase!.auth.getSession();

      if (!ignore) {
        setSession(currentSession);
        setAuthReady(true);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  async function signInWithGoogle() {
    if (!supabase) {
      setMessage("Supabase Auth is not configured yet.");
      return;
    }

    setIsSigningIn(true);
    setMessage("Opening Google sign-in...");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/support/admin`,
        queryParams: {
          login_hint: caregiverAdminEmail,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setIsSigningIn(false);
    }
  }

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4 text-stone-950">
        <section className="rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
          <p className="font-semibold">Checking caregiver access...</p>
        </section>
      </main>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="min-h-screen bg-stone-100 px-4 py-6 text-stone-950">
        <section className="mx-auto max-w-lg rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
          <Link
            className="text-sm font-semibold text-teal-800 hover:text-teal-950"
            href="/"
          >
            Back to My Campus Hub
          </Link>
          <h1 className="mt-4 text-3xl font-black">Caregiver Admin</h1>
          <p className="mt-2 text-stone-600">
            Supabase Auth must be configured before caregiver login can work.
          </p>
        </section>
      </main>
    );
  }

  if (!isAllowedCaregiver(session)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4 text-stone-950">
        <section className="w-full max-w-md rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
          <Link
            className="text-sm font-semibold text-teal-800 hover:text-teal-950"
            href="/"
          >
            Back to My Campus Hub
          </Link>
          <p className="mt-5 text-xs font-bold uppercase text-teal-800">
            Caregiver access
          </p>
          <h1 className="mt-2 text-3xl font-black">Admin sign-in</h1>
          <p className="mt-2 text-stone-600">{message}</p>
          {session ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              Signed in as {session.user.email ?? "another account"}. This page
              is limited to {caregiverAdminEmail}.
            </div>
          ) : null}
          <button
            className="mt-5 min-h-11 w-full rounded-md bg-teal-700 px-4 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            type="button"
            onClick={signInWithGoogle}
            disabled={isSigningIn}
          >
            {isSigningIn ? "Opening Google" : "Sign in with Google"}
          </button>
          {session ? (
            <button
              className="mt-3 min-h-11 w-full rounded-md border border-stone-300 px-4 font-semibold text-stone-700 hover:bg-stone-100"
              type="button"
              onClick={() => supabase?.auth.signOut()}
            >
              Sign out
            </button>
          ) : null}
        </section>
      </main>
    );
  }

  const caregiverSession = session!;

  return (
    <main className="min-h-screen bg-stone-100 text-stone-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
          <Link
            className="text-sm font-semibold text-teal-800 hover:text-teal-950"
            href="/"
          >
            Back to My Campus Hub
          </Link>
          <p className="mt-5 text-xs font-bold uppercase text-teal-800">
            Caregiver access
          </p>
          <h1 className="mt-2 text-4xl font-black leading-tight sm:text-6xl">
            Admin & Caregiver
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-stone-600">
            A support-first space for app health, review rhythms, safety
            boundaries, and consent-based caregiver check-ins.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-stone-600">
            <span>Signed in as {caregiverSession.user.email}</span>
            <button
              className="rounded-md border border-stone-300 px-3 py-2 font-semibold text-stone-700 hover:bg-stone-100"
              type="button"
              onClick={() => supabase?.auth.signOut()}
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <RewardAdminPanel />

          <article className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm md:col-span-2">
            <h2 className="text-lg font-bold">Review Rhythm</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {reviewPlan.map((item) => (
                <div
                  className="rounded-md border border-stone-200 bg-stone-50 p-3"
                  key={item.name}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm">{item.name}</strong>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                      {item.cadence}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-700">{item.detail}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-teal-200 bg-teal-50 p-5 shadow-sm">
            <h2 className="text-lg font-bold text-teal-950">
              Caregiver Check-In
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-teal-950">
              {caregiverCheckInPrompts.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <h2 className="text-lg font-bold text-amber-950">
              Sharing Boundaries
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-amber-950">
              {caregiverBoundaryRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-lg border border-red-200 bg-red-50 p-5 shadow-sm md:col-span-2">
            <h2 className="text-lg font-bold text-red-950">
              Safety Alert Policy
            </h2>
            <p className="mt-3 text-sm text-red-950">
              Ask JoJo shows crisis resources if Josephine types a self-harm or
              suicide-related concern into the app. It uses the local trigger
              list plus OpenAI moderation at {safetyAlertConfig.confidenceLevel}{" "}
              confidence ({Math.round(safetyAlertThreshold() * 100)}% score
              threshold).
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-red-950">
              {safetyAlertBoundaries.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
