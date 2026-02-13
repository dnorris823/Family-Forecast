-- Confirm all users (useful for dev environment)
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;
