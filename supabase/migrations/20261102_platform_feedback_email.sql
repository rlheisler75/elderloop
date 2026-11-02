-- Email the super admins when a Help & Feedback message comes in. The trigger calls
-- the send-feedback-email Edge Function (Resend) through pg_net, like the budget-alerts
-- cron job; the function claims each message before sending so it goes out once.

alter table public.platform_feedback
  add column if not exists email_claimed_at timestamptz,
  add column if not exists emailed_at       timestamptz,
  add column if not exists email_error      text;

create or replace function public.platform_feedback_notify()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  perform net.http_post(
    url := 'https://zrijcrzlyndnudflhbls.supabase.co/functions/v1/send-feedback-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_anon_key'),
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_anon_key')
    ),
    body := '{}'::jsonb
  );
  return null;
end;
$function$;
revoke all on function public.platform_feedback_notify() from public, anon, authenticated;

drop trigger if exists platform_feedback_notify on public.platform_feedback;
create trigger platform_feedback_notify after insert on public.platform_feedback
  for each row execute function public.platform_feedback_notify();
