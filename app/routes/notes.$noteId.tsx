import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { requireUser } from "~/lib/supabase.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

const STATUSES = ["open", "in_progress", "blocked", "resolved", "closed", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

const StatusChange = z.object({
  to_status: z.enum(STATUSES),
  note: z.string().max(1000).optional(),
});

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { supabase } = await requireUser(request);
  const { data: note } = await supabase
    .from("notes")
    .select("id, title, body, kind, current_status, km_from_m, km_to_m, updated_at, created_at, section_id, sections(number, alignment:alignments(code, name_en, name_ar))")
    .eq("id", params.noteId)
    .single();
  if (!note) throw new Response("Not found", { status: 404 });

  const { data: history } = await supabase
    .from("note_status_history")
    .select("id, from_status, to_status, note, changed_at")
    .eq("note_id", note.id)
    .order("changed_at", { ascending: false });

  const { data: tags } = await supabase
    .from("note_tags")
    .select("activity_id, equipment_id, welfare_item_id, activities(name_en, name_ar), equipment(name_en, name_ar), welfare_items(name_en, name_ar)")
    .eq("note_id", note.id);

  return { note, history: history ?? [], tags: tags ?? [] };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { user, supabase, headers } = await requireUser(request);
  const form = await request.formData();
  const intent = form.get("_intent");

  if (intent === "delete") {
    const { error } = await supabase.from("notes").delete().eq("id", params.noteId);
    if (error) return { error: error.message };
    return new Response(null, { status: 303, headers: { ...Object.fromEntries(headers), Location: "/notes" } });
  }

  const parsed = StatusChange.safeParse({
    to_status: form.get("to_status"),
    note: (form.get("note") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues.map(i => i.message).join("; ") };

  const { data: existing } = await supabase
    .from("notes").select("current_status").eq("id", params.noteId).single();
  if (!existing) return { error: "Not found" };

  if (existing.current_status === parsed.data.to_status) {
    return { error: "Status is already that value." };
  }

  const { error: histErr } = await supabase.from("note_status_history").insert({
    note_id: params.noteId!,
    changed_by: user.id,
    from_status: existing.current_status as Status,
    to_status: parsed.data.to_status,
    note: parsed.data.note ?? null,
  });
  if (histErr) return { error: histErr.message };

  const { error: updErr } = await supabase
    .from("notes")
    .update({ current_status: parsed.data.to_status })
    .eq("id", params.noteId);
  if (updErr) return { error: updErr.message };

  return { ok: true };
}

export default function NoteDetail() {
  const { note, history, tags } = useLoaderData<typeof loader>();
  const data = useActionData<typeof action>() as { error?: string; ok?: boolean } | undefined;
  const nav = useNavigation();
  const { t, i18n } = useTranslation();
  const nf = i18n.language === "ar" ? "name_ar" : "name_en";
  const section: any = (note as any).sections;
  const lastChange = history[0];

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{t(`notes.kinds.${(note as any).kind}`)}</div>
          <h1 className="text-2xl font-semibold">{(note as any).title}</h1>
          {section && (
            <div className="text-sm text-muted-foreground">
              {section.alignment.code} · §{section.number}
            </div>
          )}
        </div>
        <Badge>{t(`notes.statuses.${(note as any).current_status}`)}</Badge>
      </div>

      {(note as any).body && (
        <Card><CardContent className="p-5 whitespace-pre-wrap">{(note as any).body}</CardContent></Card>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tg: any, i: number) => {
            const label =
              tg.activities?.[nf] ?? tg.equipment?.[nf] ?? tg.welfare_items?.[nf];
            return label ? <Badge key={i} variant="outline">{label}</Badge> : null;
          })}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>{t("notes.changeStatus")}</CardTitle></CardHeader>
        <CardContent>
          {lastChange && (
            <p className="text-sm text-muted-foreground mb-3">
              Last: {lastChange.from_status ? t(`notes.statuses.${lastChange.from_status}`) : "—"} → <strong>{t(`notes.statuses.${lastChange.to_status}`)}</strong>{" "}
              ({new Date(lastChange.changed_at).toLocaleString()})
            </p>
          )}
          <Form method="post" className="flex flex-wrap gap-2 items-end">
            <select name="to_status" defaultValue={(note as any).current_status} className="h-9 rounded-md border px-2 text-sm">
              {STATUSES.map(s => <option key={s} value={s}>{t(`notes.statuses.${s}`)}</option>)}
            </select>
            <Input name="note" placeholder={t("notes.statusChangeNote")} className="flex-1 min-w-48" />
            <Button type="submit" disabled={nav.state !== "idle"}>{t("notes.logChange")}</Button>
          </Form>
          {data?.error && <p className="text-sm text-destructive mt-2">{data.error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("notes.history")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {history.map((h: any) => (
            <div key={h.id} className="flex items-start gap-3 border-s-2 ps-3 py-1">
              <div className="text-xs text-muted-foreground w-40 shrink-0">
                {new Date(h.changed_at).toLocaleString()}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">{h.from_status ? t(`notes.statuses.${h.from_status}`) : "—"}</span>
                {" → "}
                <strong>{t(`notes.statuses.${h.to_status}`)}</strong>
                {h.note && <div className="text-muted-foreground text-xs">{h.note}</div>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Form method="post">
        <input type="hidden" name="_intent" value="delete" />
        <Button type="submit" variant="destructive" size="sm">{t("common.delete")}</Button>
      </Form>
    </div>
  );
}
