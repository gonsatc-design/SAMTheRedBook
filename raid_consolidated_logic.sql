-- RAID PROTOCOL - CONSOLIDATED DAMAGE & SACRIFICE
-- Centraliza todo el daño en una única lógica para evitar inconsistencias.

-- 1. Función interna de daño (Baja nivel de abstracción)
CREATE OR REPLACE FUNCTION _internal_apply_damage(p_damage BIGINT)
RETURNS BIGINT AS $$
DECLARE
  v_rows_affected BIGINT;
BEGIN
  UPDATE public.world_events
  SET current_hp = GREATEST(0, COALESCE(current_hp, max_hp) - p_damage)
  WHERE is_active = true;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  RETURN v_rows_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Refactor de register_raid_damage
CREATE OR REPLACE FUNCTION register_raid_damage(
  p_user_id UUID,
  p_task_ids UUID[]
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_class_multiplier NUMERIC;
  v_total_difficulty INT;
  v_total_damage BIGINT;
BEGIN
  SELECT COALESCE(class_multiplier, 1.0) INTO v_class_multiplier FROM public.profiles WHERE id = p_user_id;
  
  SELECT COALESCE(SUM(COALESCE(difficulty, 1)), 0) INTO v_total_difficulty
  FROM public.tasks WHERE id = ANY(p_task_ids) AND user_id = p_user_id;

  v_total_damage := ROUND(v_total_difficulty * v_class_multiplier);
  
  PERFORM _internal_apply_damage(v_total_damage);
  
  RETURN v_total_damage;
END;
$$;

-- 3. Refactor de process_sacrifice
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
      RETURN json_build_object('success', false, 'error', 'El sacrificio bajaría tu nivel.');
    END IF;
    UPDATE public.profiles SET experience = v_new_xp WHERE id = p_user_id;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Tipo inválido.');
  END IF;

  -- Aplicar daño y registrar cuántas filas se actualizaron
  v_rows_affected := _internal_apply_damage(p_damage);

  IF v_rows_affected = 0 THEN
     -- Si no hay jefe activo, revertimos? No, mejor avisar.
     RETURN json_build_object('success', false, 'error', 'No hay un jefe activo al que dañar.');
  END IF;

  -- Registrar logro
  UPDATE public.profiles 
  SET achievements = achievements || jsonb_build_object('type', 'sacrifice', 'res', p_type, 'amt', p_amount, 'ts', now())
  WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', '¡Sacrificio aceptado!');
END;
$$;
