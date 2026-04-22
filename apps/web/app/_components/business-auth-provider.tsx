"use client";

import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import {
  createBusinessSession,
  fetchBusinessContext,
  getCurrentAuthSession,
  refreshCurrentAuthSession,
  signOutBusiness,
  subscribeToAuthChanges,
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

export function BusinessAuthProvider(props: { children: ReactNode }) {
  const [status, setStatus] = useState<BusinessAuthStatus>('loading');
  const [session, setSession] = useState<BusinessSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hydrateSession = useCallback((authSession: BrowserAuthSession, context: BusinessContext) => {
    const nextSession = buildSession(authSession, context);
    setSession(nextSession);
    setStatus('authenticated');
    setError(null);
    return nextSession;
  }, []);

  const resolveBusinessSession = useCallback(
    async (authSession: BrowserAuthSession | null) => {
      if (!authSession) {
        clearBusinessSession();
        setSession(null);
        setStatus('unauthenticated');
        setError(null);
        return null;
      }

      try {
        const context = await fetchBusinessContext(authSession.accessToken);
        return hydrateSession(authSession, context);
      } catch (issue) {
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
        setSession(null);
        setStatus('error');
        setError(message);
        return null;
      }
    },
    [hydrateSession]
  );

  const refreshBusinessSession = useCallback(async () => {
    const authSession = await refreshCurrentAuthSession().catch(() => getCurrentAuthSession());
    return resolveBusinessSession(authSession);
  }, [resolveBusinessSession]);

  const signOut = useCallback(async () => {
    await signOutBusiness();
    clearBusinessSession();
    setSession(null);
    setStatus('unauthenticated');
    setError(null);
  }, []);

  useEffect(() => {
    let active = true;

    void getCurrentAuthSession()
      .then((authSession) => (active ? resolveBusinessSession(authSession) : null))
      .catch((issue) => {
        if (!active) {
          return;
        }

        clearBusinessSession();
        setSession(null);
        setStatus('error');
        setError(issue instanceof Error ? issue.message : 'Unable to restore the authenticated session.');
      });

    const unsubscribe = subscribeToAuthChanges((event, authSession) => {
      if (!active) {
        return;
      }

      if (event === 'SIGNED_OUT') {
        clearBusinessSession();
        setSession(null);
        setStatus('unauthenticated');
        setError(null);
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
  }, [resolveBusinessSession]);

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
