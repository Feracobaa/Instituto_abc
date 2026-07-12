import { ShieldAlert, PhoneCall, HelpCircle, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";


interface BlockedInstitutionAlertProps {
  institutionName: string | null;
}

export function BlockedInstitutionAlert({ institutionName }: BlockedInstitutionAlertProps) {
  const { userRole, signOut } = useAuth();
  const schoolDisplayName = institutionName || "mi colegio";

  const handleContactSupport = () => {
    let roleText = "la administración";
    if (userRole === "rector") roleText = "la rectoría";
    else if (userRole === "contable") roleText = "el área de contabilidad";

    const message = encodeURIComponent(
      `Hola, soy de ${roleText} de ${schoolDisplayName} y requiero asistencia con el estado de cuenta y renovación de la licencia de la plataforma ETYMON.`
    );
    window.open(`https://wa.me/573239398177?text=${message}`, "_blank");
  };

  const handleContactSupportGeneral = () => {
    window.open("https://wa.me/573239398177", "_blank");
  };

  // Determinar contenido según el rol
  const isDirectPayer = userRole === "rector" || userRole === "contable";
  const isTeacher = userRole === "profesor";
  const isParent = userRole === "parent";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      {/* Background visual details */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-destructive/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-emerald-500/5 blur-3xl" />

      <div className="relative mx-auto max-w-xl overflow-hidden rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-2xl transition-all duration-300 hover:shadow-destructive/5">
        {/* Glowing Top Bar (Red Accent) */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-destructive/60 via-destructive to-destructive/60" />

        {/* Shield Alert Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-8 ring-destructive/5 dark:bg-destructive/20 dark:ring-destructive/10">
          <ShieldAlert className="h-10 w-10 animate-pulse" />
        </div>

        <h1 className="mt-6 font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Acceso Suspendido
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          El acceso a la plataforma para la institución <strong className="text-foreground">{schoolDisplayName}</strong> ha sido suspendido temporalmente debido a saldos pendientes por concepto de licenciamiento del servicio.
        </p>

        {/* Information box tailored by user role */}
        <div className="mt-6 rounded-xl border border-border bg-muted/40 p-5 text-left text-sm leading-relaxed dark:bg-slate-950/20">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <User className="h-4 w-4 text-destructive" />
            Información del Perfil
          </h2>
          
          {isDirectPayer && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Como <strong>directivo o administrador</strong> de la institución, te sugerimos ponerte en contacto con el soporte administrativo de <strong>ETYMON</strong> para actualizar el estado de cuenta y proceder con la reactivación de la licencia del servicio de inmediato.
            </p>
          )}

          {isTeacher && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Estimado <strong>docente</strong>, el acceso para tu institución se encuentra restringido. Por favor, informa al área de dirección, rectoría o administración general de tu colegio para que gestionen la regularización del estado de cuenta de la plataforma.
            </p>
          )}

          {isParent && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Estimado <strong>acudiente</strong>, el portal escolar de la institución se encuentra fuera de servicio por mantenimiento administrativo de licencias. Por favor, comunícate con la secretaría o administración de tu colegio para obtener más información.
            </p>
          )}
        </div>

        {/* Contact buttons */}
        <div className="mt-8 space-y-4">
          {isDirectPayer ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button 
                  onClick={handleContactSupport} 
                  className="w-full gap-2 font-semibold shadow-md sm:w-auto"
                >
                  <PhoneCall className="h-4 w-4" />
                  Contactar Soporte
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleContactSupportGeneral}
                  className="w-full gap-2 sm:w-auto"
                >
                  <HelpCircle className="h-4 w-4" />
                  Atención al Cliente
                </Button>
              </div>
              <div className="flex justify-center pt-2">
                <Button 
                  variant="ghost" 
                  onClick={signOut}
                  className="gap-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Cerrar Sesión
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()} 
                  className="w-full gap-2 sm:w-auto"
                >
                  Intentar de Nuevo
                </Button>
              </div>
              <div className="flex justify-center pt-2">
                <Button 
                  variant="ghost" 
                  onClick={signOut}
                  className="gap-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Cerrar Sesión
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
