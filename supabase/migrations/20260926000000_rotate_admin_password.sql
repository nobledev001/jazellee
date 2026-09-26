-- Rotate admin@jazelle.com password away from 'admin123' and repair GoTrue auth.users schema NULL columns
UPDATE auth.users
SET
  encrypted_password = crypt('Jazelle#Admin!9482$XpQw', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
  updated_at = now()
WHERE email = 'admin@jazelle.com';
