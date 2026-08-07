import { MainLayout } from "@/components/layout/MainLayout";
import { GestionTareasDocente } from "@/features/tareas/GestionTareasDocente";

export default function TareasPage() {
  return (
    <MainLayout>
      <GestionTareasDocente />
    </MainLayout>
  );
}
