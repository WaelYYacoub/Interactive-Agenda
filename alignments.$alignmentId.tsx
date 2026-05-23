import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { requireUser } from "~/lib/supabase.server";
import { getLocaleFromRequest } from "~/lib/i18n.server";
import { formatKm } from "~/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { supabase } = await requireUser(request);
  const locale = getLocaleFromRequest(request);

  const { data: alignment } = await supabase
    .from("alignments")
    .select("id, kind, code, name_en, name_ar, sections(id, number, km_start_m, km_end_m)")
    .eq("id", params.alignmentId)
    .single();

  if (!alignment) throw new Response("Not found", { status: 404 });
  return { locale, alignment };
}

export default function AlignmentPage() {
  const { locale, alignment } = useLoaderData<typeof loader>();
  const name = locale === "ar" ? alignment.name_ar : alignment.name_en;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{alignment.code} · {name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {(alignment.sections ?? []).sort((a: any, b: any) => a.number - b.number).map((s: any) => (
          <Link key={s.id} to={`/sections/${s.id}`}>
            <Card className="hover:bg-accent transition-colors">
              <CardHeader><CardTitle>Section {s.number}</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {formatKm(s.km_start_m)} → {formatKm(s.km_end_m)}
                <div className="text-xs mt-1">{((s.km_end_m - s.km_start_m) / 1000).toFixed(2)} km</div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {(!alignment.sections || alignment.sections.length === 0) && (
          <p className="text-muted-foreground">No sections in this zone.</p>
        )}
      </div>
    </div>
  );
}
