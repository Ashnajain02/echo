import { useState, useEffect } from 'react';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { AuthState, SignUpMetadata } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { identifyUser, resetAnalyticsIdentity } from '@/lib/analytics';

const initialState: AuthState = {
  session: null,
  user: null,
  loading: true,
};

const SUPABASE_AUTH_STORAGE_PREFIX = (() => {
  // The Supabase auth storage key is `sb-<project_ref>-auth-token`.
  // Derive the project ref from the URL the client was created with so we
  // don't hardcode it. Falls back to a noop prefix if URL parsing fails.
  try {
    const host = new URL(SUPABASE_URL).hostname;
    const ref = host.split('.')[0];
    return ref ? `sb-${ref}-` : '';
  } catch {
    return '';
  }
})();

function forceClearSupabaseAuthStorage() {
  if (typeof window === 'undefined' || !SUPABASE_AUTH_STORAGE_PREFIX) return;

  const clearFrom = (storage: Storage) => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(SUPABASE_AUTH_STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => storage.removeItem(k));
  };

  try { clearFrom(window.localStorage); } catch { /* private mode */ }
  try { clearFrom(window.sessionStorage); } catch { /* private mode */ }
}

export const useAuthProvider = () => {
  const [authState, setAuthState] = useState<AuthState>(initialState);
  const [authReady, setAuthReady] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // onAuthStateChange handles all auth state updates including INITIAL_SESSION.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthState({
        session,
        user: session?.user ?? null,
        loading: false,
      });

      // authReady mirrors "has a usable session." Decoupled from `authState`
      // so listeners that key off readiness aren't notified on every token
      // refresh.
      if (session?.access_token) {
        setAuthReady(prev => prev || true);
      } else if (event === 'SIGNED_OUT') {
        setAuthReady(false);
      }

      // Single choke point for tying analytics events to a real user —
      // every sign-in path (password, OAuth, session restore on load) goes
      // through onAuthStateChange, so this is the one place that needs it.
      if (session?.user) {
        identifyUser(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        resetAnalyticsIdentity();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const toastFailure = (title: string, error: unknown, fallback: string) => {
    toast({
      title,
      description: getErrorMessage(error, fallback),
      variant: 'destructive',
    });
  };

  const signUp = async (email: string, password: string, metadata?: SignUpMetadata) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (error) {
      toastFailure('Error', error, 'Failed to sign up');
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      toastFailure('Error', error, 'Failed to sign in');
      throw error;
    }
  };

  const signOut = async () => {
    // Clear local auth state immediately so the UI updates without waiting
    // for the (sometimes-403'ing) server round trip.
    setAuthState({ session: null, user: null, loading: false });

    try { supabase.auth.stopAutoRefresh(); } catch { /* no-op */ }
    forceClearSupabaseAuthStorage();

    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) logger.warn('useAuthProvider', 'supabase.signOut returned error (continuing):', error);
    } catch (error) {
      logger.warn('useAuthProvider', 'supabase.signOut threw (continuing):', error);
    } finally {
      forceClearSupabaseAuthStorage();
    }
  };

  const resetPassword = async (email: string, redirectTo?: string) => {
    try {
      const resetUrl = redirectTo || `${window.location.origin}/auth?tab=update-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetUrl });
      if (error) throw error;
    } catch (error) {
      toastFailure('Error', error, 'Failed to send reset password email');
      throw error;
    }
  };

  const updatePassword = async (
    password: string,
    accessToken?: string | null,
    refreshToken?: string | null,
  ) => {
    try {
      if (accessToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });
        if (sessionError) throw sessionError;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
    } catch (error) {
      toastFailure('Error', error, 'Failed to update password');
      throw error;
    }
  };

  return {
    authState,
    authReady,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  };
};
