const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://ondemand-logistics-platform-web.vercel.app",
  "https://ondemand-logistics-platform-web-xthetic-studios-projects.vercel.app"
] as const;

const DEFAULT_VERCEL_PROJECT_SLUGS = [
  "ondemand-logistics-platform",
  "ondemand-logistics-platform-web"
] as const;

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/$/, "");
}

function parseCsv(value?: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter((item) => item.length > 0);
}

function parseHostname(origin: string) {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function resolveAllowedOrigins(value?: string | null) {
  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...parseCsv(value)]));
}

export function resolveAllowedVercelProjects(value?: string | null) {
  return Array.from(new Set([...DEFAULT_VERCEL_PROJECT_SLUGS, ...parseCsv(value)]));
}

export function isAllowedCorsOrigin(input: {
  origin?: string | null;
  allowedOrigins?: string[];
  allowedVercelProjects?: string[];
}) {
  const origin = input.origin?.trim();
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  const allowedOrigins = input.allowedOrigins ?? resolveAllowedOrigins();
  if (allowedOrigins.includes(normalizedOrigin)) {
    return true;
  }

  const hostname = parseHostname(normalizedOrigin);
  if (!hostname || !hostname.endsWith(".vercel.app")) {
    return false;
  }

  const projectSlugs = input.allowedVercelProjects ?? resolveAllowedVercelProjects();
  return projectSlugs.some((slug) => hostname.startsWith(`${slug}-`) || hostname === `${slug}.vercel.app`);
}
