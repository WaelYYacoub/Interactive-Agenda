import { useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";

export function LanguageSwitcher({ current }: { current: "en" | "ar" }) {
  const { t } = useTranslation();
  const location = useLocation();
  const next = current === "en" ? "ar" : "en";
  return (
    <form method="post" action="/api/set-locale" className="inline-flex">
      <input type="hidden" name="locale" value={next} />
      <input type="hidden" name="redirectTo" value={location.pathname + location.search} />
      <Button type="submit" variant="ghost" size="sm" aria-label={t("common.language")}>
        {next === "ar" ? "العربية" : "English"}
      </Button>
    </form>
  );
}
