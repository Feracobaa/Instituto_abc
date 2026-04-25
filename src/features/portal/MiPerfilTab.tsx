import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Save } from "lucide-react";
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

type FormState = {
  address: string;
  birth_date: string;
  confirm_password: string;
  guardian_name: string;
  guardian_phone: string;
  new_password: string;
};

const emptyForm: FormState = { address: "", birth_date: "", confirm_password: "", guardian_name: "", guardian_phone: "", new_password: "" };

export default function MiPerfilTab() {
  const guardianAccountQuery = useGuardianAccount();
  const updateGuardianProfile = useUpdateGuardianProfile();
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const guardianAccount = guardianAccountQuery.data;
  const student = guardianAccount?.students ?? null;
  const requiresOnboarding = Boolean(guardianAccount?.must_change_password || !guardianAccount?.onboarding_completed_at);

  useEffect(() => {
    if (!student) return;
    setFormData({ address: student.address || "", birth_date: student.birth_date || "", confirm_password: "", guardian_name: student.guardian_name || "", guardian_phone: student.guardian_phone || "", new_password: "" });
    setErrors({});
  }, [student]);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((c) => ({ ...c, [field]: value }));
    setErrors((c) => { if (!c[field]) return c; const next = { ...c }; delete next[field]; return next; });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = guardianProfileFormSchema.safeParse(formData);
    if (!validation.success) {
      setErrors(getFieldErrors(validation.error));
      toast({ title: "Revisa el formulario", description: "Completa los campos obligatorios.", variant: "destructive" });
      return;
    }
    if (requiresOnboarding && !validation.data.new_password) {
      setErrors((c) => ({ ...c, new_password: "Debes cambiar la contraseña temporal en el primer ingreso." }));
      toast({ title: "Debes cambiar tu contraseña", variant: "destructive" });
      return;
    }
    const metadataUpdate = validation.data.guardian_name ? { full_name: validation.data.guardian_name } : undefined;
    if (metadataUpdate || validation.data.new_password) {
      const { error: authError } = await supabase.auth.updateUser({
        ...(metadataUpdate ? { data: metadataUpdate } : {}),
        ...(validation.data.new_password ? { password: validation.data.new_password } : {}),
      });
      if (authError) { toast({ title: "No fue posible actualizar el acceso", description: getFriendlyErrorMessage(authError), variant: "destructive" }); return; }
    }
    await updateGuardianProfile.mutateAsync({
      address: validation.data.address, birth_date: validation.data.birth_date,
      guardian_name: validation.data.guardian_name, guardian_phone: validation.data.guardian_phone,
      markOnboardingComplete: requiresOnboarding,
    });
    setFormData((c) => ({ ...c, confirm_password: "", new_password: "" }));
    setErrors({});
  };

  if (guardianAccountQuery.isLoading) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!guardianAccount || !student) {
    return <EmptyState title="Sin cuenta vinculada" description="Rectoría debe revisar la configuración de este acceso." />;
  }

  return (
    <div className="space-y-6">
      {requiresOnboarding && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Primer ingreso</AlertTitle>
          <AlertDescription>Completa los datos del acudiente y cambia la contraseña temporal antes de continuar.</AlertDescription>
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
            <Input id="guardian_name" value={formData.guardian_name} onChange={(e) => updateField("guardian_name", e.target.value)} />
            {errors.guardian_name && <p className="text-xs text-destructive">{errors.guardian_name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardian_phone">Teléfono del acudiente</Label>
            <Input id="guardian_phone" value={formData.guardian_phone} onChange={(e) => updateField("guardian_phone", e.target.value)} />
            {errors.guardian_phone && <p className="text-xs text-destructive">{errors.guardian_phone}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="birth_date">Cumpleaños del estudiante</Label>
            <Input id="birth_date" type="date" value={formData.birth_date} onChange={(e) => updateField("birth_date", e.target.value)} />
            {errors.birth_date && <p className="text-xs text-destructive">{errors.birth_date}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_password">{requiresOnboarding ? "Nueva contraseña" : "Cambiar contraseña (opcional)"}</Label>
            <Input id="new_password" type="password" value={formData.new_password} onChange={(e) => updateField("new_password", e.target.value)} />
            {errors.new_password && <p className="text-xs text-destructive">{errors.new_password}</p>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Dirección</Label>
            <Textarea id="address" value={formData.address} onChange={(e) => updateField("address", e.target.value)} rows={3} />
            {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="confirm_password">Confirmar contraseña</Label>
            <Input id="confirm_password" type="password" value={formData.confirm_password} onChange={(e) => updateField("confirm_password", e.target.value)} />
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
    </div>
  );
}
