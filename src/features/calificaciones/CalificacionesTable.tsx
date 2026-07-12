import { FileText, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getGradeColor,
  isPreescolarEvaluationRecord,
} from "@/features/calificaciones/helpers";
import type { CalificacionTableRecord } from "@/features/calificaciones/types";
import type {
  GradeRecord,
  PreescolarEvaluation,
  Student,
} from "@/hooks/useSchoolData";
import { cn } from "@/lib/utils";

interface InlineGradeInputProps {
  record: GradeRecord;
  onSave: (record: GradeRecord, grade: number) => Promise<void>;
}

function InlineGradeInput({ record, onSave }: InlineGradeInputProps) {
  const [value, setValue] = useState<string>(String(record.grade));
  const [isSaving, setIsSaving] = useState(false);
  const initialValue = useRef<string>(String(record.grade));

  useEffect(() => {
    setValue(String(record.grade));
    initialValue.current = String(record.grade);
  }, [record.grade]);

  const handleSave = async () => {
    const numeric = parseFloat(value);
    if (Number.isNaN(numeric) || numeric < 1 || numeric > 5) {
      setValue(initialValue.current);
      return;
    }

    if (value === initialValue.current) {
      return;
    }

    try {
      setIsSaving(true);
      await onSave(record, numeric);
      initialValue.current = value;
    } catch (error) {
      setValue(initialValue.current);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const inputs = document.querySelectorAll(".inline-grade-input") as NodeListOf<HTMLInputElement>;
      const currentIdx = Array.from(inputs).indexOf(e.currentTarget);
      if (e.key === "ArrowDown" && currentIdx < inputs.length - 1) {
        inputs[currentIdx + 1].focus();
        inputs[currentIdx + 1].select();
      } else if (e.key === "ArrowUp" && currentIdx > 0) {
        inputs[currentIdx - 1].focus();
        inputs[currentIdx - 1].select();
      }
    }
  };

  const currentGradeNum = parseFloat(value);

  return (
    <input
      type="number"
      step="0.1"
      min="1"
      max="5"
      value={value}
      disabled={isSaving}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      className={cn(
        "w-16 h-9 text-center font-bold px-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/45 inline-grade-input transition-all duration-200",
        isSaving ? "opacity-50 cursor-wait" : "",
        currentGradeNum >= 4.6 ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
        currentGradeNum >= 4.0 ? "border-success bg-success/10 text-success" :
        currentGradeNum >= 3.0 ? "border-warning bg-warning/10 text-warning" :
        currentGradeNum >= 2.0 ? "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400" :
        "border-destructive bg-destructive/10 text-destructive"
      )}
    />
  );
}

interface CalificacionesTableProps {
  canManageRecords: boolean;
  getRecordsForStudent: (studentId: string, gradeId: string) => CalificacionTableRecord[];
  isPreescolar: boolean;
  onAddGrade: (studentId: string) => void;
  onAddPreescolar: (studentId: string) => void;
  onDeleteGrade: (recordId: string) => void;
  onDeletePreescolar: (recordId: string) => void;
  onDownloadReport: (student: Student) => void;
  onEditGrade: (record: GradeRecord) => void;
  onEditPreescolar: (record: PreescolarEvaluation) => void;
  students: Student[];
  inlineEditActive: boolean;
  onInlineGradeChange: (record: GradeRecord, newGrade: number) => Promise<void>;
}

export function CalificacionesTable({
  canManageRecords,
  getRecordsForStudent,
  isPreescolar,
  onAddGrade,
  onAddPreescolar,
  onDeleteGrade,
  onDeletePreescolar,
  onDownloadReport,
  onEditGrade,
  onEditPreescolar,
  students,
  inlineEditActive,
  onInlineGradeChange,
}: CalificacionesTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-card animate-fade-in">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary">
            <TableHead className="font-semibold">Estudiante</TableHead>
            <TableHead className="font-semibold">{isPreescolar ? "Dimension" : "Materia"}</TableHead>
            <TableHead className="hidden font-semibold md:table-cell">
              {isPreescolar ? "Fortalezas registradas" : "Logros"}
            </TableHead>
            <TableHead className="text-center font-semibold">
              {isPreescolar ? "Estado" : "Nota"}
            </TableHead>
            <TableHead className="w-[120px] text-center font-semibold">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-12">
                <EmptyState
                  title="Sin resultados"
                  description="No se encontraron estudiantes para los filtros actuales."
                  icon={Users}
                  className="border-none shadow-none bg-transparent py-4"
                />
              </TableCell>
            </TableRow>
          ) : (
            students.map((student) => {
              const records = getRecordsForStudent(student.id, student.grade_id ?? "");

              if (records.length === 0) {
                return (
                  <TableRow key={student.id} className="hover:bg-secondary/10 transition-colors">
                    <TableCell className="font-medium">{student.full_name}</TableCell>
                    <TableCell colSpan={3} className="text-sm text-muted-foreground">
                      Sin informacion registrada
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          disabled={!canManageRecords}
                          onClick={() =>
                            isPreescolar ? onAddPreescolar(student.id) : onAddGrade(student.id)
                          }
                      >
                        <Plus className="h-3 w-3" />
                        Agregar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }

              return records.map((record, index) => {
                const isPreescolarRecord = isPreescolarEvaluationRecord(record);

                return (
                  <TableRow key={record.id} className="hover:bg-secondary/30 transition-colors">
                    {index === 0 && (
                      <TableCell className="font-medium" rowSpan={records.length}>
                        <div className="flex items-center gap-2">
                          <span>{student.full_name}</span>
                          <button
                            className="rounded p-1 text-primary transition-colors hover:bg-primary/10"
                            onClick={() => onDownloadReport(student)}
                            title="Descargar boletin PDF"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    )}

                    <TableCell className="text-sm">
                      {isPreescolarRecord ? record.dimension : record.subjects?.name}
                    </TableCell>
                    <TableCell className="hidden max-w-xs truncate text-sm text-muted-foreground md:table-cell">
                      {isPreescolarRecord ? record.fortalezas || "-" : record.achievements || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {isPreescolarRecord ? (
                        <span className="text-muted-foreground">-</span>
                      ) : inlineEditActive && canManageRecords ? (
                        <InlineGradeInput
                          record={record}
                          onSave={onInlineGradeChange}
                        />
                      ) : (
                        <span
                          className={cn(
                            "inline-flex h-9 w-9 items-center justify-center rounded-lg font-bold",
                            getGradeColor(record.grade),
                          )}
                        >
                          {record.grade}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={!canManageRecords}
                          onClick={() =>
                            isPreescolarRecord
                              ? onEditPreescolar(record)
                              : onEditGrade(record)
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={!canManageRecords}
                          onClick={() =>
                            isPreescolarRecord
                              ? onDeletePreescolar(record.id)
                              : onDeleteGrade(record.id)
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {index === records.length - 1 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            disabled={!canManageRecords}
                            onClick={() =>
                              isPreescolar ? onAddPreescolar(student.id) : onAddGrade(student.id)
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              });
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

