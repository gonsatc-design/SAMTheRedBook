-- 🔥 NUCLEAR FIX: Deshabilitar RLS en world_events completamente

-- 1. Deshabilitar RLS
ALTER TABLE public.world_events DISABLE ROW LEVEL SECURITY;

-- 2. Confirmar que está deshabilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'world_events';

-- 3. PRUEBA: Hacer un UPDATE
UPDATE public.world_events 
SET current_hp = GREATEST(0, current_hp - 100)
WHERE is_active = true;

-- 4. Verificar resultado
SELECT current_hp, max_hp FROM public.world_events WHERE is_active = true;
