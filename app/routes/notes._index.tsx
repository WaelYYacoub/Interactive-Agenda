import { Link, useLoaderData, useSearchParams } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { useTranslation } from "react-i18next";
import { requireUser } from "~/lib/supabase.server";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

const KINDS = ["note", "issue", "incident", "event", "audit", "progress", "challenge"] as const;
const STATUSES = ["open", "in_progress", "blocked", "resolved", "closed", "cancelled"] as const;

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase } = await requireUser(request);
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const kind = url.searchParams.get("kind");
  const status = url.searchParams.get("status");

  let query = supabase
    .from("notes")
    .select("id, title, kind, current_status, updated_at, section_id")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (q) query = query.ilike("title", `%${q}%`);
  if (kind) query = query.eq("kind", kind);
  if (status) query = query.eq("current_status", status);

  const { data } = await query;
  return { notes: data ?? [] };
}

export default function NotesIndex() {
  const { notes } = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("notes.all")}</h1>
        <Link to="/notes/new"><Button>+ {t("notes.new")}</Button></Link>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <Input name="q" placeholder={t("common.search")} defaultValue={params.get("q") ?? ""} className="max-w-xs" />
        <select name="kind" defaultValue={params.get("kind") ?? ""} className="h-9 rounded-md border px-2 text-sm">
          <option value="">— {t("notes.kind")} —</option>
          {KINDS.map(k => <option key={k} value={k}>{t(`notes.kinds.${k}`)}</option>)}
        </select>
        <select name="status" defaultValue={params.get("status") ?? ""} className="h-9 rounded-md border px-2 text-sm">
          <option value="">— {t("notes.status")} —</option>
          {STATUSES.map(s => <option key={s} value={s}>{t(`notes.statuses.${s}`)}</option>)}
        </select>
        <Button type="submit" variant="outline" size="sm">{t("common.search")}</Button>
      </form>

      <div className="space-y-2">
        {notes.length === 0 && (
          <Card><CardContent className="p-6 text-center text-muted-foreground">{t("notes.empty")}</CardContent></Card>
        )}
        {notes.map((n: any) => (
          <Link key={n.id} to={`/notes/${n.id}`} className="block">
            <Card className="hover:bg-accent transition-colors">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{n.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {t(`notes.kinds.${n.kind}`)} · {new Date(n.updated_at).toLocaleString()}
                  </div>
                </div>
                <Badge>{t(`notes.statuses.${n.current_status}`)}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
