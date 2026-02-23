-- RAID PROTOCOL - PERMISOS DE TEST
-- Permitir que el sistema (service role) o usuarios autenticados puedan actualizar world_events 
-- (Normalmente esto se hace vía RPC, pero para los tests de estrés facilitamos la semilla)

-- Habilitar UPDATE para world_events
CREATE POLICY "Service role can update world events" 
ON public.world_events 
FOR UPDATE 
USING (true) 
WITH CHECK (true);

-- Si ya existe y falla, podemos intentar:
-- ALTER POLICY "Anyone can update world_events" ON public.world_events USING (true);
