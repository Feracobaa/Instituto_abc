import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shield } from "lucide-react";

export default function Usuarios() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const handleChange = (field: keyof typeof formData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.fullName.trim() || !formData.email.trim() || formData.password.length < 8) {
      toast.error("Datos incompletos", {
        description: "Completa nombre, correo y una contrasena valida (minimo 8 caracteres).",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Sesión expirada", {
          description: "Inicia sesión de nuevo para crear cuentas.",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-institution-user", {
        body: {
          email: formData.email.trim(),
          full_name: formData.fullName.trim(),
          role: "contable",
          temporary_password: formData.password,
        },
      });

      if (error) {
        // supabase.functions.invoke wraps HTTP errors
        const message = data?.error || error.message || "Error desconocido al crear la cuenta.";
        toast.error("Error al crear la cuenta", {
          description: message,
        });
        return;
      }

      toast.success("Cuenta contable creada", {
        description: "Comparte estas credenciales con la contable.",
      });

      setFormData({ fullName: "", email: "", password: "" });
    } catch (err) {
      toast.error("Error inesperado", {
        description: err instanceof Error ? err.message : "No se pudo crear la cuenta.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Crea accesos de contabilidad y asigna el rol contable.
          </p>
        </div>

        <Card className="max-w-xl p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">Nueva cuenta contable</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre completo</Label>
              <Input
                value={formData.fullName}
                onChange={handleChange("fullName")}
                placeholder="Maria Lopez"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Correo electronico</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={handleChange("email")}
                placeholder="contable@colegio.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Contrasena temporal</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={handleChange("password")}
                placeholder="Minimo 8 caracteres"
              />
              <p className="text-xs text-muted-foreground">
                Esta contrasena se comparte con la contable para el primer ingreso.
              </p>
            </div>

            <Button type="submit" className="gap-2" disabled={isSubmitting}>
              Crear cuenta contable
            </Button>
          </form>
        </Card>
      </div>
    </MainLayout>
  );
}
