-- RAID PROTOCOL MIGRATION - PART 3
-- 🔥 BLOQUE 3: EL HUD DE GUERRA Y EL FEED DE BATALLA

-- 1. Crear tabla de logs de incursión para el Battle Feed
CREATE TABLE IF NOT EXISTS public.raid_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    user_email TEXT, -- Para mostrar en el feed sin joins costosos
    event_id UUID REFERENCES public.world_events(id),
    damage BIGINT NOT NULL,
    type TEXT DEFAULT 'task', -- 'task' or 'sacrifice'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.raid_logs ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden ver los logs de la batalla
CREATE POLICY "Public raid logs" ON public.raid_logs FOR SELECT USING (true);

-- 2. Añadir fecha de expiración al jefe mundial
ALTER TABLE public.world_events ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Actualizar el evento actual con una expiración de 24h desde ahora (para el demo)
UPDATE public.world_events 
SET expires_at = now() + interval '24 hours' 
WHERE is_active = true AND expires_at IS NULL;

-- 3. Actualizar funciones de daño para registrar en raid_logs
-- Refactorizamos _internal_apply_damage para que reciba también el usuario y tipo
CREATE OR REPLACE FUNCTION _internal_apply_damage(
    p_user_id UUID,
    p_damage BIGINT,
    p_type TEXT DEFAULT 'task'
)
RETURNS BIGINT AS $$
DECLARE
  v_rows_affected BIGINT;
  v_user_email TEXT;
BEGIN
  -- 1. Aplicar daño
  UPDATE public.world_events
  SET current_hp = GREATEST(0, COALESCE(current_hp, max_hp) - p_damage)
  WHERE is_active = true;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  -- 2. Si se hizo daño, registrar en el log
  IF v_rows_affected > 0 THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
    
    INSERT INTO public.raid_logs (user_id, user_email, damage, type, created_at)
    VALUES (p_user_id, SPLIT_PART(v_user_email, '@', 1), p_damage, p_type, now());
  END IF;

  RETURN v_rows_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ajustar register_raid_damage para usar la nueva firma
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
  
  PERFORM _internal_apply_damage(p_user_id, v_total_damage, 'task');
  
  RETURN v_total_damage;
END;
$$;

-- Ajustar process_sacrifice para usar la nueva firma
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

  -- Aplicar daño relacionalmente
  v_rows_affected := _internal_apply_damage(p_user_id, p_damage, 'sacrifice');

  IF v_rows_affected = 0 THEN
     RETURN json_build_object('success', false, 'error', 'No hay un jefe activo al que dañar.');
  END IF;

  RETURN json_build_object('success', true, 'message', '¡Sacrificio aceptado!');
END;
$$;
