export const commercialStatuses = ["lead", "active", "paused", "churned"] as const;
export const billingStatuses = ["pending", "paid", "overdue", "waived"] as const;
export const subscriptionStatuses = ["trialing", "active", "past_due", "canceled"] as const;
export const institutionRoles = ["rector", "profesor", "parent", "contable"] as const;

export const colorRegex = /^#[0-9A-Fa-f]{6}$/;

export const fontFamilyOptions = [
  { value: "modern-sans", label: "Modern Sans" },
  { value: "academic-sans", label: "Academic Sans" },
  { value: "friendly-rounded", label: "Friendly Rounded" },
  { value: "classic-serif", label: "Classic Serif" },
] as const;

export const visualStyleOptions = [
  { value: "clean", label: "Clean" },
  { value: "bold", label: "Bold" },
  { value: "minimal", label: "Minimal" },
] as const;

export const brandPresets = [
  {
    accent_color: "#14B8A6",
    key: "coastal",
    label: "Coastal Tech",
    primary_color: "#0EA5E9",
    secondary_color: "#1E293B",
    visual_style: "clean",
  },
  {
    accent_color: "#F59E0B",
    key: "academia",
    label: "Academia Gold",
    primary_color: "#0F172A",
    secondary_color: "#334155",
    visual_style: "bold",
  },
  {
    accent_color: "#4F46E5",
    key: "future",
    label: "Future Indigo",
    primary_color: "#111827",
    secondary_color: "#312E81",
    visual_style: "minimal",
  },
] as const;

export type FontFamilyValue = (typeof fontFamilyOptions)[number]["value"];
export type VisualStyleValue = (typeof visualStyleOptions)[number]["value"];

export interface BrandingFormState {
  accent_color: string;
  cover_image_url: string;
  display_name: string;
  font_family: FontFamilyValue;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  visual_style: VisualStyleValue;
  address: string;
  legal_name: string;
  nit: string;
  phone: string;
  rector_name: string;
  block_reports_on_debt: boolean;
}

export interface CreateInstitutionForm extends BrandingFormState {
  billingStatus: string;
  name: string;
  notes: string;
  planId: string;
  slug: string;
  subscriptionStatus: string;
}

export function makeBrandingForm(displayName = ""): BrandingFormState {
  return {
    accent_color: "#14B8A6",
    cover_image_url: "",
    display_name: displayName,
    font_family: "modern-sans",
    logo_url: "",
    primary_color: "#0EA5E9",
    secondary_color: "#1E293B",
    visual_style: "clean",
    address: "",
    legal_name: "",
    nit: "",
    phone: "",
    rector_name: "",
    block_reports_on_debt: false,
  };
}

export function defaultCreateForm(): CreateInstitutionForm {
  return {
    ...makeBrandingForm(""),
    billingStatus: "pending",
    name: "",
    notes: "",
    planId: "",
    slug: "",
    subscriptionStatus: "trialing",
  };
}

export function ensureHexOrEmpty(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  return colorRegex.test(normalized) ? normalized.toUpperCase() : null;
}

export function fontPreviewClass(value: FontFamilyValue) {
  if (value === "friendly-rounded") return "font-[Nunito]";
  if (value === "classic-serif") return "font-serif";
  if (value === "academic-sans") return "font-[Inter] tracking-[0.01em]";
  return "font-[Inter]";
}

export function styleBadgeClass(value: VisualStyleValue) {
  if (value === "bold") return "uppercase tracking-[0.16em]";
  if (value === "minimal") return "tracking-[0.08em]";
  return "tracking-[0.12em]";
}
