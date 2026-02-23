-- FIX: register_raid_damage and metadata column
-- Let's ensure 'metadata' exists in 'tasks' or simplify the RPC

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='metadata') THEN
        ALTER TABLE public.tasks ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Update the RPC to be more robust
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
    -- 1. Obtener multiplicador de clase del usuario (UNA SOLA VEZ)
    SELECT COALESCE(class_multiplier, 1.0) INTO v_class_mult
    FROM public.profiles WHERE id = p_user_id;

    -- 2. Iterar sobre tareas
    FOREACH v_task_id IN ARRAY p_task_ids
    LOOP
        -- Obtener dificultad de la tarea (si no hay metadata, asumimos 1)
        SELECT COALESCE((metadata->>'difficulty')::INT, 1) INTO v_difficulty
        FROM public.tasks WHERE id = v_task_id;
        
        -- Calcular daño: Dificultad × Multiplicador de Clase
        v_task_damage := GREATEST(1, (v_difficulty * v_class_mult)::BIGINT);
        v_total_damage := v_total_damage + v_task_damage;
    END LOOP;

    -- 3. Aplicar el daño total en una sola transacción atómica
    IF v_total_damage > 0 THEN
        PERFORM _internal_apply_damage(p_user_id, v_total_damage, 'task');
    END IF;

    RETURN v_total_damage;
END;
$$;
