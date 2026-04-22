import { createClient, type AuthChangeEvent, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { APP_AUTH_COOKIE } from './route-protection';
import { createId, type BusinessContext, type BusinessSession } from './product-state';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api-staging-qvmv.onrender.com';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const AUTH_RESTORE_TIMEOUT_MS = 8000;

let browserClient: SupabaseClient | null = null;

export type BrowserAuthSession = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  userId: string;
  email: string;
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
    this.name = 'SupabaseBrowserAuthError';
    this.code = input.code ?? null;
    this.status = input.status;
  }
}

export class BrowserAuthTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(input: { action: string; timeoutMs: number }) {
    super(`${input.action} timed out after ${input.timeoutMs}ms.`);
    this.name = 'BrowserAuthTimeoutError';
    this.timeoutMs = input.timeoutMs;
  }
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/$/, '');
}

function requireSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase browser auth is not configured for this deployment.');
  }
}

function hasWindow() {
  return typeof window !== 'undefined';
}

export async function withTimeout<T>(promise: Promise<T>, input: { timeoutMs: number; action: string }) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race<T>([
      promise.finally(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new BrowserAuthTimeoutError(input));
        }, input.timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function readJson(text: string) {
  return text.length === 0 ? null : (JSON.parse(text) as unknown);
}

function extractErrorDetails(payload: unknown, fallback: string): ErrorDetails {
  let message = fallback;
  let code: string | null = null;

  if (typeof payload === 'object' && payload !== null) {
    if (typeof (payload as { error_code?: unknown }).error_code === 'string') {
      code = (payload as { error_code: string }).error_code;
    } else if (typeof (payload as { code?: unknown }).code === 'string') {
      code = (payload as { code: string }).code;
    }

    if (typeof (payload as { msg?: unknown }).msg === 'string') {
      message = (payload as { msg: string }).msg;
    } else if (typeof (payload as { message?: unknown }).message === 'string') {
      message = (payload as { message: string }).message;
    } else if (typeof (payload as { error_description?: unknown }).error_description === 'string') {
      message = (payload as { error_description: string }).error_description;
    }
  }

  return { message, code };
}

function mapSession(session: Session | null): BrowserAuthSession | null {
  if (!session?.access_token || !session.user?.id || !session.user.email) {
    return null;
  }

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token ?? null,
    expiresAt: session.expires_at ?? null,
    userId: session.user.id,
    email: session.user.email
  };
}

export function syncAuthCookie(session: BrowserAuthSession | null) {
  if (!hasWindow()) {
    return;
  }

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  if (!session) {
    document.cookie = `${APP_AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const maxAge = session.expiresAt ? Math.max(60, session.expiresAt - now) : 60 * 60 * 24 * 7;
  document.cookie = `${APP_AUTH_COOKIE}=1; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function getSupabaseBrowserClient() {
  requireSupabaseConfig();

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  return browserClient;
}

function toAuthError(error: { message: string; status?: number; code?: string | null }, fallback: string) {
  const details = extractErrorDetails(error, fallback);
  return new SupabaseBrowserAuthError({
    message: details.message,
    code: details.code ?? error.code ?? null,
    status: error.status ?? 400
  });
}

export async function signUpWithPassword(input: { email: string; password: string; displayName: string }) {
  const client = getSupabaseBrowserClient();
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        display_name: input.displayName
      }
    }
  });

  if (error) {
    throw toAuthError(error, 'Unable to create the auth account.');
  }

  const mapped = mapSession(data.session);
  if (mapped) {
    syncAuthCookie(mapped);
    return mapped;
  }

  return signInWithPassword({ email: input.email, password: input.password });
}

export async function signInWithPassword(input: { email: string; password: string }) {
  const client = getSupabaseBrowserClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: input.email,
    password: input.password
  });

  if (error || !data.session) {
    throw toAuthError(error ?? { message: 'Missing auth session.', status: 400 }, 'Unable to sign in with email and password.');
  }

  const mapped = mapSession(data.session);
  if (!mapped) {
    throw new SupabaseBrowserAuthError({
      message: 'Unable to read the Supabase auth session.',
      status: 400
    });
  }

  syncAuthCookie(mapped);
  return mapped;
}

export async function signOutBusiness() {
  const client = getSupabaseBrowserClient();
  const { error } = await client.auth.signOut();
  if (error) {
    throw toAuthError(error, 'Unable to sign out.');
  }

  syncAuthCookie(null);
}

export async function getCurrentAuthSession() {
  const client = getSupabaseBrowserClient();
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw toAuthError(error, 'Unable to restore the authenticated session.');
  }

  const mapped = mapSession(data.session);
  syncAuthCookie(mapped);
  return mapped;
}

export async function refreshCurrentAuthSession() {
  const client = getSupabaseBrowserClient();
  const { data, error } = await client.auth.refreshSession();
  if (error) {
    throw toAuthError(error, 'Unable to refresh the authenticated session.');
  }

  const mapped = mapSession(data.session);
  syncAuthCookie(mapped);
  return mapped;
}

export function subscribeToAuthChanges(listener: (event: AuthChangeEvent, session: BrowserAuthSession | null) => void) {
  const client = getSupabaseBrowserClient();
  const { data } = client.auth.onAuthStateChange((event, session) => {
    const mapped = mapSession(session);
    syncAuthCookie(mapped);
    window.setTimeout(() => listener(event, mapped), 0);
  });

  return () => data.subscription.unsubscribe();
}

async function apiFetch<T>(accessToken: string, path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTH_RESTORE_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${normalizeBaseUrl(apiBaseUrl)}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        ...(init?.headers ?? {})
      },
      cache: 'no-store',
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new BrowserAuthTimeoutError({
        action: `API request to ${path}`,
        timeoutMs: AUTH_RESTORE_TIMEOUT_MS
      });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const payload = readJson(await response.text());
  if (!response.ok) {
    throw new Error(extractErrorDetails(payload, `Request failed with status ${response.status}`).message);
  }

  return payload as T;
}

export async function fetchBusinessContext(accessToken: string) {
  return apiFetch<BusinessContext>(accessToken, '/v1/business/context', {
    method: 'GET'
  });
}

export async function createBusinessOrg(
  accessToken: string,
  input: { businessName: string; contactName: string; email: string; phone: string; city: string }
) {
  return apiFetch<BusinessContext>(accessToken, '/v1/business/orgs', {
    method: 'POST',
    headers: {
      'Idempotency-Key': `${createId('idem')}-business-org`
    },
    body: JSON.stringify(input)
  });
}

export function createBusinessSession(input: {
  authSession: BrowserAuthSession;
  context: BusinessContext;
}): BusinessSession {
  return {
    accessToken: input.authSession.accessToken,
    refreshToken: input.authSession.refreshToken,
    expiresAt: input.authSession.expiresAt,
    userId: input.authSession.userId,
    email: input.authSession.email,
    context: input.context
  };
}
