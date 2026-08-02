create table public.user_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  identity_status text not null default 'pending',
  funds_status text not null default 'pending',
  identity_note text not null default '',
  funds_note text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_verifications_identity_status check (identity_status in ('pending', 'verified', 'rejected')),
  constraint user_verifications_funds_status check (funds_status in ('pending', 'verified', 'rejected')),
  constraint user_verifications_notes_size check (
    octet_length(identity_note) <= 2000
    and octet_length(funds_note) <= 2000
  )
);

create table public.admin_user_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_kind text not null,
  target_id text,
  before_value jsonb,
  after_value jsonb,
  reason text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  constraint admin_user_audit_target_kind check (target_kind in ('order', 'device', 'transaction', 'verification')),
  constraint admin_user_audit_action_length check (char_length(action) between 3 and 80),
  constraint admin_user_audit_reason_size check (octet_length(reason) <= 1000)
);

create index user_verifications_updated_by_idx on public.user_verifications (updated_by);
create index admin_user_audit_user_created_idx on public.admin_user_audit_logs (user_id, created_at desc);
create index admin_user_audit_admin_created_idx on public.admin_user_audit_logs (admin_id, created_at desc);

alter table public.user_verifications enable row level security;
alter table public.admin_user_audit_logs enable row level security;

revoke all on public.user_verifications, public.admin_user_audit_logs from public, anon, authenticated;
grant all on public.user_verifications, public.admin_user_audit_logs to service_role;

create trigger user_verifications_set_updated_at before update on public.user_verifications
for each row execute function private.set_updated_at();

comment on table public.user_verifications is 'Administrator-maintained identity and funds verification state. Supabase email confirmation and provider payment verification remain authoritative in their own systems.';
comment on table public.admin_user_audit_logs is 'Append-only audit trail for administrator changes to a user business account.';
