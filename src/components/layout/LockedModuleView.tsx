import { Lock, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LockedModuleViewProps {
  moduleName?: string;
}

export function LockedModuleView({ moduleName = "este módulo" }: LockedModuleViewProps) {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 shadow-inner">
        <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-sm">
          <Sparkles className="h-4 w-4 text-amber-500" />
        </div>
        <Lock className="h-10 w-10 text-primary" />
      </div>

      <h2 className="mb-3 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Módulo Bloqueado
      </h2>
      
      <p className="max-w-md text-center text-base text-muted-foreground">
        Tu institución actualmente no tiene acceso a <span className="font-semibold text-foreground">{moduleName}</span>. 
        Este espacio está diseñado para potenciar la gestión de tu colegio con herramientas avanzadas.
      </p>

      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
        <Button 
          className="h-12 gap-2 rounded-xl px-6 font-semibold"
          onClick={() => window.open("mailto:soporte@etymon.com?subject=Solicitud de Upgrade de Plan")}
        >
          Contactar a Soporte para Upgrade <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-12 max-w-sm rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
        <p className="text-sm text-card-foreground">
          ¿Crees que esto es un error? Por favor, verifica el estado de tu suscripción con el administrador de tu institución.
        </p>
      </div>
    </div>
  );
}
