type AppError = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message?: string;
};

function isAppError(error: unknown): error is AppError {
  return typeof error === "object" && error !== null;
}

export function getFriendlyErrorMessage(error: unknown) {
  if (!isAppError(error)) {
    return "Ocurrio un error inesperado. Intenta nuevamente.";
  }

  const message = error.message?.toLowerCase() ?? "";
  const details = error.details?.toLowerCase() ?? "";
  const hint = error.hint?.toLowerCase() ?? "";

  if (
    error.code === "42501" ||
    message.includes("row-level security") ||
    details.includes("row-level security")
  ) {
    return "No tienes permisos para realizar esta accion con tu rol actual.";
  }

  if (error.code === "23505" || message.includes("duplicate key")) {
    return "Ya existe un registro con esos datos. Revisa si estas duplicando la informacion.";
  }

  if (error.code === "23503" || message.includes("foreign key")) {
    return "La relacion requerida ya no existe o aun no ha sido creada correctamente.";
  }

  if (message.includes("no existe usuario") || message.includes("no profile found for email") || message.includes("no auth user found")) {
    return "El email ingresado no tiene una cuenta registrada en la plataforma. Crea primero el usuario desde la seccion de acceso.";
  }

  if (message.includes("user already exists") || message.includes("already registered") || message.includes("already")) {
    return "Ese usuario ya existe. Usa la pestana \"Asignar existente\" para vincularlo a la institucion.";
  }

  if (message.includes("only provider owners") || message.includes("forbidden")) {
    return "Solo el owner del proveedor puede ejecutar esta accion. Verifica que tu cuenta tenga el rol correcto.";
  }

  if (error.code === "23502" || message.includes("null value")) {
    return "Faltan datos obligatorios para completar esta accion.";
  }

  if (message.includes("payment exceeds monthly tuition") || message.includes("ya está pagado completamente")) {
    return "Este mes ya tiene el pago completo registrado. No es posible agregar mas abonos.";
  }

  if (message.includes("period month is outside the charge window")) {
    return "El mes seleccionado esta fuera del rango de cobro configurado para este estudiante.";
  }

  if (message.includes("monthly tuition must") || message.includes("positive amount")) {
    return "El valor de pension debe ser un monto mayor a cero.";
  }

  if (message.includes("student tuition profile not found")) {
    return "Este estudiante no tiene un perfil de pension configurado. Configuralo primero en la seccion de perfiles.";
  }

  if (error.code === "23514" || message.includes("check constraint")) {
    return "Los datos no cumplen las reglas del sistema. Revisa la informacion ingresada.";
  }


  if (message.includes("invalid login credentials")) {
    return "Credenciales invalidas. Verifica tu correo y tu contrasena.";
  }

  if (message.includes("already registered")) {
    return "Ese correo ya se encuentra registrado en la plataforma.";
  }

  if (message.includes("network") || hint.includes("network")) {
    return "No fue posible conectar con el servidor. Verifica tu conexion e intenta otra vez.";
  }

  return error.message || "Ocurrio un error inesperado. Intenta nuevamente.";
}
