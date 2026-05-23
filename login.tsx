import { Form, useActionData, useNavigation } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { useTranslation } from "react-i18next";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  if (!email) return { error: "Email required" };

  const { supabase, headers } = createSupabaseServerClient(request);
  const url = new URL(request.url);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${url.origin}/auth/callback` },
  });
  if (error) return { error: error.message };
  return new Response(JSON.stringify({ sent: true }), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}

export default function LoginPage() {
  const data = useActionData<typeof action>() as { sent?: boolean; error?: string } | undefined;
  const nav = useNavigation();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>{t("auth.signInToContinue")}</CardTitle></CardHeader>
        <CardContent>
          {data?.sent ? (
            <p className="text-sm">{t("auth.checkInbox")}</p>
          ) : (
            <Form method="post" className="space-y-3">
              <label className="block text-sm">
                {t("auth.email")}
                <Input name="email" type="email" required autoFocus className="mt-1" />
              </label>
              <Button type="submit" disabled={nav.state !== "idle"} className="w-full">
                {t("auth.magicLink")}
              </Button>
              {data?.error && <p className="text-sm text-destructive">{data.error}</p>}
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
