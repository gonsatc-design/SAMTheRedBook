-- =============================================================================
-- =============================================================================
-- ==                                                                         ==
-- ==                      S.A.M. - THE RED BOOK                              ==
-- ==                      FINAL & CONSOLIDATED SCHEMA                        ==
-- ==                                                                         ==
-- =============================================================================
-- =============================================================================
-- Este script contiene el esquema completo y definitivo de la base de datos.
-- Ejecútalo en un entorno Supabase limpio para inicializar todo el sistema.
-- Orden de ejecución:
-- 1. Creación de Tablas
-- 2. Alteración y Adición de Columnas
-- 3. Creación de Funciones (RPCs)
-- 4. Definición de Políticas de Seguridad (RLS)
-- 5. Inserción de Datos Iniciales (Seeding)
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECCIÓN 1: CREACIÓN DE TABLAS
-- =============================================================================

-- Tabla de Perfiles de Usuario (RPG Core)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT DEFAULT NULL,
  
  -- RPG Stats
  level INTEGER DEFAULT 1 NOT NULL,
  experience BIGINT DEFAULT 0 NOT NULL,
  gold BIGINT DEFAULT 0 NOT NULL,
  
  -- Clase y Raza
  race TEXT DEFAULT 'Humanos',
  race_title TEXT DEFAULT 'Aventurero',
  user_class TEXT DEFAULT 'aventurero',
  class_multiplier NUMERIC DEFAULT 1.0,
  
  -- Logros y Timestamps
  achievements JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
COMMENT ON TABLE public.profiles IS 'Almacena todos los datos RPG y de personalización del usuario.';

-- Tabla de Tareas (Misiones)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    titulo_epico TEXT,
    descripcion TEXT,
    category TEXT DEFAULT 'otros',
    is_completed BOOLEAN DEFAULT false,
    fallo_confirmado BOOLEAN DEFAULT false,
    difficulty INT DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    sam_phrase TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE
);
COMMENT ON TABLE public.tasks IS 'El corazón del sistema: las gestas que los usuarios deben completar.';

-- Tabla de Eventos Mundiales (Raids)
CREATE TABLE IF NOT EXISTS public.world_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_name TEXT NOT NULL,
  description TEXT,
  max_hp BIGINT NOT NULL,
  current_hp BIGINT,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);
COMMENT ON TABLE public.world_events IS 'Define los jefes de raid globales, como Sauron.';

-- Tabla de Salud del Mundo (Barra de Luz)
CREATE TABLE IF NOT EXISTS public.world_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    current_health BIGINT DEFAULT 1000000,
    max_health BIGINT DEFAULT 1000000,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
COMMENT ON TABLE public.world_health IS 'Sistema de moral global que se ve afectado por las tareas fallidas.';

-- Tabla de Inventario
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    item_name TEXT NOT NULL,
    rarity TEXT NOT NULL CHECK (rarity IN ('Común', 'Raro', 'Legendario')),
    quantity INT DEFAULT 1,
    category_context TEXT, 
    effects JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.inventory IS 'Inventario de cada usuario para recompensas y crafteo.';

-- Tabla de Logs de Raid (Feed de Batalla)
CREATE TABLE IF NOT EXISTS public.raid_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    damage BIGINT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('task', 'sacrifice')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
COMMENT ON TABLE public.raid_logs IS 'Registro de cada golpe al jefe para el feed en tiempo real.';

-- Tabla de Logros Globales
CREATE TABLE IF NOT EXISTS public.global_achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    requirement_type TEXT,
    requirement_value INT
);
COMMENT ON TABLE public.global_achievements IS 'Catálogo de todos los logros disponibles en el juego.';

-- Tabla de Unión para Logros de Usuario
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id TEXT REFERENCES global_achievements(id),
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, achievement_id)
);
COMMENT ON TABLE public.user_achievements IS 'Registra qué logros ha desbloqueado cada usuario.';

-- Tabla de Analíticas Diarias
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  log_date date not null,
  tasks_total int default 0,
  tasks_completed int default 0,
  tasks_failed int default 0,
  shadow_level text default 'neutral',
  completed_by_category jsonb default '{}'::jsonb,
  total_by_category jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, log_date)
);
COMMENT ON TABLE public.daily_logs IS 'Agregados diarios para el Palantir y análisis de rendimiento.';

