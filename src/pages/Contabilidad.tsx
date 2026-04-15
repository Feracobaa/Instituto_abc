import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmActionDialog } from "@/components/ui/ConfirmActionDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Calculator,
  Wallet,
  FileText,
  ClipboardList,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Trash2,
  RotateCcw,
  Users,
  Package,
  Download,
} from "lucide-react";
import {
  useAccountingLedger,
  useAccountingStudents,
  useBulkAssignTuitionProfiles,
  useCreateFinancialTransaction,
  useCreateInventoryItem,
  useCreateTuitionProfile,
  useDeleteFinancialTransaction,
  useDeleteInventoryItem,
  useDeleteTuitionPayment,
  useDeleteTuitionProfile,
  useInventoryItems,
  useRegisterStudentPayment,
  useAccountingTeachers,
  useTuitionPayments,
  useTuitionMonthStatus,
  useTuitionProfiles,
  useTuitionSummary,
  useUpdateTuitionProfile,
} from "@/hooks/useSchoolData";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { FinancialTransaction, InventoryItem, TuitionMonthStatus, TuitionProfile } from "@/hooks/school/types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
    .format(value);

const todayIso = () => new Date().toISOString().slice(0, 10);

const statusVariant = (status: string) => {
  if (status === "paid") return "default";
  if (status === "partial") return "outline";
  return "destructive";
};

const categoryLabels: Record<string, string> = {
  other_income: "Otros ingresos",
  teacher_payment: "Pago profesores",
  suplent_payment: "Pago suplente",
  rent: "Arriendo",
  water: "Agua",
  internet: "internet",
  electricity: "Luz",
  cleaning: "Aseo",
  inventory_purchase: "Compra inventario",
  repair: "Arreglos",
  other_expense: "Otros egresos",
  tuition: "Pensiones",
};

const incomeCategories: Array<{ value: FinancialTransaction["category"]; label: string }> = [
  { value: "other_income", label: "Otros ingresos" },
];

const expenseCategories: Array<{ value: FinancialTransaction["category"]; label: string }> = [
  { value: "teacher_payment", label: "Pago profesores" },
  { value: "suplent_payment", label: "Pago suplente" },
  { value: "rent", label: "Arriendo" },
  { value: "internet", label: "Internet" },
  { value: "water", label: "Agua" },
  { value: "electricity", label: "Luz" },
  { value: "cleaning", label: "Aseo" },
  { value: "inventory_purchase", label: "Compra inventario" },
  { value: "repair", label: "Arreglos" },
  { value: "other_expense", label: "Otros egresos" },
];

const monthLabel = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));

  return label.charAt(0).toUpperCase() + label.slice(1);
};

const DEFAULT_TUITION_VALUE = 120000;
const SCHOOL_MONTH_START = 2;
const SCHOOL_MONTH_END = 11;

const monthString = (month: number) => String(month).padStart(2, "0");

const clampSchoolMonth = (month: number) => Math.min(SCHOOL_MONTH_END, Math.max(SCHOOL_MONTH_START, month));

const toSchoolMonthDate = (year: number, month: number) => `${year}-${monthString(month)}-01`;

const toSchoolMonthInput = (year: number, month: number) => `${year}-${monthString(month)}`;

const formatMoneyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Number(digits));
};

const parseMoneyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits);
};

const normalizeLegacyAmount = (value: number) => (value > 0 && value < 1000 ? value * 1000 : value);

const isSchoolMonthInput = (value: string) => {
  const month = Number(value.split("-")[1]);
  return month >= SCHOOL_MONTH_START && month <= SCHOOL_MONTH_END;
};

const isProfileActiveInSchoolYear = (
  profile: Pick<TuitionProfile, "charge_start_month" | "charge_end_month">,
  year: number,
) => {
  const schoolYearStart = toSchoolMonthDate(year, SCHOOL_MONTH_START);
  const schoolYearEnd = toSchoolMonthDate(year, SCHOOL_MONTH_END);
  const chargeEnd = profile.charge_end_month ?? schoolYearEnd;

  return profile.charge_start_month <= schoolYearEnd && chargeEnd >= schoolYearStart;
};

type PendingDeleteAction =
  | {
    kind: "tuition_payment";
    id: string;
    title: string;
    description: string;
  }
  | {
    kind: "financial_transaction";
    id: string;
    title: string;
    description: string;
  }
  | {
    kind: "inventory_item";
    id: string;
    title: string;
    description: string;
  }
  | {
    kind: "tuition_profile_reset";
    studentId: string;
    title: string;
    description: string;
  };

