import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { setLocaleCookie } from "~/lib/i18n.server";
import { SUPPORTED_LOCALES, type Locale } from "~/lib/i18n";

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const locale = form.get("locale");
  const redirectTo = (form.get("redirectTo") as string) || "/";
  if (typeof locale !== "string" || !(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    return new Response("Invalid locale", { status: 400 });
  }
  return redirect(redirectTo, {
    headers: { "Set-Cookie": setLocaleCookie(locale as Locale) },
  });
}
