-- ==============================================================================
-- Pruebas de Integración y Seguridad PostgreSQL / RLS: Fase 1.1.5
-- Fecha: 08 de Septiembre de 2026
-- Ejecuta con SET LOCAL ROLE authenticated y variables JWT de sesión:
-- TEST A: Colegio A -> leer Colegio B (0 filas por RLS)
-- TEST B: Colegio A -> insertar alumno Colegio B (foreign_key_violation)
-- TEST C: Colegio A -> modificar documento Colegio B (0 filas modificadas por RLS)
-- TEST D: RPC A -> student B (Violación frontera estudiante)
-- TEST E: RPC A -> document B (Violación frontera documento)
-- TEST F: RPC A -> documento y alumno propio (ALLOW + inserción auditoría)
-- TEST G: Usuario anónimo / sin sesión JWT (DENIED)
-- TEST H: Rector de Colegio A -> leer documento propio (1 fila autorizada)
-- TEST I: Usuario autenticado sin membresía en tenant (DENIED)
-- TEST J: Documento en tenant A con document_type de tenant B (DENIED por trigger)
-- ==============================================================================

BEGIN;

-- 1. Verificación de Privilegios Físicos de Tabla y Función
DO $perm_test$
DECLARE
  v_table regclass := 'public.sensitive_access_logs'::regclass;
  v_fn regprocedure := 'public.log_sensitive_document_access(uuid,uuid,public.sensitive_action_enum,text,boolean,text,text,text)'::regprocedure;
  v_public_exec boolean;
