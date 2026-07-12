import { useEffect } from "react";
import { useInstitutionSettings } from "@/hooks/useSchoolData";
import { hexToHSL, contrastForeground, adjustLuminanceForDarkMode } from "@/lib/utils";

/**
 * Reads the institution's `primary_color` from the DB and injects the
 * corresponding CSS custom properties into `:root` so that every Tailwind
 * utility class that references `--primary` automatically picks up the
 * institution-specific brand color.
 *
 * Mount this component once inside the authenticated layout tree.
 */
export function InstitutionThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useInstitutionSettings();

  useEffect(() => {
    const color = settings?.primary_color;
    const accent = settings?.accent_color;
    const secondary = settings?.secondary_color;
    const fontFamily = settings?.font_family;

    if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return;
    }

    const root = document.documentElement;

    const applyColors = () => {
      const isDark = root.classList.contains("dark");
      
      // Inyecciones principales de variables CSS
      const hsl = isDark ? adjustLuminanceForDarkMode(color) : hexToHSL(color);
      const fg = contrastForeground(color);

      root.style.setProperty("--primary", hsl);
      root.style.setProperty("--primary-foreground", fg);
      root.style.setProperty("--ring", hsl);
      root.style.setProperty("--sidebar-primary", hsl);
      root.style.setProperty("--sidebar-primary-foreground", fg);
      root.style.setProperty("--sidebar-ring", hsl);

      if (accent && /^#[0-9a-fA-F]{6}$/.test(accent)) {
        const hslAccent = isDark ? adjustLuminanceForDarkMode(accent) : hexToHSL(accent);
        root.style.setProperty("--accent", hslAccent);
        root.style.setProperty("--success", hslAccent);
      }

      if (secondary && /^#[0-9a-fA-F]{6}$/.test(secondary)) {
        const hslSecondary = isDark ? adjustLuminanceForDarkMode(secondary) : hexToHSL(secondary);
        root.style.setProperty("--secondary", hslSecondary);
      }
    };

    // Aplicación en montaje inicial
    applyColors();

    // MutationObserver para recalcular variables al alternar .dark
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "class") {
          applyColors();
        }
      }
    });

    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    if (fontFamily) {
      const fontMap: Record<string, string> = {
        "academic-sans": "'Inter', 'Nunito', sans-serif",
        "classic-serif": "'Lora', 'Merriweather', serif",
        "friendly-rounded": "'Nunito', 'Inter', sans-serif",
        "modern-sans": "'Inter', 'Nunito', sans-serif",
      };
      const resolvedFont = fontMap[fontFamily];
      if (resolvedFont) {
        root.style.setProperty("--institution-font-family", resolvedFont);
      }
    }

    return () => {
      observer.disconnect();
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-foreground");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--sidebar-primary");
      root.style.removeProperty("--sidebar-primary-foreground");
      root.style.removeProperty("--sidebar-ring");
      root.style.removeProperty("--accent");
      root.style.removeProperty("--success");
      root.style.removeProperty("--secondary");
      root.style.removeProperty("--institution-font-family");
    };
  }, [settings?.accent_color, settings?.font_family, settings?.primary_color, settings?.secondary_color]);

  return <>{children}</>;
}

