// Don't load at startup - delay until first use
let cachedEnv: Record<string, string> | null = null;

function getEnv(): Record<string, string> {
  if (cachedEnv) return cachedEnv;

  cachedEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL || "",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  };

  // Validate only when accessed
  const missing = Object.entries(cachedEnv)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }

  return cachedEnv;
}

export const env = new Proxy({}, {
  get(target, prop: string | symbol) {
    if (typeof prop === "string") {
      const allEnv = getEnv();
      return allEnv[prop];
    }
    return undefined;
  },
}) as Record<string, string>;