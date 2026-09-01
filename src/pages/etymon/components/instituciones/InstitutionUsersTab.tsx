import React from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProviderFloatingInput } from "@/components/provider/ProviderFloatingField";
import { institutionRoles } from "./types";

interface InstitutionUsersTabProps {
  accessForm: {
    email: string;
    fullName: string;
    role: (typeof institutionRoles)[number];
    temporaryPassword: string;
  };
  setAccessForm: React.Dispatch<
    React.SetStateAction<{
      email: string;
      fullName: string;
      role: (typeof institutionRoles)[number];
      temporaryPassword: string;
    }>
  >;
  onProcessUserAccess: () => void;
  isProcessing: boolean;
}

export function InstitutionUsersTab({
  accessForm,
  setAccessForm,
  onProcessUserAccess,
  isProcessing,
}: InstitutionUsersTabProps) {
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="etymon-surface-soft p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--et-border)] pb-3 mb-1">
          <Users className="h-4 w-4 text-[var(--et-accent)]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--et-text-subtle)]">
            Otorgar Acceso Administrativo
          </h4>
        </div>
        <p className="text-xs text-[var(--et-text-muted)] leading-relaxed">
          Ingresa el correo electrónico institucional. Si el usuario no existe en la base central,
          se creará una cuenta automáticamente. Si ya existe, se le vinculará este rol asignado en
          esta institución.
        </p>
        <ProviderFloatingInput
          type="email"
          label="Correo del usuario"
          value={accessForm.email}
          onChange={(event) =>
            setAccessForm((current) => ({ ...current, email: event.target.value }))
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ProviderFloatingInput
            label="Nombre completo (opcional)"
            value={accessForm.fullName}
            onChange={(event) =>
              setAccessForm((current) => ({ ...current, fullName: event.target.value }))
            }
          />
          <ProviderFloatingInput
            label="Contraseña temporal (opcional)"
            type="password"
            value={accessForm.temporaryPassword}
            onChange={(event) =>
              setAccessForm((current) => ({ ...current, temporaryPassword: event.target.value }))
            }
          />
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--et-text-muted)]">
            Rol en la institución
          </p>
          <Select
            value={accessForm.role}
            onValueChange={(value) =>
              setAccessForm((current) => ({
                ...current,
                role: value as (typeof institutionRoles)[number],
              }))
            }
          >
            <SelectTrigger className="etymon-input h-10 text-xs text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-[var(--et-border)] [background:var(--et-input-bg)] text-xs text-slate-100">
              {institutionRoles
                .filter((r) => r !== "parent")
                .map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          className="etymon-btn-primary w-full h-11"
          onClick={onProcessUserAccess}
          disabled={isProcessing}
        >
          {isProcessing ? "Otorgando acceso..." : "Otorgar acceso a institución"}
        </Button>
      </div>
    </div>
  );
}
