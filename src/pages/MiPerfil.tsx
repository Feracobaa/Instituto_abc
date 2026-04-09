import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/EmptyState";
import { guardianProfileFormSchema, getFieldErrors } from "@/lib/schoolSchemas";
import { useGuardianAccount, useUpdateGuardianProfile } from "@/hooks/useSchoolData";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type GuardianProfileFormState = {
  address: string;
  birth_date: string;
  confirm_password: string;
  guardian_name: string;
  guardian_phone: string;
  new_password: string;
};

const emptyForm: GuardianProfileFormState = {
  address: "",
  birth_date: "",
  confirm_password: "",
  guardian_name: "",
  guardian_phone: "",
  new_password: "",
};

export default function MiPerfil() {
  const guardianAccountQuery = useGuardianAccount();
  const updateGuardianProfile = useUpdateGuardianProfile();
  const { toast } = useToast();

  const [formData, setFormData] = useState<GuardianProfileFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const guardianAccount = guardianAccountQuery.data;
  const student = guardianAccount?.students ?? null;
  const requiresOnboarding = Boolean(
    guardianAccount?.must_change_password || !guardianAccount?.onboarding_completed_at,
  );

  useEffect(() => {
    if (!student) {
      return;
    }

    setFormData({
      address: student.address || "",
      birth_date: student.birth_date || "",
      confirm_password: "",
      guardian_name: student.guardian_name || "",
      guardian_phone: student.guardian_phone || "",
      new_password: "",
    });
    setErrors({});
  }, [student]);

  const updateField = <K extends keyof GuardianProfileFormState>(
    field: K,
    value: GuardianProfileFormState[K],
  ) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validation = guardianProfileFormSchema.safeParse(formData);
    if (!validation.success) {
      setErrors(getFieldErrors(validation.error));
      toast({
        title: "Revisa el formulario",
        description: "Completa los campos obligatorios antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    if (requiresOnboarding && !validation.data.new_password) {
      setErrors((current) => ({
        ...current,
        new_password: "Debes cambiar la contrasena temporal en el primer ingreso.",
      }));
      toast({
        title: "Debes cambiar tu contrasena",
        description: "El acceso inicial solo sirve para el primer ingreso.",
        variant: "destructive",
      });
      return;
    }

    const metadataUpdate = validation.data.guardian_name
      ? { full_name: validation.data.guardian_name }
      : undefined;

    if (metadataUpdate || validation.data.new_password) {
      const { error: authError } = await supabase.auth.updateUser({
        ...(metadataUpdate ? { data: metadataUpdate } : {}),
        ...(validation.data.new_password ? { password: validation.data.new_password } : {}),
      });

      if (authError) {
        toast({
          title: "No fue posible actualizar el acceso",
          description: getFriendlyErrorMessage(authError),
          variant: "destructive",
        });
        return;
      }
    }

    await updateGuardianProfile.mutateAsync({
      address: validation.data.address,
      birth_date: validation.data.birth_date,
      guardian_name: validation.data.guardian_name,
      guardian_phone: validation.data.guardian_phone,
      markOnboardingComplete: requiresOnboarding,
    });

    setFormData((current) => ({
      ...current,
      confirm_password: "",
      new_password: "",
    }));
    setErrors({});
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Mi perfil</h1>
          <p className="text-sm text-muted-foreground">
            Completa y manten actualizados los datos del acudiente y del estudiante.
          </p>
        </div>

        {guardianAccountQuery.isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !guardianAccount || !student ? (
          <EmptyState
            title="No hay cuenta del portal estudiantil vinculada"
            description="Rectoria debe revisar la configuracion de este acceso."
          />
        ) : (
          <>
            {requiresOnboarding && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Primer ingreso</AlertTitle>
                <AlertDescription>
                  Antes de ver notas y horario, debes completar los datos del acudiente y cambiar la contrasena temporal.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border bg-card p-4 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Usuario</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{guardianAccount.username}</p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estudiante</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{student.full_name}</p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grado</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{student.grades?.name || "Sin grado"}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 shadow-card">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guardian_name">Nombre del acudiente</Label>
                  <Input
                    id="guardian_name"
                    value={formData.guardian_name}
                    onChange={(event) => updateField("guardian_name", event.target.value)}
                  />
                  {errors.guardian_name && <p className="text-xs text-destructive">{errors.guardian_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guardian_phone">Telefono del acudiente</Label>
                  <Input
                    id="guardian_phone"
                    value={formData.guardian_phone}
                    onChange={(event) => updateField("guardian_phone", event.target.value)}
                  />
                  {errors.guardian_phone && <p className="text-xs text-destructive">{errors.guardian_phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date">Cumpleanos del estudiante</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(event) => updateField("birth_date", event.target.value)}
                  />
                  {errors.birth_date && <p className="text-xs text-destructive">{errors.birth_date}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password">
                    {requiresOnboarding ? "Nueva contrasena" : "Cambiar contrasena (opcional)"}
                  </Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={formData.new_password}
                    onChange={(event) => updateField("new_password", event.target.value)}
                  />
                  {errors.new_password && <p className="text-xs text-destructive">{errors.new_password}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Direccion</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(event) => updateField("address", event.target.value)}
                    rows={3}
                  />
                  {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="confirm_password">Confirmar contrasena</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={formData.confirm_password}
                    onChange={(event) => updateField("confirm_password", event.target.value)}
                  />
                  {errors.confirm_password && <p className="text-xs text-destructive">{errors.confirm_password}</p>}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button type="submit" disabled={updateGuardianProfile.isPending} className="gap-2">
                  {updateGuardianProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar perfil
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </MainLayout>
  );
}
