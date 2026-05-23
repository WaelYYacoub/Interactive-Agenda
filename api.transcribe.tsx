import type { ActionFunctionArgs } from "react-router";
import { requireUser } from "~/lib/supabase.server";
import { env } from "~/lib/env.server";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME = /^audio\/(webm|mp4|ogg|mpeg|wav)/;

export async function action({ request }: ActionFunctionArgs) {
  await requireUser(request);

  const form = await request.formData();
  const audio = form.get("audio");
  const languageHint = (form.get("language_hint") as string) || "";

  if (!(audio instanceof File)) {
    return json({ error: "Missing audio file" }, 400);
  }
  if (audio.size === 0 || audio.size > MAX_BYTES) {
    return json({ error: "Audio file size out of range" }, 400);
  }
  if (audio.type && !ALLOWED_MIME.test(audio.type)) {
    return json({ error: `Unsupported audio type: ${audio.type}` }, 415);
  }

  const upstream = new FormData();
  upstream.append("file", audio, audio.name || "note.webm");
  upstream.append("model", "whisper-1");
  upstream.append("response_format", "json");
  if (languageHint === "ar" || languageHint === "en") {
    upstream.append("language", languageHint);
  }

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: upstream,
  });

  if (!res.ok) {
    const text = await res.text();
    return json({ error: `Whisper API ${res.status}: ${text.slice(0, 300)}` }, 502);
  }

  const data = (await res.json()) as { text?: string };
  return json({ text: data.text?.trim() ?? "" });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
