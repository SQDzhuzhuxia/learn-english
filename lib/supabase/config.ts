export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
  configured: boolean;
};

type Environment = Record<string, string | undefined>;

function readEnv(env: Environment, key: string) {
  const value = env[key]?.trim();
  return value || "";
}

export function getSupabasePublicConfig(env: Environment = process.env): SupabasePublicConfig {
  const url = readEnv(env, "NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readEnv(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return {
    url,
    anonKey,
    configured: Boolean(url && anonKey)
  };
}
