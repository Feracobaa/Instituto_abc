import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, FileText, Scale } from "lucide-react";
import { CURRENT_POLICY_VERSION } from "@/features/legal/constants";

export function LegalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/40 bg-card/30 px-6 py-4 backdrop-blur-sm transition-colors">
      <div className="mx-auto flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row max-w-7xl">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span className="font-medium text-foreground/80">
            ETYMON Plataforma Educativa
          </span>
          <span className="hidden sm:inline text-muted-foreground/60">•</span>
          <span className="hidden sm:inline">
            Cumplimiento Habeas Data v{CURRENT_POLICY_VERSION}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <Link
            to="/legal/privacy"
            className="flex items-center gap-1.5 transition-colors hover:text-foreground font-medium"
            title="Consultar Política de Privacidad y Tratamiento de Datos"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Privacidad & Habeas Data
          </Link>

          <span className="text-muted-foreground/40">•</span>

          <Link
            to="/legal/terms"
            className="flex items-center gap-1.5 transition-colors hover:text-foreground font-medium"
            title="Consultar Términos y Condiciones del Servicio"
          >
            <Scale className="h-3.5 w-3.5 text-primary" />
            Términos y Condiciones
          </Link>

          <span className="text-muted-foreground/40">•</span>

          <span>© {currentYear} Todos los derechos reservados</span>
        </div>
      </div>
    </footer>
  );
}
