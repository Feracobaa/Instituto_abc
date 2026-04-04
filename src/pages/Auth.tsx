import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Loader2, Shield, School, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

const registerSchema = z.object({
  fullName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['rector', 'profesor'])
});

export default function Auth() {
  const { user, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'profesor' as 'rector' | 'profesor'
  });

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = loginSchema.safeParse(loginData);
    if (!validation.success) {
      toast({ title: 'Error de validación', description: validation.error.errors[0].message, variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { error } = await signIn(loginData.email, loginData.password);
    setIsLoading(false);
    if (error) {
      toast({
        title: 'Error al iniciar sesión',
        description: error.message === 'Invalid login credentials' ? 'Credenciales inválidas' : error.message,
        variant: 'destructive'
      });
    } else {
      toast({ title: '¡Bienvenido!', description: 'Has iniciado sesión correctamente.' });
      navigate('/');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = registerSchema.safeParse(registerData);
    if (!validation.success) {
      toast({ title: 'Error de validación', description: validation.error.errors[0].message, variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(registerData.email, registerData.password, registerData.fullName, registerData.role);
    setIsLoading(false);
    if (error) {
      toast({
        title: 'Error al registrarse',
        description: error.message.includes('already registered') ? 'Este email ya está registrado' : error.message,
        variant: 'destructive'
      });
    } else {
      toast({ title: 'Registro exitoso', description: 'Tu cuenta ha sido creada.' });
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-auth">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex gradient-auth relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-72 h-72 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full bg-rector/15 blur-2xl pointer-events-none animate-float" />

      {/* Left branding panel (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-center items-start w-1/2 px-16 py-12 text-white">
        <div className="w-24 h-24 bg-white rounded-2xl p-2 shadow-xl mb-6 flex items-center justify-center">
          <img src="/logo-iabc.jpg" alt="Logo Instituto ABC" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold font-heading leading-tight mb-4">
          PLATAFORMA EN LÍNEA
          <span className="block text-2xl lg:text-3xl mt-2 text-white/90">INSTITUTO ABC</span>
        </h1>
        <p className="text-white/70 text-lg leading-relaxed max-w-sm">
          Sistema integral de gestión escolar para rectores y profesores de educación primaria.
        </p>
        <div className="mt-10 space-y-4">
          {[
            { icon: Shield, text: 'Gestión de perfiles por rol' },
            { icon: GraduationCap, text: 'Calificaciones y boletines PDF' },
            { icon: School, text: 'Horarios y materias integradas' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-white/80">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-3 p-1.5">
              <img src="/logo-iabc.jpg" alt="Logo Instituto ABC" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-bold text-white font-heading leading-tight">
              PLATAFORMA EN LÍNEA<br />INSTITUTO ABC
            </h1>
          </div>

          {/* Glass card */}
          <div className="glass-dark rounded-2xl p-7 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Acceso al Sistema</h2>
            <p className="text-white/55 text-sm mb-6">Inicia sesión o crea tu cuenta</p>

            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 bg-white/10 border border-white/15">
                <TabsTrigger value="login" className="text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                  Iniciar Sesión
                </TabsTrigger>
                <TabsTrigger value="register" className="text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                  Registrarse
                </TabsTrigger>
              </TabsList>

              {/* LOGIN */}
              <TabsContent value="login" className="mt-5">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/80 text-sm">Correo Electrónico</Label>
                    <Input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/35 focus:border-white/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/80 text-sm">Contraseña</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/35 focus:border-white/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full gradient-rector border-0 hover:opacity-90 h-10 font-semibold" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Iniciar Sesión
                  </Button>
                </form>
              </TabsContent>

              {/* REGISTER */}
              <TabsContent value="register" className="mt-5">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/80 text-sm">Nombre Completo</Label>
                    <Input
                      type="text"
                      placeholder="Juan Pérez"
                      value={registerData.fullName}
                      onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/35 focus:border-white/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/80 text-sm">Correo Electrónico</Label>
                    <Input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/35 focus:border-white/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/80 text-sm">Contraseña</Label>
                    <div className="relative">
                      <Input
                        type={showRegPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/35 focus:border-white/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Role selector cards */}
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Tipo de Usuario</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { value: 'rector', label: 'Rector', icon: Shield, desc: 'Gestión completa' },
                        { value: 'profesor', label: 'Profesor', icon: GraduationCap, desc: 'Calificaciones y clases' },
                      ] as const).map(({ value, label, icon: Icon, desc }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setRegisterData({ ...registerData, role: value })}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-center",
                            registerData.role === value
                              ? value === 'rector'
                                ? 'border-rector bg-rector/25 text-white shadow-glow-rector'
                                : 'border-profesor bg-profesor/25 text-white shadow-glow-profesor'
                              : 'border-white/15 bg-white/5 text-white/50 hover:border-white/30 hover:text-white/70'
                          )}
                        >
                          <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center",
                            registerData.role === value
                              ? value === 'rector' ? 'gradient-rector' : 'gradient-profesor'
                              : 'bg-white/10'
                          )}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{label}</p>
                            <p className="text-[11px] opacity-70">{desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button type="submit" className="w-full gradient-profesor border-0 hover:opacity-90 h-10 font-semibold" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Crear Cuenta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
