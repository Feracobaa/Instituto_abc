import { MainLayout } from "@/components/layout/MainLayout";
import {
  useGrades, useStudents, useGradeRecords, useAcademicPeriods,
  useSubjects, useTeachers, useCreateGradeRecord, useUpdateGradeRecord, 
  useDeleteGradeRecord, useSchedules,
  usePreescolarEvaluations, useCreatePreescolarEvaluation,
  useUpdatePreescolarEvaluation, useDeletePreescolarEvaluation
} from "@/hooks/useSchoolData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, FileText, Pencil, ClipboardList, Trash2, CalendarDays } from "lucide-react";
import { downloadReportCard } from "@/utils/pdfGenerator";
import PreescolarReport, { PreescolarReportHandle } from "@/components/reports/PreescolarReport";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PREESCOLAR_DIMENSIONS, PREESCOLAR_DEFAULT_FORTALEZAS } from "@/utils/constants";
import { useRef } from "react";

const gradeOptions = [
  { value: 5, label: '5', sublabel: 'Superior', color: 'bg-emerald-500 hover:bg-emerald-600' },
  { value: 4, label: '4', sublabel: 'Alto', color: 'bg-success hover:bg-success/90' },
  { value: 3, label: '3', sublabel: 'Básico', color: 'bg-warning hover:bg-warning/90' },
  { value: 2, label: '2', sublabel: 'Bajo', color: 'bg-orange-500 hover:bg-orange-600' },
  { value: 1, label: '1', sublabel: 'Muy Bajo', color: 'bg-destructive hover:bg-destructive/90' },
];

