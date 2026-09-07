import { useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

interface TeacherCredentialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentials: {
    email: string;
    fullName: string;
    temporaryPassword?: string;
  } | null;
}

export function TeacherCredentialsModal({
  open,
  onOpenChange,
  credentials,
}: TeacherCredentialsModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!credentials) return null;

  const handleCopy = async () => {
    if (!credentials.temporaryPassword) return;
    const textToCopy = `Credenciales de acceso a la plataforma:\nUsuario: ${credentials.email}\nContraseña temporal: ${credentials.temporaryPassword}\n\n*Nota: Deberás cambiar esta contraseña en tu primer inicio de sesión.`;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Credenciales copiadas al portapapeles");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("No se pudo copiar automáticamente");
    }
  };

  const handleClose = () => {
    setShowPassword(false);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
            <KeyRound className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl font-heading">
            Acceso Docente Creado
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            Se ha generado la cuenta para <span className="font-semibold text-foreground">{credentials.fullName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/40 p-3 space-y-2.5">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Correo electrónico:</p>
              <p className="text-sm font-mono font-medium text-foreground select-all break-all">
                {credentials.email}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">Contraseña provisional:</p>
              <div className="mt-1 flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-1.5 font-mono text-sm">
                <span className="font-bold tracking-wider select-all text-primary">
                  {showPassword ? credentials.temporaryPassword : "••••••••••••••••"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Ocultar" : "Mostrar"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
            <ShieldAlert className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p>
              <strong>Cambio de clave forzado:</strong> Por seguridad y privacidad, el profesor deberá definir su contraseña definitiva en el primer inicio de sesión.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="w-full sm:w-auto gap-1.5"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar Credenciales"}
          </Button>
          <Button type="button" onClick={handleClose} className="w-full sm:w-auto">
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
