import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Scale,
  ArrowLeft,
  Printer,
  BookOpen,
  UserCheck,
  ShieldAlert,
  Server,
  Key,
  Clock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CURRENT_TERMS_VERSION } from "@/features/legal/constants";

export default function TermsOfServicePage() {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation & Actions Top Bar */}
        <div className="flex items-center justify-between gap-4 print:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-2 shadow-sm"
            >
              <Printer className="h-4 w-4" />
              Imprimir / Guardar PDF
            </Button>
            <Link to="/legal/privacy">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Ver Política de Privacidad
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Document Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden print:border-none print:shadow-none">
          {/* Header Banner */}
          <header className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 px-8 py-10 text-white relative">
            <div className="relative z-10 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none">
                  Acuerdo de Usuario & Términos Legales
                </Badge>
                <Badge variant="outline" className="text-emerald-200 border-emerald-300/40">
                  Versión {CURRENT_TERMS_VERSION}
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Términos y Condiciones del Servicio Educativo
              </h1>

              <p className="text-teal-100 text-sm sm:text-base max-w-2xl leading-relaxed">
                Condiciones que rigen el acceso, uso y responsabilidades en la plataforma académica
                para acudientes, estudiantes, docentes y directivos.
              </p>

              <div className="pt-2 text-xs text-teal-200/90 flex flex-wrap gap-4">
                <span>Vigencia: Septiembre 2026</span>
                <span>•</span>
                <span>Aplicable a todos los usuarios autenticados</span>
              </div>
            </div>
          </header>

          {/* Body Content */}
          <div className="px-6 sm:px-10 py-8 space-y-10 text-sm sm:text-base leading-relaxed">
            {/* 1. Objeto y Alcance */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900 dark:text-white border-b pb-2">
                <BookOpen className="h-5 w-5 text-teal-600" />
                1. Objeto y Alcance de la Plataforma
              </h2>
              <p>
                Los presentes Términos y Condiciones regulan la prestación del servicio de software como servicio (SaaS)
                educativo denominado <strong>ETYMON</strong>. La plataforma permite la gestión integral de notas, tareas,
                asistencias, comunicaciones escolares, pensiones y consulta de documentos para las comunidades educativas
                adscritas.
              </p>
            </section>

            {/* 2. Capacidad y Representación Legal de Menores */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900 dark:text-white border-b pb-2">
                <UserCheck className="h-5 w-5 text-teal-600" />
                2. Capacidad y Representación Legal de Menores
              </h2>
              <p>
                Los acudientes que interactúan en la plataforma manifiestan bajo la gravedad de juramento que ostentan la
                patria potestad, tutoría o representación legal del estudiante vinculado. Cualquier consentimiento
                otorgado dentro del portal tiene plena validez jurídica contractual y probatoria.
              </p>
            </section>

            {/* 3. Cuentas de Usuario y Custodia de Credenciales */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900 dark:text-white border-b pb-2">
                <Key className="h-5 w-5 text-teal-600" />
                3. Cuentas de Usuario y Deber de Custodia
              </h2>
              <p>
                Las credenciales de acceso (usuario y contraseña) son personales e intransferibles. El titular es el único
                responsable de la actividad que ocurra bajo su cuenta:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <li>Es obligatorio sustituir las contraseñas provisionales en el primer inicio de sesión.</li>
                <li>Queda terminantemente prohibido ceder credenciales a terceros o estudiantes no autorizados.</li>
                <li>
                  Toda acción de consulta o descarga de documentos sensibles queda firmada y registrada en el sistema
                  de auditoría inmutable de la institución.
                </li>
              </ul>
            </section>

            {/* 4. Propiedad Intelectual y Licencia de Uso */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900 dark:text-white border-b pb-2">
                <Scale className="h-5 w-5 text-teal-600" />
                4. Propiedad Intelectual y Licencia Limitada
              </h2>
              <p>
                Se otorga una licencia de uso personal, no exclusiva, revocable e intransferible para fines estrictamente
                educativos. El software, código fuente, interfaces, marcas y algoritmos son propiedad exclusiva de{" "}
                <strong>ETYMON / IABC Platform</strong>. Se prohíbe cualquier intento de descompilación, ingeniería
                inversa o extracción masiva automatizada de datos (scraping).
              </p>
            </section>

            {/* 5. Principio de Cero Rupturas y Reconfirmación Selectiva */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900 dark:text-white border-b pb-2">
                <Clock className="h-5 w-5 text-teal-600" />
                5. Principio de Cero Rupturas y Modificación de Términos
              </h2>
              <p>
                En caso de actualizarse estos términos o las condiciones institucionales, la plataforma aplica la regla de{" "}
                <strong>Reconfirmación Selectiva</strong>:
              </p>
              <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-500/20 p-4 rounded-xl text-xs sm:text-sm text-teal-950 dark:text-teal-200">
                Solo se solicitará nueva ratificación para los aspectos materialmente modificados. Los consentimientos
                académicos no alterados se mantendrán plenamente vigentes para evitar la interrupción del servicio escolar
                y preservar el histórico probatorio.
              </div>
            </section>

            {/* 6. Disponibilidad y Responsabilidades del Colegio */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900 dark:text-white border-b pb-2">
                <Server className="h-5 w-5 text-teal-600" />
                6. Disponibilidad del Servicio y Mantenimiento
              </h2>
              <p>
                Hacemos los mejores esfuerzos técnicos para garantizar un nivel de disponibilidad continua del 99.5%. No
                obstante, podrán programarse ventanas de mantenimiento nocturnas o extraordinarias para salvaguardar la
                seguridad de la infraestructura, las cuales serán notificadas oportunamente.
              </p>
            </section>

            {/* 7. Suspensión y Terminación */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900 dark:text-white border-b pb-2">
                <ShieldAlert className="h-5 w-5 text-teal-600" />
                7. Bloqueo Preventivo y Ley Aplicable
              </h2>
              <p>
                El uso indebido de la plataforma, intentos de vulneración de seguridad o suplantación de identidad facultará
                a la institución para la <strong>desactivación preventiva de la cuenta</strong>, preservando el histórico
                académico y dando traslado a las autoridades pertinentes según la legislación colombiana aplicable.
              </p>
            </section>
          </div>

          {/* Footer Bar */}
          <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-6 sm:px-10 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>© 2026 ETYMON SaaS • Términos y Condiciones Legales</span>
            <div className="flex items-center gap-1 text-slate-500">
              <Mail className="h-3.5 w-3.5 text-teal-500" />
              <span>Soporte Jurídico: legal@etymon.edu.co</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
