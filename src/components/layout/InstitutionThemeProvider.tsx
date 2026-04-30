import { useEffect } from "react";
import { useInstitutionSettings } from "@/hooks/useSchoolData";
import { hexToHSL, contrastForeground } from "@/lib/utils";

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
    if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return;
    }

    const root = document.documentElement;
    const hsl = hexToHSL(color);
    const fg = contrastForeground(color);

    // Inject into both :root (light) and dark mode contexts
    root.style.setProperty("--primary", hsl);
    root.style.setProperty("--primary-foreground", fg);
    root.style.setProperty("--ring", hsl);
    root.style.setProperty("--sidebar-primary", hsl);
    root.style.setProperty("--sidebar-primary-foreground", fg);
    root.style.setProperty("--sidebar-ring", hsl);

    return () => {
      // Clean up when unmounted (e.g. logout) so that the CSS file defaults
      // are restored on the next page load.
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-foreground");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--sidebar-primary");
      root.style.removeProperty("--sidebar-primary-foreground");
      root.style.removeProperty("--sidebar-ring");
    };
  }, [settings?.primary_color]);

  return <>{children}</>;
}
