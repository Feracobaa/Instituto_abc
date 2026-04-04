import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'rector' | 'profesor' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  teacherId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role: 'rector' | 'profesor') => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data) {
      setUserRole(data.role as UserRole);
    }
  };

  const fetchTeacherId = async (userId: string) => {
    const { data } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data) {
      setTeacherId(data.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
            fetchTeacherId(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setTeacherId(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
        fetchTeacherId(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'rector' | 'profesor') => {
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
