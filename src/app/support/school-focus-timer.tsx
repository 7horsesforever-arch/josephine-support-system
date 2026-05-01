"use client";

import { useEffect, useMemo, useState } from "react";

const focusPresets = [
  {
    label: "Quick Start",
    minutes: 10,
    detail: "Open the assignment, find the instructions, and pick the first step.",
  },
  {
    label: "Steady Block",
    minutes: 25,
    detail: "Work through one focused piece without trying to finish everything.",
  },
  {
    label: "Deep Block",
    minutes: 45,
    detail: "Use when the task is clear and supplies are already ready.",
  },
  {
    label: "Reset Break",
    minutes: 5,
    detail: "Water, bathroom, stretch, snack, or breathe before the next block.",
  },
];

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function SchoolFocusTimer() {
  const [selectedPreset, setSelectedPreset] = useState(focusPresets[1]);
  const [remainingSeconds, setRemainingSeconds] = useState(
    focusPresets[1].minutes * 60,
  );
  const [isRunning, setIsRunning] = useState(false);
  const totalSeconds = selectedPreset.minutes * 60;

  useEffect(() => {
    if (!isRunning) return;

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((currentSeconds) => {
        if (currentSeconds <= 1) {
          window.clearInterval(intervalId);
          setIsRunning(false);
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning]);

  const progress = useMemo(() => {
    if (totalSeconds === 0) return 0;
    return Math.round(((totalSeconds - remainingSeconds) / totalSeconds) * 100);
  }, [remainingSeconds, totalSeconds]);

  function choosePreset(preset: (typeof focusPresets)[number]) {
    setSelectedPreset(preset);
    setRemainingSeconds(preset.minutes * 60);
    setIsRunning(false);
  }

  function resetTimer() {
    setRemainingSeconds(totalSeconds);
    setIsRunning(false);
  }

  return (
    <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-teal-800">
            Assignment Focus
          </p>
          <h2 className="mt-2 text-2xl font-black">Focus Timer</h2>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            Pick a work block, start the timer, and make the assignment smaller.
            The goal is a doable stretch of attention, not a perfect session.
          </p>
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
          {selectedPreset.minutes} min
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {focusPresets.map((preset) => (
          <button
            className={`rounded-lg border p-3 text-left text-sm transition ${
              preset.label === selectedPreset.label
                ? "border-teal-700 bg-teal-50 text-teal-950"
                : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-white"
            }`}
            key={preset.label}
            type="button"
            onClick={() => choosePreset(preset)}
          >
            <strong className="block text-base">{preset.label}</strong>
            <span className="mt-1 block font-semibold">{preset.minutes} min</span>
            <span className="mt-2 block text-xs">{preset.detail}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-stone-600">
              {selectedPreset.label}
            </p>
            <strong className="mt-1 block text-6xl font-black tabular-nums">
              {formatTime(remainingSeconds)}
            </strong>
          </div>
          <p className="max-w-sm text-sm text-stone-600">
            When the timer ends, mark what got done, choose the next tiny step,
            or take a reset break.
          </p>
        </div>

        <div className="mt-5 h-4 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-teal-700 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <button
            className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-300"
            type="button"
            onClick={() => setIsRunning(true)}
            disabled={isRunning || remainingSeconds === 0}
          >
            Start
          </button>
          <button
            className="min-h-11 rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 hover:bg-white disabled:cursor-not-allowed disabled:text-stone-400"
            type="button"
            onClick={() => setIsRunning(false)}
            disabled={!isRunning}
          >
            Pause
          </button>
          <button
            className="min-h-11 rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 hover:bg-white"
            type="button"
            onClick={resetTimer}
          >
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}
