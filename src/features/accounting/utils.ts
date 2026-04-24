import { SCHOOL_MONTH_END, SCHOOL_MONTH_START } from "@/features/accounting/constants";

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const statusVariant = (status: string) => {
  if (status === "paid") return "default";
  if (status === "partial") return "outline";
  return "destructive";
};

export const monthLabel = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));

  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const monthString = (month: number) => String(month).padStart(2, "0");

export const clampSchoolMonth = (month: number) =>
  Math.min(SCHOOL_MONTH_END, Math.max(SCHOOL_MONTH_START, month));

export const toSchoolMonthDate = (year: number, month: number) => `${year}-${monthString(month)}-01`;

export const toSchoolMonthInput = (year: number, month: number) => `${year}-${monthString(month)}`;

export const formatMoneyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Number(digits));
};

export const parseMoneyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits);
};

export const normalizeLegacyAmount = (value: number) =>
  value > 0 && value < 1000 ? value * 1000 : value;

export const isSchoolMonthInput = (value: string) => {
  const month = Number(value.split("-")[1]);
  return month >= SCHOOL_MONTH_START && month <= SCHOOL_MONTH_END;
};
