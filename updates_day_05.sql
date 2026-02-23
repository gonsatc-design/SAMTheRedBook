-- Función para obtener estadísticas semanales del usuario
-- Se debe ejecutar en el Editor SQL de Supabase

create or replace function get_weekly_stats()
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  start_date date;
  end_date date;
  
  total_tasks bigint;
  completed_tasks bigint;
  effectiveness numeric;
  
  category_stats json;
  daily_history json;
  
begin
  -- Obtener ID del usuario autenticado
  v_user_id := auth.uid();
  
  -- Definir rango: últimos 7 días (incluyendo hoy)
  end_date := current_date;
  start_date := end_date - interval '6 days';

  -- 1. Totales Generales 
  select count(*), count(*) filter (where is_completed = true)
  into total_tasks, completed_tasks
  from tasks
  where tasks.user_id = v_user_id; -- FIX: Usamos v_user_id
  
  -- Calcular efectividad (evitar división por cero)
  if total_tasks > 0 then
    effectiveness := round((completed_tasks::numeric / total_tasks::numeric) * 100, 2);
  else
    effectiveness := 0;
  end if;

  -- 2. Estadísticas por Categoría (Globales)
  select json_object_agg(coalesce(category, 'otros'), count)
  into category_stats
  from (
    select category, count(*)
    from tasks
    where tasks.user_id = v_user_id
    group by category
  ) t;

  -- 3. Historial de los últimos 7 días
  -- Generamos la serie de días y hacemos left join con las tareas
  select json_agg(day_stats)
  into daily_history
  from (
    select 
      d.day::text as date,
      count(t.id) filter (where t.created_at::date = d.day) as created,
      count(t.id) filter (where t.is_completed = true and t.created_at::date = d.day) as completed
    from generate_series(start_date, end_date, '1 day'::interval) as d(day)
    left join tasks t on t.user_id = v_user_id 
      and t.created_at >= start_date 
      and t.created_at < (end_date + interval '1 day')
    group by d.day
    order by d.day
  ) day_stats;

  -- Construir JSON de respuesta
  return json_build_object(
    'summary', json_build_object(
      'total_tasks', total_tasks,
      'completed_tasks', completed_tasks,
      'combat_effectiveness', effectiveness
    ),
    'categories', coalesce(category_stats, '{}'::json),
    'history', coalesce(daily_history, '[]'::json)
  );
end;
$$;
