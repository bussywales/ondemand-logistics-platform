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

function extractErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null) {
    if (typeof (payload as { msg?: unknown }).msg === "string") {
      return (payload as { msg: string }).msg;
    }

    if (typeof (payload as { message?: unknown }).message === "string") {
      return (payload as { message: string }).message;
    }

    if (typeof (payload as { error_description?: unknown }).error_description === "string") {
      return (payload as { error_description: string }).error_description;
    }
  }

  return fallback;
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
    throw new Error(extractErrorMessage(payload, "Unable to create the auth account."));
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
    throw new Error(extractErrorMessage(payload, "Unable to sign in with email and password."));
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
    throw new Error(extractErrorMessage(payload, `Request failed with status ${response.status}`));
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
