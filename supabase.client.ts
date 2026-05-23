import { createBrowserClient } from "@supabase/ssr";

declare global {
  interface Window {
    ENV: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string };
  }
}

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowser() {
  if (cached) return cached;
  cached = createBrowserClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY);
  return cached;
}
