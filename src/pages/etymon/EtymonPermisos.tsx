import { useMemo, useState } from "react";
import { Loader2, ShieldCheck, Lock, Edit3, Eye } from "lucide-react";
import { ProviderLayout } from "@/components/provider/ProviderLayout";
import { useProviderRolePermissions, useProviderSetRolePermission } from "@/hooks/provider";

type AccessLevel = "full" | "readonly" | "none";

const ROLES = ["rector", "profesor", "contable", "parent"] as const;

const ACTIVE_LEVEL_CLASS: Record<AccessLevel, string> = {
  full: "border-[var(--et-accent)] bg-[var(--et-accent-soft)] text-[var(--et-accent)] font-semibold shadow-sm",
  readonly: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400 font-semibold shadow-sm",
  none: "border-rose-500/20 bg-rose-500/5 text-rose-400/80 font-medium",
};

export default function EtymonPermisos() {
  const { data: permissions, isLoading } = useProviderRolePermissions();
  const setPermission = useProviderSetRolePermission();
  const [savingCell, setSavingCell] = useState<string | null>(null);

  const modulesMap = useMemo(() => {
    if (!permissions) return new Map<string, { id: string; name: string; roles: Record<string, AccessLevel> }>();

    const map = new Map<string, { id: string; name: string; roles: Record<string, AccessLevel> }>();

    for (const permission of permissions) {
      if (!map.has(permission.module_code)) {
        map.set(permission.module_code, {
          id: permission.module_id,
          name: permission.module_name,
          roles: {} as Record<string, AccessLevel>,
        });
      }
      map.get(permission.module_code)!.roles[permission.role] = permission.access_level;
    }

    return map;
  }, [permissions]);

  const moduleCodes = Array.from(modulesMap.keys());

  const handleSetPermission = async (role: string, moduleCode: string, level: AccessLevel) => {
    if (setPermission.isPending) return;

    const cellKey = `${role}:${moduleCode}`;
    setSavingCell(cellKey);
    try {
      await setPermission.mutateAsync({ role, moduleCode, accessLevel: level });
    } finally {
      setSavingCell(null);
    }
  };

  const renderAccessButton = (
    role: string,
    moduleCode: string,
    currentLevel: AccessLevel,
    targetLevel: AccessLevel,
    label: string,
    Icon: React.ElementType,
  ) => {
    const isSaving = savingCell === `${role}:${moduleCode}`;
    const isActive = currentLevel === targetLevel;
    const disabled = setPermission.isPending || isSaving || isActive;

    return (
      <button
        onClick={() => handleSetPermission(role, moduleCode, targetLevel)}
        disabled={disabled}
        className={`
          relative flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg border p-2 transition-all duration-200 text-center
          ${isActive
            ? ACTIVE_LEVEL_CLASS[targetLevel]
            : "border-[var(--et-border)] bg-[var(--et-bg)] text-slate-500 hover:border-[var(--et-accent)]/30 hover:bg-[var(--et-chip-bg)] hover:text-[var(--et-text)]"
          }
          ${disabled && !isActive ? "opacity-40 cursor-not-allowed" : ""}
          ${isSaving ? "opacity-75" : ""}
        `}
      >
        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </button>
    );
  };

  return (
    <ProviderLayout title="Permisos por Rol" subtitle="Configura el acceso granular de cada rol a los módulos de la plataforma">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="etymon-surface border-[var(--et-accent)]/20 bg-[var(--et-accent-soft)] p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--et-accent)]/20">
              <ShieldCheck className="h-5 w-5 text-[var(--et-accent)]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--et-text)]">Matriz de Acceso Global</h3>
              <p className="mt-1 text-xs text-[var(--et-text-subtle)] leading-relaxed">
                Los permisos configurados aquí se aplicarán a <strong>todos los usuarios de todos los colegios</strong> en la plataforma.
                El acceso final de una institución será la intersección entre los módulos habilitados en su plan comercial y los permisos asignados a cada rol en esta pantalla.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-[var(--et-border)] bg-[var(--et-panel-bg)]">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--et-border)] bg-[var(--et-panel-bg)] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[var(--et-text-subtle)]">
                <thead className="bg-[var(--et-chip-bg)] text-xs font-semibold uppercase tracking-wider text-[var(--et-text-muted)]">
                  <tr>
                    <th className="w-64 border-b border-r border-[var(--et-border)] px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Módulo</th>
                    {ROLES.map((role) => (
                      <th key={role} className="border-b border-[var(--et-border)] px-6 py-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="text-[11px] font-bold text-[var(--et-text)] uppercase tracking-wider">{role}</span>
                          <span className="text-[9px] font-medium normal-case text-[var(--et-text-muted)]">
                            {role === "parent" ? "Acudiente / Estudiante" : "Personal escolar"}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--et-border)]">
                  {moduleCodes.map((code) => {
                    const moduleData = modulesMap.get(code)!;
                    return (
                      <tr key={code} className="transition-colors hover:bg-[var(--et-chip-bg)]/50">
                        <td className="border-r border-[var(--et-border)] px-6 py-4">
                          <p className="font-bold text-[var(--et-text)] text-sm">{moduleData.name}</p>
                          <p className="mt-1 font-mono text-[10px] text-[var(--et-text-muted)] uppercase tracking-wider">{code}</p>
                        </td>
                        {ROLES.map((role) => {
                          const currentLevel = moduleData.roles[role] || "none";
                          return (
                            <td key={role} className="px-4 py-4 align-middle">
                              <div className="flex w-full min-w-[220px] gap-2 rounded-xl bg-black/20 p-2 shadow-inner border border-[var(--et-border)]/50">
                                {renderAccessButton(role, code, currentLevel, "full", "Edición", Edit3)}
                                {renderAccessButton(role, code, currentLevel, "readonly", "Lectura", Eye)}
                                {renderAccessButton(role, code, currentLevel, "none", "Sin Acceso", Lock)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}
