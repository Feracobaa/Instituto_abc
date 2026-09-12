import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, Camera } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { InteractiveBackground } from "@/components/ui/InteractiveBackground";
import { InteractiveLogoVideo } from "@/components/ui/InteractiveLogoVideo";
import { BiometricLoginModal } from "@/components/biometrics/BiometricLoginModal";
import { AuthConsentNotice, AuthLegalFooter } from "@/components/auth/AuthLegalFooter";

const loginSchema = z.object({
  identifier: z.string().min(3, "Ingresa un usuario o correo válido"),
  password: z.string().min(3, "Ingresa tu contraseña"),
});

type LoginMode = "staff" | "family";

export default function Auth() {
  const { isProviderOwner, loading, signIn, user } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();

  const [loginMode, setLoginMode] = useState<LoginMode>("staff");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);
  const [loginData, setLoginData] = useState({ identifier: "", password: "" });

  const [branding, setBranding] = useState<{
    id?: string;
    accent_color?: string;
    cover_image_url?: string;
    name?: string;
    display_name?: string;
    font_family?: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    visual_style?: string;
    isLoaded: boolean;
  }>({ isLoaded: false });

  useEffect(() => {
    async function loadBranding() {
      if (!slug) {
        setBranding({ isLoaded: true });
        return;
      }
      const { data, error } = await supabase.rpc("get_public_institution_branding", { p_slug: slug });
      if (!error && data && typeof data === "object" && Object.keys(data).length > 0) {
        setBranding({
          ...(data as {
            accent_color?: string;
            cover_image_url?: string;
            name?: string;
            display_name?: string;
            font_family?: string;
            logo_url?: string;
            primary_color?: string;
            secondary_color?: string;
            visual_style?: string;
          }),
          isLoaded: true,
        });
      } else {
        setBranding({ isLoaded: true });
      }
    }
    loadBranding();
  }, [slug]);

  useEffect(() => {
    if (user && !loading) {
      navigate(isProviderOwner ? "/etymon" : "/");
    }
  }, [isProviderOwner, loading, navigate, user]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    const validation = loginSchema.safeParse(loginData);
    if (!validation.success) {
      toast.error("Error al iniciar sesion", {
        description: "Credenciales invalidas o cuenta no autorizada",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginData.identifier, loginData.password, { loginMode });
    setIsLoading(false);

    if (error) {
      toast.error("Error al iniciar sesion", {
        description: "Credenciales invalidas o cuenta no autorizada",
      });
      return;
    }

    toast.success("Bienvenido a la plataforma");
  };

  if (loading || !branding.isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060e22]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const isEtymon = !slug || (!branding.display_name && !branding.name);
  const displayName = branding.display_name || branding.name || "Etymon SaaS";
  const primaryColor = branding.primary_color || "#2563eb";
  const accentColor = branding.accent_color || "#3b82f6";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060e22]">
      <InteractiveBackground primaryColor={primaryColor} />

      <div className="relative z-10 w-full max-w-[420px] p-6">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="mb-8 flex flex-col items-center justify-center text-center">
            {isEtymon ? (
              <div className="mb-6">
                <InteractiveLogoVideo
                  src="/Logo_animated_for_webpage_202607091648.mp4"
                  className="h-20 w-20 bg-transparent"
                />
              </div>
            ) : branding.logo_url ? (
              <div className="mb-6 h-20 w-20 overflow-hidden rounded-2xl bg-white p-2 shadow-2xl">
                <img src={branding.logo_url} alt={displayName} className="h-full w-full object-contain" />
              </div>
            ) : (
              <div
                className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.25)]"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="text-2xl font-bold text-white">{displayName.charAt(0)}</span>
              </div>
            )}

            <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
              {isEtymon ? "ETYMON" : displayName}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              {isEtymon ? "SaaS de Gestión Académica" : "Portal de acceso seguro"}
            </p>
          </div>

          <div className="rounded-3xl border border-blue-500/20 bg-[#0c1833]/85 p-8 text-white shadow-2xl shadow-blue-950/60 backdrop-blur-2xl ring-1 ring-white/10">
            <div className="mb-6 flex rounded-xl bg-[#060e22]/80 border border-blue-500/15 p-1">
              <button
                type="button"
                onClick={() => setLoginMode("staff")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                  loginMode === "staff"
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Personal
              </button>
              <button
                type="button"
                onClick={() => setLoginMode("family")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                  loginMode === "family"
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Estudiante
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-300/80">
                  {loginMode === "family" ? "Usuario Institucional" : "Correo Electrónico"}
                </Label>
                <Input
                  type={loginMode === "family" ? "text" : "email"}
                  placeholder={loginMode === "family" ? "ej. fmvega" : "usuario@colegio.edu"}
                  value={loginData.identifier}
                  onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                  className="h-12 border-slate-700/60 bg-[#060e22]/70 px-4 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-300/80">Contraseña</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="h-12 border-slate-700/60 bg-[#060e22]/70 px-4 pr-10 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="mt-2 h-12 w-full font-bold text-white transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:brightness-110 active:scale-[0.98] rounded-xl"
                style={{
                  background: isEtymon
                    ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                    : `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                }}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" /> : "Iniciar Sesión"}
              </Button>

              <AuthConsentNotice />
            </form>

            <div className="relative my-6 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-blue-500/15" />
              </div>
              <div className="relative bg-[#0c1833] px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                o acceso rápido
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled
              title="Disponible cuando la verificación de vida en servidor esté implementada"
              className="h-12 w-full border-blue-500/20 bg-blue-500/5 text-blue-300/60 font-semibold flex items-center justify-center gap-2 cursor-not-allowed rounded-xl"
            >
              <Camera className="h-5 w-5 text-blue-400" />
              Acceso facial temporalmente no disponible
            </Button>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400/60">
            Powered by <span className="font-semibold tracking-wider text-blue-300/80">ETYMON</span>
          </div>

          <AuthLegalFooter />
        </div>
      </div>

      <BiometricLoginModal
        isOpen={isBiometricModalOpen}
        institutionId={branding.id}
        onClose={() => setIsBiometricModalOpen(false)}
        onSuccess={() => {
          navigate(isProviderOwner ? "/etymon" : "/");
        }}
      />
    </div>
  );
}
