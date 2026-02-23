-- FIX: Añadir política de inserción en profiles y asegurar evento activo
-- Ejecutar en Supabase SQL Editor

-- 1. Permitir a los usuarios crear su propio perfil (necesario si el trigger no capturó a los existentes)
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Asegurar que el evento de Sauron tiene current_hp inicializado
UPDATE world_events SET current_hp = max_hp WHERE current_hp IS NULL AND is_active = true;

-- 3. Refuerzo de la función de daño para manejar nulos
CREATE OR REPLACE FUNCTION process_global_damage(p_damage BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE world_events
  SET current_hp = GREATEST(0, COALESCE(current_hp, max_hp) - p_damage)
  WHERE is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
