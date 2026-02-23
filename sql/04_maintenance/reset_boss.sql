-- Reset del jefe para test limpio
UPDATE public.world_events 
SET current_hp = max_hp 
WHERE is_active = true;

-- Verificar
SELECT current_hp, max_hp FROM public.world_events WHERE is_active = true;
