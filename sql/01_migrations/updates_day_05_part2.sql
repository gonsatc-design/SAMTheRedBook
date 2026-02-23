-- BLOQUE 2: Sincronización Global (Sauron)
-- Ejecutar en Supabase SQL Editor

-- 1. Crear tabla de Eventos Globales (si no existe)
drop table if exists world_events cascade; -- LIMPIEZA: Aseguramos que se crea con las columnas nuevas
create table if not exists world_events (
  id uuid default uuid_generate_v4() primary key,
  event_name text not null, -- 'Sauron', 'Balrog', etc.
  description text,
  max_hp bigint not null,
  current_hp bigint, -- Opcional si lo calculamos dinámicamente, pero útil para caché
  damage_multiplier int default 10, -- Daño por tarea completada
  start_date timestamp with time zone default now(),
  end_date timestamp with time zone,
  is_active boolean default true
);

-- Habilitar lectura pública (Realtime necesita esto a veces, o al menos authenticated)
alter table world_events enable row level security;

create policy "Anyone can view active world events"
  on world_events for select
  using ( true ); -- Público para lectura (o restringido a auth, pero todos deben verlo)

-- 2. Insertar a Sauron (El Ojo) si no existe
insert into world_events (event_name, description, max_hp, damage_multiplier, is_active)
select 'La Sombra de Sauron', 'La oscuridad se cierne sobre la Tierra Media. Completar tareas debilita su poder.', 500000, 10, true
where not exists (select 1 from world_events where event_name = 'La Sombra de Sauron');

-- 3. Función para calcular el estado actual del Jefe Mundial
CREATE OR REPLACE FUNCTION get_world_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_event record;
  progress_percentage numeric;
BEGIN
  -- Obtener evento activo
  SELECT * INTO active_event
  FROM world_events
  WHERE is_active = true
  ORDER BY start_date DESC
  LIMIT 1;

  IF active_event IS NULL THEN
    RETURN json_build_object('active', false, 'message', 'La paz reina por ahora.');
  END IF;

  -- Calcular porcentaje basado en la columna física current_hp
  IF active_event.max_hp > 0 THEN
      progress_percentage := round((active_event.current_hp::numeric / active_event.max_hp::numeric) * 100, 2);
  ELSE
      progress_percentage := 0;
  END IF;

  RETURN json_build_object(
    'active', true,
    'event_name', active_event.event_name,
    'max_hp', active_event.max_hp,
    'current_hp', active_event.current_hp,
    'total_damage_dealt', (active_event.max_hp - active_event.current_hp),
    'progress_percentage', progress_percentage,
    'is_fury_active', (progress_percentage < 50)
  );
END;
$$;