const Calificaciones = () => {
  const { data: grades } = useGrades();
  const { data: periods } = useAcademicPeriods();
  const { data: subjects } = useSubjects();
  const { data: teachers } = useTeachers();
  const { userRole, teacherId } = useAuth();
  const isRector = userRole === 'rector';

  const activePeriod = periods?.find(p => p.is_active);

  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Derived properties
  const selectedGradeData = grades?.find(g => g.id === selectedGrade);
  
  // Detección robusta por nombre para abarcar párvulo, pre-jardín, jardín, transición y preescolar
  const normalizedGradeName = selectedGradeData?.name?.toLowerCase().trim() || '';
  const isPreescolar = 
    normalizedGradeName.includes('párvulo') || 
    normalizedGradeName.includes('parvulo') || 
    normalizedGradeName.includes('pre-jardín') || 
    normalizedGradeName.includes('pre-jardin') || 
    normalizedGradeName.includes('jardín') || 
    normalizedGradeName.includes('jardin') || 
    normalizedGradeName.includes('transición') || 
    normalizedGradeName.includes('transicion') || 
    normalizedGradeName.includes('preescolar');

  // Auto-select active period on load
  useEffect(() => {
    if (activePeriod && !selectedPeriod) {
      setSelectedPeriod(activePeriod.id);
    }
  }, [activePeriod, selectedPeriod]);

  // Fetch schedules for the current teacher to filter available grades and subjects
  const { data: fetchSchedules } = useSchedules(undefined, isRector ? undefined : (teacherId || undefined));
  
  const availableGrades = isRector 
    ? grades 
    : grades?.filter(g => fetchSchedules?.some(s => s.grade_id === g.id));

  // If the currently selected grade is not in the available grades, reset it
  useEffect(() => {
    if (!isRector && availableGrades?.length && selectedGrade) {
      if (!availableGrades.find(g => g.id === selectedGrade)) {
        setSelectedGrade('');
      }
    }
  }, [isRector, availableGrades, selectedGrade]);

  const { data: students } = useStudents(selectedGrade || undefined);
  
  // Data for Primary
  const { data: gradeRecords, isLoading: isPrimaryLoading } = useGradeRecords({ periodId: selectedPeriod || undefined });
  
  // Data for Preescolar
  const { data: preescolarRecords, isLoading: isPreescolarLoading } = usePreescolarEvaluations({ periodId: selectedPeriod || undefined });

  // Mutations Primary
  const createGradeRecord = useCreateGradeRecord();
  const updateGradeRecord = useUpdateGradeRecord();
  const deleteGradeRecord = useDeleteGradeRecord();

  // Mutations Preescolar
  const createPreescolarEvaluation = useCreatePreescolarEvaluation();
  const updatePreescolarEvaluation = useUpdatePreescolarEvaluation();
  const deletePreescolarEvaluation = useDeletePreescolarEvaluation();

  // Dialog State Primary
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{
    id?: string;
    student_id: string;
    subject_id: string;
    grade: number;
    achievements: string;
    comments: string;
  } | null>(null);

  // Dialog State Preescolar
  const [preescolarDialogOpen, setPreescolarDialogOpen] = useState(false);
  const [editingPreescolar, setEditingPreescolar] = useState<{
    id?: string;
    student_id: string;
    dimension: string;
    fortalezas: string;
    debilidades: string;
    recomendaciones: string;
  } | null>(null);

  // Print Handling State
  const [downloadingStudent, setDownloadingStudent] = useState<any>(null);
  const preescolarRef = useRef<PreescolarReportHandle>(null);

  // Trigger print gracefully when downloading student is populated
  useEffect(() => {
    if (downloadingStudent && isPreescolar) {
      // Ensure the DOM has mounted the component with the student's data before exporting
      setTimeout(async () => {
        try {
          if (preescolarRef.current) {
             toast.info(`Generando PDF para ${downloadingStudent.full_name}...`);
             await preescolarRef.current.exportPDF();
             setDownloadingStudent(null);
          }
        } catch (error) {
           console.error(error);
           toast.error("Hubo un error exportando el PDF.");
           setDownloadingStudent(null);
        }
      }, 800); // Allow images to render
    }
  }, [downloadingStudent, isPreescolar]);

  const getGradeColor = (grade: number) => {
    if (grade >= 5) return 'bg-emerald-500 text-white';
    if (grade >= 4) return 'bg-success text-success-foreground';
    if (grade === 3) return 'bg-warning text-warning-foreground';
    if (grade === 2) return 'bg-orange-500 text-white';
    return 'bg-destructive text-destructive-foreground';
  };

  const getStudentGrades = (studentId: string) =>
    gradeRecords?.filter(r => r.student_id === studentId && (isRector || r.teacher_id === teacherId)) || [];

  const getStudentPreescolarEvaluations = (studentId: string) =>
    preescolarRecords?.filter(r => r.student_id === studentId && (isRector || r.teacher_id === teacherId)) || [];

  // ===================== PRIMARY HANDLERS =====================
  const handleAddGrade = (studentId: string) => {
    setEditingRecord({ student_id: studentId, subject_id: '', grade: 3, achievements: '', comments: '' });
    setDialogOpen(true);
  };

  const handleEditGrade = (record: NonNullable<typeof gradeRecords>[0]) => {
    setEditingRecord({
      id: record.id,
      student_id: record.student_id,
      subject_id: record.subject_id,
      grade: record.grade,
      achievements: record.achievements || '',
      comments: record.comments || ''
    });
    setDialogOpen(true);
  };

  const handleSaveGrade = async () => {
    if (!editingRecord || !selectedPeriod) return;
    const currentTeacherId = isRector ? teachers?.[0]?.id : teacherId;
    if (!currentTeacherId) return;

    if (editingRecord.id) {
      await updateGradeRecord.mutateAsync({
        id: editingRecord.id,
        grade: editingRecord.grade,
        achievements: editingRecord.achievements,
        comments: editingRecord.comments
      });
    } else {
      await createGradeRecord.mutateAsync({
        student_id: editingRecord.student_id,
        subject_id: editingRecord.subject_id,
        teacher_id: currentTeacherId,
        period_id: selectedPeriod,
        grade: editingRecord.grade,
        achievements: editingRecord.achievements,
        comments: editingRecord.comments
      });
    }
    setDialogOpen(false);
    setEditingRecord(null);
  };

  const handleDeleteGrade = async (recordId: string) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta calificación? Esta acción no se puede deshacer.")) {
      try {
        await deleteGradeRecord.mutateAsync(recordId);
      } catch (error) {
        console.error("Error al eliminar la calificación:", error);
      }
    }
  };

  // ===================== PREESCOLAR HANDLERS =====================
  const handleAddPreescolar = (studentId: string) => {
    setEditingPreescolar({ 
      student_id: studentId, 
      dimension: '', 
      fortalezas: '', 
      debilidades: '', 
      recomendaciones: '' 
    });
    setPreescolarDialogOpen(true);
  };

  const handleEditPreescolar = (record: any) => {
    setEditingPreescolar({
      id: record.id,
      student_id: record.student_id,
      dimension: record.dimension,
      fortalezas: record.fortalezas || '',
      debilidades: record.debilidades || '',
      recomendaciones: record.recomendaciones || ''
    });
    setPreescolarDialogOpen(true);
  };

  const handleSavePreescolar = async () => {
    if (!editingPreescolar || !selectedPeriod) return;
    
    // Validaciones basicas
    if (!editingPreescolar.dimension) {
       toast.error("Debe seleccionar una dimensión");
       return;
    }
    const maxLen = 1000;
    if (editingPreescolar.fortalezas.length > maxLen || editingPreescolar.debilidades.length > maxLen || editingPreescolar.recomendaciones.length > maxLen) {
       toast.error(`Los textos no pueden exceder los ${maxLen} caracteres`);
       return;
    }

    const currentTeacherId = isRector ? teachers?.[0]?.id : teacherId;
    if (!currentTeacherId) return;

    if (editingPreescolar.id) {
      await updatePreescolarEvaluation.mutateAsync({
        id: editingPreescolar.id,
        fortalezas: editingPreescolar.fortalezas,
        debilidades: editingPreescolar.debilidades,
        recomendaciones: editingPreescolar.recomendaciones
      });
    } else {
      await createPreescolarEvaluation.mutateAsync({
        student_id: editingPreescolar.student_id,
        dimension: editingPreescolar.dimension,
        period_id: selectedPeriod,
        fortalezas: editingPreescolar.fortalezas,
        debilidades: editingPreescolar.debilidades,
        recomendaciones: editingPreescolar.recomendaciones
      });
    }
    setPreescolarDialogOpen(false);
    setEditingPreescolar(null);
  };

  const handleDeletePreescolar = async (recordId: string) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta dimensión?")) {
      try {
        await deletePreescolarEvaluation.mutateAsync(recordId);
      } catch (error) {
        console.error("Error al eliminar la evaluación cualitativa:", error);
      }
    }
  };

  // ===================== PDF EXPORT HANDLER =====================
  const handleDownloadReport = async (student: NonNullable<typeof students>[0]) => {
    if (!selectedPeriod) return;
    const period = periods?.find(p => p.id === selectedPeriod);
    if (!period) return;

    if (isPreescolar) {
       // Start hidden render and wait for useEffect cycle 
       setDownloadingStudent(student);
       return;
    }

    try {
      // Logic for primary report card (unchanged)
      const { data: allRecords } = await supabase
        .from('grade_records')
        .select(`
          period_id,
          grade,
          achievements,
          comments,
          subjects (id, name),
          academic_periods (name)
        `)
        .eq('student_id', student.id);

      const { data: classSchedules } = await supabase
        .from('schedules')
        .select('subject_id')
        .eq('grade_id', student.grade_id);

      if (allRecords && allRecords.length > 0) {
        await downloadReportCard(
          { full_name: student.full_name, grades: student.grades },
          { id: period.id, name: period.name },
          allRecords as any,
          classSchedules || [],
          periods || [],
          deliveryDate
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredStudents = students?.filter(s => !selectedGrade || s.grade_id === selectedGrade);
  const isLoading = isPrimaryLoading || isPreescolarLoading;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Calificaciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isPreescolar ? "Evaluaciones cualitativas (Preescolar)" : "Registro de calificaciones por período"}
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Seleccionar grado" />
            </SelectTrigger>
            <SelectContent>
              {availableGrades?.map((grade) => (
                <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              {periods?.map((period) => (
                <SelectItem key={period.id} value={period.id}>
                  {period.name} {period.is_active && '(Activo)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-1.5 h-10">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground leading-none mb-0.5">Fecha Entrega PDF</span>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="bg-transparent border-none p-0 text-sm focus:outline-none w-28 h-4 leading-none"
              />
            </div>
          </div>

          {activePeriod && !selectedPeriod && (
            <button
              onClick={() => setSelectedPeriod(activePeriod.id)}
              className="text-xs text-primary underline underline-offset-2"
            >
              Usar período activo
            </button>
          )}
        </div>

        {/* State: no selection */}
        {(!selectedGrade || !selectedPeriod) ? (
          <EmptyState
            icon={ClipboardList}
            title="Selecciona un grado y período"
            description="Elige el grado y el período académico para ver y gestionar las calificaciones."
          />
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card rounded-xl border shadow-card overflow-hidden animate-fade-in">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary">
                  <TableHead className="font-semibold">Estudiante</TableHead>
                  <TableHead className="font-semibold">{isPreescolar ? "Dimensión" : "Materia"}</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">{isPreescolar ? "Fortalezas Registradas" : "Logros"}</TableHead>
                  <TableHead className="font-semibold text-center">{isPreescolar ? "-" : "Nota"}</TableHead>
                  <TableHead className="font-semibold text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents?.map((student) => {
                  
                  // Decide which records to show based on grade logic
                  const records = isPreescolar 
                    ? getStudentPreescolarEvaluations(student.id)
                    : getStudentGrades(student.id);

                  if (records.length === 0) {
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.full_name}</TableCell>
                        <TableCell colSpan={3} className="text-muted-foreground text-sm">
                          Sin información registrada
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-xs gap-1" 
                            onClick={() => isPreescolar ? handleAddPreescolar(student.id) : handleAddGrade(student.id)}
                          >
                            <Plus className="w-3 h-3" />
                            Agregar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return records.map((record: any, idx) => (
                    <TableRow key={record.id} className="hover:bg-secondary/30">
                      {idx === 0 && (
                        <TableCell className="font-medium" rowSpan={records.length}>
                          <div className="flex items-center gap-2">
                            <span>{student.full_name}</span>
                            <button
                              className="p-1 rounded hover:bg-primary/10 text-primary transition-colors"
                              onClick={() => handleDownloadReport(student)}
                              title="Descargar boletín PDF"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      )}
                      
                      <TableCell className="text-sm">
                        {isPreescolar ? record.dimension : record.subjects?.name}
                      </TableCell>
                      
                      <TableCell className="text-muted-foreground text-sm max-w-xs truncate hidden md:table-cell">
                        {isPreescolar ? (record.fortalezas || '-') : (record.achievements || '-')}
                      </TableCell>
                      
                      <TableCell className="text-center">
                        {isPreescolar ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <span className={cn(
                            "inline-flex items-center justify-center w-9 h-9 rounded-lg font-bold",
                            getGradeColor(record.grade)
                          )}>
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
                            onClick={() => isPreescolar ? handleEditPreescolar(record) : handleEditGrade(record)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" 
                            onClick={() => isPreescolar ? handleDeletePreescolar(record.id) : handleDeleteGrade(record.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          {idx === records.length - 1 && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7" 
                              onClick={() => isPreescolar ? handleAddPreescolar(student.id) : handleAddGrade(student.id)}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ));
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Legend for Primary Only */}
        {!isPreescolar && (
          <div className="flex gap-4 flex-wrap">
            {[
              { color: 'bg-emerald-500', label: 'Superior (5)' },
              { color: 'bg-success', label: 'Alto (4)' },
              { color: 'bg-warning', label: 'Básico (3)' },
              { color: 'bg-orange-500', label: 'Bajo (2)' },
              { color: 'bg-destructive', label: 'Muy Bajo (1)' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={cn("w-3 h-3 rounded-sm", color)} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PRIMARY Grade Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRecord?.id ? 'Editar Calificación' : 'Nueva Calificación'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingRecord?.id && (
              <div className="space-y-2">
                <Label>Materia</Label>
                <Select
                  value={editingRecord?.subject_id}
                  onValueChange={(value) => setEditingRecord(prev => prev ? { ...prev, subject_id: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar materia" />
                  </SelectTrigger>
                  <SelectContent>
                    {(isRector 
                      ? subjects 
                      : subjects?.filter(subject => fetchSchedules?.some(s => s.grade_id === selectedGrade && s.subject_id === subject.id))
                    )?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Calificación</Label>
              <div className="grid grid-cols-5 gap-2">
                {gradeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEditingRecord(prev => prev ? { ...prev, grade: opt.value } : null)}
                    className={cn(
                      "flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all font-bold text-white text-lg",
                      editingRecord?.grade === opt.value
                        ? cn(opt.color, "border-transparent scale-105 shadow-md")
                        : "border-border bg-secondary text-foreground hover:border-primary/40"
                    )}
                  >
                    {opt.label}
                    <span className={cn(
                      "text-[10px] font-normal mt-0.5",
                      editingRecord?.grade === opt.value ? 'text-white/80' : 'text-muted-foreground'
                    )}>
                      {opt.sublabel}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Logros</Label>
              <Textarea
                placeholder="Describe los logros alcanzados..."
                value={editingRecord?.achievements || ''}
                onChange={(e) => setEditingRecord(prev => prev ? { ...prev, achievements: e.target.value } : null)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                placeholder="Observaciones adicionales..."
                value={editingRecord?.comments || ''}
                onChange={(e) => setEditingRecord(prev => prev ? { ...prev, comments: e.target.value } : null)}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleSaveGrade}
                disabled={createGradeRecord.isPending || updateGradeRecord.isPending || (!editingRecord?.id && !editingRecord?.subject_id)}
              >
                {(createGradeRecord.isPending || updateGradeRecord.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PREESCOLAR Evaluation Dialog */}
      <Dialog open={preescolarDialogOpen} onOpenChange={setPreescolarDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPreescolar?.id ? 'Editar Dimensión' : 'Nueva Evaluación (Dimensión)'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingPreescolar?.id && (
              <div className="space-y-2">
                <Label>Dimensión a Evaluar</Label>
                <Select
                  value={editingPreescolar?.dimension}
                  onValueChange={(value) => {
                    setEditingPreescolar(prev => prev ? { 
                      ...prev, 
                      dimension: value,
                      fortalezas: !prev.id && !prev.fortalezas ? PREESCOLAR_DEFAULT_FORTALEZAS[value] || '' : prev.fortalezas 
                    } : null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar dimensión" />
                  </SelectTrigger>
                  <SelectContent>
                    {PREESCOLAR_DIMENSIONS.map((dim) => (
                      <SelectItem key={dim} value={dim}>{dim}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2 mt-4 text-sm text-muted-foreground bg-blue-50/50 p-3 rounded-lg dark:bg-blue-900/20">
              Las fortalezas aparecerán por defecto, pero puedes editarlas. Las debilidades y recomendaciones son opcionales.
            </div>

            <div className="space-y-2">
              <Label className="text-emerald-700 dark:text-emerald-400 font-bold">Fortalezas</Label>
              <Textarea
                placeholder="Describa las fortalezas en esta dimensión..."
                value={editingPreescolar?.fortalezas || ''}
                maxLength={1000}
                onChange={(e) => setEditingPreescolar(prev => prev ? { ...prev, fortalezas: e.target.value } : null)}
                rows={4}
                className="resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-rose-700 dark:text-rose-400 font-bold">Debilidades (Opcional)</Label>
              <Textarea
                placeholder="Describa las debilidades en esta dimensión..."
                value={editingPreescolar?.debilidades || ''}
                maxLength={1000}
                onChange={(e) => setEditingPreescolar(prev => prev ? { ...prev, debilidades: e.target.value } : null)}
                rows={3}
                className="resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-blue-700 dark:text-blue-400 font-bold">Recomendaciones (Opcional)</Label>
              <Textarea
                placeholder="Recomendaciones para superar las debilidades..."
                value={editingPreescolar?.recomendaciones || ''}
                maxLength={1000}
                onChange={(e) => setEditingPreescolar(prev => prev ? { ...prev, recomendaciones: e.target.value } : null)}
                rows={3}
                className="resize-none"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPreescolarDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleSavePreescolar}
                disabled={createPreescolarEvaluation.isPending || updatePreescolarEvaluation.isPending || (!editingPreescolar?.id && !editingPreescolar?.dimension)}
              >
                {(createPreescolarEvaluation.isPending || updatePreescolarEvaluation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* HIDDEN RENDERER FOR PREESCOLAR PDF ENGINE */}
      {downloadingStudent && isPreescolar && (
        <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
          <PreescolarReport 
            ref={preescolarRef}
            student={{ 
              name: downloadingStudent.full_name, 
              grade: grades?.find(g => g.id === selectedGrade)?.name || 'Preescolar', 
              year: new Date().getFullYear().toString(), 
              director: '_______________________',
              period: periods?.find(p => p.id === selectedPeriod)?.name || 'Primer Periodo',
              deliveryDate: deliveryDate ? deliveryDate.split('-').reverse().join('/') : new Date().toLocaleDateString('es-CO')
            }}
            dimensions={getStudentPreescolarEvaluations(downloadingStudent.id)}
            schoolInfo={{
              republic: 'REPÚBLICA DE COLOMBIA',
              ministry: 'MINISTERIO DE EDUCACIÓN NACIONAL',
              department: 'DEPARTAMENTO DEL MAGDALENA',
              city: 'Ciénaga, Magdalena',
              name: 'INSTITUCIÓN EDUCATIVA INSTITUTO PEDAGÓGICO ABC',
              address: 'Calle 7 #14-42 - Ciénaga, Magdalena',
              phoneNit: 'Tel: 3104755752   NIT: 39.144.200-1',
              logoUrl: '/logo-iabc.jpg'
            }}
            id="hidden-preescolar-print"
          />
        </div>
      )}
    </MainLayout>
  );
};

export default Calificaciones;
