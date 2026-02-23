-- RAID PROTOCOL - GOLD UTILITY
-- Función para incrementar oro de forma segura

CREATE OR REPLACE FUNCTION increment_gold(
  p_user_id UUID,
  p_amount INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET gold = COALESCE(gold, 0) + p_amount
  WHERE id = p_user_id;
END;
$$;
