import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { z } from 'zod';
import { cloudflareApi } from '@/integrations/cloudflare/client';
import { UserSchema } from '@/lib/schemas';

export type Profile = z.infer<typeof UserSchema>;

type AuthContextValue = {
  user: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const reloadUser = useCallback(async () => {
    if (!getStoredAccessToken()) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await cloudflareApi.auth.getUser();
      setUser((data.user as Profile | null) ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadUser();
  }, [reloadUser]);

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
