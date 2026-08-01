-- Site settings became global in 20260722142313_global_public_site_settings.sql.
-- New user provisioning must not insert another row for the same section key,
-- otherwise the auth.users trigger aborts every signup with site_settings_pkey.
create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := btrim(coalesce(new.raw_user_meta_data ->> 'username', ''));
  v_username_normalized text;
begin
  if char_length(v_username) < 2 or char_length(v_username) > 32 or v_username ~ '[[:space:]@/]' then
    raise exception 'invalid username';
  end if;

  if new.email is null or char_length(new.email) < 3 then
    raise exception 'email is required';
  end if;

  v_username_normalized := lower(v_username);

  insert into public.profiles (id, username, username_normalized, display_name, avatar_color)
  values (
    new.id,
    v_username,
    v_username_normalized,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), v_username),
    '#525252'
  );

  insert into public.login_aliases (user_id, username_normalized, email_normalized)
  values (new.id, v_username_normalized, lower(btrim(new.email)));

  insert into public.compute_devices (user_id, device_code, name, compute, status, daily_yield, expires_at)
  values
    (new.id, 'A100-0427', 'NVIDIA A100 80G', '312 TFLOPS', '运行中', 96.84, current_date + 240),
    (new.id, 'H800-0186', 'NVIDIA H800 80G', '756 TFLOPS', '运行中', 188.26, current_date + 345),
    (new.id, '4090-1108', 'GeForce RTX 4090', '82.6 TFLOPS', '维护中', 28.12, current_date + 128),
    (new.id, 'L40S-0631', 'NVIDIA L40S 48G', '362 TFLOPS', '运行中', 116.70, current_date + 198);

  insert into public.rental_orders (user_id, order_no, product, period_months, amount, status, created_at)
  values
    (new.id, 'CO202607180086', 'NVIDIA H800 80G', 12, 128800, '已完成', timezone('utc', now()) - interval '4 days'),
    (new.id, 'CO202606020041', 'NVIDIA L40S 48G', 12, 68600, '已完成', timezone('utc', now()) - interval '50 days'),
    (new.id, 'CO202603180019', 'NVIDIA A100 80G', 12, 96800, '已完成', timezone('utc', now()) - interval '126 days');

  insert into public.earnings (user_id, amount, earned_on, status)
  select new.id, item.amount, current_date - ((item.day_offset - 1)::integer), '已结算'
  from unnest(array[328.40, 364.20, 341.80, 426.10, 462.70, 448.90, 532.60, 574.30, 548.10, 618.50, 636.80, 684.20, 668.40, 742.60]::numeric[])
    with ordinality as item(amount, day_offset);

  insert into public.transactions (user_id, transaction_type, reference, amount, status, occurred_at)
  values
    (new.id, '托管收益', 'H800-0186', 188.26, '已入账', timezone('utc', now()) - interval '18 minutes'),
    (new.id, '托管收益', 'L40S-0631', 116.70, '已入账', timezone('utc', now()) - interval '20 minutes'),
    (new.id, '周度结算', 'SET-0721', 2036.40, '已结算', timezone('utc', now()) - interval '1 day'),
    (new.id, '设备租用', 'CO202607180086', -128800.00, '已完成', timezone('utc', now()) - interval '4 days');

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
grant execute on function private.handle_new_auth_user() to supabase_auth_admin;
