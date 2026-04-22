import { createId, type BusinessContext, type BusinessSession } from "./product-state";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api-staging-qvmv.onrender.com";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type PasswordGrantResponse = {
  access_token: string;
  refresh_token?: string;
  user?: {
    id?: string;
    email?: string;
  };
};

type ErrorDetails = {
  message: string;
  code: string | null;
};

export class SupabaseBrowserAuthError extends Error {
  readonly code: string | null;
  readonly status: number;

  constructor(input: { message: string; code?: string | null; status: number }) {
    super(input.message);
    this.name = "SupabaseBrowserAuthError";
    this.code = input.code ?? null;
    this.status = input.status;
  }
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

function requireSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase browser auth is not configured for this deployment.");
  }
}

async function readJson(response: Response) {
  const text = await response.text();
  return text.length === 0 ? null : (JSON.parse(text) as unknown);
}

function extractErrorDetails(payload: unknown, fallback: string): ErrorDetails {
  let message = fallback;
  let code: string | null = null;

  if (typeof payload === "object" && payload !== null) {
    if (typeof (payload as { error_code?: unknown }).error_code === "string") {
      code = (payload as { error_code: string }).error_code;
    } else if (typeof (payload as { code?: unknown }).code === "string") {
      code = (payload as { code: string }).code;
    }

    if (typeof (payload as { msg?: unknown }).msg === "string") {
      message = (payload as { msg: string }).msg;
    } else if (typeof (payload as { message?: unknown }).message === "string") {
      message = (payload as { message: string }).message;
    } else if (typeof (payload as { error_description?: unknown }).error_description === "string") {
      message = (payload as { error_description: string }).error_description;
    }
  }

  return { message, code };
}

export async function signUpWithPassword(input: { email: string; password: string; displayName: string }) {
  requireSupabaseConfig();

  const response = await fetch(`${normalizeBaseUrl(supabaseUrl)}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      authorization: `Bearer ${supabaseAnonKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      data: {
        display_name: input.displayName
      }
    })
  });

  const payload = await readJson(response);
  if (!response.ok) {
    const error = extractErrorDetails(payload, "Unable to create the auth account.");
    throw new SupabaseBrowserAuthError({
      message: error.message,
      code: error.code,
      status: response.status
    });
  }

  return signInWithPassword({ email: input.email, password: input.password });
}

export async function signInWithPassword(input: { email: string; password: string }) {
  requireSupabaseConfig();

  const response = await fetch(`${normalizeBaseUrl(supabaseUrl)}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      authorization: `Bearer ${supabaseAnonKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password
    })
  });

  const payload = (await readJson(response)) as PasswordGrantResponse | null;
  if (!response.ok || !payload?.access_token || !payload.user?.id || !payload.user.email) {
    const error = extractErrorDetails(payload, "Unable to sign in with email and password.");
    throw new SupabaseBrowserAuthError({
      message: error.message,
      code: error.code,
      status: response.status
    });
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    userId: payload.user.id,
    email: payload.user.email
  };
}

async function apiFetch<T>(accessToken: string, path: string, init?: RequestInit) {
  const response = await fetch(`${normalizeBaseUrl(apiBaseUrl)}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(extractErrorDetails(payload, `Request failed with status ${response.status}`).message);
  }

  return payload as T;
}

export async function fetchBusinessContext(accessToken: string) {
  return apiFetch<BusinessContext>(accessToken, "/v1/business/context", {
    method: "GET"
  });
}

export async function createBusinessOrg(
  accessToken: string,
  input: { businessName: string; contactName: string; email: string; phone: string; city: string }
) {
  return apiFetch<BusinessContext>(accessToken, "/v1/business/orgs", {
    method: "POST",
    headers: {
      "Idempotency-Key": `${createId("idem")}-business-org`
    },
    body: JSON.stringify(input)
  });
}

export function createBusinessSession(input: {
  accessToken: string;
  refreshToken: string | null;
  context: BusinessContext;
}): BusinessSession {
  return {
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    context: input.context
  };
}
