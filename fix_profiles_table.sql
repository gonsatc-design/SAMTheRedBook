-- =====================================================
-- FIX: Crear tabla PROFILES con todas las columnas
-- =====================================================

-- 1. Eliminar tabla antigua si existe
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. Crear tabla profiles con la estructura correcta
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Datos básicos
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  gold INTEGER DEFAULT 0,
  
  -- Raza y evolución
  race TEXT DEFAULT NULL,
  race_title TEXT DEFAULT 'Aventurero',
  
  -- Logros
  achievements JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de seguridad
-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Los usuarios pueden crear su propio perfil (backend también)
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 5. Crear índices para mejor rendimiento
CREATE INDEX idx_profiles_id ON profiles(id);
CREATE INDEX idx_profiles_level ON profiles(level);
CREATE INDEX idx_profiles_gold ON profiles(gold);

-- 6. NOTAS IMPORTANTES
-- ⚠️ Los perfiles se crean AUTOMÁTICAMENTE cuando el usuario hace login
-- ⚠️ El servidor crea un perfil con level=4, exp=350, gold=2500
-- ⚠️ No necesitas insertar manualmente perfiles para testing

-- 7. Verificación
SELECT 'Tabla profiles creada correctamente ✅' AS status;
SELECT COUNT(*) as total_profiles FROM profiles;

-- Para ver todos los perfiles existentes:
-- SELECT id, level, gold, race, race_title FROM profiles;
