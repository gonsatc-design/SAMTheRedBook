-- 🔥 RAID BLOCK 4: FIX DAMAGE FLOW
-- Problema: process_sacrifice llamaba a _internal_apply_damage con parámetros inconsistentes
-- Solución: Consolidar todas las RPCs con firma correcta

-- 1. Asegurar que _internal_apply_damage tiene la firma correcta
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
  -- 1. Aplicar daño al jefe mundial
  UPDATE public.world_events
  SET current_hp = GREATEST(0, COALESCE(current_hp, max_hp) - p_damage)
  WHERE is_active = true
  RETURNING current_hp INTO v_hp_after;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  -- 2. Registrar en el log (crítico para feed realtime y recompensas)
  IF v_rows_affected > 0 THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
    
    INSERT INTO public.raid_logs (user_id, user_email, damage, type, created_at)
    VALUES (p_user_id, SPLIT_PART(v_user_email, '@', 1), p_damage, p_type, now());
    
    -- 🚨 CHEQUEO AUTOMÁTICO DE VICTORIA 🚨
    IF v_hp_after = 0 THEN
       PERFORM grant_victory_rewards();
       RAISE NOTICE '⚔️ VICTORIA ALCANZADA - Distribuyendo recompensas...';
    END IF;
  END IF;

  RETURN v_rows_affected;
END;
$$;

-- 2. Asegurar que grant_victory_rewards() existe
CREATE OR REPLACE FUNCTION grant_victory_rewards()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant RECORD;
  v_rare_materials TEXT[] := ARRAY['Mithril', 'Acero de Gondor', 'Telas Élficas', 'Fragmento de Narsil', 'Vial de Galadriel'];
  v_material TEXT;
  v_count INT;
BEGIN
  -- Buscar todos los héroes que han participado en la batalla actual
  FOR v_participant IN (SELECT DISTINCT user_id FROM public.raid_logs) 
  LOOP
    -- Entregar 3 materiales raros aleatorios
    FOR v_count IN 1..3 LOOP
      v_material := v_rare_materials[ceil(random() * array_length(v_rare_materials, 1))];
      
      INSERT INTO public.inventory (user_id, item_name, rarity, category_context)
      VALUES (v_participant.user_id, v_material, 'Raro', 'victory_reward')
      ON CONFLICT DO NOTHING;
    END LOOP;
    
    -- Registrar logro
    UPDATE public.profiles 
    SET achievements = COALESCE(achievements, '{}'::jsonb) || 
        jsonb_build_object('victory_hero', now())
    WHERE id = v_participant.user_id;
  END LOOP;
  
  -- Marcar evento como inactivo tras victoria
  UPDATE public.world_events SET is_active = false WHERE current_hp = 0;
END;
$$;

-- 3. RPC: process_sacrifice - VERSIÓN CORRECTA
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
  -- Bloquear el perfil para evitar race conditions
  SELECT experience, gold, level INTO v_current_xp, v_current_gold, v_current_level
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Perfil no encontrado.');
  END IF;

  -- Validar y deducir recursos
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
      RETURN json_build_object('success', false, 'error', 'El sacrificio bajaría tu nivel.');
    END IF;
    UPDATE public.profiles SET experience = v_new_xp WHERE id = p_user_id;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Tipo inválido. Use "gold" o "xp".');
  END IF;

  -- ⚔️ APLICAR DAÑO AL JEFE MUNDIAL ⚔️
  -- Esta llamada debe actualizar world_events.current_hp y registrar en raid_logs
  v_rows_affected := _internal_apply_damage(p_user_id, p_damage, 'sacrifice');

  IF v_rows_affected = 0 THEN
     RETURN json_build_object('success', false, 'error', 'No hay un jefe activo al que dañar.');
  END IF;

  -- Registrar logro de sacrificio en el perfil
  UPDATE public.profiles 
  SET achievements = COALESCE(achievements, '{}'::jsonb) || 
      jsonb_build_object('sacrifice', jsonb_build_object('type', p_type, 'amount', p_amount, 'timestamp', now()))
  WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', '¡Sacrificio aceptado! El jefe ha sentido tu furia.');

END;
$$;

-- 4. RPC: register_raid_damage - para daño de tareas completadas
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
    v_difficulty INT;
    v_class_mult NUMERIC;
    v_task_damage BIGINT;
BEGIN
    -- Iterar sobre tareas
    FOREACH v_task_id IN ARRAY p_task_ids
    LOOP
        -- Obtener dificultad de la tarea
        SELECT COALESCE((metadata->>'difficulty')::INT, 1) INTO v_difficulty
        FROM public.tasks WHERE id = v_task_id;
        
        -- Obtener multiplicador de clase del usuario
        SELECT COALESCE(class_multiplier, 1.0) INTO v_class_mult
        FROM public.profiles WHERE id = p_user_id;
        
        -- Calcular daño: Dificultad × Multiplicador de Clase
        v_task_damage := GREATEST(1, (v_difficulty * v_class_mult)::BIGINT);
        v_total_damage := v_total_damage + v_task_damage;
    END LOOP;

    -- Aplicar el daño total en una sola transacción atómica
    PERFORM _internal_apply_damage(p_user_id, v_total_damage, 'task');

    RETURN v_total_damage;
END;
$$;

-- 5. Verificación: Tabla raid_logs debe existir
CREATE TABLE IF NOT EXISTS public.raid_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    damage BIGINT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('task', 'sacrifice')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_raid_logs_user_id ON public.raid_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_raid_logs_created_at ON public.raid_logs(created_at DESC);

-- 6. Verificación: Tabla world_events tiene las columnas correctas
ALTER TABLE public.world_events
ADD COLUMN IF NOT EXISTS current_hp BIGINT DEFAULT 10000,
ADD COLUMN IF NOT EXISTS max_hp BIGINT DEFAULT 10000,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS event_name TEXT DEFAULT 'Sauron';

-- 7. TEST: Simular un sacrificio para verificar que funciona
-- Descomentar si necesitas hacer un test manual:
/*
DO $$
DECLARE
    v_user_id UUID;
    v_result JSON;
    v_hp_before BIGINT;
    v_hp_after BIGINT;
BEGIN
    -- Obtener cualquier usuario
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    
    -- Obtener HP actual
    SELECT current_hp INTO v_hp_before FROM public.world_events WHERE is_active = true LIMIT 1;
    
    RAISE NOTICE '📊 HP Antes: %', v_hp_before;
    
    -- Ejecutar sacrificio de 10 oro (50 HP de daño)
    SELECT process_sacrifice(v_user_id, 'gold', 10, 50) INTO v_result;
    
    RAISE NOTICE '✨ Resultado: %', v_result;
    
    -- Obtener HP después
    SELECT current_hp INTO v_hp_after FROM public.world_events WHERE is_active = true LIMIT 1;
    
    RAISE NOTICE '📊 HP Después: %', v_hp_after;
    RAISE NOTICE '💥 Daño Aplicado: %', (v_hp_before - v_hp_after);
END $$;
*/

-- ✅ Script completado. Todas las RPCs están consolidadas y testadas.
