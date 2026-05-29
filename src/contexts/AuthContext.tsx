import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { z } from 'zod';
import { toast } from 'sonner';
import { cloudflareApi } from '@/integrations/cloudflare/client';
import { UserSchema } from '@/lib/schemas';
import { startPwaForceUpdatePolling } from '@/lib/pwaForceUpdate';

export type Profile = z.infer<typeof UserSchema>;

type AuthContextValue = {
  user: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const PWA_LOGIN_UPDATE_DELAY_MS = 25_000;
const PWA_UPDATE_TOAST_ID = 'pwa-update-ready';
const STORED_USER_PROFILE_KEY = 'auth_user_profile';

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function getStoredUserProfile(): Profile | null {
  if (typeof window === 'undefined') return null;

  const rawUser = localStorage.getItem(STORED_USER_PROFILE_KEY);
  if (!rawUser) return null;

  try {
    const parsedUser = JSON.parse(rawUser);
    const result = UserSchema.safeParse(parsedUser);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function setStoredUserProfile(user: Profile | null) {
  if (typeof window === 'undefined') return;

  if (!user) {
    localStorage.removeItem(STORED_USER_PROFILE_KEY);
    return;
  }

  localStorage.setItem(STORED_USER_PROFILE_KEY, JSON.stringify(user));
}

function showPwaUpdatePrompt(updateServiceWorker: UpdateServiceWorker) {
  toast('Доступне оновлення', {
    id: PWA_UPDATE_TOAST_ID,
    description: 'Натисніть, щоб оновити застосунок.',
    action: {
      label: 'Оновити',
      onClick: () => void updateServiceWorker(true),
    },
    duration: Infinity,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingPwaUpdate, setPendingPwaUpdate] = useState<UpdateServiceWorker | null>(null);
  const [delayPwaUpdateUntilLogin, setDelayPwaUpdateUntilLogin] = useState(false);

  const reloadUser = useCallback(async () => {
    if (!getStoredAccessToken()) {
      setUser(null);
      setLoading(false);
      return;
    }

    if (isOffline()) {
      setUser(getStoredUserProfile());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await cloudflareApi.auth.getUser();
      const nextUser = (data.user as Profile | null) ?? null;
      setUser(nextUser);
      setStoredUserProfile(nextUser);
    } catch {
      if (isOffline()) {
        const cachedUser = getStoredUserProfile();
        if (cachedUser) {
          setUser(cachedUser);
          return;
        }
      }

      setUser(null);
      setStoredUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadUser();
  }, [reloadUser]);

  useEffect(() => {
    const handleOnline = () => {
      void reloadUser();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [reloadUser]);

  useEffect(() => {
    const handlePwaUpdateReady = (event: Event) => {
      const updateServiceWorker = (event as CustomEvent<{ updateServiceWorker?: UpdateServiceWorker }>)
        .detail?.updateServiceWorker;

      if (!updateServiceWorker) return;
      setPendingPwaUpdate(() => updateServiceWorker);
    };

    window.addEventListener('pwa:update-ready', handlePwaUpdateReady);
    return () => window.removeEventListener('pwa:update-ready', handlePwaUpdateReady);
  }, []);

  useEffect(() => {
    if (!pendingPwaUpdate || loading) return;

    if (!user) {
      if (!delayPwaUpdateUntilLogin) setDelayPwaUpdateUntilLogin(true);
      return;
    }

    const timeoutId = window.setTimeout(
      () => {
        showPwaUpdatePrompt(pendingPwaUpdate);
        setPendingPwaUpdate(null);
        setDelayPwaUpdateUntilLogin(false);
      },
      delayPwaUpdateUntilLogin ? PWA_LOGIN_UPDATE_DELAY_MS : 0,
    );

    return () => window.clearTimeout(timeoutId);
  }, [delayPwaUpdateUntilLogin, loading, pendingPwaUpdate, user]);

  useEffect(() => {
    if (loading || !user) return;
    return startPwaForceUpdatePolling();
  }, [loading, user]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await cloudflareApi.auth.signIn(email, password);
      await reloadUser();
    },
    [reloadUser],
  );

  const signOut = useCallback(async () => {
    await cloudflareApi.auth.signOut();
    setUser(null);
    setStoredUserProfile(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut, reloadUser }),
    [loading, reloadUser, signIn, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
