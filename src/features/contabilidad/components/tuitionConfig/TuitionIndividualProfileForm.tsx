import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { formatCurrency, formatMoneyInput, parseMoneyInput, toSchoolMonthInput } from "@/features/contabilidad/utils";
import { SCHOOL_MONTH_START, SCHOOL_MONTH_END } from "@/features/contabilidad/constants";
import type { TuitionProfile } from "@/hooks/school/types";

interface StudentOption {
  id: string;
  full_name: string;
}

interface TuitionIndividualProfileFormProps {
  profileForm: {
    studentId: string;
    monthlyTuition: string;
    chargeStartMonth: string;
    chargeEndMonth: string;
    notes: string;
  };
  setProfileForm: React.Dispatch<
    React.SetStateAction<{
      studentId: string;
      monthlyTuition: string;
      chargeStartMonth: string;
      chargeEndMonth: string;
      notes: string;
    }>
  >;
  students: StudentOption[];
  profilesByStudent: Map<string, TuitionProfile>;
  selectedYear: number;
  isContable: boolean;
  isPending: boolean;
  onProfileSubmit: (event: React.FormEvent) => void;
  onStudentSelected: (studentId: string) => void;
}

export function TuitionIndividualProfileForm({
  profileForm,
  setProfileForm,
  students,
  profilesByStudent,
  selectedYear,
  isContable,
  isPending,
  onProfileSubmit,
  onStudentSelected,
}: TuitionIndividualProfileFormProps) {
  return (
    <form onSubmit={onProfileSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Estudiante</Label>
        <SearchableSelect
          value={profileForm.studentId}
          onValueChange={(studentId) => onStudentSelected(studentId)}
          options={students.map((student) => ({
            value: student.id,
            label: student.full_name,
          }))}
          placeholder="Busca un estudiante..."
          searchPlaceholder="Escribe un nombre..."
          emptyMessage="Ningun estudiante coincide."
          disabled={!isContable}
        />
      </div>
      {profileForm.studentId && profilesByStudent.has(profileForm.studentId) && (
        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          Este estudiante ya tiene perfil. Al guardar, se actualizara su configuracion.
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Valor mensual</Label>
        <Input
          type="text"
          inputMode="numeric"
          value={profileForm.monthlyTuition}
          onChange={(event) =>
            setProfileForm((current) => ({
              ...current,
              monthlyTuition: formatMoneyInput(event.target.value),
            }))
          }
          disabled={!isContable}
          placeholder="Ej: 120.000"
        />
        <p className="text-xs text-muted-foreground">
          Valor digitado: {formatCurrency(parseMoneyInput(profileForm.monthlyTuition))}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Mes inicio</Label>
        <Input
          type="month"
          value={profileForm.chargeStartMonth}
          onChange={(event) =>
            setProfileForm((current) => ({ ...current, chargeStartMonth: event.target.value }))
          }
          min={toSchoolMonthInput(selectedYear, SCHOOL_MONTH_START)}
          max={toSchoolMonthInput(selectedYear, SCHOOL_MONTH_END)}
          disabled={!isContable}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Mes fin (opcional)</Label>
        <Input
          type="month"
          value={profileForm.chargeEndMonth}
          onChange={(event) =>
            setProfileForm((current) => ({ ...current, chargeEndMonth: event.target.value }))
          }
          min={toSchoolMonthInput(selectedYear, SCHOOL_MONTH_START)}
          max={toSchoolMonthInput(selectedYear, SCHOOL_MONTH_END)}
          disabled={!isContable}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Notas</Label>
        <Textarea
          value={profileForm.notes}
          onChange={(event) =>
            setProfileForm((current) => ({ ...current, notes: event.target.value }))
          }
          disabled={!isContable}
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={!isContable || isPending}
      >
        {profilesByStudent.has(profileForm.studentId) ? "Actualizar pension" : "Guardar pension"}
      </Button>
    </form>
  );
}
