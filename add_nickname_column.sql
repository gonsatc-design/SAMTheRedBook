-- Agregar columna nickname a la tabla profiles
ALTER TABLE profiles
ADD COLUMN nickname TEXT DEFAULT NULL;

-- Crear índice para búsquedas por nickname
CREATE INDEX idx_profiles_nickname ON profiles(nickname);

-- Mostrar confirmación
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'nickname';
