import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { useTranslation } from "react-i18next";
import { requireUser } from "~/lib/supabase.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { getLocaleFromRequest } from "~/lib/i18n.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase } = await requireUser(request);
  const locale = getLocaleFromRequest(request);

  const { count: openCount } = await supabase
    .from("notes")
    .select("id", { count: "exact", head: true })
    .in("current_status", ["open", "in_progress", "blocked"]);

  const { data: recent } = await supabase
    .from("notes")
    .select("id, title, kind, current_status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(8);

  return { locale, openCount: openCount ?? 0, recent: recent ?? [] };
}

export default function Dashboard() {
  const { openCount, recent } = useLoaderData<typeof loader>();
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("app.title")}</h1>
        <Link to="/notes/new">
          <Button>+ {t("notes.new")}</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Open items</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{openCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 && <p className="text-sm text-muted-foreground">{t("notes.empty")}</p>}
          {recent.map((n: any) => (
            <Link key={n.id} to={`/notes/${n.id}`} className="flex items-center justify-between rounded-md border p-3 hover:bg-accent">
              <div>
                <div className="font-medium">{n.title}</div>
                <div className="text-xs text-muted-foreground">
                  {t(`notes.kinds.${n.kind}`)} · {new Date(n.updated_at).toLocaleString()}
                </div>
              </div>
              <Badge variant={badgeVariant(n.current_status)}>{t(`notes.statuses.${n.current_status}`)}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function badgeVariant(status: string): "default" | "success" | "warning" | "destructive" {
  switch (status) {
    case "resolved":
    case "closed":
      return "success";
    case "blocked":
      return "destructive";
    case "in_progress":
      return "warning";
    default:
      return "default";
  }
}
