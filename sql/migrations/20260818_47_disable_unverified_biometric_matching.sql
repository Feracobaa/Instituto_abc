-- Contención temporal de matching facial.
-- No se revocan templates ni se eliminan datos: sólo se impide que un cliente
-- autenticado use una coincidencia facial sin evidencia PAD verificable.
begin;

revoke all on function public.match_student_biometrics(extensions.vector(128), double precision, uuid[])
  from public, anon, authenticated;

comment on function public.match_student_biometrics(extensions.vector(128), double precision, uuid[]) is
  'Deshabilitada temporalmente: reactivar únicamente detrás de PAD verificable en servidor y evaluación formal.';

commit;
