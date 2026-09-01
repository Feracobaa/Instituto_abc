import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/hooks/school/types";
import type { AttendanceDraftMap } from "@/features/asistencias/helpers";

const STATUS_OPTIONS: Array<{ label: string; value: AttendanceStatus }> = [
  { label: "Presente", value: "present" },
  { label: "Ausente", value: "absent" },
  { label: "Justificada", value: "justified" },
];

const STATUS_META: Record<
  AttendanceStatus,
  {
    badgeClass: string;
    buttonClass: string;
    icon: typeof CheckCircle2;
    label: string;
  }
> = {
  present: {
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    buttonClass: "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
    icon: CheckCircle2,
    label: "Presente",
  },
  absent: {
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
    buttonClass: "border-rose-600 bg-rose-600 text-white hover:bg-rose-700",
    icon: XCircle,
    label: "Ausente",
  },
  justified: {
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    buttonClass: "border-amber-600 bg-amber-600 text-white hover:bg-amber-700",
    icon: AlertCircle,
    label: "Justificada",
  },
};

interface StudentItem {
  id: string;
  full_name: string;
}

interface AttendanceStudentTableProps {
  students: StudentItem[];
  draftMap: AttendanceDraftMap;
  isMobile: boolean;
  canEditDate: boolean;
  isSaving: boolean;
  onSetDraftStatus: (studentId: string, status: AttendanceStatus | "") => void;
  onSetDraftNote: (studentId: string, value: string) => void;
}

export function AttendanceStudentTable({
  students,
  draftMap,
  isMobile,
  canEditDate,
  isSaving,
  onSetDraftStatus,
  onSetDraftNote,
}: AttendanceStudentTableProps) {
  const getStatusLabel = (status: AttendanceStatus | "") => {
    if (!status) return "Sin marcar";
    return STATUS_META[status].label;
  };

  const getStatusBadgeClass = (status: AttendanceStatus | "") => {
    if (!status) {
      return "border-slate-200 bg-slate-50 text-slate-600";
    }
    return STATUS_META[status].badgeClass;
  };

  if (isMobile) {
    return (
      <div className="space-y-3">
        {students.map((student) => {
          const draft = draftMap[student.id] ?? {
            justification_note: "",
            status: "" as AttendanceStatus | "",
          };

          return (
            <div key={student.id} className="rounded-xl border bg-background p-3 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{student.full_name}</p>
                <Badge variant="outline" className={cn("whitespace-nowrap", getStatusBadgeClass(draft.status))}>
                  {getStatusLabel(draft.status)}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {STATUS_OPTIONS.map((option) => {
                  const isActive = draft.status === option.value;
                  const Icon = STATUS_META[option.value].icon;

                  return (
                    <Button
                      key={`${student.id}-${option.value}`}
                      type="button"
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                      className={cn("h-9 px-2 text-[11px]", isActive && STATUS_META[option.value].buttonClass)}
                      onClick={() => onSetDraftStatus(student.id, option.value)}
                      disabled={!canEditDate || isSaving}
                    >
                      <Icon className="mr-1 h-3.5 w-3.5" />
                      {option.label}
                    </Button>
                  );
                })}
              </div>

              <div className="mt-3">
                <Input
                  value={draft.justification_note}
                  onChange={(event) => onSetDraftNote(student.id, event.target.value)}
                  placeholder="Motivo de justificacion"
                  disabled={
                    !canEditDate
                    || isSaving
                    || draft.status !== "justified"
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Estudiante</TableHead>
            <TableHead className="w-[220px] font-semibold">Estado</TableHead>
            <TableHead className="font-semibold">Nota (opcional si justificada)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => {
            const draft = draftMap[student.id] ?? {
              justification_note: "",
              status: "" as AttendanceStatus | "",
            };

            return (
              <TableRow key={student.id}>
                <TableCell className="font-medium">
                  <div className="space-y-1">
                    <p>{student.full_name}</p>
                    <Badge variant="outline" className={cn("w-fit", getStatusBadgeClass(draft.status))}>
                      {getStatusLabel(draft.status)}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {STATUS_OPTIONS.map((option) => {
                      const isActive = draft.status === option.value;
                      const Icon = STATUS_META[option.value].icon;

                      return (
                        <Button
                          key={`${student.id}-${option.value}`}
                          type="button"
                          size="sm"
                          variant={isActive ? "default" : "outline"}
                          className={cn("h-8 px-2 text-xs", isActive && STATUS_META[option.value].buttonClass)}
                          onClick={() => onSetDraftStatus(student.id, option.value)}
                          disabled={!canEditDate || isSaving}
                        >
                          <Icon className="mr-1 h-3.5 w-3.5" />
                          {option.label}
                        </Button>
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    value={draft.justification_note}
                    onChange={(event) => onSetDraftNote(student.id, event.target.value)}
                    placeholder="Motivo de justificacion"
                    disabled={
                      !canEditDate
                      || isSaving
                      || draft.status !== "justified"
                    }
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
