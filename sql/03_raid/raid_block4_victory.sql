-- RAID PROTOCOL - BLOQUE 4: VICTORIA Y TEMPLADO
-- 🔥 Este script repara errores previos e implementa el sistema de recompensas automáticas.

-- 1. REPARACIÓN DE EMERGENCIA: Asegurar class_multiplier
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='class_multiplier') THEN
        ALTER TABLE public.profiles ADD COLUMN class_multiplier NUMERIC DEFAULT 1.0;
    END IF;
END $$;

-- 2. Sistema de Recompensas de Victoria
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
  -- Buscar todos los héroes que han participado en la batalla actual (logs)
  FOR v_participant IN (SELECT DISTINCT user_id FROM public.raid_logs) 
  LOOP
    -- Entregar 3 materiales raros aleatorios
    FOR v_count IN 1..3 LOOP
      v_material := v_rare_materials[ceil(random() * array_length(v_rare_materials, 1))];
      
      INSERT INTO public.inventory (user_id, item_name, rarity, category_context)
      VALUES (v_participant.user_id, v_material, 'Raro', 'victory_reward');
    END LOOP;
    
    -- Notificar logro (opcional, en achievements)
    UPDATE public.profiles 
    SET achievements = achievements || jsonb_build_object('type', 'victory', 'date', now(), 'event', 'Sauron Defeated')
    WHERE id = v_participant.user_id;
  END LOOP;
  
  -- Marcar evento como inactivo tras la victoria total (Opcional, ya lo hace el HP=0 conceptually)
  UPDATE public.world_events SET is_active = false WHERE current_hp = 0;
END;
$$;

-- 3. Actualizar _internal_apply_damage para disparar la victoria
CREATE OR REPLACE FUNCTION _internal_apply_damage(
    p_user_id UUID,
    p_damage BIGINT,
    p_type TEXT DEFAULT 'task'
)
RETURNS BIGINT AS $$
DECLARE
  v_rows_affected BIGINT;
  v_user_email TEXT;
  v_hp_after BIGINT;
BEGIN
  -- 1. Aplicar daño
  UPDATE public.world_events
  SET current_hp = GREATEST(0, COALESCE(current_hp, max_hp) - p_damage)
  WHERE is_active = true
  RETURNING current_hp INTO v_hp_after;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  -- 2. Registrar en el log
  IF v_rows_affected > 0 THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
    
    INSERT INTO public.raid_logs (user_id, user_email, damage, type, created_at)
    VALUES (p_user_id, SPLIT_PART(v_user_email, '@', 1), p_damage, p_type, now());
    
    -- 🚨 CHEQUEO DE VICTORIA 🚨
    IF v_hp_after = 0 THEN
       PERFORM grant_victory_rewards();
    END IF;
  END IF;

  RETURN v_rows_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
