-- GlucoPredict v4 — Supabase/Postgres
create extension if not exists pgcrypto;

create type public.report_status as enum ('requested','generating','ready','delivered','failed');
create type public.order_status as enum ('created','checkout_open','paid','failed','refunded');
create type public.privacy_request_type as enum ('access','export','delete');

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  email_ciphertext text not null,
  email_hash text not null,
  locale text not null check (locale in ('es','en','pt')),
  country_profile text not null,
  consent_report_delivery boolean not null default false,
  consent_owner_copy boolean not null default false,
  consent_waitlist boolean not null default false,
  consent_recorded_at timestamptz not null default now(),
  utm_source text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index leads_email_hash_idx on public.leads(email_hash);
create index leads_created_at_idx on public.leads(created_at desc);

create table public.calculations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  health_payload_ciphertext text not null,
  result_payload_ciphertext text not null,
  score_band text not null,
  followup_recommended boolean not null,
  country_profile text not null,
  threshold_status text not null,
  model_version text not null,
  manifest_version text not null,
  parameter_checksum text not null,
  locale text not null check (locale in ('es','en','pt')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index calculations_created_at_idx on public.calculations(created_at desc);
create index calculations_lead_id_idx on public.calculations(lead_id);

create table public.report_requests (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  calculation_id uuid not null references public.calculations(id) on delete restrict,
  idempotency_key text not null unique,
  status public.report_status not null default 'requested',
  report_storage_key text,
  report_sha256 text,
  private_token_hash text,
  token_expires_at timestamptz,
  delivered_at timestamptz,
  owner_notified_at timestamptz,
  resend_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index report_requests_lead_idx on public.report_requests(lead_id);
create index report_requests_status_idx on public.report_requests(status);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  report_request_id uuid not null references public.report_requests(id) on delete restrict,
  provider text not null default 'stripe',
  provider_session_id text unique,
  provider_payment_id text unique,
  currency text,
  amount_minor integer,
  status public.order_status not null default 'created',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload_sha256 text not null,
  processed_at timestamptz not null default now(),
  unique(provider,event_id)
);

create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  request_type public.privacy_request_type not null,
  verification_status text not null default 'pending',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_type text not null,
  actor_ref text,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  hit_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.leads enable row level security;
alter table public.calculations enable row level security;
alter table public.report_requests enable row level security;
alter table public.orders enable row level security;
alter table public.webhook_events enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.audit_events enable row level security;
alter table public.rate_limits enable row level security;

-- Sin políticas anon/authenticated: deny-by-default.
revoke all on table public.leads from anon, authenticated;
revoke all on table public.calculations from anon, authenticated;
revoke all on table public.report_requests from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.webhook_events from anon, authenticated;
revoke all on table public.privacy_requests from anon, authenticated;
revoke all on table public.audit_events from anon, authenticated;
revoke all on table public.rate_limits from anon, authenticated;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger report_requests_touch before update on public.report_requests
for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders
for each row execute function public.touch_updated_at();
