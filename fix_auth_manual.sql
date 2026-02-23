-- VERSIÓN CORREGIDA PARA SUPABASE
-- 1. Confirmar todos los usuarios actuales (Solo actualizamos email_confirmed_at)
UPDATE auth.users SET email_confirmed_at = NOW();

-- 2. Asegurarse de que las identidades también estén marcadas como confirmadas
UPDATE auth.identities SET last_sign_in_at = NOW();

-- NOTA IMPORTANTE:
-- Para evitar este problema en el futuro con nuevos usuarios:
-- Ve a Authentication -> Settings -> User Signups
-- y DESACTIVA "Confirm email".
