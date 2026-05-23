import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";

type State = "idle" | "recording" | "transcribing" | "error";

export function VoiceRecorder({ targetName }: { targetName: string }) {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<State>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => () => {
    recorderRef.current?.stream.getTracks().forEach(t => t.stop());
  }, []);

  async function start() {
    setErrMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = handleStop;
      rec.start();
      recorderRef.current = rec;
      setState("recording");
    } catch (e: any) {
      setErrMsg(e?.message ?? "mic error");
      setState("error");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    recorderRef.current?.stream.getTracks().forEach(t => t.stop());
  }

  async function handleStop() {
    setState("transcribing");
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    const fd = new FormData();
    fd.append("audio", blob, "note.webm");
    fd.append("language_hint", i18n.language === "ar" ? "ar" : "en");
    try {
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Transcribe failed: ${res.status}`);
      const { text } = (await res.json()) as { text: string };
      const target = document.querySelector<HTMLTextAreaElement>(`textarea[name="${targetName}"]`);
      if (target) {
        const trimmed = (target.value ?? "").trim();
        target.value = trimmed ? `${trimmed}\n\n${text}` : text;
        target.dispatchEvent(new Event("input", { bubbles: true }));
        target.focus();
      }
      setState("idle");
    } catch (e: any) {
      setErrMsg(e?.message ?? "transcribe error");
      setState("error");
    }
  }

  if (state === "recording") {
    return (
      <Button type="button" onClick={stop} size="sm" variant="destructive">
        ⏺ {t("voice.stop")}
      </Button>
    );
  }
  if (state === "transcribing") {
    return <Button type="button" size="sm" disabled>{t("voice.transcribing")}</Button>;
  }
  return (
    <div className="flex items-center gap-2">
      <Button type="button" onClick={start} size="sm" variant="outline">🎙 {t("voice.record")}</Button>
      {errMsg && <span className="text-xs text-destructive">{errMsg}</span>}
    </div>
  );
}

function pickMime(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return undefined;
}
