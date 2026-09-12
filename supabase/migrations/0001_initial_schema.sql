create extension if not exists pgcrypto;

create table public.app_users (
  id text primary key,
  email text not null,
  display_name text not null,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_name text not null,
  customer_city text not null default '',
  supplier_number text not null default '',
  store_number text not null default '',
  store_name text not null,
  invoice_date date not null,
  po_number text not null default '',
  goods_receiving_number text not null default '',
  status text not null default 'pending_review' check (status in ('pending_review', 'issued', 'cancelled')),
  total_paisa bigint not null check (total_paisa >= 0),
  notes text not null default '',
  created_by text not null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  position integer not null,
  mgm_code text not null default '',
  subsys_code text not null default '',
  article_name text not null,
  unit text not null default 'Kg',
  quantity_millis bigint not null check (quantity_millis >= 0),
  rate_paisa bigint not null check (rate_paisa >= 0),
  total_paisa bigint not null check (total_paisa >= 0)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  payment_date date not null,
  amount_paisa bigint not null check (amount_paisa > 0),
  reference_number text not null default '',
  notes text not null default '',
  created_by text not null references public.app_users(id),
  created_at timestamptz not null default now()
);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id),
  amount_paisa bigint not null check (amount_paisa > 0),
  created_at timestamptz not null default now(),
  unique (payment_id, invoice_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id text not null references public.app_users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_invoices_date on public.invoices(invoice_date desc);
create index idx_invoices_status on public.invoices(status);
create index idx_invoices_store on public.invoices(store_name);
create index idx_invoice_items_invoice on public.invoice_items(invoice_id);
create index idx_payments_date on public.payments(payment_date desc);
create index idx_allocations_invoice on public.payment_allocations(invoice_id);
create index idx_audit_entity on public.audit_logs(entity_type, entity_id);

alter table public.app_users enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.app_users, public.invoices, public.invoice_items, public.payments, public.payment_allocations, public.audit_logs from anon, authenticated;
grant all on public.app_users, public.invoices, public.invoice_items, public.payments, public.payment_allocations, public.audit_logs to service_role;

create or replace function public.ensure_app_user(p_id text, p_email text, p_display_name text)
returns public.app_users
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.app_users;
  assigned_role text;
begin
  perform pg_advisory_xact_lock(23558);
  select * into result from public.app_users where id = p_id;
  if found then return result; end if;

  select case when exists(select 1 from public.app_users) then 'staff' else 'owner' end into assigned_role;
  insert into public.app_users(id, email, display_name, role)
  values (p_id, p_email, p_display_name, assigned_role)
  returning * into result;
  return result;
end;
$$;

create or replace function public.create_invoice(p_actor_id text, p_invoice jsonb, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid := gen_random_uuid();
  calculated_total bigint;
begin
  if not exists(select 1 from public.app_users where id = p_actor_id) then raise exception 'Unknown user'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'At least one item is required'; end if;

  select coalesce(sum((item->>'total_paisa')::bigint), 0) into calculated_total from jsonb_array_elements(p_items) item;
  insert into public.invoices(id, invoice_number, customer_name, customer_city, supplier_number, store_number, store_name, invoice_date, po_number, goods_receiving_number, total_paisa, notes, created_by)
  values (new_id, trim(p_invoice->>'invoice_number'), trim(p_invoice->>'customer_name'), coalesce(trim(p_invoice->>'customer_city'), ''), coalesce(trim(p_invoice->>'supplier_number'), ''), coalesce(trim(p_invoice->>'store_number'), ''), trim(p_invoice->>'store_name'), (p_invoice->>'invoice_date')::date, coalesce(trim(p_invoice->>'po_number'), ''), coalesce(trim(p_invoice->>'goods_receiving_number'), ''), calculated_total, coalesce(trim(p_invoice->>'notes'), ''), p_actor_id);

  insert into public.invoice_items(invoice_id, position, mgm_code, subsys_code, article_name, unit, quantity_millis, rate_paisa, total_paisa)
  select new_id, ordinality::integer - 1, coalesce(item->>'mgm_code',''), coalesce(item->>'subsys_code',''), item->>'article_name', coalesce(item->>'unit','Kg'), (item->>'quantity_millis')::bigint, (item->>'rate_paisa')::bigint, (item->>'total_paisa')::bigint
  from jsonb_array_elements(p_items) with ordinality as rows(item, ordinality);

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details) values (p_actor_id, 'created', 'invoice', new_id::text, jsonb_build_object('invoice_number', p_invoice->>'invoice_number'));
  return new_id;
end;
$$;

create or replace function public.set_invoice_status(p_actor_id text, p_invoice_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists(select 1 from public.app_users where id = p_actor_id and role = 'owner') then raise exception 'Owner access required'; end if;
  if p_status not in ('issued', 'cancelled') then raise exception 'Invalid status'; end if;
  update public.invoices set status = p_status, updated_at = now() where id = p_invoice_id;
  if not found then raise exception 'Invoice not found'; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details) values (p_actor_id, p_status, 'invoice', p_invoice_id::text, '{}'::jsonb);
end;
$$;

create or replace function public.update_invoice(p_actor_id text, p_invoice_id uuid, p_invoice jsonb, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  calculated_total bigint;
begin
  if not exists(select 1 from public.app_users where id = p_actor_id and role = 'owner') then raise exception 'Owner access required'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'At least one item is required'; end if;
  if exists(select 1 from public.invoices where id = p_invoice_id and status = 'cancelled') then raise exception 'A cancelled invoice cannot be edited'; end if;

  select coalesce(sum((item->>'total_paisa')::bigint), 0) into calculated_total from jsonb_array_elements(p_items) item;
  update public.invoices
  set invoice_number = trim(p_invoice->>'invoice_number'),
      customer_name = trim(p_invoice->>'customer_name'),
      customer_city = coalesce(trim(p_invoice->>'customer_city'), ''),
      supplier_number = coalesce(trim(p_invoice->>'supplier_number'), ''),
      store_number = coalesce(trim(p_invoice->>'store_number'), ''),
      store_name = trim(p_invoice->>'store_name'),
      invoice_date = (p_invoice->>'invoice_date')::date,
      po_number = coalesce(trim(p_invoice->>'po_number'), ''),
      goods_receiving_number = coalesce(trim(p_invoice->>'goods_receiving_number'), ''),
      total_paisa = calculated_total,
      notes = coalesce(trim(p_invoice->>'notes'), ''),
      updated_at = now()
  where id = p_invoice_id;
  if not found then raise exception 'Invoice not found'; end if;

  delete from public.invoice_items where invoice_id = p_invoice_id;
  insert into public.invoice_items(invoice_id, position, mgm_code, subsys_code, article_name, unit, quantity_millis, rate_paisa, total_paisa)
  select p_invoice_id, ordinality::integer - 1, coalesce(item->>'mgm_code',''), coalesce(item->>'subsys_code',''), item->>'article_name', coalesce(item->>'unit','Kg'), (item->>'quantity_millis')::bigint, (item->>'rate_paisa')::bigint, (item->>'total_paisa')::bigint
  from jsonb_array_elements(p_items) with ordinality as rows(item, ordinality);

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'updated', 'invoice', p_invoice_id::text, jsonb_build_object('invoice_number', p_invoice->>'invoice_number'));
end;
$$;

create or replace function public.record_payment(p_actor_id text, p_payment jsonb, p_allocations jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid := gen_random_uuid();
  payment_total bigint := (p_payment->>'amount_paisa')::bigint;
  allocation_total bigint;
  allocation jsonb;
  current_balance bigint;
  invoice_customer text;
begin
  if not exists(select 1 from public.app_users where id = p_actor_id and role = 'owner') then raise exception 'Owner access required'; end if;
  select coalesce(sum((item->>'amount_paisa')::bigint), 0) into allocation_total from jsonb_array_elements(p_allocations) item;
  if payment_total <= 0 or allocation_total <> payment_total then raise exception 'The full payment must be allocated manually'; end if;
  if exists(select 1 from jsonb_array_elements(p_allocations) item where (item->>'amount_paisa')::bigint <= 0) then
    raise exception 'Every allocation must be greater than zero';
  end if;
  if (select count(*) <> count(distinct item->>'invoice_id') from jsonb_array_elements(p_allocations) item) then
    raise exception 'Each invoice can only be selected once';
  end if;

  for allocation in select * from jsonb_array_elements(p_allocations)
  loop
    select i.customer_name into invoice_customer
      from public.invoices i
      where i.id = (allocation->>'invoice_id')::uuid and i.status = 'issued'
      for update;
    if not found then raise exception 'Invoice is not available for payment'; end if;

    select i.total_paisa - coalesce(sum(pa.amount_paisa), 0)
      into current_balance
      from public.invoices i
      left join public.payment_allocations pa on pa.invoice_id = i.id
      where i.id = (allocation->>'invoice_id')::uuid
      group by i.id;

    if invoice_customer <> p_payment->>'customer_name' then raise exception 'All allocations must belong to the selected customer'; end if;
    if (allocation->>'amount_paisa')::bigint > current_balance then raise exception 'Allocation exceeds an invoice balance'; end if;
  end loop;

  insert into public.payments(id, customer_name, payment_date, amount_paisa, reference_number, notes, created_by)
  values (new_id, p_payment->>'customer_name', (p_payment->>'payment_date')::date, payment_total, coalesce(trim(p_payment->>'reference_number'), ''), coalesce(trim(p_payment->>'notes'), ''), p_actor_id);

  insert into public.payment_allocations(payment_id, invoice_id, amount_paisa)
  select new_id, (item->>'invoice_id')::uuid, (item->>'amount_paisa')::bigint from jsonb_array_elements(p_allocations) item;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details) values (p_actor_id, 'recorded', 'payment', new_id::text, jsonb_build_object('amount_paisa', payment_total));
  return new_id;
end;
$$;

revoke all on function public.ensure_app_user(text,text,text), public.create_invoice(text,jsonb,jsonb), public.update_invoice(text,uuid,jsonb,jsonb), public.set_invoice_status(text,uuid,text), public.record_payment(text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.ensure_app_user(text,text,text), public.create_invoice(text,jsonb,jsonb), public.update_invoice(text,uuid,jsonb,jsonb), public.set_invoice_status(text,uuid,text), public.record_payment(text,jsonb,jsonb) to service_role;
