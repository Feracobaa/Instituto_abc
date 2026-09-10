import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  ArrowLeft,
  Printer,
  Lock,
  UserCheck,
  AlertTriangle,
  Mail,
  FileCheck2,
  Server,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CURRENT_POLICY_VERSION } from "@/features/legal/constants";

export default function PrivacyPolicyPage() {
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
            <Link to="/legal/terms">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <Scale className="h-3.5 w-3.5" />
                Ver Términos de Servicio
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Document Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden print:border-none print:shadow-none">
          {/* Header Banner */}
          <header className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 px-8 py-10 text-white relative">
            <div className="relative z-10 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none">
                  Habeas Data & Tratamiento de Datos
                </Badge>
                <Badge variant="outline" className="text-blue-200 border-blue-300/40">
                  Versión {CURRENT_POLICY_VERSION}
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Política de Privacidad y Protección de Datos Personales
              </h1>

              <p className="text-blue-100 text-sm sm:text-base max-w-2xl leading-relaxed">
                Marco institucional para la recolección, almacenamiento, uso y protección de datos
                de estudiantes, acudientes y personal docente.
              </p>

              <div className="pt-2 text-xs text-blue-200/90 flex flex-wrap gap-4">
                <span>Vigencia: Septiembre 2026</span>
                <span>•</span>
                <span>Conforme a la Ley 1581 de 2012 y Decreto 1377 de 2013</span>
              </div>
            </div>
          </header>

          {/* Body Content */}
          <div className="px-6 sm:px-10 py-8 space-y-10 text-sm sm:text-base leading-relaxed">
            {/* 1. Responsable y Encargado */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900 dark:text-white border-b pb-2">
                <FileCheck2 className="h-5 w-5 text-indigo-600" />
                1. Identificación del Responsable y del Encargado
              </h2>
              <p>
                El <strong>Responsable del Tratamiento</strong> de la información es la respectiva Institución Educativa
                adscrita en la que se encuentra matriculado el estudiante. La plataforma tecnológica es operada por{" "}
                <strong>ETYMON SaaS</strong> en calidad de <strong>Encargado del Tratamiento</strong>, suministrando la
                infraestructura en la nube, mecanismos criptográficos y almacenamiento seguro.
              </p>
              <div className="bg-slate-100 dark:bg-slate-800/60 p-4 rounded-xl text-xs space-y-1">
                <p><strong>Canal Oficial de Atención al Titular (DPO):</strong> protecciondedatos@etymon.edu.co</p>
                <p><strong>Domicilio:</strong> Colombia - Servicio Multi-Inquilino Educativo Nacional.</p>
              </div>
            </section>

            {/* 2. Interés Superior de Menores y Carácter Facultativo */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900 dark:text-white border-b pb-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                2. Interés Superior del Menor y Carácter Facultativo
              </h2>
              <p>
                El tratamiento de datos de niños, niñas y adolescentes (NNA) se realiza con estricto respeto de sus
                derechos prevalentes. En virtud del Artículo 12 del Decreto 1377 de 2013, se informa expresamente al
                representante legal:
              </p>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
                  <div className="text-xs sm:text-sm space-y-1">
                    <p className="font-semibold">ADVERTENCIA LEGAL OBLIGATORIA:</p>
                    <p>
                      Responder preguntas sobre datos sensibles (como historia clínica escolar, tipo de sangre,
                      condiciones de salud o datos biométricos) tiene carácter estrictamente <strong>FACULTATIVO</strong>.
                      Ningún servicio educativo esencial será condicionado a la entrega de datos no exigidos por
                      mandato legal expreso.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Finalidades Específicas */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900 dark:text-white border-b pb-2">
                <UserCheck className="h-5 w-5 text-indigo-600" />
                3. Catálogo de Finalidades Específicas (Consentimiento Granular)
              </h2>
              <p>
                La plataforma no utiliza autorizaciones abiertas o genéricas. El consentimiento se registra de forma
                independiente bajo las siguientes categorías de tratamiento:
              </p>
              <div className="grid gap-3 sm:grid-cols-2 pt-1 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">ACADEMIC (Académica)</span>
                  Gestión de matrículas, registros de calificaciones, boletines, certificados y planeación curricular.
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">HEALTH (Salud Escolar)</span>
                  Atención primaria en emergencias escolares, registro de alergias, EPS y contactos médicos autorizados.
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">BIOMETRIC (Biometría)</span>
                  Control ágil de asistencia y seguridad de acceso a la sede educativa (tratamiento siempre opcional).
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">COMMUNICATION & STORAGE</span>
                  Notificaciones académicas prioritarias y custodia digital cifrada de documentos de matrícula.
                </div>
              </div>
            </section>

            {/* 4. Seguridad Técnica y Auditoría Inmutable */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900 dark:text-white border-b pb-2">
                <Lock className="h-5 w-5 text-indigo-600" />
                4. Ciberseguridad, Aislamiento Multi-Tenant y Auditoría
              </h2>
              <p>
                Para garantizar la confidencialidad de los menores, la plataforma opera bajo arquitectura{" "}
                <strong>Zero-Trust</strong> con las siguientes garantías:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <li>
                  <strong>Aislamiento Multi-Inquilino Estricto:</strong> Ningún usuario o funcionario de una institución
                  puede visualizar registros de otro colegio gracias a políticas de base de datos RLS (Row Level Security).
                </li>
                <li>
                  <strong>Auditoría Inalterable:</strong> Todo acceso a documentos sensibles queda sellado en la tabla de
                  auditoría con prohibición física de edición o borrado.
                </li>
                <li>
                  <strong>Enlaces con Expiración (Signed URLs):</strong> Los archivos sensibles no poseen URLs públicas;
                  se emiten enlaces firmados con vigencia temporal máxima de 5 a 10 minutos.
                </li>
              </ul>
            </section>

            {/* 5. Derechos ARCO y Procedimiento de Reclamo */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900 dark:text-white border-b pb-2">
                <Scale className="h-5 w-5 text-indigo-600" />
                5. Derechos del Titular y Trámite de Consultas / Reclamos
              </h2>
              <p>
                El acudiente o el estudiante mayor de edad puede ejercer en cualquier momento los derechos de{" "}
                <strong>Acceso, Rectificación, Cancelación y Oposición (ARCO)</strong>:
              </p>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <strong>Consultas:</strong> Serán atendidas en un plazo máximo de <strong>diez (10) días hábiles</strong>{" "}
                  contados a partir de su recepción.
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <strong>Reclamos:</strong> Serán atendidos en un término no mayor a <strong>quince (15) días hábiles</strong>.{" "}
                  En caso de no obtener respuesta oportuna, el titular podrá acudir ante la Superintendencia de Industria y Comercio (SIC).
                </div>
              </div>
            </section>

            {/* 6. Revocatoria y Reconfirmación */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900 dark:text-white border-b pb-2">
                <Server className="h-5 w-5 text-indigo-600" />
                6. Revocabilidad y Reconfirmación Selectiva
              </h2>
              <p>
                Ante modificaciones en las políticas institucionales, no se anularán arbitrariamente todos los consentimientos.
                La plataforma marcará exclusivamente las finalidades afectadas en estado de{" "}
                <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600">REQUIRES_RECONFIRMATION</code>,
                permitiendo al acudiente ratificar las nuevas condiciones sin frenar el acceso al portal escolar.
              </p>
            </section>
          </div>

          {/* Footer Bar */}
          <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-6 sm:px-10 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>© 2026 ETYMON SaaS • Todos los derechos reservados</span>
            <div className="flex items-center gap-1 text-slate-500">
              <Mail className="h-3.5 w-3.5 text-indigo-500" />
              <span>Contacto de Cumplimiento: privacidad@etymon.edu.co</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
