-- Apply only after Supabase Phone Auth + Send SMS Hook has passed a real OTP test.
begin;

drop function if exists public.cleanup_auth_records();
drop table if exists public.admin_sessions;
drop table if exists public.otp_challenges;

commit;
