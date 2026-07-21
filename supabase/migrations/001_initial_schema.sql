begin;

create extension if not exists pgcrypto;

create type public.lead_status as enum ('new', 'contacted', 'interested', 'converted', 'not_interested');
create type public.payment_method as enum ('cash', 'bank_transfer', 'other');
create type public.receipt_source as enum ('manual', 'legacy_invoice_payment');
create type public.cost_source as enum ('auto', 'manual');

create table public.pressure_costs (
  id uuid primary key default gen_random_uuid(),
  pressure numeric not null unique check (pressure > 0 and pressure < 1000000),
  standard_block_cost numeric not null check (standard_block_cost >= 0 and standard_block_cost < 1000000000000),
  standard_length_cm numeric not null default 100 check (standard_length_cm > 0 and standard_length_cm < 1000000),
  standard_width_cm numeric not null default 120 check (standard_width_cm > 0 and standard_width_cm < 1000000),
  standard_height_cm numeric not null default 400 check (standard_height_cm > 0 and standard_height_cm < 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  normalized_name text not null check (btrim(normalized_name) <> ''),
  phone text,
  normalized_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (phone is null or btrim(phone) <> ''),
  check (normalized_phone is null or btrim(normalized_phone) <> '')
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique check (btrim(invoice_number) <> ''),
  customer_id uuid references public.customers(id) on delete set null,
  customer_name_snapshot text not null default '',
  customer_phone_snapshot text,
  seller_name_snapshot text not null default '',
  invoice_date date not null,
  delivery_date date,
  delivery_fee numeric not null default 0 check (delivery_fee >= 0 and delivery_fee < 1000000000000),
  subtotal numeric not null default 0 check (subtotal >= 0 and subtotal < 1000000000000),
  total_cost numeric not null default 0 check (total_cost >= 0 and total_cost < 1000000000000),
  invoice_total numeric not null default 0 check (invoice_total >= 0 and invoice_total < 1000000000000),
  net_profit numeric not null default 0 check (abs(net_profit) < 1000000000000),
  profit_margin numeric not null default 0 check (abs(profit_margin) < 1000000),
  schema_version integer not null default 3 check (schema_version > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (delivery_date is null or delivery_date >= invoice_date),
  check (customer_phone_snapshot is null or btrim(customer_phone_snapshot) <> '')
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  length_cm numeric not null check (length_cm > 0 and length_cm < 1000000),
  width_cm numeric not null check (width_cm > 0 and width_cm < 1000000),
  height_cm numeric not null check (height_cm > 0 and height_cm < 1000000),
  density_pressure numeric not null check (density_pressure > 0 and density_pressure < 1000000),
  quantity numeric not null check (quantity > 0 and quantity < 1000000000 and quantity = trunc(quantity)),
  unit_sale_price numeric not null check (unit_sale_price >= 0 and unit_sale_price < 1000000000000),
  unit_cost numeric not null check (unit_cost >= 0 and unit_cost < 1000000000000),
  cost_source public.cost_source not null default 'auto',
  product_subtotal numeric not null check (product_subtotal >= 0 and product_subtotal < 1000000000000),
  total_cost numeric not null check (total_cost >= 0 and total_cost < 1000000000000),
  net_profit numeric not null check (abs(net_profit) < 1000000000000),
  weight_kg numeric check (weight_kg is null or (weight_kg > 0 and weight_kg < 1000000000)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique check (btrim(receipt_number) <> ''),
  customer_id uuid not null references public.customers(id) on delete restrict,
  customer_name_snapshot text not null check (btrim(customer_name_snapshot) <> ''),
  date date not null,
  amount numeric not null check (amount > 0 and amount < 1000000000000),
  payment_method public.payment_method not null,
  reference_number text,
  notes text,
  source public.receipt_source not null default 'manual',
  source_invoice_id uuid references public.invoices(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (source <> 'legacy_invoice_payment' or source_invoice_id is not null)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  phone text not null check (btrim(phone) <> ''),
  normalized_phone text not null check (btrim(normalized_phone) <> ''),
  source text not null check (source in ('call', 'whatsapp', 'visit', 'referral', 'ad', 'exhibition', 'website', 'other')),
  custom_source text,
  notes text,
  status public.lead_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check ((source = 'other' and btrim(coalesce(custom_source, '')) <> '') or (source <> 'other' and custom_source is null))
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  source text not null default 'foamsales_app',
  created_at timestamptz not null default now()
);

create table public.app_meta (
  key text primary key check (btrim(key) <> ''),
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index customer_receipts_unique_legacy_source
  on public.customer_receipts (source_invoice_id)
  where source = 'legacy_invoice_payment' and deleted_at is null;
create unique index leads_unique_active_normalized_phone
  on public.leads (normalized_phone)
  where deleted_at is null;
create index customers_normalized_name_idx on public.customers (normalized_name);
create index customers_normalized_phone_idx on public.customers (normalized_phone) where normalized_phone is not null;
create index invoices_invoice_date_idx on public.invoices (invoice_date desc) where deleted_at is null;
create index invoices_customer_id_idx on public.invoices (customer_id) where deleted_at is null;
create index invoices_seller_name_idx on public.invoices (seller_name_snapshot) where deleted_at is null;
create index invoices_deleted_at_idx on public.invoices (deleted_at);
create index invoice_items_invoice_id_idx on public.invoice_items (invoice_id);
create index customer_receipts_customer_id_idx on public.customer_receipts (customer_id) where deleted_at is null;
create index customer_receipts_date_idx on public.customer_receipts (date desc) where deleted_at is null;
create index customer_receipts_source_invoice_id_idx on public.customer_receipts (source_invoice_id);
create index customer_receipts_deleted_at_idx on public.customer_receipts (deleted_at);
create index leads_status_idx on public.leads (status) where deleted_at is null;
create index leads_source_idx on public.leads (source) where deleted_at is null;
create index leads_deleted_at_idx on public.leads (deleted_at);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pressure_costs_set_updated_at before update on public.pressure_costs for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger invoices_set_updated_at before update on public.invoices for each row execute function public.set_updated_at();
create trigger invoice_items_set_updated_at before update on public.invoice_items for each row execute function public.set_updated_at();
create trigger customer_receipts_set_updated_at before update on public.customer_receipts for each row execute function public.set_updated_at();
create trigger leads_set_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger app_meta_set_updated_at before update on public.app_meta for each row execute function public.set_updated_at();

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  record_id uuid;
begin
  if tg_op = 'DELETE' then
    record_id := old.id;
    insert into public.audit_logs (action, entity_type, entity_id, old_data)
    values (lower(tg_op), tg_table_name, record_id, to_jsonb(old));
    return old;
  elsif tg_op = 'INSERT' then
    record_id := new.id;
    insert into public.audit_logs (action, entity_type, entity_id, new_data)
    values (lower(tg_op), tg_table_name, record_id, to_jsonb(new));
    return new;
  end if;
  record_id := new.id;
  insert into public.audit_logs (action, entity_type, entity_id, old_data, new_data)
  values (lower(tg_op), tg_table_name, record_id, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

create trigger pressure_costs_audit after insert or update or delete on public.pressure_costs for each row execute function public.write_audit_log();
create trigger customers_audit after insert or update or delete on public.customers for each row execute function public.write_audit_log();
create trigger invoices_audit after insert or update or delete on public.invoices for each row execute function public.write_audit_log();
create trigger invoice_items_audit after insert or update or delete on public.invoice_items for each row execute function public.write_audit_log();
create trigger customer_receipts_audit after insert or update or delete on public.customer_receipts for each row execute function public.write_audit_log();
create trigger leads_audit after insert or update or delete on public.leads for each row execute function public.write_audit_log();

create or replace function public.try_uuid(value text)
returns uuid
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  return value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create or replace function public.normalize_name(value text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select regexp_replace(btrim(coalesce(value, '')), '[[:space:]]+', ' ', 'g');
$$;

create or replace function public.normalize_phone(value text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select nullif(
    (case when left(btrim(coalesce(value, '')), 1) = '+' then '+' else '' end) ||
    regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g'),
    ''
  );
$$;

create or replace function public.ensure_customer(customer_name text, customer_phone text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_name_value text := public.normalize_name(customer_name);
  normalized_phone_value text := public.normalize_phone(customer_phone);
  customer_id_value uuid;
begin
  if normalized_name_value = '' then
    return null;
  end if;
  select id into customer_id_value
  from public.customers
  where normalized_name = normalized_name_value
  order by updated_at desc
  limit 1;
  if customer_id_value is null then
    insert into public.customers (name, normalized_name, phone, normalized_phone)
    values (normalized_name_value, normalized_name_value, normalized_phone_value, normalized_phone_value)
    returning id into customer_id_value;
  elsif normalized_phone_value is not null then
    update public.customers
    set phone = normalized_phone_value, normalized_phone = normalized_phone_value
    where id = customer_id_value;
  end if;
  return customer_id_value;
end;
$$;

create or replace function public.replace_invoice_items(invoice_id_value uuid, items_value jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  item_id_value uuid;
  length_value numeric;
  width_value numeric;
  height_value numeric;
  pressure_value numeric;
  quantity_value numeric;
  sale_price_value numeric;
  unit_cost_value numeric;
  block_cost_value numeric;
  standard_length_value numeric;
  standard_width_value numeric;
  standard_height_value numeric;
  source_value public.cost_source;
  subtotal_value numeric;
  total_cost_value numeric;
begin
  if jsonb_typeof(items_value) <> 'array' or jsonb_array_length(items_value) = 0 then
    raise exception 'يجب إضافة صنف واحد على الأقل' using errcode = '22023';
  end if;
  delete from public.invoice_items where invoice_id = invoice_id_value;
  for item in select value from jsonb_array_elements(items_value)
  loop
    item_id_value := coalesce(public.try_uuid(item ->> 'id'), gen_random_uuid());
    length_value := (item ->> 'lengthCm')::numeric;
    width_value := (item ->> 'widthCm')::numeric;
    height_value := (item ->> 'heightCm')::numeric;
    pressure_value := (item ->> 'densityPressure')::numeric;
    quantity_value := (item ->> 'quantity')::numeric;
    sale_price_value := (item ->> 'unitSalePrice')::numeric;
    source_value := coalesce((item ->> 'costSource')::public.cost_source, 'auto');
    if length_value <= 0 or width_value <= 0 or height_value <= 0 then
      raise exception 'أبعاد الصنف يجب أن تكون أكبر من صفر' using errcode = '22023';
    end if;
    if quantity_value <= 0 or quantity_value <> trunc(quantity_value) then
      raise exception 'كمية الصنف يجب أن تكون عددًا صحيحًا أكبر من صفر' using errcode = '22023';
    end if;
    if sale_price_value < 0 then
      raise exception 'سعر بيع الوحدة لا يمكن أن يكون سالبًا' using errcode = '22023';
    end if;
    if source_value = 'auto' then
      select standard_block_cost, standard_length_cm, standard_width_cm, standard_height_cm
      into block_cost_value, standard_length_value, standard_width_value, standard_height_value
      from public.pressure_costs where pressure = pressure_value;
      if not found then
        raise exception 'تكلفة الضغط % غير مسجلة في مركز التكلفة', pressure_value using errcode = '22023';
      end if;
      unit_cost_value := round(block_cost_value * ((length_value * width_value * height_value) / (standard_length_value * standard_width_value * standard_height_value)), 2);
    else
      unit_cost_value := (item ->> 'unitCost')::numeric;
      if unit_cost_value < 0 then
        raise exception 'تكلفة الوحدة اليدوية لا يمكن أن تكون سالبة' using errcode = '22023';
      end if;
    end if;
    subtotal_value := round(sale_price_value * quantity_value, 2);
    total_cost_value := round(unit_cost_value * quantity_value, 2);
    insert into public.invoice_items (
      id, invoice_id, length_cm, width_cm, height_cm, density_pressure, quantity,
      unit_sale_price, unit_cost, cost_source, product_subtotal, total_cost, net_profit, weight_kg,
      created_at, updated_at
    ) values (
      item_id_value, invoice_id_value, length_value, width_value, height_value, pressure_value, quantity_value,
      sale_price_value, unit_cost_value, source_value, subtotal_value, total_cost_value,
      round(subtotal_value - total_cost_value, 2), nullif(item ->> 'weightKg', '')::numeric,
      coalesce((item ->> 'createdAt')::timestamptz, now()), coalesce((item ->> 'updatedAt')::timestamptz, now())
    );
  end loop;
end;
$$;

create or replace function public.recalculate_invoice(invoice_id_value uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  subtotal_value numeric;
  total_cost_value numeric;
  total_value numeric;
  profit_value numeric;
begin
  select coalesce(sum(product_subtotal), 0), coalesce(sum(total_cost), 0)
  into subtotal_value, total_cost_value
  from public.invoice_items where invoice_id = invoice_id_value;
  select round(subtotal_value + delivery_fee, 2) into total_value from public.invoices where id = invoice_id_value;
  profit_value := round(total_value - total_cost_value, 2);
  update public.invoices set
    subtotal = round(subtotal_value, 2),
    total_cost = round(total_cost_value, 2),
    invoice_total = total_value,
    net_profit = profit_value,
    profit_margin = case when total_value > 0 then round((profit_value / total_value) * 100, 2) else 0 end
  where id = invoice_id_value;
end;
$$;

create or replace function public.invoice_with_items(invoice_id_value uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select to_jsonb(i) || jsonb_build_object(
    'invoice_items', coalesce((select jsonb_agg(to_jsonb(ii) order by ii.created_at, ii.id) from public.invoice_items ii where ii.invoice_id = i.id), '[]'::jsonb)
  ) from public.invoices i where i.id = invoice_id_value;
$$;

create or replace function public.create_invoice_with_items(p_invoice jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invoice_id_value uuid := coalesce(public.try_uuid(p_invoice ->> 'id'), gen_random_uuid());
  invoice_number_value text := btrim(coalesce(p_invoice ->> 'invoiceNumber', ''));
  customer_name_value text := public.normalize_name(p_invoice ->> 'customerName');
  customer_phone_value text := public.normalize_phone(p_invoice ->> 'customerPhone');
  customer_id_value uuid;
  delivery_fee_value numeric := coalesce((p_invoice ->> 'deliveryFee')::numeric, 0);
begin
  if invoice_number_value = '' then raise exception 'رقم الفاتورة مطلوب' using errcode = '22023'; end if;
  if delivery_fee_value < 0 then raise exception 'رسوم التوصيل لا يمكن أن تكون سالبة' using errcode = '22023'; end if;
  customer_id_value := public.ensure_customer(customer_name_value, customer_phone_value);
  insert into public.invoices (
    id, invoice_number, customer_id, customer_name_snapshot, customer_phone_snapshot,
    seller_name_snapshot, invoice_date, delivery_date, delivery_fee, schema_version, notes,
    created_at, updated_at
  ) values (
    invoice_id_value, invoice_number_value, customer_id_value, customer_name_value, customer_phone_value,
    public.normalize_name(p_invoice ->> 'sellerName'), (p_invoice ->> 'invoiceDate')::date,
    nullif(p_invoice ->> 'deliveryDate', '')::date, delivery_fee_value,
    coalesce((p_invoice ->> 'schemaVersion')::integer, 3), nullif(btrim(p_invoice ->> 'notes'), ''),
    coalesce((p_invoice ->> 'createdAt')::timestamptz, now()), coalesce((p_invoice ->> 'updatedAt')::timestamptz, now())
  );
  perform public.replace_invoice_items(invoice_id_value, p_items);
  perform public.recalculate_invoice(invoice_id_value);
  return public.invoice_with_items(invoice_id_value);
end;
$$;

create or replace function public.update_invoice_with_items(p_id uuid, p_invoice jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  customer_name_value text := public.normalize_name(p_invoice ->> 'customerName');
  customer_phone_value text := public.normalize_phone(p_invoice ->> 'customerPhone');
  customer_id_value uuid;
  delivery_fee_value numeric := coalesce((p_invoice ->> 'deliveryFee')::numeric, 0);
begin
  if not exists (select 1 from public.invoices where id = p_id and deleted_at is null) then
    raise exception 'الفاتورة غير موجودة' using errcode = 'P0002';
  end if;
  if delivery_fee_value < 0 then raise exception 'رسوم التوصيل لا يمكن أن تكون سالبة' using errcode = '22023'; end if;
  customer_id_value := public.ensure_customer(customer_name_value, customer_phone_value);
  update public.invoices set
    invoice_number = btrim(p_invoice ->> 'invoiceNumber'),
    customer_id = customer_id_value,
    customer_name_snapshot = customer_name_value,
    customer_phone_snapshot = customer_phone_value,
    seller_name_snapshot = public.normalize_name(p_invoice ->> 'sellerName'),
    invoice_date = (p_invoice ->> 'invoiceDate')::date,
    delivery_date = nullif(p_invoice ->> 'deliveryDate', '')::date,
    delivery_fee = delivery_fee_value,
    schema_version = coalesce((p_invoice ->> 'schemaVersion')::integer, schema_version),
    notes = nullif(btrim(p_invoice ->> 'notes'), '')
  where id = p_id;
  perform public.replace_invoice_items(p_id, p_items);
  perform public.recalculate_invoice(p_id);
  return public.invoice_with_items(p_id);
end;
$$;

create or replace function public.soft_delete_invoice(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.invoices set deleted_at = now() where id = p_id and deleted_at is null;
  if not found then raise exception 'الفاتورة غير موجودة أو محذوفة مسبقًا' using errcode = 'P0002'; end if;
  return public.invoice_with_items(p_id);
end;
$$;

create or replace function public.restore_invoice(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.invoices set deleted_at = null where id = p_id and deleted_at is not null;
  if not found then raise exception 'الفاتورة غير موجودة أو غير محذوفة' using errcode = 'P0002'; end if;
  return public.invoice_with_items(p_id);
end;
$$;

create or replace function public.customer_outstanding_balance(customer_id_value uuid, excluded_receipt_id uuid default null)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select round(
    coalesce((select sum(invoice_total) from public.invoices where customer_id = customer_id_value and deleted_at is null), 0) -
    coalesce((select sum(amount) from public.customer_receipts where customer_id = customer_id_value and deleted_at is null and (excluded_receipt_id is null or id <> excluded_receipt_id)), 0),
    2
  );
$$;

create or replace function public.create_customer_receipt(p_receipt jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  receipt_id_value uuid := coalesce(public.try_uuid(p_receipt ->> 'id'), gen_random_uuid());
  customer_name_value text := public.normalize_name(p_receipt ->> 'customerName');
  customer_id_value uuid;
  amount_value numeric := (p_receipt ->> 'amount')::numeric;
  source_value public.receipt_source := coalesce((p_receipt ->> 'source')::public.receipt_source, 'manual');
  source_invoice_value uuid := public.try_uuid(p_receipt ->> 'sourceInvoiceId');
begin
  if customer_name_value = '' then raise exception 'اسم العميل مطلوب' using errcode = '22023'; end if;
  customer_id_value := public.ensure_customer(customer_name_value, null);
  if amount_value <= 0 then raise exception 'مبلغ السند يجب أن يكون أكبر من صفر' using errcode = '22023'; end if;
  if amount_value > public.customer_outstanding_balance(customer_id_value) then
    raise exception 'مبلغ السند لا يمكن أن يتجاوز مديونية العميل' using errcode = '22023';
  end if;
  if source_value = 'legacy_invoice_payment' and not exists (select 1 from public.invoices where id = source_invoice_value) then
    raise exception 'الفاتورة المصدر للسند القديم غير موجودة' using errcode = '23503';
  end if;
  insert into public.customer_receipts (
    id, receipt_number, customer_id, customer_name_snapshot, date, amount, payment_method,
    reference_number, notes, source, source_invoice_id, created_at, updated_at
  ) values (
    receipt_id_value, btrim(p_receipt ->> 'receiptNumber'), customer_id_value, customer_name_value,
    (p_receipt ->> 'date')::date, amount_value, (p_receipt ->> 'paymentMethod')::public.payment_method,
    nullif(btrim(p_receipt ->> 'reference'), ''), nullif(btrim(p_receipt ->> 'notes'), ''), source_value,
    source_invoice_value, coalesce((p_receipt ->> 'createdAt')::timestamptz, now()),
    coalesce((p_receipt ->> 'updatedAt')::timestamptz, now())
  );
  return to_jsonb((select r from public.customer_receipts r where r.id = receipt_id_value));
end;
$$;

create or replace function public.update_customer_receipt(p_id uuid, p_receipt jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  customer_name_value text := public.normalize_name(p_receipt ->> 'customerName');
  customer_id_value uuid;
  amount_value numeric := (p_receipt ->> 'amount')::numeric;
begin
  if not exists (select 1 from public.customer_receipts where id = p_id and deleted_at is null) then
    raise exception 'سند القبض غير موجود' using errcode = 'P0002';
  end if;
  customer_id_value := public.ensure_customer(customer_name_value, null);
  if amount_value <= 0 then raise exception 'مبلغ السند يجب أن يكون أكبر من صفر' using errcode = '22023'; end if;
  if amount_value > public.customer_outstanding_balance(customer_id_value, p_id) then
    raise exception 'مبلغ السند لا يمكن أن يتجاوز مديونية العميل' using errcode = '22023';
  end if;
  update public.customer_receipts set
    receipt_number = btrim(p_receipt ->> 'receiptNumber'), customer_id = customer_id_value,
    customer_name_snapshot = customer_name_value, date = (p_receipt ->> 'date')::date,
    amount = amount_value, payment_method = (p_receipt ->> 'paymentMethod')::public.payment_method,
    reference_number = nullif(btrim(p_receipt ->> 'reference'), ''), notes = nullif(btrim(p_receipt ->> 'notes'), '')
  where id = p_id;
  return to_jsonb((select r from public.customer_receipts r where r.id = p_id));
end;
$$;

create or replace function public.soft_delete_customer_receipt(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.customer_receipts set deleted_at = now() where id = p_id and deleted_at is null;
  if not found then raise exception 'سند القبض غير موجود أو محذوف مسبقًا' using errcode = 'P0002'; end if;
  return to_jsonb((select r from public.customer_receipts r where r.id = p_id));
end;
$$;

create or replace function public.restore_customer_receipt(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  receipt_record public.customer_receipts%rowtype;
begin
  select * into receipt_record from public.customer_receipts where id = p_id and deleted_at is not null;
  if not found then raise exception 'سند القبض غير موجود أو غير محذوف' using errcode = 'P0002'; end if;
  if receipt_record.amount > public.customer_outstanding_balance(receipt_record.customer_id) then
    raise exception 'استرجاع السند سيتجاوز مديونية العميل' using errcode = '22023';
  end if;
  update public.customer_receipts set deleted_at = null where id = p_id;
  return to_jsonb((select r from public.customer_receipts r where r.id = p_id));
end;
$$;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 1, 'mode', 'single_user', 'installed_at', now()));

alter table public.pressure_costs enable row level security;
alter table public.customers enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.customer_receipts enable row level security;
alter table public.leads enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_meta enable row level security;

revoke all on all tables in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant execute on function public.create_invoice_with_items(jsonb, jsonb) to service_role;
grant execute on function public.update_invoice_with_items(uuid, jsonb, jsonb) to service_role;
grant execute on function public.soft_delete_invoice(uuid) to service_role;
grant execute on function public.restore_invoice(uuid) to service_role;
grant execute on function public.create_customer_receipt(jsonb) to service_role;
grant execute on function public.update_customer_receipt(uuid, jsonb) to service_role;
grant execute on function public.soft_delete_customer_receipt(uuid) to service_role;
grant execute on function public.restore_customer_receipt(uuid) to service_role;

commit;
