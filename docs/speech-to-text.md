# Speech To Text Design

The app has two speech-to-text layers:

1. Browser voice entry for fast dictation into focused fields.
2. Server transcription for uploaded audio when higher accuracy is needed.

## Browser Voice Entry

- `src/app/voice-dictation-widget.tsx` renders a global floating voice-entry control from the root layout.
- It uses the browser `SpeechRecognition` or `webkitSpeechRecognition` API when available.
- Josephine focuses any writable text field, starts listening, and final speech results insert into that field.
- This keeps short dictation local to the browser and avoids storing audio.
- Browser support varies, so the control clearly shows when voice entry is unavailable.

## Server Transcription

- `POST /api/speech/transcribe` accepts multipart form data with an `audio` file.
- The route requires the app session when Supabase is configured.
- It sends the audio to OpenAI's `audio/transcriptions` endpoint using `OPENAI_API_KEY`.
- The default model is `gpt-4o-mini-transcribe`; override with `OPENAI_TRANSCRIPTION_MODEL`.
- Uploads are limited to 25 MB.
- Accepted formats: `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav`, and `webm`.
- The route returns transcript text and does not store uploaded audio.

## Future Integration Points

- Add an audio upload button next to long-form fields like Social Decoder and Ask JoJo.
- Add a "send transcript to Ask JoJo" action.
- Add optional transcript cleanup for punctuation, paragraph breaks, and task extraction.
- Add a privacy notice before any server transcription because audio leaves the device.

## Privacy Rules

- Prefer browser voice entry for short notes.
- Use server transcription only when Josephine chooses an audio file or recording.
- Do not store raw audio by default.
- Do not auto-send dictated content.
- Dictated text should still pass through the same review and safety flows as typed text.
