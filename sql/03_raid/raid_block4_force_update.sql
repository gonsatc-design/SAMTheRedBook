-- 🔥 RAID BLOCK 4: FORCE UPDATE - Versión que DEFINITIVAMENTE funciona
-- Este script REEMPLAZA completamente las funciones antiguas

BEGIN;

-- 1. BORRAR TODAS LAS FUNCIONES VIEJAS (para evitar conflictos)
DROP FUNCTION IF EXISTS _internal_apply_damage(UUID, BIGINT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS grant_victory_rewards() CASCADE;
DROP FUNCTION IF EXISTS process_sacrifice(UUID, TEXT, BIGINT, BIGINT) CASCADE;
DROP FUNCTION IF EXISTS register_raid_damage(UUID, UUID[]) CASCADE;

-- 2. CREAR DESDE CERO (sin conflictos de versión)

-- ============================================================================
-- FUNCIÓN 1: _internal_apply_damage (CORE LOGIC)
-- ============================================================================

CREATE FUNCTION _internal_apply_damage(
    p_user_id UUID,
    p_damage BIGINT,
    p_type TEXT DEFAULT 'task'
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows_affected BIGINT := 0;
  v_user_email TEXT;
  v_hp_after BIGINT;
BEGIN
  -- ACTUALIZAR HP DEL JEFE MUNDIAL
  UPDATE public.world_events
  SET current_hp = GREATEST(0, COALESCE(current_hp, max_hp) - p_damage)
  WHERE is_active = true
  RETURNING current_hp INTO v_hp_after;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  -- REGISTRAR EN LOG
  IF v_rows_affected > 0 THEN
    BEGIN
      SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
      EXCEPTION WHEN OTHERS THEN
        v_user_email := 'unknown@realm.com';
    END;
    
    INSERT INTO public.raid_logs (user_id, user_email, damage, type, created_at)
    VALUES (p_user_id, COALESCE(SPLIT_PART(v_user_email, '@', 1), 'unknown'), p_damage, p_type, now());
    
    -- CHEQUEO DE VICTORIA
    IF v_hp_after = 0 THEN
       PERFORM grant_victory_rewards();
    END IF;
  END IF;

  RETURN v_rows_affected;
END;
$$;

-- ============================================================================
-- FUNCIÓN 2: grant_victory_rewards (RECOMPENSAS)
-- ============================================================================

CREATE FUNCTION grant_victory_rewards()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant RECORD;
  v_rare_materials TEXT[] := ARRAY['Mithril', 'Acero de Gondor', 'Telas Elficas', 'Fragmento de Narsil'];
  v_material TEXT;
  v_count INT;
BEGIN
  FOR v_participant IN (SELECT DISTINCT user_id FROM public.raid_logs LIMIT 100) 
  LOOP
    FOR v_count IN 1..3 LOOP
      v_material := v_rare_materials[ceil(random() * 4)::INT];
      
      INSERT INTO public.inventory (user_id, item_name, rarity, category_context)
      VALUES (v_participant.user_id, v_material, 'Raro', 'victory_reward')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
  
  UPDATE public.world_events SET is_active = false WHERE current_hp = 0;
END;
$$;

-- ============================================================================
-- FUNCIÓN 3: process_sacrifice (SACRIFICIO HEROICO)
-- ============================================================================

CREATE FUNCTION process_sacrifice(
  p_user_id UUID,
  p_type TEXT,
  p_amount BIGINT,
  p_damage BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_gold BIGINT := 0;
  v_rows_affected BIGINT;
BEGIN
  -- DEDUCIR RECURSOS
  IF p_type = 'gold' THEN
    SELECT gold INTO v_current_gold FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    
    IF v_current_gold < p_amount THEN
      RETURN json_build_object('success', false, 'error', 'Oro insuficiente.');
    END IF;
    
    UPDATE public.profiles SET gold = gold - p_amount WHERE id = p_user_id;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Tipo debe ser gold');
  END IF;

  -- APLICAR DAÑO AL JEFE
  v_rows_affected := _internal_apply_damage(p_user_id, p_damage, 'sacrifice');

  IF v_rows_affected = 0 THEN
     RETURN json_build_object('success', false, 'error', 'No hay un jefe activo.');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Sacrificio aceptado!');
END;
$$;

-- ============================================================================
-- FUNCIÓN 4: register_raid_damage (DAÑO DE TAREAS)
-- ============================================================================

CREATE FUNCTION register_raid_damage(
    p_user_id UUID,
    p_task_ids UUID[]
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_damage BIGINT := 0;
    v_task_id UUID;
BEGIN
    -- Daño simple: 1 HP por tarea
    FOREACH v_task_id IN ARRAY p_task_ids
    LOOP
        v_total_damage := v_total_damage + 1;
    END LOOP;

    PERFORM _internal_apply_damage(p_user_id, v_total_damage, 'task');

    RETURN v_total_damage;
END;
$$;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN: Las funciones están creadas
-- ============================================================================

SELECT 
  routine_name, 
  routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('_internal_apply_damage', 'process_sacrifice', 'grant_victory_rewards', 'register_raid_damage')
ORDER BY routine_name;
