alter type public.receipt_source add value if not exists 'invoice_initial_payment';

begin;

alter table public.customer_receipts
  alter column customer_id drop not null;

alter table public.customer_receipts
  add constraint customer_receipts_customer_or_initial_payment_check
    check (customer_id is not null or source::text = 'invoice_initial_payment'),
  add constraint customer_receipts_initial_payment_invoice_check
    check (source::text <> 'invoice_initial_payment' or source_invoice_id is not null);

create unique index customer_receipts_unique_active_invoice_source
  on public.customer_receipts (source_invoice_id)
  where source_invoice_id is not null and deleted_at is null;

alter function public.update_invoice_with_items(uuid, jsonb, jsonb)
  rename to update_invoice_with_items_v1;

create or replace function public.create_invoice_with_initial_payment(
  p_invoice jsonb,
  p_items jsonb,
  p_initial_payment jsonb default '{"mode":"none"}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invoice_id_value uuid := coalesce(public.try_uuid(p_invoice ->> 'id'), gen_random_uuid());
  invoice_number_value text := btrim(coalesce(p_invoice ->> 'invoiceNumber', ''));
  mode_value text := coalesce(nullif(btrim(p_initial_payment ->> 'mode'), ''), 'none');
  amount_value numeric;
  total_value numeric;
  customer_id_value uuid;
  customer_name_value text;
  payment_method_value public.payment_method;
  receipt_id_value uuid := coalesce(public.try_uuid(p_initial_payment ->> 'id'), gen_random_uuid());
  receipt_record public.customer_receipts%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(invoice_id_value::text, 0));

  if exists (select 1 from public.invoices where id = invoice_id_value) then
    if not exists (
      select 1 from public.invoices
      where id = invoice_id_value and invoice_number = invoice_number_value
    ) then
      raise exception 'معرف الفاتورة مستخدم لفاتورة أخرى' using errcode = '23505';
    end if;
    select * into receipt_record
    from public.customer_receipts
    where source_invoice_id = invoice_id_value
      and source::text = 'invoice_initial_payment'
      and deleted_at is null;
    return jsonb_build_object(
      'invoice', public.invoice_with_items(invoice_id_value),
      'initial_receipt', case when receipt_record.id is null then null else to_jsonb(receipt_record) end
    );
  end if;

  if mode_value not in ('none', 'deferred', 'partial', 'paid') then
    raise exception 'خيار الدفعة الأولية غير صالح' using errcode = '22023';
  end if;

  perform public.create_invoice_with_items(p_invoice, p_items);

  select invoice_total, customer_id,
    coalesce(nullif(customer_name_snapshot, ''), 'عميل نقدي')
  into total_value, customer_id_value, customer_name_value
  from public.invoices
  where id = invoice_id_value;

  if mode_value in ('partial', 'paid') then
    if mode_value = 'partial' then
      amount_value := nullif(p_initial_payment ->> 'amount', '')::numeric;
      if amount_value is null or amount_value <= 0 then
        raise exception 'أدخل مبلغًا أكبر من صفر' using errcode = '22023';
      end if;
      if amount_value >= total_value then
        raise exception 'المبلغ الجزئي يجب أن يكون أقل من إجمالي الفاتورة' using errcode = '22023';
      end if;
    else
      if total_value <= 0 then
        raise exception 'إجمالي الفاتورة يجب أن يكون أكبر من صفر لتسجيل السداد الكامل' using errcode = '22023';
      end if;
      amount_value := total_value;
    end if;

    if amount_value > total_value then
      raise exception 'لا يمكن أن تتجاوز الدفعة إجمالي الفاتورة' using errcode = '22023';
    end if;

    payment_method_value := coalesce(
      nullif(p_initial_payment ->> 'paymentMethod', '')::public.payment_method,
      'cash'::public.payment_method
    );

    insert into public.customer_receipts (
      id, receipt_number, customer_id, customer_name_snapshot, date, amount,
      payment_method, reference_number, notes, source, source_invoice_id,
      created_at, updated_at
    )
    values (
      receipt_id_value,
      'INIT-' || invoice_id_value::text,
      customer_id_value,
      customer_name_value,
      (p_invoice ->> 'invoiceDate')::date,
      amount_value,
      payment_method_value,
      nullif(btrim(p_initial_payment ->> 'reference'), ''),
      'دفعة أولية عند إنشاء الفاتورة ' || invoice_number_value,
      'invoice_initial_payment'::public.receipt_source,
      invoice_id_value,
      now(),
      now()
    )
    returning * into receipt_record;
  end if;

  return jsonb_build_object(
    'invoice', public.invoice_with_items(invoice_id_value),
    'initial_receipt', case when receipt_record.id is null then null else to_jsonb(receipt_record) end
  );
end;
$$;

create or replace function public.update_invoice_with_items(
  p_id uuid,
  p_invoice jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result_value jsonb;
  invoice_total_value numeric;
  receipts_total_value numeric;
begin
  result_value := public.update_invoice_with_items_v1(p_id, p_invoice, p_items);

  select invoice_total into invoice_total_value
  from public.invoices
  where id = p_id;

  select coalesce(sum(amount), 0) into receipts_total_value
  from public.customer_receipts
  where source_invoice_id = p_id and deleted_at is null;

  if invoice_total_value < receipts_total_value then
    raise exception 'لا يمكن جعل إجمالي الفاتورة أقل من إجمالي سندات القبض المرتبطة بها'
      using errcode = '22023';
  end if;

  return result_value;
end;
$$;

revoke execute on function public.update_invoice_with_items_v1(uuid, jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function public.create_invoice_with_initial_payment(jsonb, jsonb, jsonb)
  from public, anon, authenticated;
revoke execute on function public.update_invoice_with_items(uuid, jsonb, jsonb)
  from public, anon, authenticated;

grant execute on function public.create_invoice_with_initial_payment(jsonb, jsonb, jsonb)
  to service_role;
grant execute on function public.update_invoice_with_items(uuid, jsonb, jsonb)
  to service_role;

update public.app_meta
set value = jsonb_set(value, '{version}', '2'::jsonb, true)
where key = 'schema_version';

commit;
