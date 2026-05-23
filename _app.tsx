import { Link, NavLink, Outlet, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { useTranslation } from "react-i18next";
import { requireUser } from "~/lib/supabase.server";
import { getLocaleFromRequest } from "~/lib/i18n.server";
import { LanguageSwitcher } from "~/components/LanguageSwitcher";
import { cn, formatKm } from "~/lib/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, supabase } = await requireUser(request);
  const locale = getLocaleFromRequest(request);

  const { data: alignments } = await supabase
    .from("alignments")
    .select("id, kind, code, name_en, name_ar, sort_order, sections(id, number, km_start_m, km_end_m)")
    .order("sort_order", { ascending: true })
    .order("number", { foreignTable: "sections", ascending: true });

  return { user: { email: user.email }, locale, alignments: alignments ?? [] };
}

export default function AppLayout() {
  const { user, locale, alignments } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const nameField = locale === "ar" ? "name_ar" : "name_en";

  return (
    <div className="grid h-screen grid-rows-[auto_1fr] grid-cols-[280px_1fr]">
      <header className="col-span-2 flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-semibold">{t("app.title")}</Link>
          <span className="text-xs text-muted-foreground">{t("app.tagline")}</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher current={locale as "en" | "ar"} />
          <span className="text-xs text-muted-foreground hidden md:inline">{user.email}</span>
          <form method="post" action="/logout"><button className="text-xs underline">{t("nav.logout")}</button></form>
        </div>
      </header>

      <aside className="border-e overflow-y-auto p-3 space-y-4">
        <nav className="space-y-1">
          <SidebarLink to="/" label={t("nav.dashboard")} />
          <SidebarLink to="/notes" label={t("nav.notes")} />
          <SidebarLink to="/people" label={t("nav.people")} />
        </nav>

        <div>
          <div className="px-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
            {t("nav.alignments")}
          </div>
          <ul className="space-y-1">
            {alignments.map((a: any) => (
              <li key={a.id}>
                <NavLink
                  to={`/alignments/${a.id}`}
                  className={({ isActive }) =>
                    cn("block rounded-md px-2 py-1.5 text-sm hover:bg-accent", isActive && "bg-accent")
                  }
                >
                  <span className="font-medium">{a.code}</span>
                  <span className="ms-2 text-muted-foreground">{a[nameField]}</span>
                </NavLink>
                {a.sections?.length > 0 && (
                  <ul className="ms-3 mt-1 space-y-0.5">
                    {a.sections.map((s: any) => (
                      <li key={s.id}>
                        <NavLink
                          to={`/sections/${s.id}`}
                          className={({ isActive }) =>
                            cn("block rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent",
                              isActive && "bg-accent text-foreground")
                          }
                        >
                          §{s.number} · {formatKm(s.km_start_m)} → {formatKm(s.km_end_m)}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

function SidebarLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn("block rounded-md px-2 py-1.5 text-sm hover:bg-accent", isActive && "bg-accent font-medium")
      }
    >
      {label}
    </NavLink>
  );
}
