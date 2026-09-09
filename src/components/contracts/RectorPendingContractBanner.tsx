import { useState } from "react";
import { ShieldAlert, ArrowRight, FileCheck, FileSignature } from "lucide-react";
import { useInstitutionContracts } from "@/hooks/provider/useProviderContracts";
import { RectorSignContractModal } from "./RectorSignContractModal";
import { useInstitutionSettings } from "@/hooks/useSchoolData";
import { cn } from "@/lib/utils";

export function RectorPendingContractBanner() {
  const { data: contracts = [] } = useInstitutionContracts();
  const { data: settings } = useInstitutionSettings();
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);

  const pendingContract = contracts.find((c) => c.status === "sent");

  if (!pendingContract) return null;

  return (
    <>
      <div
        role="alert"
        aria-live="polite"
        className={cn(
          "relative overflow-hidden rounded-2xl p-4 sm:p-5 transition-all duration-300",
          "backdrop-blur-2xl -webkit-backdrop-blur-2xl shadow-xl",
          "animate-in fade-in slide-in-from-top-2 duration-500",
          "bg-gradient-to-br from-amber-500/20 via-slate-950/85 to-amber-950/40",
          "border border-amber-500/45 shadow-[0_10px_35px_rgba(245,158,11,0.2),inset_0_1.5px_2px_rgba(255,255,255,0.25)]"
        )}
      >
        {/* Specular Liquid Glass Top Highlight Bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/80 dark:via-amber-200/90 to-transparent" />

        {/* Dynamic Animated Glare Sheen Sweep */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="animate-liquid-glare absolute -inset-y-full -left-1/3 w-1/2 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent pointer-events-none" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Glowing Glass Icon Badge */}
            <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/25 text-amber-300 border border-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.35)] backdrop-blur-md">
              <ShieldAlert className="h-7 w-7 animate-pulse text-amber-400" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/30 text-amber-200 border border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping bg-amber-400" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                  Acción Requerida: Firma Legal
                </span>
              </div>

              <h4 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <FileSignature className="h-4 w-4 shrink-0 text-amber-400" />
                Acuerdo de Licenciamiento y Legitimidad Legal Pendiente
              </h4>

              <p className="text-xs sm:text-sm leading-relaxed text-amber-100/90 font-normal max-w-3xl">
                Etymon ha emitido el contrato formal de servicios SaaS y el acuerdo de tratamiento de datos personales de menores (
                <strong className="inline-block font-bold text-amber-200 bg-amber-500/25 px-2 py-0.5 rounded-md border border-amber-400/35 shadow-sm">
                  {pendingContract.contract_number}
                </strong>
                ). Se requiere la ratificación digital del Representante Legal para formalizar la cobertura jurídica de la institución.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSignModalOpen(true)}
            className={cn(
              "shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl",
              "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500",
              "text-slate-950 font-extrabold text-xs sm:text-sm tracking-wide transition-all duration-200",
              "shadow-[0_4px_20px_rgba(245,158,11,0.4)] hover:shadow-[0_6px_25px_rgba(245,158,11,0.55)]",
              "active:scale-95 cursor-pointer"
            )}
          >
            <FileCheck className="h-4 w-4" />
            <span>Revisar y Firmar Acuerdo Digital</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      <RectorSignContractModal
        contract={pendingContract}
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        defaultRectorName={settings?.rector_name || ""}
      />
    </>
  );
}

