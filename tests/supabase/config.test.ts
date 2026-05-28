import { describe, expect, it } from "vitest";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

describe("getSupabasePublicConfig", () => {
  it("reports unconfigured state when public env values are missing", () => {
    const config = getSupabasePublicConfig({});

    expect(config.configured).toBe(false);
    expect(config.url).toBe("");
    expect(config.anonKey).toBe("");
  });

  it("trims public Supabase settings", () => {
    const config = getSupabasePublicConfig({
      NEXT_PUBLIC_SUPABASE_URL: " https://example.supabase.co ",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: " anon-key "
    });

    expect(config.configured).toBe(true);
    expect(config.url).toBe("https://example.supabase.co");
    expect(config.anonKey).toBe("anon-key");
  });
});
