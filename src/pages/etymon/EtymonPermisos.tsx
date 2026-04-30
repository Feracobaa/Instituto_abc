import { useMemo, useState } from "react";
import { Loader2, ShieldCheck, Lock, Edit3, Eye } from "lucide-react";
import { ProviderLayout } from "@/components/provider/ProviderLayout";
import { useProviderRolePermissions, useProviderSetRolePermission } from "@/hooks/provider";

type AccessLevel = "full" | "readonly" | "none";

const ROLES = ["rector", "profesor", "contable", "parent"] as const;

const ACTIVE_LEVEL_CLASS: Record<AccessLevel, string> = {
  full: "border-cyan-400/50 bg-cyan-400/10 text-cyan-400 shadow-[inset_0_0_12px_rgba(0,0,0,0.1)]",
  readonly: "border-indigo-400/50 bg-indigo-400/10 text-indigo-400 shadow-[inset_0_0_12px_rgba(0,0,0,0.1)]",
  none: "border-rose-400/50 bg-rose-400/10 text-rose-400 shadow-[inset_0_0_12px_rgba(0,0,0,0.1)]",
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
          relative flex flex-1 flex-col items-center justify-center gap-1.5 rounded-md border p-2 transition-all duration-200
          ${isActive
            ? ACTIVE_LEVEL_CLASS[targetLevel]
            : "border-[#2d2d2d] bg-[#1a1a1a] text-slate-500 hover:border-[#3d3d3d] hover:bg-[#202020] hover:text-slate-300"
          }
          ${disabled ? "opacity-70 cursor-not-allowed" : ""}
        `}
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </button>
    );
  };

  return (
    <ProviderLayout title="Permisos por Rol" subtitle="Configura el acceso granular de cada rol a los modulos de la plataforma">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="etymon-surface border-[#00e7a7]/20 bg-[#00e7a7]/5 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00e7a7]/20">
              <ShieldCheck className="h-5 w-5 text-[#00e7a7]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Matriz de Acceso Global</h3>
              <p className="mt-1 text-xs text-slate-400">
                Los permisos configurados aqui se aplicaran a <strong>todos los usuarios de todos los colegios</strong> en la plataforma.
                El acceso final de una institucion sera la interseccion entre los modulos habilitados en su plan comercial y los permisos asignados a cada rol en esta pantalla.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-[#2d2d2d] bg-[#141414]">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#2d2d2d] bg-[#141414] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-[#1a1a1a] text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="w-64 border-b border-r border-[#2d2d2d] px-6 py-4 text-[11px] font-heading">Modulo</th>
                    {ROLES.map((role) => (
                      <th key={role} className="border-b border-[#2d2d2d] px-6 py-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="text-slate-200">{role}</span>
                          <span className="text-[10px] font-normal normal-case text-slate-500">
                            {role === "parent" ? "Acudiente / Estudiante" : "Personal escolar"}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d2d2d]">
                  {moduleCodes.map((code) => {
                    const moduleData = modulesMap.get(code)!;
                    return (
                      <tr key={code} className="transition-colors hover:bg-[#1a1a1a]/50">
                        <td className="border-r border-[#2d2d2d] px-6 py-5">
                          <p className="font-semibold text-slate-200">{moduleData.name}</p>
                          <p className="mt-1 font-mono text-xs text-slate-500">{code}</p>
                        </td>
                        {ROLES.map((role) => {
                          const currentLevel = moduleData.roles[role] || "none";
                          return (
                            <td key={role} className="px-4 py-4 align-top">
                              <div className="flex w-full min-w-[200px] gap-1.5 rounded-lg bg-[#111] p-1.5 shadow-inner">
                                {renderAccessButton(role, code, currentLevel, "full", "Edicion", Edit3)}
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
