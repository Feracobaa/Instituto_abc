import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
          {students.map((student) => {
            const records = getRecordsForStudent(student.id, student.grade_id ?? "");

            if (records.length === 0) {
              return (
                <TableRow key={student.id}>
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
                <TableRow key={record.id} className="hover:bg-secondary/30">
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
          })}
        </TableBody>
      </Table>
    </div>
  );
}
