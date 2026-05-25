function required(name: string): string {
  // Try non-prefixed first (server runtime)
  let value = process.env[name];
  
  // Fall back to VITE_ prefixed (build-time injected)
  if (!value) {
    value = process.env[`VITE_${name}`];
  }
  
  if (!value) {
    throw new Error(`Missing env var ${name}`);
  }
  return value;
}

export const env = {
  SUPABASE_URL: required("SUPABASE_URL"),
  SUPABASE_ANON_KEY: required("SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
  OPENAI_API_KEY: required("OPENAI_API_KEY"),
  SESSION_SECRET: required("SESSION_SECRET"),
};