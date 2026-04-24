import { useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Plus,
  ShieldX,
  Users,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  CheckCheck,
} from "lucide-react";
import { ProviderLayout } from "@/components/provider/ProviderLayout";
import { ProviderEmptyState } from "@/components/provider/ProviderEmptyState";
import { ProviderFloatingInput } from "@/components/provider/ProviderFloatingField";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useProviderInstitutionSummaries,
  useEtymonCreateUser,
  useEtymonInstitutionUsers,
  useEtymonRemoveUserMembership,
} from "@/hooks/provider";
import type { EtymonCreateUserResult } from "@/hooks/provider/useProviderPanel";

const ROLES = [
  { label: "Rector", value: "rector" },
  { label: "Profesor", value: "profesor" },
  { label: "Contable", value: "contable" },
] as const;

type RoleValue = (typeof ROLES)[number]["value"];

const roleBadgeClass: Record<string, string> = {
  rector: "border-[#00e7a7]/40 bg-[#00e7a7]/10 text-[#9cf7df]",
  profesor: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  contable: "border-amber-400/30 bg-amber-400/10 text-amber-300",
};

// ─── Temporary credentials display ────────────────────────────────────────────
function CredentialsCard({
  result,
  onDismiss,
}: {
  result: EtymonCreateUserResult;
  onDismiss: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(
        `Email: ${result.email}\nContraseña temporal: ${result.temporary_password}`,
      )
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
  };

  return (
    <div className="rounded-xl border border-[#00e7a7]/40 bg-[#00e7a7]/8 p-5 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="mb-3 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-[#00e7a7]" />
        <p className="text-sm font-semibold text-[#9cf7df]">
          Usuario creado — Credenciales temporales
        </p>
      </div>

      <p className="mb-3 text-xs text-slate-400">
        Entrega estas credenciales al usuario de forma segura. La contraseña debe cambiarse en el
        primer inicio de sesión.
      </p>

      <div className="space-y-2 rounded-lg border border-[#2d2d2d] bg-[#111] px-4 py-3 font-mono text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400">Email</span>
          <span className="text-slate-100">{result.email}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400">Contraseña</span>
          <div className="flex items-center gap-2">
            <span className="text-[#00e7a7]">
              {showPassword ? result.temporary_password : "••••••••••••"}
            </span>
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-slate-500 hover:text-slate-300"
            >
              {showPassword ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400">Rol</span>
          <span className="capitalize text-slate-100">{result.role}</span>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#2d2d2d] bg-[#1a1a1a] px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-[#00e7a7]/50 hover:text-[#9cf7df]"
        >
          {copied ? (
            <>
              <CheckCheck className="h-3 w-3" /> Copiado
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copiar credenciales
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg border border-[#2d2d2d] bg-[#1a1a1a] px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function EtymonUsuarios() {
  const { data: summaries, isLoading: summariesLoading } = useProviderInstitutionSummaries();

  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("");
  const [createForm, setCreateForm] = useState({
    email: "",
    full_name: "",
    role: "rector" as RoleValue,
    temporary_password: "",
  });
  const [lastCreated, setLastCreated] = useState<EtymonCreateUserResult | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const createUserMutation = useEtymonCreateUser();
  const removeMembershipMutation = useEtymonRemoveUserMembership();

  const { data: institutionUsers, isLoading: usersLoading } = useEtymonInstitutionUsers(
    selectedInstitutionId || null,
  );

  const selectedInstitution = summaries?.find(
    (s) => s.institution.id === selectedInstitutionId,
  );

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedInstitutionId) return;

    const result = await createUserMutation.mutateAsync({
      email: createForm.email.trim().toLowerCase(),
      full_name: createForm.full_name.trim(),
      institution_id: selectedInstitutionId,
      role: createForm.role,
      temporary_password: createForm.temporary_password || undefined,
    });

    setLastCreated(result);
    setCreateForm({ email: "", full_name: "", role: "rector", temporary_password: "" });
  };

  const handleRevoke = async (membershipId: string) => {
    if (!selectedInstitutionId) return;
    await removeMembershipMutation.mutateAsync({
      membershipId,
      institutionId: selectedInstitutionId,
    });
    setConfirmRevoke(null);
  };

  return (
    <ProviderLayout
      title="Usuarios"
      subtitle="Creación de accesos, gestión de roles y revocación por institución"
    >
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* ── Institution selector ─────────────────────────────────────── */}
        <section className="etymon-surface p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Seleccionar institución
          </h3>

          {summariesLoading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Cargando instituciones…</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(summaries ?? []).map((s) => (
                <button
                  key={s.institution.id}
                  type="button"
                  onClick={() => {
                    setSelectedInstitutionId(s.institution.id);
                    setLastCreated(null);
                    setConfirmRevoke(null);
                  }}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    selectedInstitutionId === s.institution.id
                      ? "border-[#00e7a7]/55 bg-[#00e7a7]/10 text-slate-100"
                      : "border-[#2d2d2d] bg-[#171717] text-slate-400 hover:border-[#3a3a3a] hover:text-slate-200"
                  }`}
                >
                  {s.institution.name}
                </button>
              ))}
            </div>
          )}
        </section>

        {selectedInstitutionId && (
          <>
            {/* ── Create user ──────────────────────────────────────────── */}
            <section className="etymon-surface p-5">
              <header className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">
                    Crear nuevo usuario
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Se creará la cuenta en Auth, su perfil y el rol en{" "}
                    <span className="font-medium text-slate-300">
                      {selectedInstitution?.institution.name}
                    </span>
                    .
                  </p>
                </div>
                {createUserMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                )}
              </header>

              <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-4">
                  <ProviderFloatingInput
                    type="email"
                    label="Email"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="lg:col-span-4">
                  <ProviderFloatingInput
                    label="Nombre completo"
                    value={createForm.full_name}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, full_name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="lg:col-span-2">
                  <p className="mb-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
                    Rol
                  </p>
                  <Select
                    value={createForm.role}
                    onValueChange={(val) =>
                      setCreateForm((prev) => ({ ...prev, role: val as RoleValue }))
                    }
                  >
                    <SelectTrigger className="etymon-input h-12 border-[#2d2d2d] bg-[#151515] text-slate-100 focus:ring-[#00e7a7]/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-[#2d2d2d] bg-[#161616] text-slate-100">
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="lg:col-span-2 flex items-end">
                  <Button
                    type="submit"
                    disabled={createUserMutation.isPending}
                    className="etymon-btn-primary h-12 w-full gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Crear usuario
                  </Button>
                </div>

                <div className="lg:col-span-6">
                  <ProviderFloatingInput
                    label="Contraseña temporal (opcional — se genera si está vacío)"
                    value={createForm.temporary_password}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, temporary_password: e.target.value }))
                    }
                  />
                </div>
              </form>

              {/* Credentials display after creation */}
              {lastCreated && (
                <div className="mt-5">
                  <CredentialsCard
                    result={lastCreated}
                    onDismiss={() => setLastCreated(null)}
                  />
                </div>
              )}
            </section>

            {/* ── Users list ───────────────────────────────────────────── */}
            <section className="etymon-surface p-5">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-300" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">
                  Usuarios en {selectedInstitution?.institution.name}
                </h3>
              </div>

              {usersLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                </div>
              ) : !institutionUsers || institutionUsers.length === 0 ? (
                <ProviderEmptyState
                  title="Sin usuarios registrados"
                  description="Crea el primer usuario para esta institución usando el formulario de arriba."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2d2d2d] text-left">
                        <th className="pb-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                          Nombre
                        </th>
                        <th className="pb-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                          Email
                        </th>
                        <th className="pb-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                          Rol
                        </th>
                        <th className="pb-2 text-right text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {institutionUsers.map((u) => (
                        <tr
                          key={u.membership_id}
                          className="border-b border-[#1e1e1e] transition-colors hover:bg-[#171717]"
                        >
                          <td className="py-3 font-medium text-slate-100">{u.full_name}</td>
                          <td className="py-3 text-slate-400">{u.email}</td>
                          <td className="py-3">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                                roleBadgeClass[u.role] ?? "border-[#444] text-slate-400"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {confirmRevoke === u.membership_id ? (
                              <div className="inline-flex items-center gap-2">
                                <span className="text-xs text-amber-400">¿Confirmar?</span>
                                <button
                                  type="button"
                                  disabled={removeMembershipMutation.isPending}
                                  onClick={() => handleRevoke(u.membership_id)}
                                  className="rounded bg-destructive/20 px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/30"
                                >
                                  Sí, revocar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmRevoke(null)}
                                  className="text-xs text-slate-500 hover:text-slate-300"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmRevoke(u.membership_id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs text-slate-500 transition-colors hover:border-destructive/40 hover:text-destructive"
                              >
                                <ShieldX className="h-3.5 w-3.5" />
                                Revocar acceso
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ── Danger zone ──────────────────────────────────────────── */}
            <section className="rounded-xl border border-destructive/25 bg-destructive/5 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <h3 className="text-sm font-semibold text-destructive">Zona peligrosa</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    La revocación de acceso elimina la membresía del usuario en esta institución pero{" "}
                    <strong className="text-slate-400">no borra su cuenta de autenticación</strong>. Para
                    eliminación total de usuarios, usa el panel de Supabase directamente.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {!selectedInstitutionId && !summariesLoading && (
          <ProviderEmptyState
            title="Selecciona una institución"
            description="Escoge un tenant arriba para gestionar sus usuarios y crear nuevos accesos."
          />
        )}
      </div>
    </ProviderLayout>
  );
}
