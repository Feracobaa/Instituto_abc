import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { TabsContent } from "@/components/ui/tabs";
import { Users } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitutionSettings, useUpdateInstitutionSettings } from "@/hooks/school/useInstitution";
import {
  useAccountingStudents,
  useTuitionProfiles,
  useTuitionMonthStatus,
  useRegisterStudentPayment,
  useCreateTuitionProfile,
  useUpdateTuitionProfile,
  useBulkAssignTuitionProfiles,
} from "@/hooks/useSchoolData";
import {
  DEFAULT_TUITION_VALUE,
  SCHOOL_MONTH_START,
  SCHOOL_MONTH_END,
  isProfileActiveInSchoolYear,
} from "@/features/contabilidad/constants";
import {
  formatMoneyInput,
  parseMoneyInput,
  isSchoolMonthInput,
  toSchoolMonthInput,
  toSchoolMonthDate,
  todayIso,
  normalizeLegacyAmount,
  monthLabel,
} from "@/features/contabilidad/utils";
import { ContabilidadSectionProps } from "../types";
import type { TuitionMonthStatus } from "@/hooks/school/types";
import { TuitionTemporaryReportCardBanner } from "./tuitionConfig/TuitionTemporaryReportCardBanner";
import { TuitionQuickPaymentForm } from "./tuitionConfig/TuitionQuickPaymentForm";
import { TuitionBulkAssignForm } from "./tuitionConfig/TuitionBulkAssignForm";
import { TuitionIndividualProfileForm } from "./tuitionConfig/TuitionIndividualProfileForm";