export default function Contabilidad() {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const isContable = userRole === "contable";
  const isReadOnly = userRole === "rector";

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const month = clampSchoolMonth(now.getMonth() + 1);
    return toSchoolMonthDate(now.getFullYear(), month);
  });
  const [reportMonth, setReportMonth] = useState<string>(selectedMonth);

  const { data: monthStatus, isLoading: monthStatusLoading } = useTuitionMonthStatus(selectedMonth);
  const { data: reportMonthStatus, isLoading: reportMonthStatusLoading } = useTuitionMonthStatus(reportMonth);
  const { data: allMonthStatus } = useTuitionMonthStatus();
  const { data: tuitionProfiles } = useTuitionProfiles();
  const { data: tuitionSummary } = useTuitionSummary();
  const { data: tuitionPayments } = useTuitionPayments(selectedMonth);
  const { data: ledger } = useAccountingLedger(selectedMonth);
  const { data: reportLedger } = useAccountingLedger(reportMonth);
  const { data: inventoryItems } = useInventoryItems();
  const { data: students } = useAccountingStudents();
  const { data: teachers } = useAccountingTeachers();

  const registerPayment = useRegisterStudentPayment();
  const createTuitionProfile = useCreateTuitionProfile();
  const updateTuitionProfile = useUpdateTuitionProfile();
  const bulkAssignProfiles = useBulkAssignTuitionProfiles();
  const createTransaction = useCreateFinancialTransaction();
  const createInventoryItem = useCreateInventoryItem();
  const deleteTuitionPayment = useDeleteTuitionPayment();
  const deleteFinancialTransaction = useDeleteFinancialTransaction();
  const deleteInventoryItem = useDeleteInventoryItem();
  const deleteTuitionProfile = useDeleteTuitionProfile();

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
    chargeStartMonth: toSchoolMonthInput(Number(selectedMonth.slice(0, 4)), SCHOOL_MONTH_START),
    chargeEndMonth: toSchoolMonthInput(Number(selectedMonth.slice(0, 4)), SCHOOL_MONTH_END),
    notes: "",
  });

  const [bulkForm, setBulkForm] = useState({
    monthlyTuition: formatMoneyInput(String(DEFAULT_TUITION_VALUE)),
    chargeStartMonth: toSchoolMonthInput(Number(selectedMonth.slice(0, 4)), SCHOOL_MONTH_START),
    chargeEndMonth: toSchoolMonthInput(Number(selectedMonth.slice(0, 4)), SCHOOL_MONTH_END),
    overwrite: false,
  });

  const [transactionForm, setTransactionForm] = useState({
    movementType: "expense" as FinancialTransaction["movement_type"],
    category: "rent" as FinancialTransaction["category"],
    amount: "",
    transactionDate: todayIso(),
    description: "",
    teacherId: "",
    inventoryItemId: "",
  });

  const [inventoryForm, setInventoryForm] = useState({
    name: "",
    acquisitionDate: todayIso(),
    totalCost: "",
    paymentMode: "paid" as InventoryItem["payment_mode"],
    outstandingDebt: "0",
    notes: "",
  });

  const [pendingDeleteAction, setPendingDeleteAction] = useState<PendingDeleteAction | null>(null);
  const [ignoredDebtors, setIgnoredDebtors] = useState<Set<string>>(new Set());

  const monthTotals = useMemo(() => {
    const tuitionIncome = (monthStatus ?? []).reduce((sum, row) => sum + row.paid_amount, 0);
    const income = (ledger ?? [])
      .filter((entry) => entry.movement_type === "income")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const expenses = (ledger ?? [])
      .filter((entry) => entry.movement_type === "expense")
      .reduce((sum, entry) => sum + entry.amount, 0);
    return {
      tuitionIncome,
      income,
      expenses,
      balance: income - expenses,
    };
  }, [ledger, monthStatus]);

  const totalAnnualDebt = useMemo(() => {
    return (tuitionSummary ?? []).reduce((sum, row) => sum + row.total_pending, 0);
  }, [tuitionSummary]);

  const paymentsByStudent = useMemo(() => {
    const byId = new Map<string, string[]>();
    const byName = new Map<string, string[]>();
    (tuitionPayments ?? []).forEach((p) => {
      const raw = p as unknown as Record<string, unknown>;
      const sid = (raw.student_id as string) ?? "";
      const name: string = (p.students as { full_name?: string } | undefined)?.full_name ?? "";
      if (sid) {
        if (!byId.has(sid)) byId.set(sid, []);
        byId.get(sid)!.push(p.id);
      }
      if (name) {
        if (!byName.has(name)) byName.set(name, []);
        byName.get(name)!.push(p.id);
      }
    });
    return { byId, byName };
  }, [tuitionPayments]);

  const pendingCount = useMemo(
    () => (monthStatus ?? []).filter((row) => row.pending_amount > 0).length,
    [monthStatus],
  );

  const topDebtors = useMemo(() => {
    return [...(tuitionSummary ?? [])]
      .sort((a, b) => b.total_pending - a.total_pending)
      .slice(0, 6);
  }, [tuitionSummary]);

  const profilesByStudent = useMemo(() => {
    return new Map((tuitionProfiles ?? []).map((profile) => [profile.student_id, profile]));
  }, [tuitionProfiles]);

  const selectedYear = Number(selectedMonth.slice(0, 4));

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

  const studentsWithoutProfile = useMemo(() => {
    return (students ?? []).filter((student) => !profilesByStudent.has(student.id));
  }, [profilesByStudent, students]);

  const studentsReadyForPayments = useMemo(() => {
    return (students ?? []).filter((student) => {
      const profile = profilesByStudent.get(student.id);
      if (!profile) return false;
      return isProfileActiveInSchoolYear(profile, selectedYear);
    });
  }, [profilesByStudent, selectedYear, students]);

  const financedInventory = useMemo(() => {
    return (inventoryItems ?? []).filter((item) => item.payment_mode === "financed");
  }, [inventoryItems]);

  const inventoryOutstanding = useMemo(() => {
    return financedInventory.reduce((sum, item) => sum + item.outstanding_debt, 0);
  }, [financedInventory]);

  const selectedPaymentProfile = paymentForm.studentId
    ? profilesByStudent.get(paymentForm.studentId)
    : undefined;
  const selectedPaymentStatus = paymentForm.studentId && paymentForm.periodMonth
    ? schoolYearStatusMap.get(`${paymentForm.studentId}-${paymentForm.periodMonth}`)
    : undefined;
  const selectedMonthLabel = monthLabel(selectedMonth);
  const reportMonthLabel = monthLabel(reportMonth);
  const selectedPaymentMonthLabel = paymentForm.periodMonth
    ? monthLabel(paymentForm.periodMonth)
    : selectedMonthLabel;

  const reportRows = useMemo(() => {
    return [...(reportMonthStatus ?? [])].sort((a, b) => a.student_name.localeCompare(b.student_name));
  }, [reportMonthStatus]);

  const reportTotals = useMemo(() => {
    const paidCount = reportRows.filter((row) => row.status === "paid").length;
    const partialCount = reportRows.filter((row) => row.status === "partial").length;
    const unpaidCount = reportRows.filter((row) => row.status === "unpaid").length;
    const collectedAmount = reportRows.reduce((sum, row) => sum + normalizeLegacyAmount(row.paid_amount), 0);
    const pendingAmount = reportRows.reduce((sum, row) => sum + normalizeLegacyAmount(row.pending_amount), 0);

    return {
      paidCount,
      partialCount,
      unpaidCount,
      collectedAmount,
      pendingAmount,
    };
  }, [reportRows]);

  const setMonthFromInput = (value: string) => {
    if (!value) return;
    const [yearString, monthStringValue] = value.split("-");
    const year = Number(yearString);
    const month = clampSchoolMonth(Number(monthStringValue));
    setSelectedMonth(toSchoolMonthDate(year, month));
  };

  const getSuggestedPeriodMonth = (studentId: string) => {
    const firstPending = schoolMonthOptions.find((option) => {
      const row = schoolYearStatusMap.get(`${studentId}-${option.value}`);
      return row?.pending_amount && row.pending_amount > 0;
    });
    return firstPending?.value ?? schoolMonthOptions[0]?.value ?? selectedMonth;
  };

  useEffect(() => {
    setReportMonth(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    if (!paymentForm.studentId) return;
    const suggestedPeriod = getSuggestedPeriodMonth(paymentForm.studentId);
    setPaymentForm((current) =>
      current.periodMonth === suggestedPeriod
        ? current
        : {
          ...current,
          periodMonth: suggestedPeriod,
        },
    );
  }, [paymentForm.studentId, schoolYearStatusMap, schoolMonthOptions]);

  useEffect(() => {
    if (!paymentForm.studentId) return;
    const stillAvailable = studentsReadyForPayments.some((student) => student.id === paymentForm.studentId);
    if (stillAvailable) return;

    setPaymentForm((current) => ({
      ...current,
      studentId: "",
      periodMonth: selectedMonth,
    }));
  }, [paymentForm.studentId, selectedMonth, studentsReadyForPayments]);

  useEffect(() => {
    if (paymentForm.studentId) return;
    setPaymentForm((current) => ({
      ...current,
      periodMonth: selectedMonth,
    }));
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
  }, [selectedYear]);

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
      toast({
        title: "Selecciona estudiante",
        description: "Debes seleccionar un estudiante para asignar pension.",
        variant: "destructive",
      });
      return;
    }

    const monthlyTuition = parseMoneyInput(profileForm.monthlyTuition);
    if (monthlyTuition <= 0) {
      toast({
        title: "Monto invalido",
        description: "La pension debe ser mayor a cero.",
        variant: "destructive",
      });
      return;
    }

    if (!profileForm.chargeStartMonth || !isSchoolMonthInput(profileForm.chargeStartMonth)) {
      toast({
        title: "Mes invalido",
        description: "El inicio de cobro debe estar entre febrero y noviembre.",
        variant: "destructive",
      });
      return;
    }

    if (profileForm.chargeEndMonth && !isSchoolMonthInput(profileForm.chargeEndMonth)) {
      toast({
        title: "Mes invalido",
        description: "El fin de cobro debe estar entre febrero y noviembre.",
        variant: "destructive",
      });
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
      toast({
        title: "Monto invalido",
        description: "La pension debe ser mayor a cero.",
        variant: "destructive",
      });
      return;
    }

    if (!bulkForm.chargeStartMonth || !isSchoolMonthInput(bulkForm.chargeStartMonth)) {
      toast({
        title: "Mes invalido",
        description: "El inicio de cobro debe estar entre febrero y noviembre.",
        variant: "destructive",
      });
      return;
    }

    if (bulkForm.chargeEndMonth && !isSchoolMonthInput(bulkForm.chargeEndMonth)) {
      toast({
        title: "Mes invalido",
        description: "El fin de cobro debe estar entre febrero y noviembre.",
        variant: "destructive",
      });
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
      toast({
        title: "Datos incompletos",
        description: "Selecciona estudiante, mes pagado y un monto valido.",
        variant: "destructive",
      });
      return;
    }

    if (!profilesByStudent.has(paymentForm.studentId)) {
      toast({
        title: "Perfil de pension faltante",
        description: "Primero asigna la pension del estudiante.",
        variant: "destructive",
      });
      return;
    }

    await registerPayment.mutateAsync({
      student_id: paymentForm.studentId,
      period_month: paymentForm.periodMonth,
      amount: paymentAmount,
      payment_date: paymentForm.paymentDate,
      notes: paymentForm.notes || undefined,
    });

    setPaymentForm((current) => ({
      ...current,
      amount: "",
      notes: "",
    }));
  };

  const handleDownloadTuitionReport = async () => {
    if (reportRows.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay estudiantes en el mes seleccionado para generar el informe.",
        variant: "destructive",
      });
      return;
    }

    const { downloadTuitionMonthlyReportPDF } = await import("@/utils/accountingPdf");
    const reportIncomeEntries = (reportLedger ?? []).filter((e) => e.movement_type === "income");
    const reportExpenseEntries = (reportLedger ?? []).filter((e) => e.movement_type === "expense");
    const reportIncomeTotal = reportIncomeEntries.reduce((sum, e) => sum + e.amount, 0);
    const reportExpenseTotal = reportExpenseEntries.reduce((sum, e) => sum + e.amount, 0);
    downloadTuitionMonthlyReportPDF({
      periodMonth: reportMonth,
      monthLabel: reportMonthLabel,
      rows: reportRows.map((row) => ({
        studentName: row.student_name,
        status: row.status,
        expectedAmount: normalizeLegacyAmount(row.expected_amount),
        paidAmount: normalizeLegacyAmount(row.paid_amount),
        pendingAmount: normalizeLegacyAmount(row.pending_amount),
      })),
      financialSummary: {
        incomeCount: reportIncomeEntries.length,
        incomeTotal: reportIncomeTotal,
        expenseCount: reportExpenseEntries.length,
        expenseTotal: reportExpenseTotal,
      },
    });

    toast({
      title: "Informe generado",
      description: `Se descargo el PDF de ${reportMonthLabel}.`,
    });
  };

  const handleTransactionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const transactionAmount = parseMoneyInput(transactionForm.amount);
    if (transactionAmount <= 0) {
      toast({
        title: "Monto invalido",
        description: "Ingresa un monto mayor a cero.",
        variant: "destructive",
      });
      return;
    }

    if (transactionForm.category === "teacher_payment" && !transactionForm.teacherId) {
      toast({
        title: "Docente requerido",
        description: "Selecciona el docente para este pago.",
        variant: "destructive",
      });
      return;
    }

    await createTransaction.mutateAsync({
      movement_type: transactionForm.movementType,
      category: transactionForm.category,
      teacher_id: transactionForm.teacherId || null,
      inventory_item_id: transactionForm.inventoryItemId || null,
      period_month: selectedMonth,
      transaction_date: transactionForm.transactionDate,
      amount: transactionAmount,
      description: transactionForm.description || null,
    });

    setTransactionForm((current) => ({
      ...current,
      amount: "",
      description: "",
      teacherId: "",
      inventoryItemId: "",
    }));
  };

  const handleInventorySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const totalCost = parseMoneyInput(inventoryForm.totalCost);
    if (!inventoryForm.name.trim() || totalCost <= 0) {
      toast({
        title: "Datos incompletos",
        description: "Ingresa nombre y costo del item.",
        variant: "destructive",
      });
      return;
    }

    const outstandingDebt = parseMoneyInput(inventoryForm.outstandingDebt);

    if (
      inventoryForm.paymentMode === "financed" &&
      (outstandingDebt <= 0 || outstandingDebt > totalCost)
    ) {
      toast({
        title: "Deuda invalida",
        description: "La deuda financiada debe ser mayor a cero y no superar el costo total.",
        variant: "destructive",
      });
      return;
    }

    await createInventoryItem.mutateAsync({
      name: inventoryForm.name.trim(),
      description: null,
      acquisition_date: inventoryForm.acquisitionDate,
      total_cost: totalCost,
      payment_mode: inventoryForm.paymentMode,
      outstanding_debt: inventoryForm.paymentMode === "financed" ? outstandingDebt : 0,
      notes: inventoryForm.notes || null,
    });

    setInventoryForm({
      name: "",
      acquisitionDate: todayIso(),
      totalCost: "",
      paymentMode: "paid",
      outstandingDebt: "0",
      notes: "",
    });
  };

  const availableCategories = transactionForm.movementType === "income"
    ? incomeCategories
    : expenseCategories;

  const openDeleteDialog = (action: PendingDeleteAction) => {
    setPendingDeleteAction(action);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteAction || isDeletePending) return;

    if (pendingDeleteAction.kind === "tuition_payment") {
      await deleteTuitionPayment.mutateAsync(pendingDeleteAction.id);
    }

    if (pendingDeleteAction.kind === "financial_transaction") {
      await deleteFinancialTransaction.mutateAsync(pendingDeleteAction.id);
    }

    if (pendingDeleteAction.kind === "inventory_item") {
      await deleteInventoryItem.mutateAsync(pendingDeleteAction.id);
    }

    if (pendingDeleteAction.kind === "tuition_profile_reset") {
      await deleteTuitionProfile.mutateAsync(pendingDeleteAction.studentId);
    }

    setPendingDeleteAction(null);
  };

  const isDeletePending = deleteTuitionPayment.isPending
    || deleteFinancialTransaction.isPending
    || deleteInventoryItem.isPending
    || deleteTuitionProfile.isPending;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Espacio de trabajo contable
              </Badge>
              {isReadOnly && <Badge variant="outline">Modo lectura</Badge>}
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">Contabilidad</h1>
              <p className="text-sm text-muted-foreground">
                Organiza cobros, egresos e inventario desde una pantalla pensada para operar rapido.
              </p>
            </div>
          </div>

          <div className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-stretch">
            <Card className="flex-1 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-card">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Periodo activo</p>
                  <p className="font-heading text-lg font-semibold text-foreground">{selectedMonthLabel}</p>
                </div>
                <Input
                  type="month"
                  value={selectedMonth.slice(0, 7)}
                  onChange={(event) => setMonthFromInput(event.target.value)}
                  className="w-full sm:w-[170px]"
                />
              </CardContent>
            </Card>
            <Card className={cn(
              "shadow-card border",
              totalAnnualDebt > 0
                ? "border-destructive/30 bg-destructive/5"
                : "border-success/30 bg-success/5",
            )}>
              <CardContent className="flex flex-col justify-center p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Deuda anual total</p>
                <p className={cn(
                  "font-heading text-lg font-semibold",
                  totalAnnualDebt > 0 ? "text-destructive" : "text-success",
                )}>
                  {formatCurrency(totalAnnualDebt)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="shadow-card border-primary/20 bg-primary/5">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Pensiones cobradas</p>
                <p className="text-lg font-semibold text-primary">{formatCurrency(monthTotals.tuitionIncome)}</p>
              </div>
              <Wallet className="h-4 w-4 text-primary" />
            </CardContent>
          </Card>
          <Card className="shadow-card border-success/20 bg-success/5">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Ingresos del mes</p>
                <p className="text-lg font-semibold text-success">{formatCurrency(monthTotals.income)}</p>
              </div>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardContent>
          </Card>
          <Card className="shadow-card border-destructive/20 bg-destructive/5">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Egresos del mes</p>
                <p className="text-lg font-semibold text-destructive">{formatCurrency(monthTotals.expenses)}</p>
              </div>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardContent>
          </Card>
          <Card className={cn(
            "shadow-card border",
            monthTotals.balance >= 0
              ? "border-success/20 bg-success/5"
              : "border-destructive/20 bg-destructive/5",
          )}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Balance</p>
                <p
                  className={cn(
                    "text-lg font-semibold",
                    monthTotals.balance >= 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {formatCurrency(monthTotals.balance)}
                </p>
              </div>
              <Calculator className={cn("h-4 w-4", monthTotals.balance >= 0 ? "text-success" : "text-destructive")} />
            </CardContent>
          </Card>
        </div>

        <Accordion type="single" collapsible defaultValue="pensiones" className="space-y-4">
          <AccordionItem value="pensiones" className="overflow-hidden rounded-xl border bg-card shadow-card">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex w-full items-center justify-between gap-3 pr-2 text-left">
                <div>
                  <p className="text-sm font-semibold text-foreground">Pensiones</p>
                  <p className="text-xs text-muted-foreground">Cobro mensual, abonos y cartera estudiantil</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{pendingCount} pendientes</Badge>
                  <Badge variant="outline">{(tuitionPayments ?? []).length} pagos</Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 px-4 pb-4">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
                  <span className="select-none font-medium">¿Cómo funciona? — Ver guía de pasos</span>
                  <span className="ml-auto transition-transform group-open:rotate-180">▾</span>
                </summary>
                <div className="mt-2">
                  <Card className="border-primary/15 bg-gradient-to-r from-primary/5 via-background to-background shadow-card">
                    <CardContent className="grid gap-3 p-4 md:grid-cols-3">
                      <div className="rounded-lg border bg-background/80 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Paso 1</p>
                        <p className="mt-1 font-semibold text-foreground">Carga base de pensiones</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Asigna el valor a todos los estudiantes activos al iniciar el periodo.
                        </p>
                      </div>
                      <div className="rounded-lg border bg-background/80 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Paso 2</p>
                        <p className="mt-1 font-semibold text-foreground">Ajusta excepciones</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Usa el formulario individual solo cuando un estudiante necesite una condicion distinta.
                        </p>
                      </div>
                      <div className="rounded-lg border bg-background/80 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Paso 3</p>
                        <p className="mt-1 font-semibold text-foreground">Registra abonos</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Lleva los pagos del mes mientras ves al frente el saldo pendiente real.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </details>

              {/* --- Zona de datos: 3 columnas --- */}
              <div className="grid gap-4 xl:grid-cols-3">

                {/* Col 1: Pagos registrados del periodo */}
                <Card className="p-5 shadow-card">
                  <div className="mb-3 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <h3 className="font-heading font-bold text-foreground">Pagos del periodo</h3>
                  </div>
                  {(tuitionPayments ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay pagos registrados para este mes.</p>
                  ) : (
                    <div className="max-h-[300px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">Estudiante</TableHead>
                            <TableHead className="whitespace-nowrap">Fecha</TableHead>
                            <TableHead className="whitespace-nowrap">Monto</TableHead>
                            {isContable && <TableHead className="whitespace-nowrap text-right">Accion</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tuitionPayments?.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell className="font-medium">
                                {payment.students?.full_name ?? "Sin nombre"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{payment.payment_date}</TableCell>
                              <TableCell className="whitespace-nowrap">{formatCurrency(normalizeLegacyAmount(payment.amount))}</TableCell>
                              {isContable && (
                                <TableCell className="text-right">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() =>
                                      openDeleteDialog({
                                        kind: "tuition_payment",
                                        id: payment.id,
                                        title: "Eliminar pago de pension",
                                        description: `Se eliminara el pago de ${payment.students?.full_name ?? "estudiante"} por ${formatCurrency(normalizeLegacyAmount(payment.amount))}.`,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </Card>

                {/* Col 2: Estado del mes */}
                <Card className="p-5 shadow-card">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      <h3 className="font-heading font-bold text-foreground">Estado del mes</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">{pendingCount} pendientes</Badge>
                      <Badge variant="outline">{studentsWithoutProfile.length} sin perfil</Badge>
                    </div>
                  </div>
                  {monthStatusLoading ? (
                    <p className="text-sm text-muted-foreground">Cargando...</p>
                  ) : (monthStatus ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay registros para este mes.</p>
                  ) : (
                    <div className="space-y-1">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] gap-x-3 px-2 pb-1 text-xs font-medium text-muted-foreground">
                        <span>Estudiante</span>
                        <span className="text-right">Cuota</span>
                        <span className="text-right">Pagado</span>
                        <span className="text-right">Pendiente</span>
                        <span className="text-right">Estado</span>
                      </div>
                      {monthStatus?.map((row) => {
                        const paymentIds =
                          paymentsByStudent.byId.get(row.student_id) ??
                          paymentsByStudent.byName.get(row.student_name) ??
                          [];
                        const hasPay = paymentIds.length > 0;
                        return (
                          <div
                            key={row.student_id}
                            className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] items-center gap-x-3 rounded-lg border px-2 py-2 text-sm"
                          >
                            <span className="truncate font-medium text-foreground" title={row.student_name}>
                              {row.student_name}
                            </span>
                            <span className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                              {formatCurrency(normalizeLegacyAmount(row.expected_amount))}
                            </span>
                            <span className="whitespace-nowrap text-right tabular-nums">
                              {formatCurrency(normalizeLegacyAmount(row.paid_amount))}
                            </span>
                            <span className={cn(
                              "whitespace-nowrap text-right tabular-nums font-semibold",
                              row.pending_amount > 0 ? "text-destructive" : "text-success",
                            )}>
                              {formatCurrency(normalizeLegacyAmount(row.pending_amount))}
                            </span>
                            <div className="flex items-center justify-end gap-1">
                              <Badge variant={statusVariant(row.status)} className="shrink-0 text-xs">
                                {row.status === "paid" ? "Al dia" : row.status === "partial" ? "Parcial" : "Pend."}
                              </Badge>
                              {isContable && hasPay && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 shrink-0 p-0 text-destructive hover:text-destructive"
                                  title={"Borrar pagos de " + row.student_name + " en este mes"}
                                  onClick={() =>
                                    openDeleteDialog({
                                      kind: "tuition_payment",
                                      id: paymentIds[paymentIds.length - 1],
                                      title: "Borrar pago del mes",
                                      description:
                                        "Se eliminara el pago registrado de " +
                                        row.student_name +
                                        " en este periodo. El perfil de pension se conserva.",
                                    })
                                  }
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                              {isContable && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 shrink-0 p-0 text-orange-500 hover:text-orange-600"
                                  title={"Resetear todo de " + row.student_name + " (perfil + pagos)"}
                                  onClick={() =>
                                    openDeleteDialog({
                                      kind: "tuition_profile_reset",
                                      studentId: row.student_id,
                                      title: "Resetear estudiante",
                                      description:
                                        "Se eliminará el perfil de pensión y TODOS los pagos de " +
                                        row.student_name +
                                        ". Deberás volver a configurar su pensión desde cero.",
                                    })
                                  }
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {/* Col 3: Cartera prioritaria — con toggle ignorar/reactivar */}
                <Card className="p-5 shadow-card">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <h3 className="font-heading font-bold text-foreground">Cartera prioritaria</h3>
                    </div>
                    {ignoredDebtors.size > 0 && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                        onClick={() => setIgnoredDebtors(new Set())}
                      >
                        Mostrar todos
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    {topDebtors.length === 0 ? (
                      <p className="text-muted-foreground">No hay deudas registradas.</p>
                    ) : (
                      topDebtors.map((debtor, index) => {
                        const isIgnored = ignoredDebtors.has(debtor.student_id);
                        return (
                          <div
                            key={debtor.student_id}
                            className={cn(
                              "flex items-center justify-between rounded-lg border px-3 py-2 transition-opacity",
                              isIgnored && "opacity-40",
                            )}
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <p className={cn(
                                "truncate",
                                isIgnored ? "text-muted-foreground line-through" : "text-foreground",
                              )}>
                                {index + 1}. {debtor.student_name}
                              </p>
                              <p className="text-xs text-muted-foreground">{debtor.pending_months} meses pendientes</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className={cn(
                                "font-semibold",
                                isIgnored
                                  ? "text-muted-foreground"
                                  : debtor.total_pending > 0
                                    ? "text-destructive"
                                    : "text-success",
                              )}>
                                {formatCurrency(debtor.total_pending)}
                              </span>
                              <button
                                type="button"
                                title={isIgnored ? "Reactivar" : "Ignorar temporalmente"}
                                onClick={() =>
                                  setIgnoredDebtors((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(debtor.student_id)) next.delete(debtor.student_id);
                                    else next.add(debtor.student_id);
                                    return next;
                                  })
                                }
                                className={cn(
                                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs transition-colors",
                                  isIgnored
                                    ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
                                    : "border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground hover:text-foreground",
                                )}
                              >
                                {isIgnored ? "+" : "-"}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Estudiantes pendientes de configurar: {studentsWithoutProfile.length}
                  </p>
                </Card>
              </div>

              {/* --- Zona de formularios: registro de pago + herramientas colapsables --- */}
              <div className="grid gap-4 xl:grid-cols-2">

                {/* Registrar pago: acción principal, siempre visible */}
                <Card className="p-5 shadow-card">
                  <div className="mb-3 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <h3 className="font-heading font-bold text-foreground">Registrar pago</h3>
                  </div>
                  <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Estudiante</Label>
                      <select
                        value={paymentForm.studentId}
                        onChange={(event) => {
                          const studentId = event.target.value;
                          setPaymentForm((current) => ({
                            ...current,
                            studentId,
                            periodMonth: studentId ? getSuggestedPeriodMonth(studentId) : current.periodMonth,
                          }));
                        }}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        disabled={!isContable}
                      >
                        <option value="">Selecciona estudiante</option>
                        {studentsReadyForPayments.map((student) => (
                          <option key={student.id} value={student.id}>{student.full_name}</option>
                        ))}
                      </select>
                      {studentsReadyForPayments.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Solo aparecen estudiantes con pension configurada para este periodo.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Mes que pago</Label>
                      <select
                        value={paymentForm.periodMonth}
                        onChange={(event) =>
                          setPaymentForm((current) => ({ ...current, periodMonth: event.target.value }))
                        }
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        disabled={!isContable}
                      >
                        {schoolMonthOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label} {selectedYear}
                          </option>
                        ))}
                      </select>
                    </div>
                    {paymentForm.studentId && (
                      <div className="rounded-lg border border-dashed bg-muted/20 p-3">
                        <p className="text-xs font-medium text-foreground">Control anual (febrero a noviembre)</p>
                        <div className="mt-2 space-y-1 text-xs">
                          {schoolMonthOptions.map((option) => {
                            const row = schoolYearStatusMap.get(`${paymentForm.studentId}-${option.value}`);
                            return (
                              <div key={option.value} className="flex items-center justify-between">
                                <span className="text-muted-foreground">{option.label}</span>
                                <span className="font-medium text-foreground">
                                  {row ? formatCurrency(normalizeLegacyAmount(row.paid_amount)) : formatCurrency(0)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {paymentForm.studentId && (
                      <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Cuota ({selectedPaymentMonthLabel})</span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(
                              selectedPaymentStatus?.expected_amount ??
                              normalizeLegacyAmount(selectedPaymentProfile?.monthly_tuition ?? 0),
                            )}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-muted-foreground">Saldo actual</span>
                          <span className="font-medium text-foreground">
                            {selectedPaymentStatus
                              ? formatCurrency(selectedPaymentStatus.pending_amount)
                              : selectedPaymentProfile
                                ? formatCurrency(normalizeLegacyAmount(selectedPaymentProfile.monthly_tuition))
                                : "Sin perfil"}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label>Monto abonado</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={paymentForm.amount}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            amount: formatMoneyInput(event.target.value),
                          }))
                        }
                        disabled={!isContable}
                        placeholder="Ej: 60.000"
                      />
                      <p className="text-xs text-muted-foreground">
                        Valor digitado: {formatCurrency(parseMoneyInput(paymentForm.amount))}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fecha de pago</Label>
                      <Input
                        type="date"
                        value={paymentForm.paymentDate}
                        onChange={(event) =>
                          setPaymentForm((current) => ({ ...current, paymentDate: event.target.value }))
                        }
                        disabled={!isContable}
                      />
                      <p className="text-xs text-muted-foreground">
                        El dia solo es informativo. Lo que cuenta en cartera es el mes pagado.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Observacion</Label>
                      <Textarea
                        value={paymentForm.notes}
                        onChange={(event) =>
                          setPaymentForm((current) => ({ ...current, notes: event.target.value }))
                        }
                        disabled={!isContable}
                        placeholder="Ej: Abono en efectivo"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={!isContable || registerPayment.isPending}>
                      Registrar pago del mes
                    </Button>
                  </form>
                </Card>

                {/* Herramientas ocasionales: Asignar masivo + Ajuste individual colapsables */}
                <div className="space-y-3">
                  <details className="group overflow-hidden rounded-xl border bg-card shadow-card">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 hover:bg-muted/30">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-heading font-bold text-foreground">Asignar pensiones masivas</span>
                      <span className="ml-auto text-muted-foreground transition-transform group-open:rotate-180">▾</span>
                    </summary>
                    <div className="px-5 pb-5">
                      <form onSubmit={handleBulkSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label>Valor mensual</Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={bulkForm.monthlyTuition}
                            onChange={(event) =>
                              setBulkForm((current) => ({ ...current, monthlyTuition: formatMoneyInput(event.target.value) }))
                            }
                            disabled={!isContable}
                            placeholder="Ej: 120.000"
                          />
                          <p className="text-xs text-muted-foreground">
                            Valor digitado: {formatCurrency(parseMoneyInput(bulkForm.monthlyTuition))}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Mes inicio</Label>
                          <Input
                            type="month"
                            value={bulkForm.chargeStartMonth}
                            onChange={(event) =>
                              setBulkForm((current) => ({ ...current, chargeStartMonth: event.target.value }))
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
                            value={bulkForm.chargeEndMonth}
                            onChange={(event) =>
                              setBulkForm((current) => ({ ...current, chargeEndMonth: event.target.value }))
                            }
                            min={toSchoolMonthInput(selectedYear, SCHOOL_MONTH_START)}
                            max={toSchoolMonthInput(selectedYear, SCHOOL_MONTH_END)}
                            disabled={!isContable}
                          />
                        </div>
                        <div className="rounded-lg border bg-muted/30 p-3">
                          <div className="flex items-start gap-2">
                            <Checkbox
                              id="bulk-overwrite"
                              checked={bulkForm.overwrite}
                              onCheckedChange={(checked) =>
                                setBulkForm((current) => ({ ...current, overwrite: Boolean(checked) }))
                              }
                              disabled={!isContable}
                            />
                            <div className="space-y-1">
                              <Label htmlFor="bulk-overwrite" className="text-sm">
                                Actualizar perfiles existentes
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Usalo solo si quieres cambiar el valor o las fechas para todos.
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={!isContable || bulkAssignProfiles.isPending}>
                          Asignar a todos los estudiantes
                        </Button>
                      </form>
                    </div>
                  </details>

                  <details className="group overflow-hidden rounded-xl border bg-card shadow-card">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 hover:bg-muted/30">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-heading font-bold text-foreground">Ajuste individual</span>
                      <span className="ml-auto text-muted-foreground transition-transform group-open:rotate-180">▾</span>
                    </summary>
                    <div className="px-5 pb-5">
                      <form onSubmit={handleProfileSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label>Estudiante</Label>
                          <select
                            value={profileForm.studentId}
                            onChange={(event) => updateProfileFormForStudent(event.target.value)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            disabled={!isContable}
                          >
                            <option value="">Selecciona estudiante</option>
                            {(students ?? []).map((student) => (
                              <option key={student.id} value={student.id}>{student.full_name}</option>
                            ))}
                          </select>
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
                              setProfileForm((current) => ({ ...current, monthlyTuition: formatMoneyInput(event.target.value) }))
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
                          disabled={!isContable || createTuitionProfile.isPending || updateTuitionProfile.isPending}
                        >
                          {profilesByStudent.has(profileForm.studentId) ? "Actualizar pension" : "Guardar pension"}
                        </Button>
                      </form>
                    </div>
                  </details>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="informes" className="overflow-hidden rounded-xl border bg-card shadow-card">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex w-full items-center justify-between gap-3 pr-2 text-left">
                <div>
                  <p className="text-sm font-semibold text-foreground">Informes PDF</p>
                  <p className="text-xs text-muted-foreground">Exporta el estado mensual de pagos por estudiante</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{reportTotals.paidCount} pagados</Badge>
                  <Badge variant="outline">{reportTotals.unpaidCount} no pagados</Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 px-4 pb-4">
              <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                <Card className="p-5 shadow-card">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="font-heading font-bold text-foreground">Generar informe</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Mes del informe</Label>
                      <select
                        value={reportMonth}
                        onChange={(event) => setReportMonth(event.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {schoolMonthOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label} {selectedYear}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Mes seleccionado</span>
                        <span className="font-medium text-foreground">{reportMonthLabel}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-muted-foreground">Total recaudado</span>
                        <span className="font-semibold text-success">
                          {formatCurrency(reportTotals.collectedAmount)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-muted-foreground">Saldo pendiente</span>
                        <span className="font-semibold text-destructive">
                          {formatCurrency(reportTotals.pendingAmount)}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      className="w-full gap-2"
                      onClick={() => void handleDownloadTuitionReport()}
                      disabled={reportMonthStatusLoading || reportRows.length === 0}
                    >
                      <Download className="h-4 w-4" />
                      Generar PDF mensual
                    </Button>
                  </div>
                </Card>

                <Card className="p-5 shadow-card">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      <h3 className="font-heading font-bold text-foreground">Vista previa del informe</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">{reportTotals.paidCount} pagados</Badge>
                      <Badge variant="outline">{reportTotals.partialCount} parciales</Badge>
                      <Badge variant="outline">{reportTotals.unpaidCount} no pagados</Badge>
                    </div>
                  </div>
                  {reportMonthStatusLoading ? (
                    <p className="text-sm text-muted-foreground">Cargando estado del mes...</p>
                  ) : reportRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay datos para este mes.</p>
                  ) : (
                    <div className="max-h-[480px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Estudiante</TableHead>
                            <TableHead className="whitespace-nowrap text-right">Cuota</TableHead>
                            <TableHead className="whitespace-nowrap text-right">Pagado</TableHead>
                            <TableHead className="whitespace-nowrap text-right">Pendiente</TableHead>
                            <TableHead className="whitespace-nowrap text-right">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportRows.map((row) => (
                            <TableRow key={`${row.student_id}-${row.period_month}`}>
                              <TableCell className="font-medium">{row.student_name}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCurrency(normalizeLegacyAmount(row.expected_amount))}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCurrency(normalizeLegacyAmount(row.paid_amount))}
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-semibold text-destructive">
                                {formatCurrency(normalizeLegacyAmount(row.pending_amount))}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant={statusVariant(row.status)}>
                                  {row.status === "paid" ? "Pagado" : row.status === "partial" ? "Parcial" : "No pago"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="movimientos" className="overflow-hidden rounded-xl border bg-card shadow-card">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex w-full items-center justify-between gap-3 pr-2 text-left">
                <div>
                  <p className="text-sm font-semibold text-foreground">Movimientos</p>
                  <p className="text-xs text-muted-foreground">Ingresos y egresos operativos del periodo</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{formatCurrency(monthTotals.income)} ingresos</Badge>
                  <Badge variant="outline">{formatCurrency(monthTotals.expenses)} egresos</Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 px-4 pb-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_390px]">
                <Card className="p-5 shadow-card xl:order-2 xl:sticky xl:top-24 xl:self-start">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="font-heading font-bold text-foreground">Nuevo movimiento</h3>
                  </div>
                  <form onSubmit={handleTransactionSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Tipo</Label>
                      <select
                        value={transactionForm.movementType}
                        onChange={(event) => {
                          const nextType = event.target.value as FinancialTransaction["movement_type"];
                          const nextCategory = nextType === "income"
                            ? incomeCategories[0].value
                            : expenseCategories[0].value;
                          setTransactionForm((current) => ({
                            ...current,
                            movementType: nextType,
                            category: nextCategory,
                          }));
                        }}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        disabled={!isContable}
                      >
                        <option value="income">Ingreso</option>
                        <option value="expense">Egreso</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Categoria</Label>
                      <select
                        value={transactionForm.category}
                        onChange={(event) =>
                          setTransactionForm((current) => ({
                            ...current,
                            category: event.target.value as FinancialTransaction["category"],
                          }))
                        }
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        disabled={!isContable}
                      >
                        {availableCategories.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {(transactionForm.category === "teacher_payment" || transactionForm.category === "suplent_payment") && (
                      <div className="space-y-1.5">
                        <Label>Docente</Label>
                        <select
                          value={transactionForm.teacherId}
                          onChange={(event) =>
                            setTransactionForm((current) => ({ ...current, teacherId: event.target.value }))
                          }
                          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          disabled={!isContable}
                        >
                          <option value="">Selecciona docente</option>
                          {(teachers ?? []).map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {transactionForm.category === "inventory_purchase" && (
                      <div className="space-y-1.5">
                        <Label>Item de inventario (opcional)</Label>
                        <select
                          value={transactionForm.inventoryItemId}
                          onChange={(event) =>
                            setTransactionForm((current) => ({ ...current, inventoryItemId: event.target.value }))
                          }
                          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          disabled={!isContable}
                        >
                          <option value="">Sin vincular</option>
                          {(inventoryItems ?? []).map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label>Monto</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={transactionForm.amount}
                        onChange={(event) =>
                          setTransactionForm((current) => ({
                            ...current,
                            amount: formatMoneyInput(event.target.value),
                          }))
                        }
                        disabled={!isContable}
                        placeholder="Ej: 450.000"
                      />
                      <p className="text-xs text-muted-foreground">
                        Valor digitado: {formatCurrency(parseMoneyInput(transactionForm.amount))}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fecha</Label>
                      <Input
                        type="date"
                        value={transactionForm.transactionDate}
                        onChange={(event) =>
                          setTransactionForm((current) => ({ ...current, transactionDate: event.target.value }))
                        }
                        disabled={!isContable}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Descripcion</Label>
                      <Textarea
                        value={transactionForm.description}
                        onChange={(event) =>
                          setTransactionForm((current) => ({ ...current, description: event.target.value }))
                        }
                        disabled={!isContable}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={!isContable || createTransaction.isPending}>
                      Registrar movimiento
                    </Button>
                  </form>
                </Card>

                <div className="space-y-4 xl:order-1">
                  {/* Ingresos del mes */}
                  <Card className="p-5 shadow-card">
                    <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-success" />
                        <h3 className="font-heading font-bold text-foreground">Ingresos del mes</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {(ledger ?? []).filter((e) => e.movement_type === "income").length} registros
                        </Badge>
                        <Badge variant="outline" className="text-success">
                          Total: {formatCurrency(monthTotals.income)}
                        </Badge>
                      </div>
                    </div>
                    {(() => {
                      const incomeEntries = (ledger ?? []).filter((e) => e.movement_type === "income");
                      if (incomeEntries.length === 0) {
                        return <p className="text-sm text-muted-foreground">No hay ingresos registrados en este mes.</p>;
                      }
                      return (
                        <div className="max-h-[320px] overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="whitespace-nowrap">Categoria</TableHead>
                                <TableHead>Detalle</TableHead>
                                <TableHead className="whitespace-nowrap">Fecha</TableHead>
                                <TableHead className="whitespace-nowrap text-right">Monto</TableHead>
                                {isContable && <TableHead className="text-right">Accion</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {incomeEntries.map((entry) => (
                                <TableRow key={entry.movement_id}>
                                  <TableCell className="whitespace-nowrap font-medium">
                                    {categoryLabels[entry.category_label] ?? entry.category_label}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {entry.description || "Sin descripcion"}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">{entry.transaction_date}</TableCell>
                                  <TableCell className="whitespace-nowrap text-right">
                                    <span className="font-semibold text-success">
                                      {formatCurrency(entry.amount)}
                                    </span>
                                  </TableCell>
                                  {isContable && (
                                    <TableCell className="text-right">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() =>
                                          openDeleteDialog(
                                            entry.category_label === "tuition"
                                              ? {
                                                kind: "tuition_payment",
                                                id: entry.movement_id,
                                                title: "Eliminar pago de pension",
                                                description: `Se eliminara este pago de ${formatCurrency(normalizeLegacyAmount(entry.amount))}.`,
                                              }
                                              : {
                                                kind: "financial_transaction",
                                                id: entry.movement_id,
                                                title: "Eliminar movimiento",
                                                description: `Se eliminara el movimiento ${categoryLabels[entry.category_label] ?? entry.category_label}.`,
                                              },
                                          )
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })()}
                  </Card>

                  {/* Egresos del mes */}
                  <Card className="p-5 shadow-card">
                    <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-destructive" />
                        <h3 className="font-heading font-bold text-foreground">Egresos del mes</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {(ledger ?? []).filter((e) => e.movement_type === "expense").length} registros
                        </Badge>
                        <Badge variant="outline" className="text-destructive">
                          Total: {formatCurrency(monthTotals.expenses)}
                        </Badge>
                      </div>
                    </div>
                    {(() => {
                      const expenseEntries = (ledger ?? []).filter((e) => e.movement_type === "expense");
                      if (expenseEntries.length === 0) {
                        return <p className="text-sm text-muted-foreground">No hay egresos registrados en este mes.</p>;
                      }
                      return (
                        <div className="max-h-[320px] overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="whitespace-nowrap">Categoria</TableHead>
                                <TableHead>Detalle</TableHead>
                                <TableHead className="whitespace-nowrap">Fecha</TableHead>
                                <TableHead className="whitespace-nowrap text-right">Monto</TableHead>
                                {isContable && <TableHead className="text-right">Accion</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {expenseEntries.map((entry) => (
                                <TableRow key={entry.movement_id}>
                                  <TableCell className="whitespace-nowrap font-medium">
                                    {categoryLabels[entry.category_label] ?? entry.category_label}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {entry.description || "Sin descripcion"}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">{entry.transaction_date}</TableCell>
                                  <TableCell className="whitespace-nowrap text-right">
                                    <span className="font-semibold text-destructive">
                                      {formatCurrency(entry.amount)}
                                    </span>
                                  </TableCell>
                                  {isContable && (
                                    <TableCell className="text-right">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() =>
                                          openDeleteDialog({
                                            kind: "financial_transaction",
                                            id: entry.movement_id,
                                            title: "Eliminar movimiento",
                                            description: `Se eliminara el movimiento ${categoryLabels[entry.category_label] ?? entry.category_label}.`,
                                          })
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })()}
                  </Card>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="inventario" className="overflow-hidden rounded-xl border bg-card shadow-card">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex w-full items-center justify-between gap-3 pr-2 text-left">
                <div>
                  <p className="text-sm font-semibold text-foreground">Inventario</p>
                  <p className="text-xs text-muted-foreground">Compras, financiacion y deuda pendiente</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{inventoryItems?.length ?? 0} items</Badge>
                  <Badge variant="outline">{financedInventory.length} financiados</Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 px-4 pb-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_390px]">
                <Card className="p-5 shadow-card xl:order-2 xl:sticky xl:top-24 xl:self-start">
                  <div className="mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <h3 className="font-heading font-bold text-foreground">Nuevo item</h3>
                  </div>
                  <form onSubmit={handleInventorySubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Nombre</Label>
                      <Input
                        value={inventoryForm.name}
                        onChange={(event) =>
                          setInventoryForm((current) => ({ ...current, name: event.target.value }))
                        }
                        disabled={!isContable}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Costo total</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={inventoryForm.totalCost}
                        onChange={(event) =>
                          setInventoryForm((current) => ({
                            ...current,
                            totalCost: formatMoneyInput(event.target.value),
                          }))
                        }
                        disabled={!isContable}
                        placeholder="Ej: 1.250.000"
                      />
                      <p className="text-xs text-muted-foreground">
                        Valor digitado: {formatCurrency(parseMoneyInput(inventoryForm.totalCost))}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Forma de pago</Label>
                      <select
                        value={inventoryForm.paymentMode}
                        onChange={(event) => {
                          const nextMode = event.target.value as InventoryItem["payment_mode"];
                          setInventoryForm((current) => ({
                            ...current,
                            paymentMode: nextMode,
                            outstandingDebt: nextMode === "paid" ? "0" : current.outstandingDebt,
                          }));
                        }}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        disabled={!isContable}
                      >
                        <option value="paid">Pagado</option>
                        <option value="financed">Financiado</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Deuda pendiente</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={inventoryForm.outstandingDebt}
                        onChange={(event) =>
                          setInventoryForm((current) => ({
                            ...current,
                            outstandingDebt: formatMoneyInput(event.target.value),
                          }))
                        }
                        disabled={!isContable || inventoryForm.paymentMode === "paid"}
                        placeholder="Ej: 300.000"
                      />
                      <p className="text-xs text-muted-foreground">
                        Valor digitado: {formatCurrency(parseMoneyInput(inventoryForm.outstandingDebt))}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fecha de compra</Label>
                      <Input
                        type="date"
                        value={inventoryForm.acquisitionDate}
                        onChange={(event) =>
                          setInventoryForm((current) => ({ ...current, acquisitionDate: event.target.value }))
                        }
                        disabled={!isContable}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Notas</Label>
                      <Textarea
                        value={inventoryForm.notes}
                        onChange={(event) =>
                          setInventoryForm((current) => ({ ...current, notes: event.target.value }))
                        }
                        disabled={!isContable}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={!isContable || createInventoryItem.isPending}>
                      Registrar item
                    </Button>
                  </form>
                </Card>

                <Card className="p-5 shadow-card xl:order-1">
                  <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      <h3 className="font-heading font-bold text-foreground">Inventario</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{inventoryItems?.length ?? 0} items</Badge>
                      <Badge variant="outline">{financedInventory.length} financiados</Badge>
                    </div>
                  </div>
                  {(inventoryItems ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay inventario registrado.</p>
                  ) : (
                    <div className="max-h-[560px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="whitespace-nowrap">Fecha</TableHead>
                            <TableHead className="whitespace-nowrap">Modo</TableHead>
                            <TableHead className="whitespace-nowrap">Costo</TableHead>
                            <TableHead className="whitespace-nowrap text-right">Pendiente</TableHead>
                            {isContable && <TableHead className="text-right">Accion</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventoryItems?.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell className="whitespace-nowrap">{item.acquisition_date}</TableCell>
                              <TableCell className="whitespace-nowrap">{item.payment_mode === "financed" ? "Financiado" : "Pagado"}</TableCell>
                              <TableCell className="whitespace-nowrap">{formatCurrency(item.total_cost)}</TableCell>
                              <TableCell className="whitespace-nowrap text-right">
                                {formatCurrency(item.outstanding_debt)}
                              </TableCell>
                              {isContable && (
                                <TableCell className="text-right">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() =>
                                      openDeleteDialog({
                                        kind: "inventory_item",
                                        id: item.id,
                                        title: "Eliminar item de inventario",
                                        description: `Se eliminara "${item.name}" del inventario.`,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Saldo pendiente financiado: {formatCurrency(inventoryOutstanding)}
                  </p>
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <ConfirmActionDialog
          open={Boolean(pendingDeleteAction)}
          onOpenChange={(open) => {
            if (!open) setPendingDeleteAction(null);
          }}
          title={pendingDeleteAction?.title ?? "Confirmar eliminacion"}
          description={pendingDeleteAction?.description ?? ""}
          actionLabel={isDeletePending ? "Eliminando..." : "Eliminar"}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </MainLayout>
  );
}
