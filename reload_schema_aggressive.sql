-- RELOAD ESQUEMA AGRESIVO
-- Si el NOTIFY no funcionó, este truco suele forzar el refresco de esquema en PostgREST

BEGIN;
  ALTER TABLE public.profiles RENAME TO profiles_temp;
  ALTER TABLE public.profiles_temp RENAME TO profiles;
COMMIT;

NOTIFY pgrst, 'reload schema';
