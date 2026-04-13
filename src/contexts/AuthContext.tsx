import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { buildGuardianAuthEmail, isLikelyEmailLogin } from '@/lib/guardianAuth';

type SupportedUserRole = 'rector' | 'profesor' | 'parent' | 'contable';
type UserRole = SupportedUserRole | null;
type LoginMode = 'staff' | 'family';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  teacherId: string | null;
  loading: boolean;
  signIn: (
    identifier: string,
    password: string,
    options?: { loginMode?: LoginMode }
  ) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: 'rector' | 'profesor' | 'contable'
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_CONTEXT_CACHE_KEY = 'iabc.auth-context';
const AUTH_CONTEXT_CACHE_MAX_AGE = 15 * 60 * 1000;

const isSupportedUserRole = (role: string): role is SupportedUserRole =>
  role === 'rector' || role === 'profesor' || role === 'parent' || role === 'contable';

interface CachedAuthContext {
  cachedAt: number;
  teacherId: string | null;
  userId: string;
  userRole: UserRole;
}

const readCachedAuthContext = (userId: string): CachedAuthContext | null => {
  try {
    const raw = sessionStorage.getItem(AUTH_CONTEXT_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CachedAuthContext;
    const isExpired = Date.now() - parsed.cachedAt > AUTH_CONTEXT_CACHE_MAX_AGE;

    if (parsed.userId !== userId || isExpired) {
      sessionStorage.removeItem(AUTH_CONTEXT_CACHE_KEY);
      return null;
    }

    return parsed;
  } catch {
    sessionStorage.removeItem(AUTH_CONTEXT_CACHE_KEY);
    return null;
  }
};

const writeCachedAuthContext = (payload: CachedAuthContext) => {
  try {
    sessionStorage.setItem(AUTH_CONTEXT_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota or private-mode errors; auth still works without cache.
  }
};

const clearCachedAuthContext = () => {
  try {
    sessionStorage.removeItem(AUTH_CONTEXT_CACHE_KEY);
  } catch {
    // Ignore storage access errors.
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hydratedUserIdRef = useRef<string | null>(null);
  const hydratingUserIdRef = useRef<string | null>(null);
  const userContextReadyRef = useRef(false);

  const fetchUserRole = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    
    return data && isSupportedUserRole(data.role) ? data.role : null;
  }, []);

  const fetchTeacherId = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    
    return data ? data.id : null;
  }, []);

  const hydrateAuthState = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    supabase.functions.setAuth(nextSession?.access_token ?? '');

    if (!nextSession?.user) {
      hydratedUserIdRef.current = null;
      hydratingUserIdRef.current = null;
      userContextReadyRef.current = false;
      clearCachedAuthContext();
      setUserRole(null);
      setTeacherId(null);
      setLoading(false);
      return;
    }

    const nextUserId = nextSession.user.id;

    if (hydratedUserIdRef.current === nextUserId && userContextReadyRef.current) {
      setLoading(false);
      return;
    }

    if (hydratingUserIdRef.current === nextUserId) {
      return;
    }

    const cachedContext = readCachedAuthContext(nextUserId);
    if (cachedContext) {
      hydratedUserIdRef.current = nextUserId;
      userContextReadyRef.current = true;
      setUserRole(cachedContext.userRole);
      setTeacherId(cachedContext.teacherId);
      setLoading(false);
      return;
    }

    setLoading(true);
    hydratingUserIdRef.current = nextUserId;

    try {
      const role = await fetchUserRole(nextUserId);
      const resolvedTeacherId =
        role === 'profesor'
          ? await fetchTeacherId(nextUserId)
          : null;

      hydratedUserIdRef.current = nextUserId;
      userContextReadyRef.current = true;
      setUserRole(role);
      setTeacherId(resolvedTeacherId);
      writeCachedAuthContext({
        cachedAt: Date.now(),
        teacherId: resolvedTeacherId,
        userId: nextUserId,
        userRole: role,
      });
    } catch (error) {
      console.error('Failed to hydrate auth state', error);
      hydratedUserIdRef.current = nextUserId;
      userContextReadyRef.current = true;
      clearCachedAuthContext();
      setUserRole(null);
      setTeacherId(null);
    } finally {
      hydratingUserIdRef.current = null;
      setLoading(false);
    }
  }, [fetchTeacherId, fetchUserRole]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void hydrateAuthState(session);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      void hydrateAuthState(session);
    });

    return () => subscription.unsubscribe();
  }, [hydrateAuthState]);

  const signIn = async (
    identifier: string,
    password: string,
    options?: { loginMode?: LoginMode },
  ) => {
    const loginMode = options?.loginMode ?? 'staff';
    const normalizedIdentifier =
      loginMode === 'family' && !isLikelyEmailLogin(identifier)
        ? buildGuardianAuthEmail(identifier)
        : identifier.trim();

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedIdentifier,
      password,
    });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: 'rector' | 'profesor' | 'contable'
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role
        }
      }
    });

    if (error) return { error };

    // Eliminamos la inserción manual desde el frontend a 'profiles', 'user_roles' y 'teachers'.
    // Ahora todo eso se maneja 100% de forma segura a través del Database Trigger en Supabase 
    // (creado con el archivo fix_teacher_registration.sql).
    // Esto previene los errores de RLS (Row Level Security) cuando la sesión aún no está lista.

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    supabase.functions.setAuth('');
    hydratedUserIdRef.current = null;
    hydratingUserIdRef.current = null;
    userContextReadyRef.current = false;
    clearCachedAuthContext();
    setUserRole(null);
    setTeacherId(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userRole,
      teacherId,
      loading,
      signIn,
      signUp,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
