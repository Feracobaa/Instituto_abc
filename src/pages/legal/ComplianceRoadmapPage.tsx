import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, BadgeCheck, Building2, ChevronRight, ClipboardCheck, FileText,
  Landmark, LockKeyhole, Printer, Scale, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const requirements = [
  { icon: Building2, title: "Empresa, matrícula y tributación", items: [
    "Definir la persona natural o jurídica que presta el SaaS, su representante y su actividad económica.",
    "Verificar matrícula mercantil, RUT/NIT actualizado y obligaciones tributarias con contador.",
    "Habilitar facturación electrónica cuando corresponda y conservar soportes de la relación comercial.",
  ] },
  { icon: LockKeyhole, title: "Datos personales, NNA y biometría", items: [
    "Identificar a cada colegio como Responsable y a ETYMON como Encargado cuando trate datos por sus instrucciones.",
    "Publicar una política clara, aviso de privacidad y canal real para consultas, reclamos, corrección y supresión.",
    "Documentar finalidad, necesidad, seguridad y autorización previa, expresa e informada; para biometría o salud, consentimiento expreso del representante cuando aplique.",
    "Evaluar RNBD, transferencias/transmisiones internacionales y los contratos con proveedores de nube.",
  ] },
  { icon: FileText, title: "Contratos y evidencia electrónica", items: [
    "Formalizar el contrato SaaS por institución: alcance, soporte, niveles de servicio, pagos, propiedad intelectual y salida de datos.",
    "Incluir un acuerdo de tratamiento de datos: instrucciones, medidas de seguridad, subencargados, incidentes, devolución o eliminación de datos.",
    "Conservar evidencia de aceptación: identidad, fecha/hora, versión del documento, texto aceptado y trazabilidad de cambios.",
  ] },
  { icon: ShieldCheck, title: "Seguridad y gestión documental", items: [
    "Aplicar mínimos privilegios, aislamiento entre instituciones, copias de seguridad, control de accesos y registro de eventos sensibles.",
    "Definir procedimiento de incidentes, atención de titulares y responsables internos de privacidad y seguridad.",
    "Acordar con cada institución la retención, consulta, exportación y eliminación de documentos escolares conforme a su gestión documental.",
  ] },
  { icon: Scale, title: "Transparencia, consumidor e identidad", items: [
    "Mostrar quién presta el servicio, canales de contacto, precio, condiciones de pago, renovación, soporte y terminación antes de contratar.",
    "Mantener términos de uso, política de privacidad y procedimiento de PQR actualizados y accesibles.",
    "Proteger marca, código y contenidos; definir la titularidad de datos institucionales y desarrollos en los contratos.",
  ] },
];

const sources = [
  ["SIC · marco de protección de datos y deberes", "https://sedeelectronica.sic.gov.co/politica-de-tratamiento-de-datos-personales"],
  ["VUE · creación y registro de empresa", "https://www.vue.gov.co/ventanilla-unica-empresarial/guia-para-crear-y-hacer-crecer-su-empresa/guia-previa-a-la-creacion-de-su-empresa"],
  ["DIAN · facturación electrónica", "https://www.dian.gov.co/impuestos/factura-electronica/como-hacerlo/Paginas/ser-facturador-electronico.aspx"],
  ["SUIN · Ley 527 de 1999", "https://www.suin-juriscol.gov.co/viewDocument.asp?id=1662013"],
  ["Función Pública · Ley 594 de 2000", "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=4275"],
] as const;

export default function ComplianceRoadmapPage() {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3 print:hidden">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft /> Volver</Button>
          <div className="flex gap-2"><Link to="/legal/privacy"><Button variant="outline" size="sm">Privacidad</Button></Link><Button variant="outline" size="sm" onClick={() => window.print()}><Printer /> Imprimir</Button></div>
        </div>
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 print:border-none print:shadow-none">
          <header className="bg-gradient-to-br from-indigo-800 via-blue-800 to-slate-950 px-6 py-10 text-white sm:px-10">
            <div className="mb-3 flex items-center gap-2 text-sm text-blue-100"><Landmark className="h-4 w-4" /> Colombia · hoja de ruta operativa</div>
            <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">Legalidad y cumplimiento de la plataforma</h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-blue-100 sm:text-base">Guía pública para organizar los frentes que ETYMON y cada institución educativa deben revisar antes y durante la operación del servicio.</p>
          </header>
          <div className="space-y-10 px-6 py-8 sm:px-10">
            <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100"><div className="flex gap-3"><BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" /><p><strong>Estado de esta página: guía de implementación.</strong> No constituye concepto jurídico ni afirma que la plataforma o una institución ya cuenten con todas las habilitaciones. La validación final corresponde a asesoría jurídica, contable y de protección de datos en Colombia.</p></div></section>
            <section><div className="mb-5 flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-indigo-600" /><h2 className="text-xl font-bold">Qué debe estar documentado y verificable</h2></div><div className="grid gap-4 md:grid-cols-2">{requirements.map(({ icon: Icon, title, items }) => <section key={title} className="rounded-xl border border-slate-200 p-5 dark:border-slate-800"><div className="mb-3 flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Icon className="h-5 w-5 text-indigo-600" />{title}</div><ul className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{items.map((item) => <li key={item} className="flex gap-2"><ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-indigo-500" />{item}</li>)}</ul></section>)}</div></section>
            <section className="rounded-xl bg-slate-100 p-5 dark:bg-slate-800/70"><h2 className="text-lg font-bold">Reparto de responsabilidades</h2><div className="mt-4 grid gap-4 text-sm md:grid-cols-2"><div><strong className="text-indigo-700 dark:text-indigo-300">Institución educativa</strong><p className="mt-1 text-slate-600 dark:text-slate-300">Define las finalidades educativas, informa a las familias, obtiene las autorizaciones que correspondan y mantiene sus obligaciones sectoriales y archivísticas.</p></div><div><strong className="text-indigo-700 dark:text-indigo-300">ETYMON</strong><p className="mt-1 text-slate-600 dark:text-slate-300">Presta el software, protege la infraestructura y trata los datos conforme a las instrucciones y al contrato aplicable. Debe informar límites, subproveedores e incidentes según el acuerdo.</p></div></div></section>
            <section><h2 className="text-lg font-bold">Fuentes oficiales para la validación</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Las obligaciones exactas dependen de la estructura societaria, servicios contratados, datos tratados y cambios normativos.</p><ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{sources.map(([label, url]) => <li key={url}><a className="text-indigo-700 underline underline-offset-4 hover:text-indigo-900 dark:text-indigo-300" href={url} target="_blank" rel="noreferrer">{label}</a></li>)}</ul></section>
          </div>
        </article>
      </div>
    </main>
  );
}
