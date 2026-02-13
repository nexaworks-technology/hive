"use client";

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase-client';

interface SessionContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    refresh,
  }), [session, loading]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSessionContext must be used within SessionProvider');
  return ctx;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSessionContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
    }
  }, [loading, session, router, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Checking session...
      </div>
    );
  }

  if (!session) return null;

  return <>{children}</>;
}
