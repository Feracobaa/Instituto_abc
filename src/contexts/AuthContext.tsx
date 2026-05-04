import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/types';
import { buildGuardianAuthEmail, isLikelyEmailLogin } from '@/lib/guardianAuth';

type SupportedUserRole = 'rector' | 'profesor' | 'parent' | 'contable';
type UserRole = SupportedUserRole | null;
type LoginMode = 'staff' | 'family';
type ProviderSupportContext = Database['public']['Functions']['provider_get_support_context']['Returns'][number];

interface AuthContextType {
  effectiveInstitutionId: string | null;
  isProviderOwner: boolean;
  loading: boolean;
  refreshSupportContext: () => Promise<void>;
  session: Session | null;
  signIn: (
    identifier: string,
    password: string,
    options?: { loginMode?: LoginMode }
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: 'rector' | 'profesor' | 'contable',
    options?: { institutionId?: string | null },
  ) => Promise<{ error: Error | null }>;
  supportContext: ProviderSupportContext | null;
  teacherId: string | null;
  user: User | null;
  userRole: UserRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isSupportedUserRole = (role: string): role is SupportedUserRole =>
  role === 'rector' || role === 'profesor' || role === 'parent' || role === 'contable';



const isMissingProviderObjectError = (error: unknown) => {
  const casted = error as { code?: string; message?: string } | null;
  const message = casted?.message?.toLowerCase() ?? '';
  return (
    casted?.code === '42P01'
    || casted?.code === '42883'
    || message.includes('provider_')
    || message.includes('is_provider_owner')
  );
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [isProviderOwner, setIsProviderOwner] = useState(false);
  const [supportContext, setSupportContext] = useState<ProviderSupportContext | null>(null);
  const [effectiveInstitutionId, setEffectiveInstitutionId] = useState<string | null>(null);
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

  const fetchEffectiveInstitutionId = useCallback(async () => {
    const { data, error } = await supabase.rpc('current_institution_id');
    if (error) {
      throw error;
    }
    return data ?? null;
  }, []);

  const fetchProviderState = useCallback(async (userId: string) => {
    const { data: providerUser, error: providerError } = await supabase
      .from('provider_users')
      .select('role, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (providerError) {
      if (isMissingProviderObjectError(providerError)) {
        return {
          effectiveInstitutionId: await fetchEffectiveInstitutionId(),
          isProviderOwner: false,
          supportContext: null as ProviderSupportContext | null,
        };
      }

      throw providerError;
    }

    const isOwner = providerUser?.role === 'owner' && providerUser?.is_active === true;

    if (!isOwner) {
      return {
        effectiveInstitutionId: await fetchEffectiveInstitutionId(),
        isProviderOwner: false,
        supportContext: null as ProviderSupportContext | null,
      };
    }

    const [supportContextResult, effectiveInstitutionResult] = await Promise.all([
      supabase.rpc('provider_get_support_context'),
      supabase.rpc('current_institution_id'),
    ]);

    if (supportContextResult.error && !isMissingProviderObjectError(supportContextResult.error)) {
      throw supportContextResult.error;
    }

    if (effectiveInstitutionResult.error) {
      throw effectiveInstitutionResult.error;
    }

    const resolvedSupportContext = supportContextResult.data?.[0] ?? null;

    return {
      effectiveInstitutionId: effectiveInstitutionResult.data ?? resolvedSupportContext?.institution_id ?? null,
      isProviderOwner: true,
      supportContext: resolvedSupportContext,
    };
  }, [fetchEffectiveInstitutionId]);

  const refreshSupportContext = useCallback(async (overrideUserId?: string) => {
    const targetUserId = overrideUserId || user?.id;

    if (!targetUserId) {
      setIsProviderOwner(false);
      setSupportContext(null);
      setEffectiveInstitutionId(null);
      setUserRole(null);
      setTeacherId(null);
      return;
    }

    try {
      const [role, providerState] = await Promise.all([
        fetchUserRole(targetUserId),
        fetchProviderState(targetUserId),
      ]);
      const resolvedRole: UserRole =
        role
        ?? (providerState.isProviderOwner && providerState.supportContext ? 'rector' : null);
      const resolvedTeacherId =
        role === 'profesor'
          ? await fetchTeacherId(targetUserId)
          : null;

      setIsProviderOwner(providerState.isProviderOwner);
      setSupportContext(providerState.supportContext);
      setEffectiveInstitutionId(providerState.effectiveInstitutionId);
      setUserRole(resolvedRole);
      setTeacherId(resolvedTeacherId);
    } catch (error) {
      console.error('Failed to refresh provider support context', error);
    }
  }, [fetchProviderState, fetchTeacherId, fetchUserRole, user?.id]);

  const hydrateAuthState = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    supabase.functions.setAuth(nextSession?.access_token ?? '');

    if (!nextSession?.user) {
      hydratedUserIdRef.current = null;
      hydratingUserIdRef.current = null;
      userContextReadyRef.current = false;
      setIsProviderOwner(false);
      setSupportContext(null);
      setEffectiveInstitutionId(null);
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

    setLoading(true);
    hydratingUserIdRef.current = nextUserId;

    try {
      const [role, providerState] = await Promise.all([
        fetchUserRole(nextUserId),
        fetchProviderState(nextUserId),
      ]);
      const resolvedRole: UserRole =
        role
        ?? (providerState.isProviderOwner && providerState.supportContext ? 'rector' : null);
      const resolvedTeacherId = role === 'profesor' ? await fetchTeacherId(nextUserId) : null;

      hydratedUserIdRef.current = nextUserId;
      userContextReadyRef.current = true;
      setIsProviderOwner(providerState.isProviderOwner);
      setSupportContext(providerState.supportContext);
      setEffectiveInstitutionId(providerState.effectiveInstitutionId);
      setUserRole(resolvedRole);
      setTeacherId(resolvedTeacherId);
    } catch (error) {
      console.error('Failed to hydrate auth state', error);
      hydratedUserIdRef.current = nextUserId;
      userContextReadyRef.current = true;
      setIsProviderOwner(false);
      setSupportContext(null);
      setEffectiveInstitutionId(null);
      setUserRole(null);
      setTeacherId(null);
    } finally {
      hydratingUserIdRef.current = null;
      setLoading(false);
    }
  }, [fetchProviderState, fetchTeacherId, fetchUserRole, refreshSupportContext]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        void hydrateAuthState(nextSession);
      }
    );

    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      void hydrateAuthState(nextSession);
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
    role: 'rector' | 'profesor' | 'contable',
    options?: { institutionId?: string | null },
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    const targetInstitutionId = options?.institutionId ?? effectiveInstitutionId;

    if (!targetInstitutionId) {
      return {
        error: new Error('No hay una institucion activa para crear esta cuenta.'),
      };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          institution_id: targetInstitutionId,
          role,
        },
      },
    });

    if (error) return { error };

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    supabase.functions.setAuth('');
    hydratedUserIdRef.current = null;
    hydratingUserIdRef.current = null;
    userContextReadyRef.current = false;
    setIsProviderOwner(false);
    setSupportContext(null);
    setEffectiveInstitutionId(null);
    setUserRole(null);
    setTeacherId(null);
  };

  return (
    <AuthContext.Provider value={{
      effectiveInstitutionId,
      isProviderOwner,
      loading,
      refreshSupportContext,
      session,
      signIn,
      signOut,
      signUp,
      supportContext,
      teacherId,
      user,
      userRole,
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
