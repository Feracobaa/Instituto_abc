/**
 * Fachada retrocompatible para hooks de contabilidad, pensiones e inventario.
 * Re-exporta los submódulos especializados preservando compatibilidad absoluta.
 */
export * from "./accounting/useTuitionHooks";
export * from "./accounting/useLedgerHooks";
export * from "./accounting/useInventoryHooks";