BEGIN
  IF has_table_privilege('anon', v_table, 'INSERT') OR has_table_privilege('authenticated', v_table, 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: sensitive_access_logs permite INSERT directo a roles cliente';
  END IF;

  IF has_table_privilege('authenticated', v_table, 'UPDATE') OR has_table_privilege('authenticated', v_table, 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: sensitive_access_logs permite UPDATE/DELETE a authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
    WHERE p.oid = v_fn AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
  ) INTO v_public_exec;

  IF v_public_exec OR has_function_privilege('anon', v_fn, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: log_sensitive_document_access expuesta a anon o PUBLIC';
  END IF;
END;
$perm_test$;

-- 2. Suite de Integración con Fixtures Transaccionales
DO $integration_suite$
DECLARE
  v_inst_a UUID := gen_random_uuid();
  v_inst_b UUID := gen_random_uuid();
  v_user_rector_a UUID := gen_random_uuid();
  v_user_rector_b UUID := gen_random_uuid();
  v_user_no_membership UUID := gen_random_uuid();
  v_student_a UUID := gen_random_uuid();
  v_student_b UUID := gen_random_uuid();
  v_doc_type_global UUID;
  v_doc_type_tenant_b UUID := gen_random_uuid();
  v_doc_a UUID := gen_random_uuid();
  v_doc_b UUID := gen_random_uuid();
  v_count INT;
  v_rows_affected INT;
  v_log_result UUID;
  v_caught boolean;
  v_err_msg text;
BEGIN
  -- Crear instituciones A y B
  INSERT INTO public.institutions (id, name, slug, is_active)
  VALUES (v_inst_a, 'Colegio A Pruebas', 'col-a-' || substr(gen_random_uuid()::text, 1, 8), true),
         (v_inst_b, 'Colegio B Pruebas', 'col-b-' || substr(gen_random_uuid()::text, 1, 8), true);

  -- Crear usuarios temporales en auth.users para satisfacer la FK de institution_memberships
  INSERT INTO auth.users (id, aud, role, email)
  VALUES (v_user_rector_a, 'authenticated', 'authenticated', 'rec_a_' || substr(gen_random_uuid()::text, 1, 8) || '@test.com'),
         (v_user_rector_b, 'authenticated', 'authenticated', 'rec_b_' || substr(gen_random_uuid()::text, 1, 8) || '@test.com'),
         (v_user_no_membership, 'authenticated', 'authenticated', 'no_mem_' || substr(gen_random_uuid()::text, 1, 8) || '@test.com');

  -- Crear membresías
  INSERT INTO public.institution_memberships (institution_id, user_id, role, is_default)
  VALUES (v_inst_a, v_user_rector_a, 'rector'::public.user_role_enum, true),
         (v_inst_b, v_user_rector_b, 'rector'::public.user_role_enum, true);

  -- Crear estudiantes en A y B
  INSERT INTO public.students (id, institution_id, full_name)
  VALUES (v_student_a, v_inst_a, 'Estudiante Colegio A'),
         (v_student_b, v_inst_b, 'Estudiante Colegio B');

  -- Resolver tipo documental global y crear tipo documental exclusivo de Colegio B
  SELECT id INTO v_doc_type_global FROM public.document_types WHERE code = 'IDENTITY_CARD' AND institution_id IS NULL LIMIT 1;

  INSERT INTO public.document_types (id, institution_id, code, name, category, is_sensitive, requires_consent, allowed_roles)
  VALUES (v_doc_type_tenant_b, v_inst_b, 'CARNET_B', 'Carnet Propio B', 'IDENTIFICATION', true, false, ARRAY['rector'::text]);

  -- Crear documentos de prueba
  INSERT INTO public.student_documents (id, institution_id, student_id, document_type_id, storage_path, original_filename, mime_type, size_bytes)
  VALUES (v_doc_a, v_inst_a, v_student_a, v_doc_type_global, 'inst_a/doc_a.pdf', 'doc_a.pdf', 'application/pdf', 1024),
         (v_doc_b, v_inst_b, v_student_b, v_doc_type_global, 'inst_b/doc_b.pdf', 'doc_b.pdf', 'application/pdf', 1024);

  -- TEST B: Integridad Física Compuesta — Vincular student_b con institution_a
  v_caught := false;
  BEGIN
    INSERT INTO public.student_documents (institution_id, student_id, document_type_id, storage_path, original_filename, mime_type, size_bytes)
    VALUES (v_inst_a, v_student_b, v_doc_type_global, 'hack/doc.pdf', 'doc.pdf', 'application/pdf', 500);
  EXCEPTION WHEN foreign_key_violation THEN
    v_caught := true;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL TEST B: Clave foranea compuesta permitio asociar alumno ajeno al tenant';
  END IF;

  -- TEST J: Trigger check_document_type_tenant_match — Doc en tenant A con tipo de tenant B
  v_caught := false;
  v_err_msg := NULL;
  BEGIN
    INSERT INTO public.student_documents (institution_id, student_id, document_type_id, storage_path, original_filename, mime_type, size_bytes)
    VALUES (v_inst_a, v_student_a, v_doc_type_tenant_b, 'hack/type.pdf', 'type.pdf', 'application/pdf', 500);
  EXCEPTION WHEN OTHERS THEN
    v_err_msg := SQLERRM;
    IF SQLERRM LIKE '%Mapeo documental invalido: el tipo documental pertenece a otra institucion%' THEN
      v_caught := true;
    END IF;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL TEST J: Se permitio asociar un document_type_id privado de otra institucion. Error: %', COALESCE(v_err_msg, 'Ninguno');
  END IF;

  -- Configurar contexto de ejecución RLS para authenticated (Rector de Colegio A)
  PERFORM set_config('request.jwt.claim.sub', v_user_rector_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_rector_a::text, 'institution_id', v_inst_a::text)::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  -- TEST A: Ejecución real de SELECT bajo contexto de Colegio A sobre documento de Colegio B
  SELECT count(*) INTO v_count FROM public.student_documents sd WHERE sd.id = v_doc_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL TEST A: RLS permitio ver documento de Colegio B (filas encontradas: %)', v_count;
  END IF;

  -- TEST H: Ejecución real de SELECT sobre su propio documento (Colegio A)
  SELECT count(*) INTO v_count FROM public.student_documents sd WHERE sd.id = v_doc_a;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL TEST H: RLS impidio al rector leer documento de su propio tenant';
  END IF;

  -- TEST C: Ejecución real de UPDATE bajo contexto de Colegio A sobre documento de Colegio B
  UPDATE public.student_documents sd SET is_active = false WHERE sd.id = v_doc_b;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected <> 0 THEN
    RAISE EXCEPTION 'FAIL TEST C: RLS permitio modificar documento de Colegio B (filas: %)', v_rows_affected;
  END IF;

  EXECUTE 'RESET ROLE';

  -- TEST D: RPC con student_id de Colegio B desde sesión de Colegio A
  PERFORM set_config('request.jwt.claim.sub', v_user_rector_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_rector_a::text, 'institution_id', v_inst_a::text)::text, true);

  v_caught := false;
  v_err_msg := NULL;
  BEGIN
    PERFORM public.log_sensitive_document_access(
      p_student_id := v_student_b, p_document_id := NULL,
      p_action := 'VIEW', p_document_type := 'IDENTITY_CARD', p_success := true
    );
  EXCEPTION WHEN OTHERS THEN
    v_err_msg := SQLERRM;
    IF SQLERRM LIKE '%Violacion de frontera tenant: el estudiante no existe o pertenece a otra institucion%' THEN
      v_caught := true;
    END IF;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL TEST D: La RPC no aborto al recibir un estudiante de otra institucion. Error: %', COALESCE(v_err_msg, 'Ninguno');
  END IF;

  -- TEST E: RPC con document_id de Colegio B desde sesión de Colegio A
  v_caught := false;
  v_err_msg := NULL;
  BEGIN
    PERFORM public.log_sensitive_document_access(
      p_student_id := v_student_a, p_document_id := v_doc_b,
      p_action := 'VIEW', p_document_type := 'IDENTITY_CARD', p_success := true
    );
  EXCEPTION WHEN OTHERS THEN
    v_err_msg := SQLERRM;
    IF SQLERRM LIKE '%Violacion de frontera tenant: el documento pertenece a otra institucion%' THEN
      v_caught := true;
    END IF;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL TEST E: La RPC no aborto al recibir un documento perteneciente a otra institucion. Error: %', COALESCE(v_err_msg, 'Ninguno');
  END IF;

  -- TEST F: RPC legítima dentro de Colegio A (student_a y doc_a)
  v_log_result := public.log_sensitive_document_access(
    p_student_id := v_student_a, p_document_id := v_doc_a,
    p_action := 'VIEW', p_document_type := 'IDENTITY_CARD', p_success := true, p_ip_address := '127.0.0.1'
  );
  IF v_log_result IS NULL THEN
    RAISE EXCEPTION 'FAIL TEST F: La RPC no genero ID de auditoria para operacion legitima';
  END IF;

  -- TEST I: Usuario autenticado SIN membresía en la institución
  PERFORM set_config('request.jwt.claim.sub', v_user_no_membership::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_no_membership::text, 'institution_id', v_inst_a::text)::text, true);

  v_caught := false;
  v_err_msg := NULL;
  BEGIN
    PERFORM public.log_sensitive_document_access(
      p_student_id := v_student_a, p_document_id := v_doc_a,
      p_action := 'VIEW', p_document_type := 'IDENTITY_CARD', p_success := true
    );
  EXCEPTION WHEN OTHERS THEN
    v_err_msg := SQLERRM;
    IF SQLERRM LIKE '%Acceso no autorizado: el usuario no posee una membresia activa en la institucion%'
       OR SQLERRM LIKE '%Aislamiento tenant: no se identifico una institucion valida en la sesion%' THEN
      v_caught := true;
    END IF;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL TEST I: La RPC permitio acceso a usuario autenticado sin membresia activa. Error recibido: %', COALESCE(v_err_msg, 'Ninguno');
  END IF;

  -- TEST G: Sesión desautenticada (anónimo)
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '', true);

  v_caught := false;
  v_err_msg := NULL;
  BEGIN
    PERFORM public.log_sensitive_document_access(
      p_student_id := v_student_a, p_document_id := v_doc_a,
      p_action := 'VIEW', p_document_type := 'IDENTITY_CARD', p_success := true
    );
  EXCEPTION WHEN OTHERS THEN
    v_err_msg := SQLERRM;
    IF SQLERRM LIKE '%Acceso no autorizado: sesion JWT requerida%'
       OR SQLERRM LIKE '%sesion JWT%' THEN
      v_caught := true;
    END IF;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL TEST G: La RPC permitio llamada sin sesion JWT. Error recibido: %', COALESCE(v_err_msg, 'Ninguno');
  END IF;

  RAISE NOTICE 'SUCCESS: Pruebas transaccionales A, B, C, D, E, F, G, H, I y J verificadas.';
END;
$integration_suite$;

ROLLBACK;
