import { Loader2 } from "lucide-react";
import type { ProviderInstitutionSummary } from "@/hooks/provider";

interface InstitutionListSidebarProps {
  summaries?: ProviderInstitutionSummary[];
  selectedInstitutionId: string;
  onSelectInstitution: (id: string) => void;
  isLoading: boolean;
}

export function InstitutionListSidebar({
  summaries,
  selectedInstitutionId,
  onSelectInstitution,
  isLoading,
}: InstitutionListSidebarProps) {
  return (
    <aside className="etymon-surface p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Colegios</h3>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {(summaries ?? []).map((summary) => (
            <button
              key={summary.institution.id}
              onClick={() => onSelectInstitution(summary.institution.id)}
              className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${
                selectedInstitutionId === summary.institution.id
                  ? "border-[var(--et-accent)] bg-[color:var(--et-accent-soft)] text-slate-100"
                  : "border-[var(--et-border)] [background:var(--et-chip-bg)] text-slate-300 hover:border-[var(--et-accent)]"
              }`}
            >
              <p className="text-sm font-medium">{summary.institution.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{summary.institution.slug}</p>
              <span
                className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                  summary.institution.is_active
                    ? "border border-emerald-400/35 bg-emerald-400/12 text-emerald-200"
                    : "border border-slate-500/35 bg-slate-500/15 text-slate-300"
                }`}
              >
                {summary.institution.is_active ? "Activa" : "Inactiva"}
              </span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
