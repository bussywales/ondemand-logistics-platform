export type AppConfig = {
  port: number;
  databaseUrl: string;
  supabaseUrl: string;
  supabaseJwtIssuer: string;
  supabaseJwtAudience: string;
};

export function readConfig(): AppConfig {
  const databaseUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is required");
  }

  return {
    port: Number(process.env.PORT ?? 3000),
    databaseUrl,
    supabaseUrl,
    supabaseJwtIssuer: process.env.SUPABASE_JWT_ISSUER ?? `${supabaseUrl}/auth/v1`,
    supabaseJwtAudience: process.env.SUPABASE_JWT_AUDIENCE ?? "authenticated"
  };
}
