import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/server/supabase-request";

type OpenAITranscriptionResponse = {
  text?: string;
  error?: {
    message?: string;
  };
};

const openAiApiKey = process.env.OPENAI_API_KEY;
const transcriptionModel =
  process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe";
const maxAudioBytes = 25 * 1024 * 1024;
const supportedAudioTypes = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/mpga",
  "audio/m4a",
  "audio/wav",
  "audio/webm",
  "video/mp4",
]);

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

function isSupportedAudio(file: File) {
  if (supportedAudioTypes.has(file.type)) return true;

  return /\.(mp3|mp4|mpeg|mpga|m4a|wav|webm)$/i.test(file.name);
}

export async function POST(request: NextRequest) {
  if (isSupabaseConfigured()) {
    const { error } = await getAuthenticatedSupabase(request);
    if (error) return error;
  }

  if (!openAiApiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid audio upload." }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Upload an audio file." }, { status: 400 });
  }

  if (audio.size > maxAudioBytes) {
    return NextResponse.json(
      { error: "Audio uploads must be 25 MB or smaller." },
      { status: 413 },
    );
  }

  if (!isSupportedAudio(audio)) {
    return NextResponse.json(
      { error: "Use mp3, mp4, mpeg, mpga, m4a, wav, or webm audio." },
      { status: 415 },
    );
  }

  const prompt = formData.get("prompt");
  const openAiFormData = new FormData();
  openAiFormData.set("model", transcriptionModel);
  openAiFormData.set("file", audio);
  if (typeof prompt === "string" && prompt.trim()) {
    openAiFormData.set("prompt", prompt.trim().slice(0, 800));
  }

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: openAiFormData,
  });

  const payload = (await response.json()) as OpenAITranscriptionResponse;

  if (!response.ok) {
    return NextResponse.json(
      {
        error: payload.error?.message ?? "Transcription failed.",
      },
      { status: response.status },
    );
  }

  return NextResponse.json({
    text: payload.text ?? "",
    model: transcriptionModel,
  });
}
