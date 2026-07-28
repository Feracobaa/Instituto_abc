  begin;

  -- ============================================================================
  -- MIGRACIÓN 20260727_43: pgvector E ÍNDICE HNSW PARA BÚSQUEDA BIOMÉTRICA SUB-MILISEGUNDO
  -- ============================================================================

  -- 1. Habilitar la extensión vectorial de PostgreSQL
  create extension if not exists vector with schema extensions;

  -- 2. Añadir la columna de tipo vector(128) a la tabla student_biometrics
  alter table public.student_biometrics
    add column if not exists vec_embedding extensions.vector(128);

  -- 3. Migrar datos existentes del tipo array al tipo vector(128)
  do $$
  begin
    if exists (
      select 1 from information_schema.columns 
      where table_schema = 'public' 
        and table_name = 'student_biometrics' 
        and column_name = 'embedding'
    ) then
      update public.student_biometrics
      set vec_embedding = replace(replace(embedding::text, '{', '['), '}', ']')::extensions.vector(128)
      where vec_embedding is null and array_length(embedding, 1) = 128;
    end if;
  end
  $$;

  -- 4. Crear índice HNSW para búsqueda coseno ultra-rápida (Escalabilidad O(log N))
  create index if not exists student_biometrics_hnsw_idx
    on public.student_biometrics
    using hnsw (vec_embedding extensions.vector_cosine_ops);

  -- 5. Crear Función RPC para búsqueda biométrica en servidor PostgreSQL
  create or replace function public.match_student_biometrics(
    query_embedding extensions.vector(128),
    match_threshold double precision default 0.91,
    student_ids uuid[] default null
  )
  returns table (
    student_id uuid,
    similarity double precision,
    distance double precision
  )
  language plpgsql
  security definer
  set search_path = 'public', 'extensions'
  as $function$
  begin
    return query
    select
      sb.student_id,
      (1.0 - (sb.vec_embedding <=> query_embedding)) as similarity,
      (sb.vec_embedding <=> query_embedding) as distance
    from public.student_biometrics sb
    where sb.vec_embedding is not null
      and (student_ids is null or sb.student_id = any(student_ids))
      and (1.0 - (sb.vec_embedding <=> query_embedding)) >= match_threshold
    order by sb.vec_embedding <=> query_embedding
    limit 1;
  end;
  $function$;

  comment on function public.match_student_biometrics is
  'Busca el estudiante con mayor similitud biométrica coseno utilizando el índice HNSW espacial en sub-milisegundos.';

  commit;
