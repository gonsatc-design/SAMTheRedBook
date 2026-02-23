-- Fix: Asegurar que todas las tareas fallidas antiguas tengan `failed_at`
-- Para tareas que fueron fallidas ANTES de que se implementara el campo `failed_at`

-- 1. Ver cuántas tareas fallidas tienen NULL en failed_at
SELECT COUNT(*) as "Tareas fallidas SIN failed_at"
FROM tasks
WHERE fallo_confirmado = true AND failed_at IS NULL;

-- 2. Si hay tareas sin failed_at, asignar el created_at como failed_at
UPDATE tasks
SET failed_at = created_at
WHERE fallo_confirmado = true AND failed_at IS NULL;

-- 3. Verificar que el update funcionó
SELECT COUNT(*) as "Tareas fallidas CON failed_at"
FROM tasks
WHERE fallo_confirmado = true AND failed_at IS NOT NULL;

-- 4. Ver ejemplos de tareas que fueron reparadas
SELECT 
    id,
    titulo_epico,
    categoria,
    created_at,
    failed_at,
    fallo_confirmado
FROM tasks
WHERE fallo_confirmado = true
ORDER BY failed_at DESC
LIMIT 10;
