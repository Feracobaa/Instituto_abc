import { useState } from "react";
import { useCreateGrade } from "@/hooks/school/useAcademicData";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateGradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PREESCOLAR_LEVELS = [
  { value: "1", label: "Párvulo (Nivel 1)" },
  { value: "2", label: "Pre-Jardín (Nivel 2)" },
  { value: "3", label: "Jardín (Nivel 3)" },
  { value: "4", label: "Transición (Nivel 4)" },
];

const PRIMARIA_LEVELS = [
  { value: "5", label: "Primero (Nivel 5)" },
  { value: "6", label: "Segundo (Nivel 6)" },
  { value: "7", label: "Tercero (Nivel 7)" },
  { value: "8", label: "Cuarto (Nivel 8)" },
  { value: "9", label: "Quinto (Nivel 9)" },
];

export function CreateGradeDialog({ open, onOpenChange }: CreateGradeDialogProps) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState<string>("");

  const createGrade = useCreateGrade();

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !createGrade.isPending) {
      setName("");
      setLevel("");
      onOpenChange(false);
    } else if (newOpen) {
      onOpenChange(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !level) return;

    try {
      await createGrade.mutateAsync({
        name: name.trim(),
        level: parseInt(level, 10),
      });
      handleOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isFormValid = name.trim().length > 0 && level !== "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Grado</DialogTitle>
          <DialogDescription>
            Agrega un nuevo salón o grupo para organizar a los estudiantes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="grade-name">Nombre del Grado</Label>
            <Input
              id="grade-name"
              placeholder='Ej: "Primero A" o "Transición 1"'
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={createGrade.isPending}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="grade-level">Nivel Educativo (Ciclo)</Label>
            <Select
              value={level}
              onValueChange={setLevel}
              disabled={createGrade.isPending}
            >
              <SelectTrigger id="grade-level">
                <SelectValue placeholder="Selecciona el nivel correspondiente" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel className="text-primary font-bold">Preescolar</SelectLabel>
                  {PREESCOLAR_LEVELS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel className="text-primary font-bold">Primaria</SelectLabel>
                  {PRIMARIA_LEVELS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createGrade.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isFormValid || createGrade.isPending}>
              {createGrade.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Crear Grado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
