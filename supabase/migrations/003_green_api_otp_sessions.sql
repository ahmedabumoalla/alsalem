begin;

create table public.otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  resend_available_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  used_at timestamptz,
  request_ip_hash text,
  created_at timestamptz not null default now()
);

create index otp_challenges_phone_created_idx
  on public.otp_challenges (phone, created_at desc);
create index otp_challenges_expires_idx
  on public.otp_challenges (expires_at);

create table public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  user_agent_hash text,
  request_ip_hash text,
  created_at timestamptz not null default now()
);

create index admin_sessions_expires_idx on public.admin_sessions (expires_at);
create index admin_sessions_phone_idx on public.admin_sessions (phone);
create index admin_sessions_revoked_idx on public.admin_sessions (revoked_at);

alter table public.otp_challenges enable row level security;
alter table public.admin_sessions enable row level security;

revoke all on table public.otp_challenges from anon, authenticated;
revoke all on table public.admin_sessions from anon, authenticated;
grant all on table public.otp_challenges to service_role;
grant all on table public.admin_sessions to service_role;

create or replace function public.cleanup_auth_records()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.otp_challenges
  where expires_at < now() - interval '1 day'
     or used_at < now() - interval '1 day';

  delete from public.admin_sessions
  where expires_at < now() - interval '7 days'
     or revoked_at < now() - interval '7 days';
end;
$$;

revoke all on function public.cleanup_auth_records() from public, anon, authenticated;
grant execute on function public.cleanup_auth_records() to service_role;

commit;