export function TuitionConfigSection({ selectedMonth, selectedYear, isContable }: ContabilidadSectionProps) {
  const { userRole } = useAuth();
  const isRector = userRole === "rector";
  const { data: settings } = useInstitutionSettings();
  const updateSettings = useUpdateInstitutionSettings();

  const { data: students } = useAccountingStudents();
  const { data: tuitionProfiles } = useTuitionProfiles();
  const { data: allMonthStatus } = useTuitionMonthStatus();

  const registerPayment = useRegisterStudentPayment();
  const createTuitionProfile = useCreateTuitionProfile();
  const updateTuitionProfile = useUpdateTuitionProfile();
  const bulkAssignProfiles = useBulkAssignTuitionProfiles();

  const [paymentForm, setPaymentForm] = useState({
    studentId: "",
    periodMonth: selectedMonth,
    amount: "",
    paymentDate: todayIso(),
    notes: "",
  });

  const [profileForm, setProfileForm] = useState({
    studentId: "",
    monthlyTuition: formatMoneyInput(String(DEFAULT_TUITION_VALUE)),
    chargeStartMonth: toSchoolMonthInput(selectedYear, SCHOOL_MONTH_START),
    chargeEndMonth: toSchoolMonthInput(selectedYear, SCHOOL_MONTH_END),
    notes: "",
  });

  const [bulkForm, setBulkForm] = useState({
    monthlyTuition: formatMoneyInput(String(DEFAULT_TUITION_VALUE)),
    chargeStartMonth: toSchoolMonthInput(selectedYear, SCHOOL_MONTH_START),
    chargeEndMonth: toSchoolMonthInput(selectedYear, SCHOOL_MONTH_END),
    overwrite: false,
  });

  const profilesByStudent = useMemo(() => {
    return new Map((tuitionProfiles ?? []).map((profile) => [profile.student_id, profile]));
  }, [tuitionProfiles]);

  const studentsWithoutProfile = useMemo(() => {
    return (students ?? []).filter((student) => !profilesByStudent.has(student.id));
  }, [profilesByStudent, students]);

  const schoolMonthOptions = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("es-CO", { month: "long" });
    return Array.from({ length: SCHOOL_MONTH_END - SCHOOL_MONTH_START + 1 }, (_, index) => {
      const month = SCHOOL_MONTH_START + index;
      const value = toSchoolMonthDate(selectedYear, month);
      const labelRaw = formatter.format(new Date(selectedYear, month - 1, 1));
      return {
        value,
        label: labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1),
      };
    });
  }, [selectedYear]);

  const schoolMonthOptionSet = useMemo(
    () => new Set(schoolMonthOptions.map((option) => option.value)),
    [schoolMonthOptions],
  );

  const schoolYearStatusMap = useMemo(() => {
    const map = new Map<string, TuitionMonthStatus>();
    (allMonthStatus ?? []).forEach((row) => {
      if (!schoolMonthOptionSet.has(row.period_month)) return;
      map.set(`${row.student_id}-${row.period_month}`, row);
    });
    return map;
  }, [allMonthStatus, schoolMonthOptionSet]);

  const studentsReadyForPayments = useMemo(() => {
    return (students ?? []).filter((student) => {
      const profile = profilesByStudent.get(student.id);
      if (!profile) return false;
      return isProfileActiveInSchoolYear(profile, selectedYear, toSchoolMonthDate);
    });
  }, [profilesByStudent, selectedYear, students]);

  const getSuggestedPeriodMonth = useCallback((studentId: string) => {
    const firstPending = schoolMonthOptions.find((option) => {
      const row = schoolYearStatusMap.get(`${studentId}-${option.value}`);
      return row?.pending_amount && row.pending_amount > 0;
    });
    return firstPending?.value ?? schoolMonthOptions[0]?.value ?? selectedMonth;
  }, [schoolMonthOptions, schoolYearStatusMap, selectedMonth]);

  useEffect(() => {
    if (!paymentForm.studentId) return;
    const suggestedPeriod = getSuggestedPeriodMonth(paymentForm.studentId);
    setPaymentForm((current) =>
      current.periodMonth === suggestedPeriod
        ? current
        : { ...current, periodMonth: suggestedPeriod },
    );
  }, [paymentForm.studentId, getSuggestedPeriodMonth]);

  useEffect(() => {
    if (!paymentForm.studentId) return;
    const stillAvailable = studentsReadyForPayments.some((student) => student.id === paymentForm.studentId);
    if (stillAvailable) return;
    setPaymentForm((current) => ({ ...current, studentId: "", periodMonth: selectedMonth }));
  }, [paymentForm.studentId, selectedMonth, studentsReadyForPayments]);

  useEffect(() => {
    if (paymentForm.studentId) return;
    setPaymentForm((current) => ({ ...current, periodMonth: selectedMonth }));
  }, [selectedMonth, paymentForm.studentId]);

  useEffect(() => {
    const startMonth = toSchoolMonthInput(selectedYear, SCHOOL_MONTH_START);
    const endMonth = toSchoolMonthInput(selectedYear, SCHOOL_MONTH_END);
    setBulkForm((current) => ({
      ...current,
      chargeStartMonth: startMonth,
      chargeEndMonth: current.chargeEndMonth ? endMonth : "",
    }));
    if (!profileForm.studentId || !profilesByStudent.has(profileForm.studentId)) {
      setProfileForm((current) => ({
        ...current,
        chargeStartMonth: startMonth,
        chargeEndMonth: current.chargeEndMonth ? endMonth : "",
      }));
    }
  }, [selectedYear, profileForm.studentId, profilesByStudent]);

  const updateProfileFormForStudent = (studentId: string) => {
    const profile = profilesByStudent.get(studentId);
    if (!profile) {
      setProfileForm((current) => ({
        ...current,
        studentId,
        monthlyTuition: formatMoneyInput(String(DEFAULT_TUITION_VALUE)),
        chargeStartMonth: toSchoolMonthInput(selectedYear, SCHOOL_MONTH_START),
        chargeEndMonth: toSchoolMonthInput(selectedYear, SCHOOL_MONTH_END),
        notes: "",
      }));
      return;
    }
    setProfileForm({
      studentId,
      monthlyTuition: formatMoneyInput(String(normalizeLegacyAmount(profile.monthly_tuition))),
      chargeStartMonth: profile.charge_start_month.slice(0, 7),
      chargeEndMonth: profile.charge_end_month ? profile.charge_end_month.slice(0, 7) : "",
      notes: profile.notes ?? "",
    });
  };

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profileForm.studentId) {
      toast({ title: "Selecciona estudiante", description: "Debes seleccionar un estudiante para asignar pension.", variant: "destructive" });
      return;
    }
    const monthlyTuition = parseMoneyInput(profileForm.monthlyTuition);
    if (monthlyTuition <= 0) {
      toast({ title: "Monto invalido", description: "La pension debe ser mayor a cero.", variant: "destructive" });
      return;
    }
    if (!profileForm.chargeStartMonth || !isSchoolMonthInput(profileForm.chargeStartMonth)) {
      toast({ title: "Mes invalido", description: "El inicio de cobro debe estar entre febrero y noviembre.", variant: "destructive" });
      return;
    }
    if (profileForm.chargeEndMonth && !isSchoolMonthInput(profileForm.chargeEndMonth)) {
      toast({ title: "Mes invalido", description: "El fin de cobro debe estar entre febrero y noviembre.", variant: "destructive" });
      return;
    }
    const chargeStartMonth = `${profileForm.chargeStartMonth}-01`;
    const chargeEndMonth = profileForm.chargeEndMonth ? `${profileForm.chargeEndMonth}-01` : null;
    const existing = profilesByStudent.get(profileForm.studentId);
    if (existing) {
      await updateTuitionProfile.mutateAsync({
        id: existing.id,
        monthly_tuition: monthlyTuition,
        charge_start_month: chargeStartMonth,
        charge_end_month: chargeEndMonth,
        notes: profileForm.notes || null,
      });
      return;
    }
    await createTuitionProfile.mutateAsync({
      student_id: profileForm.studentId,
      monthly_tuition: monthlyTuition,
      charge_start_month: chargeStartMonth,
      charge_end_month: chargeEndMonth,
      notes: profileForm.notes || null,
    });
  };

  const handleBulkSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const monthlyTuition = parseMoneyInput(bulkForm.monthlyTuition);
    if (monthlyTuition <= 0) {
      toast({ title: "Monto invalido", description: "La pension debe ser mayor a cero.", variant: "destructive" });
      return;
    }
    if (!bulkForm.chargeStartMonth || !isSchoolMonthInput(bulkForm.chargeStartMonth)) {
      toast({ title: "Mes invalido", description: "El inicio de cobro debe estar entre febrero y noviembre.", variant: "destructive" });
      return;
    }
    if (bulkForm.chargeEndMonth && !isSchoolMonthInput(bulkForm.chargeEndMonth)) {
      toast({ title: "Mes invalido", description: "El fin de cobro debe estar entre febrero y noviembre.", variant: "destructive" });
      return;
    }
    await bulkAssignProfiles.mutateAsync({
      monthly_tuition: monthlyTuition,
      charge_start_month: `${bulkForm.chargeStartMonth}-01`,
      charge_end_month: bulkForm.chargeEndMonth ? `${bulkForm.chargeEndMonth}-01` : null,
      overwrite: bulkForm.overwrite,
    });
  };

  const handlePaymentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const paymentAmount = parseMoneyInput(paymentForm.amount);
    if (!paymentForm.studentId || !paymentForm.periodMonth || paymentAmount <= 0) {
      toast({ title: "Datos incompletos", description: "Selecciona estudiante, mes pagado y un monto valido.", variant: "destructive" });
      return;
    }
    if (!profilesByStudent.has(paymentForm.studentId)) {
      toast({ title: "Perfil de pension faltante", description: "Primero asigna la pension del estudiante.", variant: "destructive" });
      return;
    }
    await registerPayment.mutateAsync({
      student_id: paymentForm.studentId,
      period_month: paymentForm.periodMonth,
      amount: paymentAmount,
      payment_date: paymentForm.paymentDate,
      notes: paymentForm.notes || undefined,
    });
    setPaymentForm((current) => ({ ...current, amount: "", notes: "" }));
  };

  const selectedPaymentProfile = paymentForm.studentId ? profilesByStudent.get(paymentForm.studentId) : undefined;
  const selectedPaymentStatus = paymentForm.studentId && paymentForm.periodMonth ? schoolYearStatusMap.get(`${paymentForm.studentId}-${paymentForm.periodMonth}`) : undefined;
  const selectedPaymentMonthLabel = paymentForm.periodMonth ? monthLabel(paymentForm.periodMonth) : monthLabel(selectedMonth);

  return (
    <TabsContent value="registrar-configurar" className="space-y-4 outline-none">
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="outline" className="bg-background">{studentsWithoutProfile.length} sin perfil</Badge>
      </div>

      {isRector && (
        <TuitionTemporaryReportCardBanner
          allowReportsOnDebtTemp={settings?.allow_reports_on_debt_temp}
          isPending={updateSettings.isPending}
          onToggleTempPermission={async () => {
            await updateSettings.mutateAsync({
              allow_reports_on_debt_temp: !settings?.allow_reports_on_debt_temp,
            });
          }}
        />
      )}

      <Accordion type="single" collapsible className="rounded-lg border border-dashed">
        <AccordionItem value="guia" className="border-0">
          <AccordionTrigger className="px-3 py-2 text-xs text-muted-foreground hover:no-underline hover:text-foreground">
            <span className="font-medium">¿Cómo funciona? — Ver guía de pasos</span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3">
            <Card className="border-primary/15 bg-gradient-to-r from-primary/5 via-background to-background shadow-card">
              <CardContent className="grid gap-3 p-4 md:grid-cols-3">
                <div className="rounded-lg border bg-background/80 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Paso 1</p>
                  <p className="mt-1 font-semibold text-foreground">Carga base de pensiones</p>
                  <p className="mt-1 text-sm text-muted-foreground">Asigna el valor a todos los estudiantes activos al iniciar el periodo.</p>
                </div>
                <div className="rounded-lg border bg-background/80 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Paso 2</p>
                  <p className="mt-1 font-semibold text-foreground">Ajusta excepciones</p>
                  <p className="mt-1 text-sm text-muted-foreground">Usa el formulario individual solo cuando un estudiante necesite una condicion distinta.</p>
                </div>
                <div className="rounded-lg border bg-background/80 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Paso 3</p>
                  <p className="mt-1 font-semibold text-foreground">Registra abonos</p>
                  <p className="mt-1 text-sm text-muted-foreground">Lleva los pagos del mes mientras ves al frente el saldo pendiente real.</p>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="grid gap-4 xl:grid-cols-2">
        <TuitionQuickPaymentForm
          paymentForm={paymentForm}
          setPaymentForm={setPaymentForm}
          studentsReadyForPayments={studentsReadyForPayments}
          schoolMonthOptions={schoolMonthOptions}
          schoolYearStatusMap={schoolYearStatusMap}
          selectedPaymentProfile={selectedPaymentProfile}
          selectedPaymentStatus={selectedPaymentStatus}
          selectedPaymentMonthLabel={selectedPaymentMonthLabel}
          selectedYear={selectedYear}
          isContable={isContable}
          isPending={registerPayment.isPending}
          onPaymentSubmit={handlePaymentSubmit}
          getSuggestedPeriodMonth={getSuggestedPeriodMonth}
        />

        <div className="space-y-3">
          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem value="masivo" className="overflow-hidden rounded-xl border bg-card shadow-card">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-heading font-bold text-foreground">Asignar pensiones masivas</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5">
                <TuitionBulkAssignForm
                  bulkForm={bulkForm}
                  setBulkForm={setBulkForm}
                  selectedYear={selectedYear}
                  isContable={isContable}
                  isPending={bulkAssignProfiles.isPending}
                  onBulkSubmit={handleBulkSubmit}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="individual" className="overflow-hidden rounded-xl border bg-card shadow-card">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-heading font-bold text-foreground">Ajuste individual</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5">
                <TuitionIndividualProfileForm
                  profileForm={profileForm}
                  setProfileForm={setProfileForm}
                  students={students ?? []}
                  profilesByStudent={profilesByStudent}
                  selectedYear={selectedYear}
                  isContable={isContable}
                  isPending={createTuitionProfile.isPending || updateTuitionProfile.isPending}
                  onProfileSubmit={handleProfileSubmit}
                  onStudentSelected={updateProfileFormForStudent}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </TabsContent>
  );
}
