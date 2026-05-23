import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { useTranslation } from "react-i18next";
import { requireUser } from "~/lib/supabase.server";
import { getLocaleFromRequest } from "~/lib/i18n.server";
import { formatKm } from "~/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { supabase } = await requireUser(request);
  const locale = getLocaleFromRequest(request);

  const { data: section } = await supabase
    .from("sections")
    .select("id, number, km_start_m, km_end_m, alignment:alignments(id, code, name_en, name_ar)")
    .eq("id", params.sectionId)
    .single();
  if (!section) throw new Response("Not found", { status: 404 });

  const [{ data: notes }, { data: people }] = await Promise.all([
    supabase.from("notes")
      .select("id, title, kind, current_status, updated_at")
      .eq("section_id", params.sectionId)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase.from("people")
      .select("id, full_name, role, company, subcon_name, phone")
      .eq("section_id", params.sectionId),
  ]);

  return { locale, section, notes: notes ?? [], people: people ?? [] };
}

export default function SectionPage() {
  const { locale, section, notes, people } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const alignment = section.alignment as any;
  const alignmentName = locale === "ar" ? alignment.name_ar : alignment.name_en;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{alignment.code} · {alignmentName}</div>
          <h1 className="text-2xl font-semibold">Section {section.number}</h1>
          <div className="text-sm text-muted-foreground">{formatKm(section.km_start_m)} → {formatKm(section.km_end_m)}</div>
        </div>
        <Link to={`/notes/new?section=${section.id}`}>
          <Button>+ {t("notes.new")}</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("notes.all")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {notes.length === 0 && <p className="text-sm text-muted-foreground">{t("notes.empty")}</p>}
          {notes.map((n: any) => (
            <Link key={n.id} to={`/notes/${n.id}`} className="flex items-center justify-between rounded-md border p-3 hover:bg-accent">
              <div>
                <div className="font-medium">{n.title}</div>
                <div className="text-xs text-muted-foreground">{t(`notes.kinds.${n.kind}`)}</div>
              </div>
              <Badge>{t(`notes.statuses.${n.current_status}`)}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("nav.people")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {people.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
          {people.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="font-medium">{p.full_name}</div>
                <div className="text-xs text-muted-foreground">{p.role} · {p.company}{p.subcon_name ? ` · ${p.subcon_name}` : ""}</div>
              </div>
              {p.phone && <a href={`tel:${p.phone}`} className="text-sm underline">{p.phone}</a>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
