-- FORCE SCHEMA RELOAD
-- Ejecutar en Supabase SQL Editor si PostgREST no detecta las nuevas columnas

NOTIFY pgrst, 'reload schema';

-- Truco adicional: Renombrar temporalmente (opcional si el NOTIFY no funciona)
-- ALTER TABLE profiles RENAME TO profiles_temp;
-- ALTER TABLE profiles_temp RENAME TO profiles;
