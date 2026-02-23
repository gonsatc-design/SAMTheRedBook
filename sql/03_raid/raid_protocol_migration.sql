-- RAID PROTOCOL MIGRATION
-- 🚀 DÍA 07: PROTOCOLO DE INCURSIÓN

-- 1. Añadir dificultad a las tareas
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS difficulty INT DEFAULT 1;

-- 2. Crear tabla de perfiles para las Clases de Usuario
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  user_class TEXT DEFAULT 'aventurero', -- 'guerrero', 'mago', 'pícaro', 'aventurero'
  class_multiplier NUMERIC DEFAULT 1.0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en perfiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 3. Trigger para crear perfil automáticamente al registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, user_class, class_multiplier)
  VALUES (new.id, new.email, 'aventurero', 1.0);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Ajustar world_events para daño atómico
ALTER TABLE world_events ADD COLUMN IF NOT EXISTS current_hp BIGINT;
UPDATE world_events SET current_hp = max_hp WHERE current_hp IS NULL;

-- Función atómica para procesar daño
CREATE OR REPLACE FUNCTION process_global_damage(p_damage BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE world_events
  SET current_hp = GREATEST(0, current_hp - p_damage)
  WHERE is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Inicializar el evento de Sauron si no existe con HP limpio
INSERT INTO world_events (event_name, description, max_hp, current_hp, damage_multiplier, is_active)
SELECT 'La Sombra de Sauron', 'La oscuridad se cierne sobre la Tierra Media. Completar tareas debilita su poder.', 500000, 500000, 10, true
WHERE NOT EXISTS (SELECT 1 FROM world_events WHERE event_name = 'La Sombra de Sauron');
