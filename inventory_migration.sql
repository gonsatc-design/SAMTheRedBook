-- Migración para el Sistema de Botín y Analíticas (Día 06 - Revision RPG)
-- Este archivo debe ejecutarse en el Editor SQL de Supabase

-- 1. Actualizar tabla de tareas para analíticas precisas y NARRATIVA RPG
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP WITH TIME ZONE; -- NUEVO: Para analíticas de fallos
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sam_phrase TEXT; -- Para guardar el "reply" de Sam

-- 2. Crear/Actualizar la tabla de inventario
CREATE TABLE IF NOT EXISTS inventory (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    item_name TEXT NOT NULL,
    rarity TEXT NOT NULL CHECK (rarity IN ('Común', 'Raro', 'Legendario')),
    quantity INT DEFAULT 1,
    category_context TEXT, 
    effects JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columnas si ya existe
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS category_context TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS effects JSONB DEFAULT '{}'::jsonb;

-- 3. TRUCO PARA FORZAR RECARGA DE CACHÉ (Si fallan los NOTIFY)
-- Esto renombra la tabla y la vuelve a su sitio, disparando el refresco de esquema en PostgREST
ALTER TABLE inventory RENAME TO inventory_temp;
ALTER TABLE inventory_temp RENAME TO inventory;

-- 4. Habilitar RLS
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de seguridad
DROP POLICY IF EXISTS "Users can view their own inventory" ON inventory;
CREATE POLICY "Users can view their own inventory" ON inventory FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage inventory" ON inventory;
CREATE POLICY "System can manage inventory" ON inventory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Índice para búsquedas rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);

-- 7. NOTIFY (Refuerzo)
NOTIFY pgrst, 'reload schema';


