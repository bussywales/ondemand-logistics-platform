import { createLogger } from "@shipwright/observability";

export type AppConfig = {
  port: number;
  databaseUrl: string;
  supabaseUrl: string;
  supabaseJwtIssuer: string;
  supabaseJwtAudience: string;
};

export function readConfig(): AppConfig {
  const logger = createLogger({ name: "api" });
  const requiredKeys = ["DATABASE_URL", "SUPABASE_URL", "REDIS_URL"] as const;
  const missingKeys = requiredKeys.filter((key) => {
    const value = process.env[key];
    return !value || value.trim().length === 0;
  });

  if (missingKeys.length > 0) {
    logger.error({ missing_keys: missingKeys }, "missing_env_vars");
    throw new Error(`Missing required environment variables: ${missingKeys.join(", ")}`);
  }

  const databaseUrl = process.env.DATABASE_URL as string;
  const supabaseUrl = process.env.SUPABASE_URL as string;

  return {
    port: Number(process.env.PORT ?? 10000),
    databaseUrl,
    supabaseUrl,
    supabaseJwtIssuer: process.env.SUPABASE_JWT_ISSUER ?? `${supabaseUrl}/auth/v1`,
    supabaseJwtAudience: process.env.SUPABASE_JWT_AUDIENCE ?? "authenticated"
  };
}
