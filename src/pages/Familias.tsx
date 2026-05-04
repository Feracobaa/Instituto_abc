import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Copy, KeyRound, Loader2, Search, Users } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { useGrades, useGuardianAccounts, useProvisionGuardianAccounts, useStudents } from "@/hooks/useSchoolData";
import type { ProvisionGuardianAccountResult } from "@/hooks/useSchoolData";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Familias() {
  const { data: grades } = useGrades();
  const [selectedGradeId, setSelectedGradeId] = useState("all");
  const [search, setSearch] = useState("");
  const [lastProvisioned, setLastProvisioned] = useState<ProvisionGuardianAccountResult[]>([]);

  const studentsQuery = useStudents(selectedGradeId === "all" ? undefined : selectedGradeId);
  const guardianAccountsQuery = useGuardianAccounts();
  const provisionGuardianAccounts = useProvisionGuardianAccounts();
  const { toast } = useToast();

  const accountsByStudentId = useMemo(
    () => new Map((guardianAccountsQuery.data ?? []).map((account) => [account.student_id, account])),
    [guardianAccountsQuery.data],
  );

  // Auto-fix students with is_active = null so the edge function doesn't skip them
  useEffect(() => {
    if (studentsQuery.data) {
      const fixNullActive = async () => {
        const studentsToFix = studentsQuery.data.filter(s => s.is_active === null);
        if (studentsToFix.length > 0) {
          for (const s of studentsToFix) {
            const { error } = await supabase.from("students").update({ is_active: true }).eq("id", s.id);
            if (error) console.error("Failed to fix is_active for", s.id, error);
          }
          studentsQuery.refetch();
        }
      };
      fixNullActive();
    }
  }, [studentsQuery.data]);

  const filteredStudents = useMemo(
    () => (studentsQuery.data ?? []).filter((student) => {
      const term = search.trim().toLowerCase();
      if (!term) {
        return true;
      }

      return student.full_name.toLowerCase().includes(term)
        || (student.guardian_name || "").toLowerCase().includes(term);
    }),
    [studentsQuery.data, search],
  );

  const missingAccountStudents = filteredStudents.filter((student) => !accountsByStudentId.has(student.id));
  const isLoading = studentsQuery.isLoading || guardianAccountsQuery.isLoading;

  const createdCredentials = lastProvisioned.filter((item) => item.status === "created");

  const handleProvision = async (studentIds?: string[]) => {
    const results = await provisionGuardianAccounts.mutateAsync(studentIds);
    setLastProvisioned(results);
  };

  const handleCopyCredentials = async () => {
    if (createdCredentials.length === 0) {
      return;
    }

    const text = createdCredentials
      .map((item) => `${item.studentName}: usuario ${item.username} / clave temporal ${item.temporaryPassword}`)
      .join("\n");

    await navigator.clipboard.writeText(text);
    toast({
      title: "Credenciales copiadas",
      description: "Ya puedes compartirlas con los acudientes creados en esta tanda.",
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Portal estudiantil</h1>
            <p className="text-sm text-muted-foreground">
              Administra accesos del estudiante para acudientes con usuario sin correo y clave temporal por grado.
            </p>
          </div>
          <Button
            onClick={() => handleProvision(missingAccountStudents.filter(s => s.grade_id).map((student) => student.id))}
            disabled={missingAccountStudents.filter(s => s.grade_id).length === 0 || provisionGuardianAccounts.isPending}
            className="gap-2"
          >
            {provisionGuardianAccounts.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Crear accesos faltantes
          </Button>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar estudiante o acudiente..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedGradeId("all")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                  selectedGradeId === "all"
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                )}
              >
                Todos
              </button>
              {grades?.map((grade) => (
                <button
                  key={grade.id}
                  onClick={() => setSelectedGradeId(grade.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                    selectedGradeId === grade.id
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                  )}
                >
                  {grade.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {createdCredentials.length > 0 && (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 shadow-card">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Credenciales generadas</h2>
                <p className="text-sm text-muted-foreground">
                  Comparte estas credenciales y recuerda pedir el cambio de contrasena en el primer ingreso.
                </p>
              </div>
              <Button variant="outline" className="gap-2" onClick={handleCopyCredentials}>
                <Copy className="h-4 w-4" />
                Copiar
              </Button>
            </div>
            <div className="space-y-2">
              {createdCredentials.map((item) => (
                <div key={item.studentId} className="rounded-lg bg-background/70 p-3 text-sm">
                  <p className="font-semibold text-foreground">{item.studentName}</p>
                  <p className="text-muted-foreground">Usuario: {item.username}</p>
                  <p className="text-muted-foreground">Clave temporal: {item.temporaryPassword}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No hay estudiantes para provisionar"
            description="Agrega estudiantes o ajusta el filtro de busqueda para continuar."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredStudents.map((student) => {
              const account = accountsByStudentId.get(student.id);
              const onboardingComplete = Boolean(account?.onboarding_completed_at && !account.must_change_password);

              return (
                <div key={student.id} className="rounded-xl border bg-card p-4 shadow-card">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{student.full_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {student.grades?.name || "Sin grado"} · {student.guardian_name || "Sin acudiente"}
                      </p>
                    </div>
                    <Badge variant={account ? "secondary" : "destructive"}>
                      {account ? "Con acceso" : "Sin acceso"}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Telefono acudiente: {student.guardian_phone || "No registrado"}</p>
                    <p>Usuario: {account?.username || "Pendiente por crear"}</p>
                    <p>Primer ingreso: {account ? (onboardingComplete ? "Completado" : "Pendiente") : "Sin acceso"}</p>
                  </div>

                  {!account && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => handleProvision([student.id])}
                        disabled={provisionGuardianAccounts.isPending || !student.grade_id}
                        title={!student.grade_id ? "Asigna un grado al estudiante primero" : undefined}
                      >
                        {provisionGuardianAccounts.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                        Crear acceso
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
