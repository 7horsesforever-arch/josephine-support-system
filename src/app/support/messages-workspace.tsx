"use client";

import { useMemo, useState } from "react";

const emailSources = [
  {
    name: "School Email",
    provider: "Microsoft 365",
    status: "OAuth connection planned",
    purpose:
      "Official CSU messages, SDC notices, professor replies, Canvas-adjacent updates, and campus deadlines.",
  },
  {
    name: "Personal Gmail",
    provider: "Google Gmail",
    status: "OAuth connection planned",
    purpose:
      "Personal messages, receipts, family logistics, clubs, community updates, and everyday life admin.",
  },
];

const triageLanes = [
  {
    name: "Reply Today",
    detail: "High-priority messages that need a short, safe response.",
  },
  {
    name: "Decode First",
    detail: "Messages where tone, intent, or social context feels unclear.",
  },
  {
    name: "Make A Task",
    detail: "Emails that contain a deadline, appointment, form, bill, or follow-up.",
  },
  {
    name: "Save For Later",
    detail: "Useful information that does not need action right now.",
  },
];

function detectTone(text: string) {
  const lowerText = text.toLowerCase();

  if (/(urgent|asap|immediately|deadline|overdue|required)/.test(lowerText)) {
    return "urgent or time-sensitive";
  }

  if (/(thanks|thank you|appreciate|happy to|sounds good)/.test(lowerText)) {
    return "friendly or cooperative";
  }

  if (/(confused|concern|issue|problem|missed|late|cannot)/.test(lowerText)) {
    return "concerned or needs clarification";
  }

  return "neutral or unclear";
}

function getLikelyAsk(text: string) {
  const lowerText = text.toLowerCase();

  if (/(can you|could you|please|need you to|please complete)/.test(lowerText)) {
    return "They may be asking Josephine to do something.";
  }

  if (/(meeting|appointment|schedule|office hours|available)/.test(lowerText)) {
    return "They may be trying to schedule time.";
  }

  if (/(attached|form|document|upload|submit)/.test(lowerText)) {
    return "They may need her to review or submit a document.";
  }

  if (/(due|deadline|by friday|by monday|before|no later than)/.test(lowerText)) {
    return "There may be a deadline hiding in the message.";
  }

  return "The direct ask is not obvious yet.";
}

function getSafeReply(text: string) {
  if (!text.trim()) {
    return "Paste or select a message first.";
  }

  return [
    "Hi, thanks for reaching out.",
    "I want to make sure I understand what you need from me.",
    "Can you confirm the next step and any deadline I should be tracking?",
    "Thank you.",
  ].join("\n\n");
}

export function MessagesWorkspace() {
  const [messageText, setMessageText] = useState("");

  const decoder = useMemo(
    () => ({
      tone: detectTone(messageText),
      ask: getLikelyAsk(messageText),
      reply: getSafeReply(messageText),
    }),
    [messageText],
  );

  return (
    <section className="grid gap-6">
      <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-teal-800">
              Message Center
            </p>
            <h2 className="mt-2 text-2xl font-black">
              One Place For Both Inboxes
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-stone-600">
              School email and personal Gmail should both land here, then move
              through triage, decoding, and draft review without sending
              Josephine away from the page.
            </p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
            Connections pending
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {emailSources.map((source) => (
            <article
              className="rounded-lg border border-stone-200 bg-stone-50 p-4"
              key={source.name}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold">{source.name}</h3>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-stone-600">
                  {source.provider}
                </span>
              </div>
              <p className="mt-2 text-sm text-stone-700">{source.purpose}</p>
              <div className="mt-4 rounded-md border border-stone-200 bg-white p-3 text-sm text-stone-700">
                <strong className="block text-stone-950">{source.status}</strong>
                Use OAuth, never stored passwords. Import summaries first, then
                decode or draft from selected messages.
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-teal-800">
            Social Decoder
          </p>
          <h2 className="mt-2 text-2xl font-black">What Does This Mean?</h2>
          <label className="mt-4 grid gap-2 text-sm font-semibold text-stone-700">
            Paste or select a message
            <textarea
              className="min-h-40 rounded-md border border-stone-300 p-3 font-normal"
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder="Paste the confusing part of an email or text here."
            />
          </label>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
              <strong className="text-sm">Likely tone</strong>
              <p className="mt-2 text-sm text-stone-700">{decoder.tone}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
              <strong className="text-sm">Possible ask</strong>
              <p className="mt-2 text-sm text-stone-700">{decoder.ask}</p>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3">
            <strong className="text-sm text-teal-950">Safe reply starter</strong>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-teal-950">
              {decoder.reply}
            </pre>
          </div>
        </article>

        <aside className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Triage Lanes</h2>
          <div className="mt-4 grid gap-3">
            {triageLanes.map((lane) => (
              <div
                className="rounded-md border border-stone-200 bg-stone-50 p-3"
                key={lane.name}
              >
                <strong className="text-sm">{lane.name}</strong>
                <p className="mt-2 text-sm text-stone-700">{lane.detail}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 shadow-sm">
        <h2 className="text-lg font-bold">Drafting Rule</h2>
        <p className="mt-2 text-sm">
          JoJo can draft replies, but nothing sends automatically. Josephine
          reviews the draft, edits it if needed, and chooses whether to send it
          from the original email account.
        </p>
      </section>
    </section>
  );
}
