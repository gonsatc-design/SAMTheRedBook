-- =====================================================
-- FIX: Actualizar perfil existente con raza
-- =====================================================

-- Actualizar TODOS los perfiles sin raza
UPDATE profiles
SET race = 'Hobbits', 
    race_title = 'Aventurero'
WHERE race IS NULL;

-- Verificación
SELECT 'Perfiles actualizados ✅' AS status;
SELECT id, level, gold, race, race_title FROM profiles;
