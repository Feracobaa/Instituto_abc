import { useEffect, useState } from "react";
import { Check, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { computeLegalTextHash, CURRENT_POLICY_VERSION, CURRENT_TERMS_VERSION } from "@/features/legal/constants";
import type { ConsentPurpose, StudentConsent } from "@/types/studentPrivacy";
import { toast } from "@/components/ui/sonner";

const purposes: Array<{ code: ConsentPurpose; title: string; description: string; sensitive?: boolean }> = [
  { code: "ACADEMIC", title: "Gestión académica", description: "Notas, boletines, asistencia y procesos escolares necesarios." },
  { code: "COMMUNICATION", title: "Comunicaciones", description: "Avisos, tareas y notificaciones de la institución." },
  { code: "DOCUMENT_STORAGE", title: "Custodia documental", description: "Almacenamiento privado de los documentos requeridos." },
  { code: "HEALTH", title: "Información de salud", description: "Datos estrictamente necesarios para atención escolar y emergencias.", sensitive: true },
  { code: "EMERGENCY", title: "Atención de emergencias", description: "Uso de contactos y alertas ante una situación urgente.", sensitive: true },
  { code: "BIOMETRIC", title: "Biometría facial", description: "Asistencia facial opcional. Puede usar el registro manual si no autoriza.", sensitive: true },
];

type Rpc = { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };

export function ConsentManagementTab({ studentId, guardianName }: { studentId: string; guardianName: string }) {
  const { user } = useAuth();
  const [consents, setConsents] = useState<StudentConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<ConsentPurpose | null>(null);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await (supabase as unknown as Rpc).rpc("list_my_student_consents", { p_student_id: studentId });
    if (error) toast.error("No fue posible consultar los consentimientos", { description: error.message });
    setConsents((data as StudentConsent[] | null) ?? []);
    setLoading(false);
  };
  useEffect(() => { void refresh(); }, [studentId]);

  const active = (purpose: ConsentPurpose) => consents.find((item) => item.purpose === purpose && item.status === "GRANTED");
  const toggle = async (item: typeof purposes[number]) => {
    const current = active(item.code);
    setAccepting(item.code);
    if (current) {
      const { error } = await (supabase as unknown as Rpc).rpc("revoke_student_consent", { p_consent_id: current.id, p_reason: "Revocación solicitada desde el portal" });
      if (error) toast.error("No fue posible revocar", { description: error.message }); else toast.success(item.code === "BIOMETRIC" ? "Biometría revocada y plantilla eliminada." : "Consentimiento revocado.");
    } else {
      const text = `${item.title}. ${item.description} Política ${CURRENT_POLICY_VERSION}; términos ${CURRENT_TERMS_VERSION}.`;
      const hash = await computeLegalTextHash(text);
      const { error } = await (supabase as unknown as Rpc).rpc("record_student_consent", {
        p_student_id: studentId, p_purpose: item.code, p_guardian_name: guardianName || user?.user_metadata?.full_name || "Acudiente", p_guardian_document_id: "", p_consent_text_hash: hash, p_source: "PORTAL_WEB",
      });
      if (error) toast.error("No fue posible registrar la autorización", { description: error.message }); else toast.success("Autorización registrada con evidencia verificable.");
    }
    setAccepting(null);
    await refresh();
  };

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  return <section className="space-y-4 rounded-xl border bg-card p-5 shadow-card">
    <div><h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-primary" />Privacidad y autorizaciones</h2><p className="mt-1 text-sm text-muted-foreground">Cada autorización es específica, voluntaria y revocable. No se usan casillas premarcadas.</p></div>
    <div className="grid gap-3 md:grid-cols-2">{purposes.map((item) => {
      const granted = Boolean(active(item.code)); const pending = accepting === item.code;
      return <div key={item.code} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.title}{item.sensitive && <span className="ml-2 text-xs text-amber-600">Dato sensible</span>}</p><p className="mt-1 text-xs text-muted-foreground">{item.description}</p></div><Checkbox checked={granted} onCheckedChange={() => void toggle(item)} disabled={Boolean(accepting)} aria-label={`Autorizar ${item.title}`} /></div><div className="mt-3 flex items-center justify-between text-xs"><span className={granted ? "text-emerald-600" : "text-muted-foreground"}>{granted ? "Autorizado" : "No autorizado"}</span><Button size="xs" variant={granted ? "outline" : "default"} disabled={Boolean(accepting)} onClick={() => void toggle(item)}>{pending ? <Loader2 className="animate-spin" /> : granted ? <><RotateCcw />Revocar</> : <><Check />Autorizar</>}</Button></div></div>;
    })}</div>
  </section>;
}
