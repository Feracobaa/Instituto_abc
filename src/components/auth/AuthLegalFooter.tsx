import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Scale } from "lucide-react";

export function AuthConsentNotice() {
  return (
    <p className="text-[11px] text-center text-slate-300/70 leading-relaxed mt-4 px-2">
      Al iniciar sesión, confirmas que aceptas los{" "}
      <Link
        to="/legal/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors"
      >
        Términos de Servicio
      </Link>{" "}
      y la{" "}
      <Link
        to="/legal/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors"
      >
        Política de Privacidad y Habeas Data
      </Link>
      .
    </p>
  );
}

export function AuthLegalFooter() {
  return (
    <div className="mt-8 flex flex-col items-center gap-2 text-xs text-slate-400/80">
      <div className="flex items-center gap-4">
        <Link
          to="/legal/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-slate-200 transition-colors"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
          <span>Privacidad</span>
        </Link>
        <span>•</span>
        <Link
          to="/legal/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-slate-200 transition-colors"
        >
          <Scale className="h-3.5 w-3.5 text-blue-400" />
          <span>Términos</span>
        </Link>
      </div>
      <div className="text-[11px] text-slate-400/60">
        Plataforma protegida con cifrado y aislamiento estricto de datos de menores
      </div>
    </div>
  );
}
