import type { FinancialTransaction, TuitionProfile } from "@/hooks/school/types";

export const DEFAULT_TUITION_VALUE = 120000;
export const SCHOOL_MONTH_START = 2;
export const SCHOOL_MONTH_END = 11;

export const categoryLabels: Record<string, string> = {
  other_income: "Otros ingresos",
  teacher_payment: "Pago profesores",
  suplent_payment: "Pago suplente",
  rent: "Arriendo",
  water: "Agua",
  internet: "Internet",
  electricity: "Luz",
  cleaning: "Aseo",
  inventory_purchase: "Compra inventario",
  repair: "Arreglos",
  other_expense: "Otros egresos",
  tuition: "Pensiones",
};

export const incomeCategories: Array<{ value: FinancialTransaction["category"]; label: string }> = [
  { value: "other_income", label: "Otros ingresos" },
];

export const expenseCategories: Array<{ value: FinancialTransaction["category"]; label: string }> = [
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

export const isProfileActiveInSchoolYear = (
  profile: Pick<TuitionProfile, "charge_start_month" | "charge_end_month">,
  year: number,
  toSchoolMonthDate: (yearValue: number, monthValue: number) => string,
) => {
  const schoolYearStart = toSchoolMonthDate(year, SCHOOL_MONTH_START);
  const schoolYearEnd = toSchoolMonthDate(year, SCHOOL_MONTH_END);
  const chargeEnd = profile.charge_end_month ?? schoolYearEnd;

  return profile.charge_start_month <= schoolYearEnd && chargeEnd >= schoolYearStart;
};
