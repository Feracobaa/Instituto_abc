import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";
import { ProviderLayout } from "@/components/provider/ProviderLayout";
import { ProviderEmptyState } from "@/components/provider/ProviderEmptyState";
import { ProviderFloatingInput } from "@/components/provider/ProviderFloatingField";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useProviderClearSupportContext,
  useProviderIdentityDrift,
  useProviderInstitutionSummaries,
  useProviderRepairIdentityDrift,
  useProviderSetSupportContext,
  useProviderSupportContext,
} from "@/hooks/provider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function EtymonSoporte() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshSupportContext, supportContext } = useAuth();

  const { data: summaries, isLoading } = useProviderInstitutionSummaries();
  const { data: activeSupportContext, refetch: refetchSupportContext } = useProviderSupportContext();
  const { data: driftRows, refetch: refetchDriftRows } = useProviderIdentityDrift();

  const setSupportContextMutation = useProviderSetSupportContext();
  const clearSupportContextMutation = useProviderClearSupportContext();
  const repairDriftMutation = useProviderRepairIdentityDrift();

  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [supportReason, setSupportReason] = useState("");

  useEffect(() => {
    if (!selectedInstitutionId && summaries && summaries.length > 0) {
      setSelectedInstitutionId(summaries[0].institution.id);
    }
  }, [selectedInstitutionId, summaries]);

  const handleStartSupport = async () => {
    if (!selectedInstitutionId) {
      toast({
        title: "Institucion requerida",
        description: "Selecciona una institucion para abrir soporte.",
        variant: "destructive",
      });
      return;
    }

    if (!supportReason.trim()) {
      toast({
        title: "Motivo requerido",
        description: "Debes registrar el motivo operativo del acceso.",
        variant: "destructive",
      });
      return;
    }

    await setSupportContextMutation.mutateAsync({
      institutionId: selectedInstitutionId,
      reason: supportReason.trim(),
    });

    await Promise.all([refreshSupportContext(), refetchSupportContext()]);
  };

  const handleEndSupport = async () => {
    const confirmed = window.confirm("Se cerrara el contexto de soporte activo. Deseas continuar?");
    if (!confirmed) return;

    await clearSupportContextMutation.mutateAsync();
    await Promise.all([refreshSupportContext(), refetchSupportContext()]);
  };

  const handleRepairDrift = async (userId: string) => {
    const confirmed = window.confirm("Accion critica: se corregiran instituciones en profile/role/teacher de este usuario.");
    if (!confirmed) return;

    await repairDriftMutation.mutateAsync(userId);
  };

  const activeContext = activeSupportContext ?? supportContext;
  const driftIssues = (driftRows ?? []).filter((row) => !row.is_aligned);

  return (
    <ProviderLayout title="Soporte" subtitle="Soporte cross-tenant con contexto auditado y controles de seguridad">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <section className="etymon-surface p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Sesion de soporte</h3>

          <div className="mt-4 space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Institucion</p>
              <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
                <SelectTrigger className="etymon-input h-12 border-[#2d2d2d] bg-[#151515] text-slate-100">
                  <SelectValue placeholder="Selecciona institucion" />
                </SelectTrigger>
                <SelectContent className="border-[#2d2d2d] bg-[#161616] text-slate-100">
                  {(summaries ?? []).map((summary) => (
                    <SelectItem key={summary.institution.id} value={summary.institution.id}>
                      {summary.institution.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ProviderFloatingInput
              label="Motivo de acceso"
              value={supportReason}
              onChange={(event) => setSupportReason(event.target.value)}
              hint="Este motivo queda registrado en auditoria de proveedor."
            />

            <div className="flex flex-wrap gap-2">
              <Button className="etymon-btn-primary" onClick={handleStartSupport} disabled={setSupportContextMutation.isPending || isLoading}>
                {setSupportContextMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Activar soporte
              </Button>

              <Button
                className="etymon-btn-outline"
                onClick={handleEndSupport}
                disabled={!activeSupportContext || clearSupportContextMutation.isPending}
              >
                Cerrar soporte
              </Button>

              <Button
                className="etymon-btn-outline gap-2"
                onClick={() => navigate("/")}
                disabled={!activeContext}
              >
                <LogIn className="h-4 w-4" />
                Entrar a plataforma del cliente
              </Button>
            </div>
          </div>

          <div className="mt-5">
            {activeContext ? (
              <div className="rounded-lg border border-[#00e7a7]/35 bg-[#00e7a7]/10 px-3 py-3 text-sm text-[#9cf7df]">
                <span className="font-semibold">Soporte activo:</span>{" "}
                {activeContext.institution_name} - {activeContext.reason}
              </div>
            ) : (
              <ProviderEmptyState
                title="Sin soporte activo"
                description="Activa una sesion de soporte para operar temporalmente dentro de una institucion especifica."
                ctaLabel="Configurar institucion"
                onCtaClick={() => navigate("/etymon/instituciones")}
              />
            )}
          </div>
        </section>

        <section className="etymon-surface p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Integridad de identidad</h3>
            <Button className="etymon-btn-outline h-9" onClick={() => void refetchDriftRows()}>
              Refrescar
            </Button>
          </div>

          {driftIssues.length > 0 ? (
            <div className="space-y-2">
              {driftIssues.map((row) => (
                <div key={row.user_id} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-sm font-medium text-amber-100">{row.email}</p>
                  <p className="text-xs text-amber-200/80">{row.issue ?? "inconsistencia detectada"}</p>
                  <Button
                    size="sm"
                    className="etymon-btn-outline mt-2"
                    onClick={() => handleRepairDrift(row.user_id)}
                    disabled={repairDriftMutation.isPending}
                  >
                    Reparar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <ProviderEmptyState
              title="Todo en orden"
              description="No se detectan desalineaciones entre profiles, user_roles, teachers e institution_memberships."
              ctaLabel="Ver auditoria"
              onCtaClick={() => navigate("/etymon/auditoria")}
            />
          )}

          {driftIssues.length === 0 ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#2d2d2d] bg-[#191919] px-3 py-1 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-[#00e7a7]" />
              Politica de aislamiento vigente
            </div>
          ) : null}
        </section>
      </div>
    </ProviderLayout>
  );
}
