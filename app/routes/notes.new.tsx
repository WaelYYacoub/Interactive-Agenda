import { Form, redirect, useActionData, useLoaderData, useNavigation, useSearchParams } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { requireUser } from "~/lib/supabase.server";
import { getLocaleFromRequest } from "~/lib/i18n.server";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { VoiceRecorder } from "~/components/VoiceRecorder";

const KINDS = ["note", "issue", "incident", "event", "audit", "progress", "challenge"] as const;

const NoteSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(10_000).default(""),
  kind: z.enum(KINDS),
  section_id: z.string().uuid().optional().or(z.literal("")),
  km_from_m: z.coerce.number().int().optional().or(z.literal("")),
  km_to_m: z.coerce.number().int().optional().or(z.literal("")),
  activity_ids: z.array(z.string().uuid()).default([]),
  equipment_ids: z.array(z.string().uuid()).default([]),
  welfare_ids: z.array(z.string().uuid()).default([]),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase } = await requireUser(request);
  const locale = getLocaleFromRequest(request);
  const [{ data: project }, { data: sections }, { data: activities }, { data: equipment }, { data: welfare }] = await Promise.all([
    supabase.from("projects").select("id").limit(1).single(),
    supabase.from("sections").select("id, number, km_start_m, km_end_m, alignment:alignments(code, name_en, name_ar)").order("number"),
    supabase.from("activities").select("id, name_en, name_ar").order("sort_order"),
    supabase.from("equipment").select("id, name_en, name_ar").order("sort_order"),
    supabase.from("welfare_items").select("id, name_en, name_ar").order("sort_order"),
  ]);
  return { locale, projectId: project?.id, sections: sections ?? [], activities: activities ?? [], equipment: equipment ?? [], welfare: welfare ?? [] };
}

export async function action({ request }: ActionFunctionArgs) {
  const { user, supabase, headers } = await requireUser(request);
  const form = await request.formData();
  const raw = {
    title: form.get("title") as string,
    body: (form.get("body") as string) ?? "",
    kind: form.get("kind") as string,
    section_id: (form.get("section_id") as string) || "",
    km_from_m: (form.get("km_from_m") as string) || "",
    km_to_m: (form.get("km_to_m") as string) || "",
    activity_ids: form.getAll("activity_ids") as string[],
    equipment_ids: form.getAll("equipment_ids") as string[],
    welfare_ids: form.getAll("welfare_ids") as string[],
  };
  const parsed = NoteSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }

  const { data: project } = await supabase.from("projects").select("id").limit(1).single();
  if (!project) return { error: "No project. Run the seed SQL first." };

  const { data: note, error } = await supabase
    .from("notes")
    .insert({
      owner_id: user.id,
      project_id: project.id,
      section_id: parsed.data.section_id || null,
      km_from_m: parsed.data.km_from_m === "" ? null : Number(parsed.data.km_from_m),
      km_to_m: parsed.data.km_to_m === "" ? null : Number(parsed.data.km_to_m),
      kind: parsed.data.kind,
      title: parsed.data.title,
      body: parsed.data.body,
    })
    .select("id")
    .single();
  if (error || !note) return { error: error?.message ?? "Insert failed" };

  const tagRows = [
    ...parsed.data.activity_ids.map(id => ({ note_id: note.id, activity_id: id })),
    ...parsed.data.equipment_ids.map(id => ({ note_id: note.id, equipment_id: id })),
    ...parsed.data.welfare_ids.map(id => ({ note_id: note.id, welfare_item_id: id })),
  ];
  if (tagRows.length) await supabase.from("note_tags").insert(tagRows);

  return redirect(`/notes/${note.id}`, { headers });
}

export default function NewNote() {
  const { locale, sections, activities, equipment, welfare } = useLoaderData<typeof loader>();
  const data = useActionData<typeof action>() as { error?: string } | undefined;
  const nav = useNavigation();
  const [params] = useSearchParams();
  const { t } = useTranslation();
  const nf = locale === "ar" ? "name_ar" : "name_en";

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">{t("notes.new")}</h1>

      <Form method="post" className="space-y-4">
        <Card>
          <CardContent className="p-5 space-y-3">
            <label className="block text-sm">
              {t("notes.title")}
              <Input name="title" required autoFocus className="mt-1" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                {t("notes.kind")}
                <select name="kind" defaultValue="note" className="mt-1 h-9 w-full rounded-md border px-2 text-sm">
                  {KINDS.map(k => <option key={k} value={k}>{t(`notes.kinds.${k}`)}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                {t("notes.section")}
                <select name="section_id" defaultValue={params.get("section") ?? ""} className="mt-1 h-9 w-full rounded-md border px-2 text-sm">
                  <option value="">—</option>
                  {sections.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.alignment.code} · §{s.number} ({(s.km_start_m / 1000).toFixed(1)}–{(s.km_end_m / 1000).toFixed(1)} km)
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">{t("notes.kmFrom")}<Input name="km_from_m" type="number" min="0" className="mt-1" /></label>
              <label className="block text-sm">{t("notes.kmTo")}<Input name="km_to_m" type="number" min="0" className="mt-1" /></label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">{t("notes.body")}</span>
                <VoiceRecorder targetName="body" />
              </div>
              <Textarea name="body" rows={6} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("notes.tags")}</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <TagGroup name="activity_ids" label="Activities" items={activities} nf={nf} />
            <TagGroup name="equipment_ids" label="Equipment" items={equipment} nf={nf} />
            <TagGroup name="welfare_ids" label="Welfare" items={welfare} nf={nf} />
          </CardContent>
        </Card>

        {data?.error && <p className="text-sm text-destructive">{data.error}</p>}
        <Button type="submit" disabled={nav.state !== "idle"}>
          {nav.state !== "idle" ? t("notes.saving") : t("notes.save")}
        </Button>
      </Form>
    </div>
  );
}

function TagGroup({ name, label, items, nf }: { name: string; label: string; items: any[]; nf: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-2">{label}</div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {items.map((it: any) => (
          <label key={it.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={name} value={it.id} />
            {it[nf]}
          </label>
        ))}
      </div>
    </div>
  );
}
