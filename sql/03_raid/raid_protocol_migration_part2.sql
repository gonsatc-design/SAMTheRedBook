-- 1. Ampliar profiles con estadísticas RPG si no existen (ROBUSTO)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience BIGINT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gold BIGINT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]'::jsonb;

-- Asegurar que no hay nulos
UPDATE profiles SET experience = 0 WHERE experience IS NULL;
UPDATE profiles SET gold = 0 WHERE gold IS NULL;
UPDATE profiles SET level = 1 WHERE level IS NULL;
UPDATE profiles SET achievements = '[]'::jsonb WHERE achievements IS NULL;

ALTER TABLE profiles ALTER COLUMN experience SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN gold SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN level SET NOT NULL;

-- 2. Función para procesar el sacrificio de recursos
CREATE OR REPLACE FUNCTION process_sacrifice(
  p_user_id UUID,
  p_type TEXT, -- 'xp' or 'gold'
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
  v_new_gold BIGINT;
  v_min_xp_for_level BIGINT;
BEGIN
  -- Obtener estado actual (Bloqueo forzado para evitar race conditions)
  SELECT experience, gold, level INTO v_current_xp, v_current_gold, v_current_level
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Perfil no encontrado. ¿Has jurado lealtad?');
  END IF;

  IF p_type = 'gold' THEN
    IF v_current_gold < p_amount THEN
      RETURN json_build_object('success', false, 'error', 'Oro insuficiente para este sacrificio.');
    END IF;
    
    UPDATE profiles 
    SET gold = gold - p_amount,
        achievements = achievements || jsonb_build_object('type', 'sacrifice', 'resource', 'gold', 'amount', p_amount, 'date', now())
    WHERE id = p_user_id;
    
  ELSIF p_type = 'xp' THEN
    IF v_current_xp < p_amount THEN
      RETURN json_build_object('success', false, 'error', 'Experiencia insuficiente.');
    END IF;

    -- Validación de nivel: No puede bajar de nivel
    -- Umbral simple: cada nivel son 1000 XP
    v_min_xp_for_level := (v_current_level - 1) * 1000;
    v_new_xp := v_current_xp - p_amount;

    IF v_new_xp < v_min_xp_for_level THEN
      RETURN json_build_object('success', false, 'error', 'El sacrificio es demasiado grande; perderías tu nivel actual.');
    END IF;

    UPDATE profiles 
    SET experience = v_new_xp,
        achievements = achievements || jsonb_build_object('type', 'sacrifice', 'resource', 'xp', 'amount', p_amount, 'date', now())
    WHERE id = p_user_id;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Tipo de sacrificio no válido.');
  END IF;

  -- Aplicar daño al jefe global (Asegurando que current_hp sea numérico)
  UPDATE world_events
  SET current_hp = GREATEST(0, COALESCE(current_hp, max_hp) - p_damage)
  WHERE is_active = true;

  RETURN json_build_object('success', true, 'message', '¡Sacrificio aceptado! El enemigo retrocede ante tu valor.');
END;
$$;
