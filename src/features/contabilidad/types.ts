import { PendingDeleteAction } from "@/features/accounting/types";

export interface ContabilidadSectionProps {
  selectedMonth: string;
  selectedYear: number;
  isContable: boolean;
  openDeleteDialog: (action: PendingDeleteAction) => void;
}
