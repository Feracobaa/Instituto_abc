import { useState, useEffect } from "react";
import { useUpdateAcademicPeriod } from "@/hooks/school/useAcademicData";
import type { AcademicPeriod } from "@/hooks/school/types";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditAcademicPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: AcademicPeriod | null;
}

export function EditAcademicPeriodDialog({
  open,
  onOpenChange,
  period,
}: EditAcademicPeriodDialogProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const updatePeriod = useUpdateAcademicPeriod();

  useEffect(() => {
    if (open && period) {
      setName(period.name);
      setStartDate(period.start_date);
      setEndDate(period.end_date);
    }
  }, [open, period]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !updatePeriod.isPending) {
      onOpenChange(false);
    } else if (newOpen) {
      onOpenChange(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!period || !name.trim() || !startDate || !endDate) return;

    try {
      await updatePeriod.mutateAsync({
        id: period.id,
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
      });
      handleOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isFormValid = name.trim().length > 0 && startDate !== "" && endDate !== "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Periodo Académico</DialogTitle>
          <DialogDescription>
            Ajusta el nombre y las fechas que comprenden este periodo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="period-name">Nombre del Periodo</Label>
            <Input
              id="period-name"
              placeholder='Ej: "Bimestre 1" o "Primer Trimestre"'
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={updatePeriod.isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Fecha de Inicio</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={updatePeriod.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">Fecha de Fin</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={updatePeriod.isPending}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={updatePeriod.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isFormValid || updatePeriod.isPending}>
              {updatePeriod.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
