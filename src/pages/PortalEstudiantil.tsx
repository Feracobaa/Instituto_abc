import { useState } from "react";
import { ClipboardList, Calendar, User, CheckSquare, DollarSign } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MisNotasTab from "@/features/portal/MisNotasTab";
import MiHorarioTab from "@/features/portal/MiHorarioTab";
import MiPerfilTab from "@/features/portal/MiPerfilTab";
import MisAsistenciasTab from "@/features/portal/MisAsistenciasTab";
import MisPensionesTab from "@/features/portal/MisPensionesTab";

export default function PortalEstudiantil() {
  const [tab, setTab] = useState("notas");

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Portal del Acudiente</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Consulta notas, asistencias, pensiones y horario de tu estudiante.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-10 w-full flex-wrap sm:w-auto">
            <TabsTrigger value="notas" className="gap-1.5">
              <ClipboardList className="h-4 w-4" /> Notas
            </TabsTrigger>
            <TabsTrigger value="asistencias" className="gap-1.5">
              <CheckSquare className="h-4 w-4" /> Asistencias
            </TabsTrigger>
            <TabsTrigger value="pensiones" className="gap-1.5">
              <DollarSign className="h-4 w-4" /> Pensiones
            </TabsTrigger>
            <TabsTrigger value="horario" className="gap-1.5">
              <Calendar className="h-4 w-4" /> Horario
            </TabsTrigger>
            <TabsTrigger value="perfil" className="gap-1.5">
              <User className="h-4 w-4" /> Perfil
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notas" className="mt-6">
            <MisNotasTab />
          </TabsContent>
          <TabsContent value="asistencias" className="mt-6">
            <MisAsistenciasTab />
          </TabsContent>
          <TabsContent value="pensiones" className="mt-6">
            <MisPensionesTab />
          </TabsContent>
          <TabsContent value="horario" className="mt-6">
            <MiHorarioTab />
          </TabsContent>
          <TabsContent value="perfil" className="mt-6">
            <MiPerfilTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
