"use client";

import { useEffect, useRef, useState } from "react";

type SpeechRecognitionEventResult = {
  isFinal: boolean;
  [index: number]: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionEventResult;
  };
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type WritableTarget = HTMLInputElement | HTMLTextAreaElement;

const voiceEntryEnabledKey = "josephine-voice-entry-enabled";

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechWindow;
  return (
    speechWindow.SpeechRecognition ??
    speechWindow.webkitSpeechRecognition ??
    null
  );
}

function isWritableTarget(element: Element | null): element is WritableTarget {
  if (
    element instanceof HTMLTextAreaElement &&
    !element.disabled &&
    !element.readOnly
  ) {
    return true;
  }

  if (!(element instanceof HTMLInputElement)) return false;
  if (element.disabled || element.readOnly) return false;

  return [
    "email",
    "search",
    "tel",
    "text",
    "url",
  ].includes(element.type);
}

function setNativeValue(target: WritableTarget, value: string) {
  const prototype =
    target instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  descriptor?.set?.call(target, value);
  target.dispatchEvent(new Event("input", { bubbles: true }));
}

function insertText(target: WritableTarget, text: string) {
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? target.value.length;
  const prefix = target.value.slice(0, start);
  const suffix = target.value.slice(end);
  const spacer = prefix && !prefix.endsWith(" ") ? " " : "";
  const nextText = `${spacer}${text.trim()}`;
  const nextValue = `${prefix}${nextText}${suffix}`;

  setNativeValue(target, nextValue);

  const nextCursor = prefix.length + nextText.length;
  target.focus();
  target.setSelectionRange(nextCursor, nextCursor);
}

export function VoiceDictationWidget() {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const targetRef = useRef<WritableTarget | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [message, setMessage] = useState(
    "Focus a text box, then use voice entry.",
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsSupported(Boolean(getSpeechRecognitionConstructor()));
      setIsEnabled(window.localStorage.getItem(voiceEntryEnabledKey) !== "false");
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      window.localStorage.setItem(voiceEntryEnabledKey, String(isEnabled));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isEnabled]);

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript("");
  }

  function startListening() {
    setIsExpanded(true);

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setMessage("Voice entry is not supported in this browser yet.");
      return;
    }

    const focusedElement = document.activeElement;
    if (isWritableTarget(focusedElement)) {
      targetRef.current = focusedElement;
      setMessage("Listening. Speech will go into the focused text box.");
    } else {
      targetRef.current = null;
      setMessage("Listening. Focus a text box before inserting the transcript.");
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";

        if (result.isFinal) {
          setLastTranscript(transcript.trim());
          if (targetRef.current) insertText(targetRef.current, transcript);
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim.trim());
    };

    recognition.onerror = (event) => {
      setMessage(
        event.error
          ? `Voice entry paused: ${event.error}.`
          : "Voice entry paused.",
      );
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  function toggleEnabled() {
    if (isEnabled) {
      stopListening();
      setIsExpanded(false);
      setIsEnabled(false);
      return;
    }

    setIsEnabled(true);
    setIsExpanded(true);
    setMessage("Focus a text box, then use voice entry.");
  }

  function insertLastTranscript() {
    const focusedElement = document.activeElement;
    const target = isWritableTarget(focusedElement)
      ? focusedElement
      : targetRef.current;

    if (!target || !lastTranscript) {
      setMessage("Focus a text box and dictate something first.");
      return;
    }

    insertText(target, lastTranscript);
    setMessage("Inserted the last transcript.");
  }

  return (
    <section
      className={`fixed bottom-4 right-4 z-50 rounded-lg border border-stone-300 bg-white text-stone-950 shadow-lg ${
        isExpanded || isListening
          ? "w-[min(22rem,calc(100vw-2rem))] p-3"
          : "w-auto p-2"
      }`}
    >
      {!isExpanded && !isListening ? (
        <div className="flex items-center gap-2">
          <button
            className={`min-h-10 rounded-md px-3 text-sm font-bold ${
              isEnabled
                ? "bg-teal-700 text-white hover:bg-teal-800"
                : "bg-stone-200 text-stone-600 hover:bg-stone-300"
            }`}
            type="button"
            onClick={() => {
              if (!isEnabled) {
                toggleEnabled();
                return;
              }

              setIsExpanded(true);
            }}
          >
            {isEnabled ? "Voice" : "Voice off"}
          </button>
          {isEnabled ? (
            <button
              className="min-h-10 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400"
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={startListening}
              disabled={!isSupported}
            >
              Start
            </button>
          ) : null}
        </div>
      ) : (
        <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-teal-800">
            Voice Entry
          </p>
          <p className="mt-1 text-sm text-stone-600">{message}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full px-2 py-1 text-xs font-bold ${
              isListening
                ? "bg-red-50 text-red-800"
                : isEnabled && isSupported
                  ? "bg-teal-50 text-teal-800"
                  : "bg-stone-100 text-stone-500"
            }`}
          >
            {isListening
              ? "Listening"
              : isEnabled && isSupported
                ? "Ready"
                : isEnabled
                  ? "Unavailable"
                  : "Off"}
          </span>
          <button
            className="rounded-md px-2 py-1 text-xs font-semibold text-stone-500 hover:bg-stone-100 hover:text-stone-800"
            type="button"
            onClick={() => {
              if (isListening) {
                stopListening();
              }
              setIsExpanded(false);
            }}
          >
            Minimize
          </button>
        </div>
      </div>

      {interimTranscript || lastTranscript ? (
        <div className="mt-3 rounded-md border border-stone-200 bg-stone-50 p-2 text-sm text-stone-700">
          {interimTranscript || lastTranscript}
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          className="min-h-10 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={isListening ? stopListening : startListening}
          disabled={!isSupported || !isEnabled}
        >
          {isListening ? "Stop" : "Start"}
        </button>
        <button
          className="min-h-10 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-100"
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={insertLastTranscript}
        >
          Insert Last
        </button>
      </div>
      <button
        className="mt-2 min-h-9 w-full rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-100"
        type="button"
        onClick={toggleEnabled}
      >
        {isEnabled ? "Turn Voice Entry Off" : "Turn Voice Entry On"}
      </button>
        </>
      )}
    </section>
  );
}
