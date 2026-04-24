import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, Command } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InteractiveBackground } from "@/components/ui/InteractiveBackground";

const loginSchema = z.object({
  identifier: z.string().min(3, "Ingresa un usuario o correo válido"),
  password: z.string().min(3, "Ingresa tu contraseña"),
});

type LoginMode = "staff" | "family";

export default function Auth() {
  const { isProviderOwner, loading, signIn, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { slug } = useParams<{ slug?: string }>();

  const [loginMode, setLoginMode] = useState<LoginMode>("staff");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ identifier: "", password: "" });
  
  const [branding, setBranding] = useState<{
    name?: string;
    display_name?: string;
    logo_url?: string;
    primary_color?: string;
    isLoaded: boolean;
  }>({ isLoaded: false });

  // Cargar branding del colegio si hay un slug en la URL
  useEffect(() => {
    async function loadBranding() {
      if (!slug) {
        setBranding({ isLoaded: true });
        return;
      }
      // Se obtiene el branding de manera tipada 
      const { data, error } = await supabase.rpc("get_public_institution_branding", { p_slug: slug });
      if (!error && data && typeof data === 'object' && Object.keys(data).length > 0) {
        setBranding({ ...(data as { name?: string; display_name?: string; logo_url?: string; primary_color?: string }), isLoaded: true });
      } else {
        setBranding({ isLoaded: true });
      }
    }
    loadBranding();
  }, [slug]);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (user && !loading) {
      navigate(isProviderOwner ? "/etymon" : "/");
    }
  }, [isProviderOwner, loading, navigate, user]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    const validation = loginSchema.safeParse(loginData);
    if (!validation.success) {
      toast({
        title: "Error de validacion",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginData.identifier, loginData.password, { loginMode });
    setIsLoading(false);

    if (error) {
      toast({
        title: "Error al iniciar sesion",
        description: "Credenciales invalidas o cuenta no autorizada",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Bienvenido a la plataforma" });
  };

  if (loading || !branding.isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <Loader2 className="h-8 w-8 animate-spin text-[#00e7a7]" />
      </div>
    );
  }

  // Lógica de identidad visual
  const isEtymon = !slug || (!branding.display_name && !branding.name);
  const displayName = branding.display_name || branding.name || "Etymon SaaS";
  const primaryColor = branding.primary_color || "#00e7a7";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505]">
      <InteractiveBackground primaryColor={primaryColor} />

      <div className="relative z-10 w-full max-w-[420px] p-6">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {/* Header & Logo */}
          <div className="mb-8 flex flex-col items-center justify-center text-center">
            {isEtymon ? (
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#00e7a7] to-[#009b70] shadow-[0_0_40px_rgba(0,231,167,0.3)]">
                <Command className="h-8 w-8 text-black" />
              </div>
            ) : branding.logo_url ? (
              <div className="mb-6 h-20 w-20 overflow-hidden rounded-2xl bg-white p-2 shadow-2xl">
                <img src={branding.logo_url} alt={displayName} className="h-full w-full object-contain" />
              </div>
            ) : (
              <div 
                className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="text-2xl font-bold text-white">{displayName.charAt(0)}</span>
              </div>
            )}
            
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {isEtymon ? "ETYMON" : displayName}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {isEtymon ? "SaaS de Gestión Académica" : "Portal de acceso seguro"}
            </p>
          </div>

          {/* Login Box */}
          <div className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-8 text-white shadow-2xl backdrop-blur-xl">
            {/* Toggle Mode */}
            <div className="mb-6 flex rounded-xl bg-black/60 p-1">
              <button
                type="button"
                onClick={() => setLoginMode("staff")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  loginMode === "staff" ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/80"
                }`}
              >
                Personal
              </button>
              <button
                type="button"
                onClick={() => setLoginMode("family")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  loginMode === "family" ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/80"
                }`}
              >
                Estudiante
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/50">
                  {loginMode === "family" ? "Usuario Institucional" : "Correo Electrónico"}
                </Label>
                <Input
                  type={loginMode === "family" ? "text" : "email"}
                  placeholder={loginMode === "family" ? "ej. fmvega" : "usuario@colegio.edu"}
                  value={loginData.identifier}
                  onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                  className="h-12 border-white/10 bg-black/50 px-4 text-white placeholder:text-white/20 focus:border-[#00e7a7]/50 focus:ring-[#00e7a7]/20"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/50">Contraseña</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="h-12 border-white/10 bg-black/50 px-4 pr-10 text-white placeholder:text-white/20 focus:border-[#00e7a7]/50 focus:ring-[#00e7a7]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="mt-2 h-12 w-full font-bold text-black transition-transform active:scale-[0.98]"
                style={{ backgroundColor: isEtymon ? "#00e7a7" : primaryColor }}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Iniciar Sesión"}
              </Button>
            </form>
          </div>
          
          <div className="mt-8 text-center text-xs text-white/30">
            Powered by <span className="font-semibold tracking-wider text-white/50">ETYMON</span>
          </div>
        </div>
      </div>
    </div>
  );
}
