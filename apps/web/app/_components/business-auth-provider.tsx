"use client";

import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import {
  createBusinessSession,
  fetchBusinessContext,
  getCurrentAuthSession,
  AUTH_RESTORE_TIMEOUT_MS,
  BrowserAuthTimeoutError,
  refreshCurrentAuthSession,
  signOutBusiness,
  subscribeToAuthChanges,
  syncAuthCookie,
  withTimeout,
  type BrowserAuthSession
} from '../_lib/auth';
import { buildAuthRedirectTarget } from '../_lib/route-protection';
import { clearBusinessSession, readBusinessSession, saveBusinessSession, type BusinessContext, type BusinessSession } from '../_lib/product-state';

type BusinessAuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

type BusinessAuthContextValue = {
  status: BusinessAuthStatus;
  session: BusinessSession | null;
  error: string | null;
  hydrateSession: (authSession: BrowserAuthSession, context: BusinessContext) => BusinessSession;
  refreshBusinessSession: () => Promise<BusinessSession | null>;
  signOut: () => Promise<void>;
};

const BusinessAuthContext = createContext<BusinessAuthContextValue | null>(null);

function buildSession(authSession: BrowserAuthSession, context: BusinessContext) {
  const nextSession = createBusinessSession({ authSession, context });
  saveBusinessSession(nextSession);
  return nextSession;
}

function isTimeoutError(issue: unknown) {
  return issue instanceof BrowserAuthTimeoutError;
}

export function BusinessAuthProvider(props: { children: ReactNode }) {
  const [status, setStatus] = useState<BusinessAuthStatus>('loading');
  const [session, setSession] = useState<BusinessSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const restoreAttemptRef = useRef(0);

  const hydrateSession = useCallback((authSession: BrowserAuthSession, context: BusinessContext) => {
    const nextSession = buildSession(authSession, context);
    setSession(nextSession);
    setStatus('authenticated');
    setError(null);
    return nextSession;
  }, []);

  const resetToUnauthenticated = useCallback(() => {
    restoreAttemptRef.current += 1;
    clearBusinessSession();
    syncAuthCookie(null);
    setSession(null);
    setStatus('unauthenticated');
    setError(null);
  }, [restoreAttemptRef]);

  const resolveBusinessSession = useCallback(
    async (authSession: BrowserAuthSession | null) => {
      const attemptId = ++restoreAttemptRef.current;

      if (!authSession) {
        if (attemptId === restoreAttemptRef.current) {
          clearBusinessSession();
          syncAuthCookie(null);
          setSession(null);
          setStatus('unauthenticated');
          setError(null);
        }
        return null;
      }

      try {
        const context = await withTimeout(fetchBusinessContext(authSession.accessToken), {
          timeoutMs: AUTH_RESTORE_TIMEOUT_MS,
          action: 'Business context restore'
        });

        if (attemptId !== restoreAttemptRef.current) {
          return null;
        }

        return hydrateSession(authSession, context);
      } catch (issue) {
        if (attemptId !== restoreAttemptRef.current) {
          return null;
        }

        if (isTimeoutError(issue)) {
          clearBusinessSession();
          syncAuthCookie(null);
          setSession(null);
          setStatus('unauthenticated');
          setError(null);
          return null;
        }

        const message = issue instanceof Error ? issue.message : 'Unable to load the authenticated workspace.';
        const cached = readBusinessSession();
        if (cached?.userId === authSession.userId) {
          const fallback = {
            ...cached,
            accessToken: authSession.accessToken,
            refreshToken: authSession.refreshToken,
            expiresAt: authSession.expiresAt,
            email: authSession.email
          } satisfies BusinessSession;
          saveBusinessSession(fallback);
          setSession(fallback);
          setStatus('authenticated');
          setError(message);
          return fallback;
        }

        clearBusinessSession();
        syncAuthCookie(null);
        setSession(null);
        setStatus('error');
        setError(message);
        return null;
      }
    },
    [hydrateSession, restoreAttemptRef]
  );

  const refreshBusinessSession = useCallback(async () => {
    const authSession = await withTimeout(refreshCurrentAuthSession().catch(() => getCurrentAuthSession()), {
      timeoutMs: AUTH_RESTORE_TIMEOUT_MS,
      action: 'Supabase session refresh'
    }).catch((issue) => {
      if (isTimeoutError(issue)) {
        resetToUnauthenticated();
        return null;
      }

      throw issue;
    });

    return resolveBusinessSession(authSession);
  }, [resolveBusinessSession, resetToUnauthenticated]);

  const signOut = useCallback(async () => {
    restoreAttemptRef.current += 1;
    await signOutBusiness();
    clearBusinessSession();
    setSession(null);
    setStatus('unauthenticated');
    setError(null);
  }, [restoreAttemptRef]);

  useEffect(() => {
    let active = true;

    void withTimeout(getCurrentAuthSession(), {
      timeoutMs: AUTH_RESTORE_TIMEOUT_MS,
      action: 'Supabase session restore'
    })
      .then((authSession) => (active ? resolveBusinessSession(authSession) : null))
      .catch((issue) => {
        if (!active) {
          return;
        }

        if (isTimeoutError(issue)) {
          resetToUnauthenticated();
          return;
        }

        clearBusinessSession();
        syncAuthCookie(null);
        setSession(null);
        setStatus('error');
        setError(issue instanceof Error ? issue.message : 'Unable to restore the authenticated session.');
      });

    const unsubscribe = subscribeToAuthChanges((event, authSession) => {
      if (!active) {
        return;
      }

      if (event === 'SIGNED_OUT') {
        resetToUnauthenticated();
        return;
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        void resolveBusinessSession(authSession);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [resetToUnauthenticated, resolveBusinessSession]);

  const value = useMemo<BusinessAuthContextValue>(
    () => ({
      status,
      session,
      error,
      hydrateSession,
      refreshBusinessSession,
      signOut
    }),
    [error, hydrateSession, refreshBusinessSession, session, signOut, status]
  );

  return <BusinessAuthContext.Provider value={value}>{props.children}</BusinessAuthContext.Provider>;
}

export function useBusinessAuth() {
  const context = useContext(BusinessAuthContext);
  if (!context) {
    throw new Error('useBusinessAuth must be used within BusinessAuthProvider.');
  }

  return context;
}

export function BusinessRouteGuard(props: { children: ReactNode }) {
  const { status, session, error, refreshBusinessSession, signOut } = useBusinessAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      router.replace(
        buildAuthRedirectTarget({
          pathname,
          search
        })
      );
      return;
    }

    if (status === 'authenticated' && !session?.context.currentOrg) {
      router.replace('/get-started');
    }
  }, [pathname, router, session?.context.currentOrg, status]);

  if (status === 'loading') {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <strong>Restoring authenticated workspace</strong>
          <p>Checking the Supabase session and loading the business context.</p>
        </section>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <p className="eyebrow">Session issue</p>
          <h1>Authenticated state could not be restored.</h1>
          <p>{error ?? 'Retry the session restore or sign out and start again.'}</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => void refreshBusinessSession()} type="button">
              Retry Session
            </button>
            <button
              className="button button-secondary"
              onClick={() => {
                void signOut().then(() => router.replace('/get-started'));
              }}
              type="button"
            >
              Sign Out
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (status !== 'authenticated' || !session?.context.currentOrg) {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <strong>Redirecting to onboarding</strong>
        </section>
      </main>
    );
  }

  return <>{props.children}</>;
}