-- =============================================================================
-- SECCIÓN 2: ÍNDICES Y TRIGGERS
-- =============================================================================

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_raid_logs_user_id ON public.raid_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_raid_logs_created_at ON public.raid_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- Trigger para crear perfil de usuario automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, race, race_title, user_class, class_multiplier)
  VALUES (new.id, SPLIT_PART(new.email, '@', 1), 'Humanos', 'Aventurero', 'aventurero', 1.0);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================================================
-- SECCIÓN 3: FUNCIONES (RPC - Remote Procedure Calls)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- LÓGICA DE RAID (DAÑO, SACRIFICIO, VICTORIA)
-- -----------------------------------------------------------------------------

-- Función interna para otorgar recompensas de victoria
CREATE OR REPLACE FUNCTION public.grant_victory_rewards()
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
  FOR v_participant IN (SELECT DISTINCT user_id FROM public.raid_logs LIMIT 200) -- Limite para evitar bucles infinitos
  LOOP
    -- Entregar 3 materiales raros aleatorios
    FOR v_count IN 1..3 LOOP
      v_material := v_rare_materials[ceil(random() * array_length(v_rare_materials, 1))];
      
      INSERT INTO public.inventory (user_id, item_name, rarity, category_context)
      VALUES (v_participant.user_id, v_material, 'Raro', 'victory_reward')
      ON CONFLICT DO NOTHING; -- Evitar duplicados si ya tiene el item
    END LOOP;
    
    -- Registrar logro de victoria
    UPDATE public.profiles 
    SET achievements = COALESCE(achievements, '{}'::jsonb) || jsonb_build_object('victory_hero', now())
    WHERE id = v_participant.user_id;
  END LOOP;
  
  -- Marcar evento como inactivo tras la victoria
  UPDATE public.world_events SET is_active = false WHERE current_hp = 0;
END;
$$;

