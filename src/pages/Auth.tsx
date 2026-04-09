import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, GraduationCap, Loader2, School, Shield, Users } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const staffLoginSchema = z.object({
  identifier: z.string().email("Email invalido"),
  password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres"),
});

const familyLoginSchema = z.object({
  identifier: z.string().trim().min(3, "Ingresa el usuario del estudiante"),
  password: z.string().min(3, "Ingresa la contrasena actual"),
});

const registerSchema = z.object({
  fullName: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres"),
  role: z.enum(["rector", "profesor"]),
});

type LoginMode = "staff" | "family";

const allowPublicRegistration = false;

export default function Auth() {
  const { user, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loginMode, setLoginMode] = useState<LoginMode>("staff");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [loginData, setLoginData] = useState({ identifier: "", password: "" });
  const [registerData, setRegisterData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "profesor" as "rector" | "profesor",
  });

  useEffect(() => {
    if (user && !loading) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    const schema = loginMode === "family" ? familyLoginSchema : staffLoginSchema;
    const validation = schema.safeParse(loginData);

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
        description: error.message === "Invalid login credentials"
          ? "Credenciales invalidas"
          : error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Bienvenido",
      description: loginMode === "family"
        ? "Ingresaste al portal del estudiante."
        : "Has iniciado sesion correctamente.",
    });
    navigate("/");
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = registerSchema.safeParse(registerData);

    if (!validation.success) {
      toast({
        title: "Error de validacion",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(
      registerData.email,
      registerData.password,
      registerData.fullName,
      registerData.role,
    );
    setIsLoading(false);

    if (error) {
      toast({
        title: "Error al registrarse",
        description: error.message.includes("already registered")
          ? "Este email ya esta registrado"
          : error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Registro exitoso",
      description: "Tu cuenta ha sido creada.",
    });
    navigate("/");
  };

  if (loading) {
    return (
      <div className="gradient-auth flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="gradient-auth relative flex min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute left-[-5%] top-[-10%] h-72 w-72 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-5%] h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute left-1/4 top-1/2 h-48 w-48 animate-float rounded-full bg-rector/15 blur-2xl" />

      <div className="hidden w-1/2 flex-col items-start justify-center px-16 py-12 text-white lg:flex">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-white p-2 shadow-xl">
          <img src="/logo-iabc.jpg" alt="Logo Instituto ABC" className="h-full w-full object-contain" />
        </div>

        <h1 className="font-heading mb-4 text-4xl font-bold leading-tight lg:text-5xl">
          PLATAFORMA EN LINEA
          <span className="mt-2 block text-2xl text-white/90 lg:text-3xl">INSTITUTO ABC</span>
        </h1>

        <p className="max-w-sm text-lg leading-relaxed text-white/70">
          Gestion escolar para rectoria, docentes y tambien para el seguimiento academico del estudiante.
        </p>

        <div className="mt-10 space-y-4">
          {[
            { icon: Shield, text: "Gestion de perfiles por rol" },
            { icon: GraduationCap, text: "Calificaciones y boletines por periodo" },
            { icon: School, text: "Horarios y materias integradas" },
            { icon: Users, text: "Portal del estudiante para acudientes" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-white/80">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <div className="mb-3 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg">
              <img src="/logo-iabc.jpg" alt="Logo Instituto ABC" className="h-full w-full object-contain" />
            </div>
            <h1 className="font-heading text-xl font-bold leading-tight text-white">
              PLATAFORMA EN LINEA
              <br />
              INSTITUTO ABC
            </h1>
          </div>

          <div className="glass-dark rounded-2xl p-7 shadow-2xl">
            <h2 className="mb-1 text-xl font-bold text-white">Acceso al sistema</h2>
            <p className="mb-6 text-sm text-white/55">
              {loginMode === "family"
                ? "Acceso al portal del estudiante"
                : "Ingreso para rectoria y docentes"}
            </p>

            <Tabs defaultValue="login">
              {allowPublicRegistration && (
                <TabsList className="grid w-full grid-cols-2 border border-white/15 bg-white/10">
                  <TabsTrigger
                    value="login"
                    className="text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white"
                  >
                    Iniciar sesion
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white"
                  >
                    Registrarse
                  </TabsTrigger>
                </TabsList>
              )}

              <TabsContent value="login" className={allowPublicRegistration ? "mt-5" : "mt-0"}>
                <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
                  <button
                    type="button"
                    onClick={() => setLoginMode("staff")}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      loginMode === "staff" ? "bg-white/20 text-white" : "text-white/65 hover:text-white",
                    )}
                  >
                    Personal
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMode("family")}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      loginMode === "family" ? "bg-white/20 text-white" : "text-white/65 hover:text-white",
                    )}
                  >
                    Estudiante
                  </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-white/80">
                      {loginMode === "family" ? "Usuario del estudiante" : "Correo electronico"}
                    </Label>
                    <Input
                      type={loginMode === "family" ? "text" : "email"}
                      placeholder={loginMode === "family" ? "fmvega" : "correo@ejemplo.com"}
                      value={loginData.identifier}
                      onChange={(event) => setLoginData((current) => ({
                        ...current,
                        identifier: event.target.value,
                      }))}
                      className="border-white/20 bg-white/10 text-white placeholder:text-white/35 focus:border-white/50"
                    />
                    {loginMode === "family" && (
                      <p className="text-xs text-white/50">
                        Escribe el usuario entregado por rectoria, por ejemplo <span className="font-semibold text-white/80">fmvega</span>.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm text-white/80">Contrasena</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="********"
                        value={loginData.password}
                        onChange={(event) => setLoginData((current) => ({
                          ...current,
                          password: event.target.value,
                        }))}
                        className="border-white/20 bg-white/10 pr-10 text-white placeholder:text-white/35 focus:border-white/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/70"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="gradient-rector h-10 w-full border-0 font-semibold hover:opacity-90"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {loginMode === "family" ? "Entrar al portal del estudiante" : "Iniciar sesion"}
                  </Button>
                </form>
              </TabsContent>

              {allowPublicRegistration && (
                <TabsContent value="register" className="mt-5">
                  <div className="mb-4 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                    El registro publico es solo para el personal academico. Los accesos del portal del estudiante se
                    provisionan desde rectoria.
                  </div>

                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm text-white/80">Nombre completo</Label>
                      <Input
                        type="text"
                        placeholder="Juan Perez"
                        value={registerData.fullName}
                        onChange={(event) => setRegisterData((current) => ({
                          ...current,
                          fullName: event.target.value,
                        }))}
                        className="border-white/20 bg-white/10 text-white placeholder:text-white/35 focus:border-white/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm text-white/80">Correo electronico</Label>
                      <Input
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={registerData.email}
                        onChange={(event) => setRegisterData((current) => ({
                          ...current,
                          email: event.target.value,
                        }))}
                        className="border-white/20 bg-white/10 text-white placeholder:text-white/35 focus:border-white/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm text-white/80">Contrasena</Label>
                      <div className="relative">
                        <Input
                          type={showRegPassword ? "text" : "password"}
                          placeholder="********"
                          value={registerData.password}
                          onChange={(event) => setRegisterData((current) => ({
                            ...current,
                            password: event.target.value,
                          }))}
                          className="border-white/20 bg-white/10 pr-10 text-white placeholder:text-white/35 focus:border-white/50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword((current) => !current)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/70"
                        >
                          {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="gradient-profesor h-10 w-full border-0 font-semibold hover:opacity-90"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Crear cuenta
                    </Button>
                  </form>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
