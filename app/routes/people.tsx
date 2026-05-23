import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { requireUser } from "~/lib/supabase.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

const ROLES = ["construction_engineer", "safety_engineer", "subcon_rep", "subcon_engineer", "subcon_safety", "other"] as const;
const COMPANIES = ["petrojet", "subcontractor", "client", "other"] as const;

const PersonSchema = z.object({
  full_name: z.string().min(1).max(120),
  role: z.enum(ROLES),
  company: z.enum(COMPANIES),
  subcon_name: z.string().max(120).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  section_id: z.string().uuid().optional().or(z.literal("")),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase } = await requireUser(request);
  const [{ data: people }, { data: sections }] = await Promise.all([
    supabase
      .from("people")
      .select("id, full_name, role, company, subcon_name, phone, email, section:sections(number, alignment:alignments(code))")
      .order("full_name"),
    supabase.from("sections").select("id, number, alignment:alignments(code)").order("number"),
  ]);
  return { people: people ?? [], sections: sections ?? [] };
}

export async function action({ request }: ActionFunctionArgs) {
  const { user, supabase } = await requireUser(request);
  const form = await request.formData();
  const intent = form.get("_intent");

  if (intent === "delete") {
    const id = form.get("id") as string;
    const { error } = await supabase.from("people").delete().eq("id", id);
    return error ? { error: error.message } : { ok: true };
  }

  const parsed = PersonSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues.map(i => i.message).join("; ") };

  const { data: project } = await supabase.from("projects").select("id").limit(1).single();
  if (!project) return { error: "No project. Run the seed SQL first." };

  const { error } = await supabase.from("people").insert({
    project_id: project.id,
    section_id: parsed.data.section_id || null,
    full_name: parsed.data.full_name,
    role: parsed.data.role,
    company: parsed.data.company,
    subcon_name: parsed.data.subcon_name || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export default function PeoplePage() {
  const { people, sections } = useLoaderData<typeof loader>();
  const data = useActionData<typeof action>() as { error?: string; ok?: boolean } | undefined;
  const nav = useNavigation();
  const { t } = useTranslation();

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">{t("nav.people")}</h1>

      <Card>
        <CardHeader><CardTitle>Add person</CardTitle></CardHeader>
        <CardContent>
          <Form method="post" className="grid md:grid-cols-2 gap-3" key={data?.ok ? "ok" : "form"}>
            <label className="text-sm">Name<Input name="full_name" required className="mt-1" /></label>
            <label className="text-sm">Phone<Input name="phone" className="mt-1" /></label>
            <label className="text-sm">Role
              <select name="role" className="mt-1 h-9 w-full rounded-md border px-2 text-sm" defaultValue="construction_engineer">
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
              </select>
            </label>
            <label className="text-sm">Company
              <select name="company" className="mt-1 h-9 w-full rounded-md border px-2 text-sm" defaultValue="petrojet">
                {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-sm">Subcontractor name<Input name="subcon_name" className="mt-1" /></label>
            <label className="text-sm">Email<Input name="email" type="email" className="mt-1" /></label>
            <label className="text-sm md:col-span-2">Section
              <select name="section_id" className="mt-1 h-9 w-full rounded-md border px-2 text-sm">
                <option value="">—</option>
                {sections.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.alignment.code} · §{s.number}</option>
                ))}
              </select>
            </label>
            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={nav.state !== "idle"}>{t("notes.save")}</Button>
              {data?.error && <span className="text-sm text-destructive">{data.error}</span>}
            </div>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {people.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
        {people.map((p: any) => (
          <Card key={p.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{p.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.role.replace(/_/g, " ")} · {p.company}
                  {p.subcon_name ? ` · ${p.subcon_name}` : ""}
                  {p.section ? ` · ${p.section.alignment.code} §${p.section.number}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {p.phone && <a href={`tel:${p.phone}`} className="text-sm underline">{p.phone}</a>}
                <Form method="post">
                  <input type="hidden" name="_intent" value="delete" />
                  <input type="hidden" name="id" value={p.id} />
                  <Button type="submit" variant="ghost" size="sm">{t("common.delete")}</Button>
                </Form>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
