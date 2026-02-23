-- RAID PROTOCOL - ROBUST DAMAGE RPC
-- Este script centraliza la lógica de daño para evitar problemas de caché de esquema en el cliente Node.

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
  -- 1. Obtener multiplicador de clase del perfil
  SELECT COALESCE(class_multiplier, 1.0) INTO v_class_multiplier
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    v_class_multiplier := 1.0;
  END IF;

  -- 2. Sumar dificultad de las tareas especificadas
  SELECT COALESCE(SUM(COALESCE(difficulty, 1)), 0) INTO v_total_difficulty
  FROM tasks
  WHERE id = ANY(p_task_ids)
  AND user_id = p_user_id;

  -- 3. Calcular daño
  v_total_damage := ROUND(v_total_difficulty * v_class_multiplier);

  -- 4. Aplicar daño atómico al jefe activo
  UPDATE world_events
  SET current_hp = GREATEST(0, COALESCE(current_hp, max_hp) - v_total_damage)
  WHERE is_active = true;

  RETURN v_total_damage;
END;
$$;
