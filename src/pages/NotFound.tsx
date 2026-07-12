import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-6">
      <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-card">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">404</p>
        <h1 className="mb-3 font-heading text-3xl font-bold text-foreground">Pagina no encontrada</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          La ruta que intentaste abrir no existe o ya no esta disponible.
        </p>
        <Link
          to="/"
          className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
