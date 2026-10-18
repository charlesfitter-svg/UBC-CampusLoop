-- Phase 2 upgrade: apply after 202610180001_marketplace.sql. Safe to reapply.
begin;

-- Keep normal editing intact; expired listings use the guarded relist RPC.
create or replace function public.save_listing(p_data jsonb, p_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result uuid; old public.listings; qty integer; photo text; deadline timestamptz;
begin
  if actor is null then raise exception 'Sign in to publish'; end if;
  qty := (p_data->>'quantity')::integer;
  photo := p_data->>'image_path';
  deadline := (p_data->>'expires_at')::timestamptz;
  if deadline <= now() or deadline > now() + interval '31 days' then raise exception 'Choose a future deadline within 31 days'; end if;
  if photo is null or split_part(photo, '/', 1) <> actor::text or photo !~ '^[a-f0-9-]+/[a-f0-9-]+\.(jpg|png|webp)$' then raise exception 'Invalid photo ownership'; end if;
  if not exists(select 1 from storage.objects where bucket_id = 'listing-images' and name = photo) then raise exception 'Upload the listing photo first'; end if;
  if p_data->>'category' = 'food' and deadline > now() + interval '2 days' then raise exception 'Food pickup must be within 48 hours'; end if;
  if p_id is not null then
    select * into old from public.listings where id = p_id for update;
    if not found or old.seller_id <> actor then raise exception 'Listing not found or not yours'; end if;
    if old.status <> 'active' then raise exception 'Removed listings cannot be edited'; end if;
    if old.expires_at <= now() then raise exception 'Use Relist item to renew an expired listing safely'; end if;
    if qty <> old.quantity and exists(select 1 from public.reservations where listing_id = p_id and status <> 'cancelled') then raise exception 'Quantity is fixed after reservations. Cancel reservations first.'; end if;
    update public.listings set title=p_data->>'title', description=p_data->>'description', category=p_data->>'category', subcategory=p_data->>'subcategory', price_cents=(p_data->>'price_cents')::integer,
      quantity=qty, available_quantity=case when qty = old.quantity then old.available_quantity else qty end,
      landmark=p_data->>'landmark', expires_at=deadline, image_path=photo, food_details=p_data->>'food_details'
    where id=p_id returning id into result;
    -- A reservation's price is a snapshot; prevent category changes altering recorded impact.
    if old.category <> p_data->>'category' and exists(select 1 from public.reservations where listing_id=p_id and status <> 'cancelled') then raise exception 'Category is fixed after reservations'; end if;
  else
    insert into public.listings(seller_id,seller_name,title,description,category,subcategory,price_cents,quantity,available_quantity,landmark,expires_at,image_path,food_details)
    values(actor,(select display_name from public.profiles where id=actor),p_data->>'title',p_data->>'description',p_data->>'category',p_data->>'subcategory',(p_data->>'price_cents')::integer,qty,qty,p_data->>'landmark',deadline,photo,p_data->>'food_details') returning id into result;
  end if;
  return result;
end; $$;

-- Only deadline and renewed food details change. The listing row lock serializes
-- this operation with reservations, cancellations, edits and duplicate relists.
create or replace function public.relist_listing(
  p_id uuid,
  p_expires_at timestamptz,
  p_food_confirmed boolean default false,
  p_food_details text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare item public.listings;
begin
  if auth.uid() is null then raise exception 'Sign in to relist'; end if;
  select * into item from public.listings where id=p_id for update;
  if not found or item.seller_id <> auth.uid() then raise exception 'Listing not found or not yours'; end if;
  if item.status <> 'active' or item.is_demo then raise exception 'Removed or sample listings cannot be relisted'; end if;
  if item.expires_at > now() then raise exception 'Only expired listings can be relisted'; end if;
  if exists(select 1 from public.reservations where listing_id=p_id and status='reserved') then
    raise exception 'Finish or cancel outstanding reservations before relisting. Existing pickup codes remain valid.';
  end if;
  if item.available_quantity <= 0 then raise exception 'No unclaimed inventory remains to relist'; end if;
  if p_expires_at is null or p_expires_at <= now() or p_expires_at > now() + interval '31 days' then
    raise exception 'Choose a future deadline within 31 days';
  end if;
  if item.category='food' then
    if p_expires_at > now() + interval '2 days' then raise exception 'Food pickup must be within 48 hours'; end if;
    if p_food_confirmed is not true or coalesce(length(trim(p_food_details)),0) < 5 then
      raise exception 'Reconfirm food suitability, contents, allergens and handling before relisting';
    end if;
  end if;
  update public.listings set expires_at=p_expires_at,
    food_details=case when item.category='food' then trim(p_food_details) else item.food_details end
    where id=p_id;
  return p_id;
end; $$;

revoke all on function public.relist_listing(uuid,timestamptz,boolean,text) from public, anon, authenticated;
grant execute on function public.relist_listing(uuid,timestamptz,boolean,text) to authenticated;
commit;
