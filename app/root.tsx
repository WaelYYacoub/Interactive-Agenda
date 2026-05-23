import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";
import type { LinksFunction, LoaderFunctionArgs } from "react-router";
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import { getLocaleFromRequest, isRtl } from "~/lib/i18n.server";
import { i18n } from "~/lib/i18n";
import "~/app.css";

export const links: LinksFunction = () => [
  { rel: "icon", href: "data:," },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cairo:wght@400;500;600;700&display=swap",
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const locale = getLocaleFromRequest(request);
  return { locale, dir: isRtl(locale) ? "rtl" : "ltr" };
}

export default function App() {
  const { locale, dir } = useLoaderData<typeof loader>();

  useEffect(() => {
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale);
    }
  }, [locale]);

  return (
    <html lang={locale} dir={dir} className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full bg-background text-foreground font-sans antialiased">
        <I18nextProvider i18n={i18n}>
          <Outlet />
        </I18nextProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
