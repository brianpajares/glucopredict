-- GlucoPredict · compras con PayPal (idempotente: se puede ejecutar varias veces).
-- Pégalo en Supabase → SQL Editor → Run. Al final hay una consulta de comprobación.
-- Solo el servidor (service_role) accede: RLS activado y sin políticas para anon/authenticated.

create extension if not exists pgcrypto;

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  report_id text not null unique,
  email_hash text not null,
  payload_ciphertext text,
  locale text not null check (locale in ('es','en','pt')),
  payment_status text not null default 'CREATED'
    check (payment_status in ('CREATED','AWAITING_PAYMENT','PENDING','COMPLETED','FAILED','REFUNDED','DISPUTED')),
  fulfillment_status text not null default 'NOT_STARTED'
    check (fulfillment_status in ('NOT_STARTED','PDF_READY','EMAIL_PENDING','EMAIL_ACCEPTED','DELIVERED_CONFIRMED','DELIVERY_FAILED')),
  paypal_order_id text unique,
  paypal_capture_id text unique,
  amount numeric(10,2) not null,
  currency text not null,
  env text not null check (env in ('sandbox','live')),
  terms_accepted_at timestamptz,
  consent_owner_copy boolean not null default false,
  last_error text,
  fulfillment_claimed_at timestamptz,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists purchases_email_hash_idx on public.purchases(email_hash);
create index if not exists purchases_status_idx on public.purchases(payment_status, fulfillment_status);

create table if not exists public.paypal_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);

alter table public.purchases enable row level security;
alter table public.paypal_webhook_events enable row level security;

create or replace function public.gp_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists purchases_touch_updated_at on public.purchases;
create trigger purchases_touch_updated_at before update on public.purchases
  for each row execute function public.gp_touch_updated_at();

-- Transición atómica a COMPLETED. Devuelve 'paid' | 'already_paid' | 'mismatch'.
create or replace function public.gp_purchase_mark_paid(
  p_id uuid, p_order text, p_capture text, p_amount numeric, p_currency text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  r public.purchases%rowtype;
begin
  select * into r from public.purchases where id = p_id for update;
  if not found then return 'mismatch'; end if;
  if r.amount <> p_amount or r.currency <> p_currency then return 'mismatch'; end if;
  if r.payment_status = 'COMPLETED' then
    if r.paypal_capture_id = p_capture then return 'already_paid'; end if;
    return 'mismatch';
  end if;
  if exists (select 1 from public.purchases where paypal_capture_id = p_capture and id <> p_id) then
    return 'mismatch';
  end if;
  update public.purchases
     set payment_status = 'COMPLETED', paypal_order_id = p_order, paypal_capture_id = p_capture, paid_at = now()
   where id = p_id;
  return 'paid';
end $$;

-- Reclama la entrega en exclusiva: dos procesos nunca envían el mismo correo a la vez.
create or replace function public.gp_purchase_claim_fulfillment(p_id uuid, p_stale_minutes int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  update public.purchases
     set fulfillment_status = 'EMAIL_PENDING', fulfillment_claimed_at = now()
   where id = p_id
     and payment_status = 'COMPLETED'
     and fulfillment_status not in ('EMAIL_ACCEPTED','DELIVERED_CONFIRMED')
     and (fulfillment_status <> 'EMAIL_PENDING'
          or fulfillment_claimed_at is null
          or fulfillment_claimed_at < now() - make_interval(mins => p_stale_minutes));
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- Purga de payloads cifrados (minimización): sin pago tras N días, o ya entregados hace N días.
create or replace function public.gp_purge_expired_payloads(p_days int) returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  update public.purchases
     set payload_ciphertext = null
   where payload_ciphertext is not null
     and ((payment_status <> 'COMPLETED' and created_at < now() - make_interval(days => p_days))
       or (fulfilled_at is not null and fulfilled_at < now() - make_interval(days => p_days)));
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.gp_purchase_mark_paid(uuid, text, text, numeric, text) from public, anon, authenticated;
revoke all on function public.gp_purchase_claim_fulfillment(uuid, int) from public, anon, authenticated;
revoke all on function public.gp_purge_expired_payloads(int) from public, anon, authenticated;
grant execute on function public.gp_purchase_mark_paid(uuid, text, text, numeric, text) to service_role;
grant execute on function public.gp_purchase_claim_fulfillment(uuid, int) to service_role;
grant execute on function public.gp_purge_expired_payloads(int) to service_role;

-- Comprobación: debe devolver tablas = 2 y funciones = 3
select
  (select count(*) from pg_tables where schemaname = 'public' and tablename in ('purchases','paypal_webhook_events')) as tablas,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('gp_purchase_mark_paid','gp_purchase_claim_fulfillment','gp_purge_expired_payloads')) as funciones;
