-- BLOQUE 0: EL CAMINO DEL HÉROE
-- 1. Ampliar perfiles con Raza y Título
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS race TEXT; -- 'Humanos', 'Elfos', 'Enanos', 'Hobbits'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS race_title TEXT; -- Título evolutivo
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;

-- 2. Sistema de Salud de la Tierra Media (Barra de Luz)
-- Usaremos una nueva entrada en world_events o una tabla dedicada.
-- Para simplicidad y consistencia con el sistema de raid, añadimos una columna a world_events para el "Evento de Luz"
CREATE TABLE IF NOT EXISTS world_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    current_health BIGINT DEFAULT 1000000,
    max_health BIGINT DEFAULT 1000000,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inicializar salud del mundo si no existe
INSERT INTO world_health (current_health, max_health, is_active)
SELECT 1000000, 1000000, true
WHERE NOT EXISTS (SELECT 1 FROM world_health WHERE is_active = true);

-- 3. Tabla para Logros Expandidos (42+)
CREATE TABLE IF NOT EXISTS global_achievements (
    id TEXT PRIMARY KEY, -- Ej: 'task_master_100', 'dragon_slayer'
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    requirement_type TEXT, -- 'tasks', 'damage', 'level', 'gold'
    requirement_value INT
);

-- Tabla de unión para logros de usuario
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id TEXT REFERENCES global_achievements(id),
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, achievement_id)
);

-- RLS para logros
ALTER TABLE global_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements" ON global_achievements FOR SELECT USING (true);
CREATE POLICY "Users can view their own unlocked achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);

-- 4. Función para dañar la salud del mundo al fallar tareas
CREATE OR REPLACE FUNCTION penalize_world_health(p_damage BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE world_health
  SET current_health = GREATEST(0, current_health - p_damage)
  WHERE is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
