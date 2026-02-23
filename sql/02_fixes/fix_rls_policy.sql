-- 🔥 FIX: Habilitar UPDATE en world_events para que funcione el daño

-- 1. Verificar políticas actuales
SELECT * FROM pg_policies 
WHERE tablename = 'world_events';

-- 2. Crear política de UPDATE para todos (para que RPC y app puedan actualizar)
CREATE POLICY "Allow all to update world_events" 
ON public.world_events 
FOR UPDATE 
USING (true) 
WITH CHECK (true);

-- 3. Verificar que la política se creó
SELECT * FROM pg_policies 
WHERE tablename = 'world_events';

-- 4. PRUEBA: Intentar UPDATE directo
UPDATE public.world_events 
SET current_hp = current_hp - 100
WHERE is_active = true;

-- 5. Verificar que funcionó
SELECT current_hp FROM public.world_events WHERE is_active = true;
