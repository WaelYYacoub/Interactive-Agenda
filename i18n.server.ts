import { SUPPORTED_LOCALES, type Locale } from "./i18n";

const COOKIE_NAME = "locale";

export function getLocaleFromRequest(request: Request): Locale {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([a-z]{2})`));
  const fromCookie = match?.[1];
  if (fromCookie && (SUPPORTED_LOCALES as readonly string[]).includes(fromCookie)) {
    return fromCookie as Locale;
  }

  const acceptLang = request.headers.get("Accept-Language") ?? "";
  if (acceptLang.toLowerCase().startsWith("ar")) return "ar";
  return "en";
}

export function setLocaleCookie(locale: Locale): string {
  return `${COOKIE_NAME}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function isRtl(locale: Locale): boolean {
  return locale === "ar";
}
