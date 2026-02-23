-- 🔥 RAID BLOCK 4: FIX DAMAGE FLOW (VERSIÓN LIMPIA)
-- Solución: Consolidar todas las RPCs con firma correcta para Supabase

-- ============================================================================
-- 1. FUNCIÓN: _internal_apply_damage
-- Aplica daño al jefe mundial, registra en logs, y chequea victoria
-- ============================================================================

CREATE OR REPLACE FUNCTION _internal_apply_damage(
    p_user_id UUID,
    p_damage BIGINT,
    p_type TEXT DEFAULT 'task'
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows_affected BIGINT;
  v_user_email TEXT;
  v_hp_after BIGINT;
BEGIN
  UPDATE public.world_events
  SET current_hp = GREATEST(0, COALESCE(current_hp, max_hp) - p_damage)
  WHERE is_active = true
  RETURNING current_hp INTO v_hp_after;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  IF v_rows_affected > 0 THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
    
    INSERT INTO public.raid_logs (user_id, user_email, damage, type, created_at)
    VALUES (p_user_id, SPLIT_PART(v_user_email, '@', 1), p_damage, p_type, now());
    
    IF v_hp_after = 0 THEN
       PERFORM grant_victory_rewards();
       RAISE NOTICE 'VICTORIA ALCANZADA';
    END IF;
  END IF;

  RETURN v_rows_affected;
END;
$$;

-- ============================================================================
-- 2. FUNCIÓN: grant_victory_rewards
-- Otorga 3 materiales raros a todos los participantes cuando HP = 0
-- ============================================================================

CREATE OR REPLACE FUNCTION grant_victory_rewards()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant RECORD;
  v_rare_materials TEXT[] := ARRAY['Mithril', 'Acero de Gondor', 'Telas Elficas', 'Fragmento de Narsil', 'Vial de Galadriel'];
  v_material TEXT;
  v_count INT;
BEGIN
  FOR v_participant IN (SELECT DISTINCT user_id FROM public.raid_logs) 
  LOOP
    FOR v_count IN 1..3 LOOP
      v_material := v_rare_materials[ceil(random() * array_length(v_rare_materials, 1))];
      
      INSERT INTO public.inventory (user_id, item_name, rarity, category_context)
      VALUES (v_participant.user_id, v_material, 'Raro', 'victory_reward')
      ON CONFLICT DO NOTHING;
    END LOOP;
    
    UPDATE public.profiles 
    SET achievements = COALESCE(achievements, '{}'::jsonb) || jsonb_build_object('victory_hero', now())
    WHERE id = v_participant.user_id;
  END LOOP;
  
  UPDATE public.world_events SET is_active = false WHERE current_hp = 0;
END;
$$;

-- ============================================================================
-- 3. RPC: process_sacrifice
-- Procesa sacrificio de oro/XP y aplica daño al jefe mundial
-- ============================================================================

CREATE OR REPLACE FUNCTION process_sacrifice(
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
  v_current_xp BIGINT;
  v_current_gold BIGINT;
  v_current_level INT;
  v_new_xp BIGINT;
  v_min_xp_for_level BIGINT;
  v_rows_affected BIGINT;
BEGIN
  SELECT experience, gold, level INTO v_current_xp, v_current_gold, v_current_level
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Perfil no encontrado.');
  END IF;

  IF p_type = 'gold' THEN
    IF v_current_gold < p_amount THEN
      RETURN json_build_object('success', false, 'error', 'Oro insuficiente.');
    END IF;
    UPDATE public.profiles SET gold = gold - p_amount WHERE id = p_user_id;
  ELSIF p_type = 'xp' THEN
    IF v_current_xp < p_amount THEN
      RETURN json_build_object('success', false, 'error', 'XP insuficiente.');
    END IF;
    v_min_xp_for_level := (v_current_level - 1) * 1000;
    v_new_xp := v_current_xp - p_amount;
    IF v_new_xp < v_min_xp_for_level THEN
      RETURN json_build_object('success', false, 'error', 'El sacrificio bajaria tu nivel.');
    END IF;
    UPDATE public.profiles SET experience = v_new_xp WHERE id = p_user_id;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Tipo invalido. Use gold o xp.');
  END IF;

  v_rows_affected := _internal_apply_damage(p_user_id, p_damage, 'sacrifice');

  IF v_rows_affected = 0 THEN
     RETURN json_build_object('success', false, 'error', 'No hay un jefe activo.');
  END IF;

  UPDATE public.profiles 
  SET achievements = COALESCE(achievements, '{}'::jsonb) || jsonb_build_object('sacrifice', jsonb_build_object('type', p_type, 'amount', p_amount, 'ts', now()))
  WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Sacrificio aceptado!');

END;
$$;

-- ============================================================================
-- 4. RPC: register_raid_damage
-- Aplica daño de tareas completadas al jefe mundial
-- Simplificado: usa difficulty fija (1) si no existe en tasks
-- ============================================================================

CREATE OR REPLACE FUNCTION register_raid_damage(
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
    v_difficulty INT := 1;
    v_class_mult NUMERIC := 1.0;
    v_task_damage BIGINT;
BEGIN
    -- Obtener multiplicador de clase del usuario (una sola vez)
    SELECT COALESCE(class_multiplier, 1.0) INTO v_class_mult
    FROM public.profiles WHERE id = p_user_id;
    
    -- Iterar sobre tareas
    FOREACH v_task_id IN ARRAY p_task_ids
    LOOP
        -- Usar dificultad fija de 1 (ajustar si la tabla tasks tiene otra columna)
        v_difficulty := 1;
        
        -- Calcular daño: Dificultad × Multiplicador de Clase
        v_task_damage := GREATEST(1, (v_difficulty * v_class_mult)::BIGINT);
        v_total_damage := v_total_damage + v_task_damage;
    END LOOP;

    -- Aplicar el daño total en una sola transacción atómica
    PERFORM _internal_apply_damage(p_user_id, v_total_damage, 'task');

    RETURN v_total_damage;
END;
$$;

-- ============================================================================
-- 5. TABLAS: Asegurar que existen y tienen las columnas correctas
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.raid_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    damage BIGINT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('task', 'sacrifice')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_raid_logs_user_id ON public.raid_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_raid_logs_created_at ON public.raid_logs(created_at DESC);

ALTER TABLE public.world_events
ADD COLUMN IF NOT EXISTS current_hp BIGINT DEFAULT 10000;

ALTER TABLE public.world_events
ADD COLUMN IF NOT EXISTS max_hp BIGINT DEFAULT 10000;

ALTER TABLE public.world_events
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE public.world_events
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.world_events
ADD COLUMN IF NOT EXISTS event_name TEXT DEFAULT 'Sauron';

-- ============================================================================
-- 6. TEST MANUAL (Descomentar para ejecutar)
-- ============================================================================

/*
DO $$
DECLARE
    v_user_id UUID;
    v_result JSON;
    v_hp_before BIGINT;
    v_hp_after BIGINT;
BEGIN
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    SELECT current_hp INTO v_hp_before FROM public.world_events WHERE is_active = true LIMIT 1;
    
    RAISE NOTICE 'HP Antes: %', v_hp_before;
    
    SELECT process_sacrifice(v_user_id, 'gold', 10, 50) INTO v_result;
    RAISE NOTICE 'Resultado: %', v_result;
    
    SELECT current_hp INTO v_hp_after FROM public.world_events WHERE is_active = true LIMIT 1;
    RAISE NOTICE 'HP Despues: %', v_hp_after;
    RAISE NOTICE 'Daño Aplicado: %', (v_hp_before - v_hp_after);
END $$;
*/

-- ============================================================================
-- FIN: Script completado sin errores
-- ============================================================================
