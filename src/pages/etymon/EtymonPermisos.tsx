import { useState, useMemo } from "react";
import { Loader2, ShieldCheck, Lock, Edit3, Eye } from "lucide-react";
import { ProviderLayout } from "@/components/provider/ProviderLayout";
import {
  useProviderRolePermissions,
  useProviderSetRolePermission,
} from "@/hooks/provider";

type AccessLevel = "full" | "readonly" | "none";

// All available roles
const ROLES = ["rector", "profesor", "contable", "parent"] as const;

export default function EtymonPermisos() {
  const { data: permissions, isLoading } = useProviderRolePermissions();
  const setPermission = useProviderSetRolePermission();
  const [savingCell, setSavingCell] = useState<string | null>(null);

  // Group permissions by module_code to build the grid
  const modulesMap = useMemo(() => {
    if (!permissions) return new Map();
    
    const map = new Map<string, { id: string; name: string; roles: Record<string, AccessLevel> }>();
    
    for (const p of permissions) {
      if (!map.has(p.module_code)) {
        map.set(p.module_code, {
          id: p.module_id,
          name: p.module_name,
          roles: {} as Record<string, AccessLevel>,
        });
      }
      map.get(p.module_code)!.roles[p.role] = p.access_level as AccessLevel;
    }
    
    return map;
  }, [permissions]);

  const moduleCodes = Array.from(modulesMap.keys());

  const handleSetPermission = async (role: string, moduleCode: string, level: AccessLevel) => {
    const cellKey = `${role}:${moduleCode}`;
    setSavingCell(cellKey);
    try {
      await setPermission.mutateAsync({
        role,
        moduleCode,
        accessLevel: level,
      });
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
    activeColorClass: string
  ) => {
    const isSaving = savingCell === `${role}:${moduleCode}`;
    const isActive = currentLevel === targetLevel;

    return (
      <button
        onClick={() => handleSetPermission(role, moduleCode, targetLevel)}
        disabled={isSaving || isActive}
        className={`
          relative flex flex-1 flex-col items-center justify-center gap-1.5 rounded-md border p-2 transition-all duration-200
          ${isActive 
            ? `border-${activeColorClass}/50 bg-${activeColorClass}/10 text-${activeColorClass} shadow-[inset_0_0_12px_rgba(0,0,0,0.1)]` 
            : "border-[#2d2d2d] bg-[#1a1a1a] text-slate-500 hover:border-[#3d3d3d] hover:bg-[#202020] hover:text-slate-300"
          }
          ${isSaving ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        {isSaving && isActive ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </button>
    );
  };

  return (
    <ProviderLayout title="Permisos por Rol" subtitle="Configura el acceso granular de cada rol a los módulos de la plataforma">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="etymon-surface p-5 border-[#00e7a7]/20 bg-[#00e7a7]/5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00e7a7]/20">
              <ShieldCheck className="h-5 w-5 text-[#00e7a7]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Matriz de Acceso Global</h3>
              <p className="mt-1 text-xs text-slate-400">
                Los permisos configurados aquí se aplicarán a <strong>todos los usuarios de todos los colegios</strong> en la plataforma. 
                El acceso final de una institución será la intersección entre los módulos habilitados en su Plan Comercial y los permisos asignados a cada rol en esta pantalla.
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
                    <th className="border-b border-[#2d2d2d] border-r px-6 py-4 font-heading text-[11px] w-64">
                      Módulo
                    </th>
                    {ROLES.map(role => (
                      <th key={role} className="border-b border-[#2d2d2d] px-6 py-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="text-slate-200">{role}</span>
                          <span className="text-[10px] font-normal text-slate-500 normal-case">
                            {role === "parent" ? "Acudiente / Estudiante" : "Personal escolar"}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d2d2d]">
                  {moduleCodes.map(code => {
                    const moduleData = modulesMap.get(code)!;
                    return (
                      <tr key={code} className="transition-colors hover:bg-[#1a1a1a]/50">
                        <td className="border-r border-[#2d2d2d] px-6 py-5">
                          <p className="font-semibold text-slate-200">{moduleData.name}</p>
                          <p className="mt-1 text-xs font-mono text-slate-500">{code}</p>
                        </td>
                        {ROLES.map(role => {
                          const currentLevel = moduleData.roles[role] || "none";
                          return (
                            <td key={role} className="px-4 py-4 align-top">
                              <div className="flex w-full min-w-[200px] gap-1.5 rounded-lg bg-[#111] p-1.5 shadow-inner">
                                {renderAccessButton(
                                  role, 
                                  code, 
                                  currentLevel, 
                                  "full", 
                                  "Edición", 
                                  Edit3, 
                                  "cyan-400"
                                )}
                                {renderAccessButton(
                                  role, 
                                  code, 
                                  currentLevel, 
                                  "readonly", 
                                  "Lectura", 
                                  Eye, 
                                  "indigo-400"
                                )}
                                {renderAccessButton(
                                  role, 
                                  code, 
                                  currentLevel, 
                                  "none", 
                                  "Sin Acceso", 
                                  Lock, 
                                  "rose-400"
                                )}
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
