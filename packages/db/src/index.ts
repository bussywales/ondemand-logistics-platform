import type { PoolConfig } from "pg";

export const migrationsPath = new URL("../migrations", import.meta.url).pathname;

function stripSslMode(connectionString: string): string {
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  return url.toString();
}

function shouldUseInsecureTls(connectionString: string): boolean {
  const url = new URL(connectionString);
  return (
    url.hostname.endsWith(".supabase.co") ||
    url.hostname.endsWith(".pooler.supabase.com") ||
    process.env.APP_ENV === "staging"
  );
}

export function createPgPoolConfig(
  connectionString: string,
  max: number
): PoolConfig {
  const sanitizedConnectionString = stripSslMode(connectionString);

  if (shouldUseInsecureTls(sanitizedConnectionString)) {
    return {
      connectionString: sanitizedConnectionString,
      max,
      ssl: { rejectUnauthorized: false }
    };
  }

  return {
    connectionString: sanitizedConnectionString,
    max
  };
}
