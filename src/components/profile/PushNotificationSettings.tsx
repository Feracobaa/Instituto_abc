import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Loader2, ShieldAlert, ShieldCheck, HelpCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PushNotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
    isLoading,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card className="border border-amber-500/20 bg-amber-500/5 shadow-md">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="rounded-full bg-amber-500/10 p-2 text-amber-500">
            <BellOff className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-lg">Notificaciones Push</CardTitle>
            <CardDescription>No disponible en este navegador</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="border border-amber-500/20 bg-amber-500/10">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-700 dark:text-amber-400">Compatibilidad Limitada</AlertTitle>
            <AlertDescription className="text-amber-600 dark:text-amber-300">
              Este navegador o dispositivo no soporta la Web Push API. Te recomendamos instalar la aplicación
              (PWA) desde Chrome, Edge o Safari, o habilitar las notificaciones del navegador en los ajustes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border border-border bg-card shadow-card hover:shadow-md transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/80 to-blue-600" />
      
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-full p-2.5 transition-all duration-300 ${
            isSubscribed 
              ? "bg-emerald-500/10 text-emerald-500 animate-pulse" 
              : "bg-primary/10 text-primary"
          }`}>
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-lg font-heading font-bold text-foreground">
              Alertas al Dispositivo
            </CardTitle>
            <CardDescription className="text-sm">
              Notificaciones instantáneas en Celular o Computador
            </CardDescription>
          </div>
        </div>
        
        {!isLoading && (
          <Badge 
            variant={permission === "denied" ? "destructive" : "secondary"}
            className={`capitalize ${isSubscribed ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent" : ""}`}
          >
            {isSubscribed ? "Activas" : permission === "denied" ? "Bloqueadas" : "Inactivas"}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Recibe notificaciones en tiempo real sobre nuevas calificaciones, pagos pendientes y asistencia, 
          incluso cuando no tengas la aplicación abierta en tu navegador.
        </p>

        {permission === "denied" && (
          <Alert variant="destructive" className="border-destructive/20 bg-destructive/5">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Permiso bloqueado</AlertTitle>
            <AlertDescription className="text-xs">
              Has denegado el permiso de notificaciones para este sitio. Para habilitarlas, haz clic en el
              icono del candado al lado de la URL del navegador y restablece los permisos.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-muted bg-secondary/30 p-4 transition-colors hover:bg-secondary/40">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
              {isSubscribed ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Suscripción vinculada con éxito</span>
                </>
              ) : (
                <>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  <span>Notificaciones en este navegador</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isSubscribed 
                ? "Este dispositivo está configurado para recibir alertas del portal." 
                : "Activa el interruptor para recibir avisos directamente en la pantalla de inicio."
              }
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-muted-foreground">
                  {isSubscribed ? "Activadas" : "Desactivadas"}
                </span>
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      subscribe();
                    } else {
                      unsubscribe();
                    }
                  }}
                  disabled={permission === "denied"}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