-- Función interna y centralizada para aplicar daño
CREATE OR REPLACE FUNCTION public._internal_apply_damage(
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
  -- Aplicar daño al jefe mundial
  UPDATE public.world_events
  SET current_hp = GREATEST(0, COALESCE(current_hp, max_hp) - p_damage)
  WHERE is_active = true
  RETURNING current_hp INTO v_hp_after;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  -- Si se hizo daño, registrarlo y chequear victoria
  IF v_rows_affected > 0 THEN
    BEGIN
      SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
      EXCEPTION WHEN OTHERS THEN
        v_user_email := 'unknown@realm.com';
    END;
    
    INSERT INTO public.raid_logs (user_id, user_email, damage, type, created_at)
    VALUES (p_user_id, COALESCE(SPLIT_PART(v_user_email, '@', 1), 'unknown'), p_damage, p_type, now());
    
    -- Chequeo automático de victoria
    IF v_hp_after = 0 THEN
       PERFORM grant_victory_rewards();
       RAISE NOTICE '¡VICTORIA ALCANZADA! Repartiendo recompensas...';
    END IF;
  END IF;

  RETURN v_rows_affected;
END;
$$;

-- RPC para registrar daño por completar tareas
CREATE OR REPLACE FUNCTION public.register_raid_damage(
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
    -- Obtener multiplicador de clase del usuario (UNA SOLA VEZ)
    SELECT COALESCE(class_multiplier, 1.0) INTO v_class_mult
    FROM public.profiles WHERE id = p_user_id;

    -- Iterar sobre las tareas completadas
    FOREACH v_task_id IN ARRAY p_task_ids
    LOOP
        -- Obtener dificultad de la tarea (si no tiene, asumimos 1)
        SELECT COALESCE(difficulty, 1) INTO v_difficulty
        FROM public.tasks WHERE id = v_task_id;
        
        -- Calcular daño: Dificultad * Multiplicador de Clase
        v_task_damage := GREATEST(1, (v_difficulty * v_class_mult)::BIGINT);
        v_total_damage := v_total_damage + v_task_damage;
    END LOOP;

    -- Aplicar el daño total en una sola transacción
    IF v_total_damage > 0 THEN
        PERFORM _internal_apply_damage(p_user_id, v_total_damage, 'task');
    END IF;

    RETURN v_total_damage;
END;
$$;

-- RPC para procesar sacrificio de recursos (Oro/XP)
CREATE OR REPLACE FUNCTION public.process_sacrifice(
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
  -- Bloquear el perfil para evitar condiciones de carrera
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

  -- Aplicar daño al jefe
  v_rows_affected := _internal_apply_damage(p_user_id, p_damage, 'sacrifice');

  IF v_rows_affected = 0 THEN
     RETURN json_build_object('success', false, 'error', 'No hay un jefe activo al que dañar.');
  END IF;

  -- Registrar logro de sacrificio
  UPDATE public.profiles 
  SET achievements = COALESCE(achievements, '{}'::jsonb) || 
      jsonb_build_object('sacrifice', jsonb_build_object('type', p_type, 'amount', p_amount, 'timestamp', now()))
  WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', '¡Sacrificio aceptado!');
END;
$$;

-- -----------------------------------------------------------------------------
-- LÓGICA DE ANALÍTICAS (PALANTIR)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_weekly_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  start_date date;
  end_date date;
  total_tasks bigint;
  completed_tasks bigint;
  effectiveness numeric;
  category_stats json;
  daily_history json;
BEGIN
  v_user_id := auth.uid();
  end_date := current_date;
  start_date := end_date - interval '6 days';

  -- Totales Generales
  SELECT count(*), count(*) FILTER (WHERE is_completed = true)
  INTO total_tasks, completed_tasks
  FROM tasks
  WHERE tasks.user_id = v_user_id;
  
  IF total_tasks > 0 THEN
    effectiveness := round((completed_tasks::numeric / total_tasks::numeric) * 100, 2);
  ELSE
    effectiveness := 0;
  END IF;

  -- Estadísticas por Categoría
  SELECT json_object_agg(coalesce(category, 'otros'), count)
  INTO category_stats
  FROM (
    SELECT category, count(*)
    FROM tasks
    WHERE tasks.user_id = v_user_id
    GROUP BY category
  ) t;

  -- Historial de 7 días
  SELECT json_agg(day_stats)
  INTO daily_history
  FROM (
    SELECT 
      d.day::text as date,
      count(t.id) FILTER (WHERE t.created_at::date = d.day) as created,
      count(t.id) FILTER (WHERE t.is_completed = true AND t.created_at::date = d.day) as completed
    FROM generate_series(start_date, end_date, '1 day'::interval) as d(day)
    LEFT JOIN tasks t ON t.user_id = v_user_id 
      AND t.created_at >= start_date 
      AND t.created_at < (end_date + interval '1 day')
    GROUP BY d.day
    ORDER BY d.day
  ) day_stats;

  RETURN json_build_object(
    'summary', json_build_object(
      'total_tasks', total_tasks,
      'completed_tasks', completed_tasks,
      'combat_effectiveness', effectiveness
    ),
    'categories', coalesce(category_stats, '{}'::json),
    'history', coalesce(daily_history, '[]'::json)
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- OTRAS FUNCIONES DE UTILIDAD
-- -----------------------------------------------------------------------------

-- Función para penalizar la salud del mundo al fallar tareas
CREATE OR REPLACE FUNCTION public.penalize_world_health(p_damage BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.world_health
  SET current_health = GREATEST(0, current_health - p_damage)
  WHERE is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para incrementar oro de forma segura
CREATE OR REPLACE FUNCTION public.increment_gold(p_user_id UUID, p_amount INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET gold = COALESCE(gold, 0) + p_amount
  WHERE id = p_user_id;
END;
$$;

-- =============================================================================
-- SECCIÓN 4: POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY)
-- =============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raid_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para PROFILES
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para TASKS
CREATE POLICY "Users can manage their own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id);

-- Políticas para WORLD_EVENTS (Lectura pública, escritura restringida)
CREATE POLICY "Anyone can view world events" ON public.world_events FOR SELECT USING (true);
CREATE POLICY "Service role can update world events" ON public.world_events FOR UPDATE USING (true) WITH CHECK (true);

-- Políticas para INVENTORY
CREATE POLICY "Users can view their own inventory" ON public.inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage inventory" ON public.inventory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para RAID_LOGS (Lectura pública)
CREATE POLICY "Public can view raid logs" ON public.raid_logs FOR SELECT USING (true);

-- Políticas para ACHIEVEMENTS
CREATE POLICY "Anyone can view global achievements" ON public.global_achievements FOR SELECT USING (true);
CREATE POLICY "Users can view their own unlocked achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

-- Políticas para DAILY_LOGS
CREATE POLICY "Users can view their own daily logs" ON public.daily_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own daily logs" ON public.daily_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own daily logs" ON public.daily_logs FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================================
-- SECCIÓN 5: DATOS INICIALES (SEEDING)
-- =============================================================================

-- Insertar evento de Sauron si no existe
INSERT INTO public.world_events (event_name, description, max_hp, current_hp, is_active, expires_at)
SELECT 'La Sombra de Sauron', 'La oscuridad se cierne sobre la Tierra Media. Completar tareas debilita su poder.', 500000, 500000, true, now() + interval '7 days'
WHERE NOT EXISTS (SELECT 1 FROM public.world_events WHERE event_name = 'La Sombra de Sauron' AND is_active = true);

-- Insertar salud del mundo si no existe
INSERT INTO public.world_health (current_health, max_health, is_active)
SELECT 1000000, 1000000, true
WHERE NOT EXISTS (SELECT 1 FROM public.world_health WHERE is_active = true);

-- Insertar logros globales
INSERT INTO public.global_achievements (id, name, description, icon, requirement_type, requirement_value) VALUES
('tasks_1', 'Primer Paso', 'Completa tu primera misión.', '🦶', 'tasks', 1),
('tasks_10', 'Aventurero Local', 'Completa 10 misiones.', '📜', 'tasks', 10),
('tasks_25', 'Héroe de la Comarca', 'Completa 25 misiones.', '🍺', 'tasks', 25),
('tasks_50', 'Guardia de la Ciudad', 'Completa 50 misiones.', '🛡️', 'tasks', 50),
('tasks_100', 'Capitán de Rango', 'Completa 100 misiones.', '⚔️', 'tasks', 100),
('tasks_250', 'General de los Ejércitos', 'Completa 250 misiones.', '🚩', 'tasks', 250),
('tasks_500', 'Leyenda de la Tercera Edad', 'Completa 500 misiones.', '🌟', 'tasks', 500),
('salud_5', 'Vigía de la Salud', 'Completa 5 misiones de Salud.', '💚', 'salud', 5),
('salud_20', 'Sanador de Imladris', 'Completa 20 misiones de Salud.', '🌿', 'salud', 20),
('salud_50', 'Fuerza de Beorn', 'Completa 50 misiones de Salud.', '🐻', 'salud', 50),
('estudio_10', 'Escriba de Minas Tirith', 'Completa 10 misiones de Estudio.', '📖', 'estudio', 10),
('estudio_30', 'Maestre de Sabiduría', 'Completa 30 misiones de Estudio.', '🧙', 'estudio', 30),
('trabajo_20', 'Constructor de Erebor', 'Completa 20 misiones de Trabajo.', '⚒️', 'trabajo', 20),
('trabajo_50', 'Señor del Yunque', 'Completa 50 misiones de Trabajo.', '💎', 'trabajo', 50),
('damage_1k', 'Pequeña Espina', 'Inflige 1,000 de daño a Sauron.', '🗡️', 'damage', 1000),
('damage_10k', 'Guerrero del Oeste', 'Inflige 10,000 de daño a Sauron.', '🔥', 'damage', 10000),
('damage_50k', 'Azote de la Sombra', 'Inflige 50,000 de daño a Sauron.', '💥', 'damage', 50000),
('damage_100k', 'Héroe de los Pueblos Libres', 'Inflige 100,000 de daño a Sauron.', '🦅', 'damage', 100000),
('gold_100', 'Bolsa de Monedas', 'Acumula 100 de oro.', '💰', 'gold', 100),
('gold_1k', 'Cofre de Plata', 'Acumula 1,000 de oro.', '🪙', 'gold', 1000),
('gold_5k', 'Tesoro de Smaug', 'Acumula 5,000 de oro.', '🐉', 'gold', 5000),
('level_10', 'Ascenso del Héroe', 'Llega al nivel 10.', '🆙', 'level', 10),
('level_25', 'Maestro de Armas', 'Llega al nivel 25.', '👑', 'level', 25),
('level_50', 'Inmortal en Cantares', 'Llega al nivel 50.', '🌈', 'level', 50)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SECCIÓN 6: COMANDOS DE MANTENIMIENTO (Opcionales)
-- =============================================================================

/*
-- Para forzar una recarga del esquema en PostgREST si no detecta cambios:
NOTIFY pgrst, 'reload schema';

-- Para reiniciar la vida del jefe actual para pruebas:
UPDATE public.world_events 
SET current_hp = max_hp 
WHERE is_active = true;

-- Para confirmar manualmente todos los emails de usuarios existentes:
UPDATE auth.users SET email_confirmed_at = NOW();
*/

COMMIT;

-- =============================================================================
-- FIN DEL SCRIPT
-- =============================================================================
