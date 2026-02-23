-- CORRECCIÓN CRÍTICA DE ANALYTICS
-- Ejecuta este script ENTERO en el Editor SQL de Supabase para arreglar el error "missing FROM-clause"

DROP FUNCTION IF EXISTS get_weekly_stats();

CREATE OR REPLACE FUNCTION get_weekly_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  start_date date;
  end_date date;
  
  total_tasks bigint;
  completed_tasks bigint;
  effectiveness numeric;
  
  category_stats json;
  daily_history json;
  
BEGIN
  -- Obtener ID del usuario autenticado
  v_user_id := auth.uid();
  
  -- Definir rango: últimos 7 días (incluyendo hoy)
  end_date := current_date;
  start_date := end_date - interval '6 days';

  -- 1. Totales Generales 
  SELECT count(*), count(*) FILTER (WHERE is_completed = true)
  INTO total_tasks, completed_tasks
  FROM tasks
  WHERE tasks.user_id = v_user_id;
  
  -- Calcular efectividad
  IF total_tasks > 0 THEN
    effectiveness := round((completed_tasks::numeric / total_tasks::numeric) * 100, 2);
  ELSE
    effectiveness := 0;
  END IF;

  -- 2. Estadísticas por Categoría
  SELECT json_object_agg(coalesce(category, 'otros'), count)
  INTO category_stats
  FROM (
    SELECT category, count(*)
    FROM tasks
    WHERE tasks.user_id = v_user_id
    GROUP BY category
  ) t;

  -- 3. Historial (Días rellenos con 0 si no hay datos)
  SELECT json_agg(day_stats)
  INTO daily_history
  FROM (
    SELECT 
      d.day::text as date,
      count(t.id) FILTER (WHERE t.created_at::date = d.day) as created,
      count(t.id) FILTER (WHERE t.is_completed = true AND t.created_at::date = d.day) as completed
    FROM generate_series(start_date, end_date, '1 day'::interval) as d(day)
    LEFT JOIN tasks t ON t.user_id = v_user_id 
      AND t.created_at >= start_date 
      AND t.created_at < (end_date + interval '1 day')
    GROUP BY d.day
    ORDER BY d.day
  ) day_stats;

  -- Retorno
  RETURN json_build_object(
    'summary', json_build_object(
      'total_tasks', total_tasks,
      'completed_tasks', completed_tasks,
      'combat_effectiveness', effectiveness
    ),
    'categories', coalesce(category_stats, '{}'::json),
    'history', coalesce(daily_history, '[]'::json)
  );
END;
$$;
