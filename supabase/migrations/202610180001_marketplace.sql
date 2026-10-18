-- Run as postgres in Supabase SQL Editor or with `supabase db push`.
begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 60),
  preferred_landmark text not null default 'nest' check (preferred_landmark in ('nest','ikb','buchanan','sauder','totem','orchard','life')),
  account_type text not null default 'student' check (account_type in ('student','business'))
);
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id),
  seller_name text not null,
  title text not null check (length(title) between 3 and 100),
  description text not null check (length(description) between 10 and 1600),
  category text not null check (category in ('food','items')),
  subcategory text not null check (subcategory in ('Bakery','Meals','Produce','Textbooks','Furniture','Electronics','Home','Supplies','Other')),
  price_cents integer not null default 0 check (price_cents between 0 and 100000),
  quantity integer not null check (quantity between 1 and 100),
  available_quantity integer not null check (available_quantity between 0 and quantity),
  landmark text not null check (landmark in ('nest','ikb','buchanan','sauder','totem','orchard','life')),
  expires_at timestamptz not null,
  image_path text not null,
  food_details text check (length(food_details) <= 800),
  status text not null default 'active' check (status in ('active','removed')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  check (category <> 'food' or coalesce(length(trim(food_details)),0) >= 5),
  check ((category='food' and subcategory in ('Bakery','Meals','Produce','Other')) or (category='items' and subcategory in ('Textbooks','Furniture','Electronics','Home','Supplies','Other')))
);
create index listings_discovery on public.listings(status, expires_at desc);
create index listings_seller on public.listings(seller_id);
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  buyer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.profiles(id),
  quantity integer not null check (quantity between 1 and 100),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  status text not null default 'reserved' check (status in ('reserved','cancelled','completed')),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (buyer_id, idempotency_key),
  check (buyer_id <> seller_id),
  check ((status = 'completed') = (completed_at is not null))
);
create index reservations_listing on public.reservations(listing_id);
create index reservations_buyer on public.reservations(buyer_id, created_at desc);
create index reservations_seller on public.reservations(seller_id, created_at desc);
create table public.pickup_secrets (
  reservation_id uuid primary key references public.reservations(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id),
  code text not null,
  failed_attempts integer not null default 0
);
create table public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  hour timestamptz not null,
  requests integer not null check (requests between 1 and 8),
  primary key (user_id, hour)
);

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.reservations enable row level security;
alter table public.pickup_secrets enable row level security;
alter table public.ai_usage enable row level security;
-- Explicit grants: new tables are NOT automatically exposed in the owner's project.
revoke all on public.profiles, public.listings, public.reservations, public.pickup_secrets, public.ai_usage from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.listings to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.reservations to authenticated;
grant select (reservation_id, buyer_id, code) on public.pickup_secrets to authenticated;
create policy profiles_self_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_self_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy listings_public on public.listings for select to anon, authenticated using (status = 'active' or seller_id = (select auth.uid()));
create policy listings_reserved_access on public.listings for select to authenticated using (exists(select 1 from public.reservations r where r.listing_id=listings.id and r.buyer_id=(select auth.uid())));
create policy reservations_parties on public.reservations for select to authenticated using ((select auth.uid()) in (buyer_id, seller_id));
create policy pickup_buyer_only on public.pickup_secrets for select to authenticated using (buyer_id = (select auth.uid()));
-- No client write policies/grants for inventory, reservations, secrets or usage.

create function public.initialize_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name) values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), 'Campus neighbour'),60));
  return new;
end; $$;
create trigger campusloop_new_user after insert on auth.users for each row execute function public.initialize_profile();
-- Backfill accounts that predate this migration; never expose auth email.
insert into public.profiles(id, display_name) select id, left(coalesce(nullif(trim(raw_user_meta_data->>'display_name'),''),'Campus neighbour'),60) from auth.users on conflict do nothing;

create function public.save_listing(p_data jsonb, p_id uuid default null) returns uuid
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

create function public.remove_listing(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.listings set status='removed' where id=p_id and seller_id=auth.uid();
  if not found then raise exception 'Listing not found or not yours'; end if;
  -- Existing reservations remain manageable; seller must cancel or fulfil them.
end; $$;

create function public.reserve_listing(p_listing uuid, p_quantity integer, p_key uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); item public.listings; existing public.reservations; result uuid;
begin
  if actor is null then raise exception 'Sign in to reserve'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 100 or p_key is null then raise exception 'Invalid reservation quantity or retry key'; end if;
  -- Serialize every operation on this listing; no frontend race can oversell.
  select * into item from public.listings where id=p_listing for update;
  if not found then raise exception 'Listing not found'; end if;
  select * into existing from public.reservations where buyer_id=actor and idempotency_key=p_key;
  if found then
    if existing.listing_id <> p_listing or existing.quantity <> p_quantity then raise exception 'Retry key already used for a different request'; end if;
    return existing.id;
  end if;
  if item.is_demo then raise exception 'Sample listings cannot be reserved. Publish your own test listing.'; end if;
  if item.seller_id = actor then raise exception 'You cannot reserve your own listing'; end if;
  if item.status <> 'active' or item.expires_at <= now() then raise exception 'This listing is no longer available'; end if;
  if item.available_quantity < p_quantity then raise exception 'Not enough quantity available'; end if;
  insert into public.reservations(listing_id,buyer_id,seller_id,quantity,unit_price_cents,idempotency_key)
    values(p_listing,actor,item.seller_id,p_quantity,item.price_cents,p_key) returning id into result;
  insert into public.pickup_secrets(reservation_id,buyer_id,code) values(result,actor,upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)));
  update public.listings set available_quantity=available_quantity-p_quantity where id=p_listing;
  return result;
end; $$;

create function public.cancel_reservation(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare reservation public.reservations; target uuid;
begin
  select listing_id into target from public.reservations where id=p_id and auth.uid() in (buyer_id,seller_id);
  if not found then raise exception 'Reservation not found'; end if;
  perform 1 from public.listings where id=target for update;
  select * into reservation from public.reservations where id=p_id for update;
  if reservation.status = 'cancelled' then return; end if;
  if reservation.status <> 'reserved' then raise exception 'Completed pickups cannot be cancelled'; end if;
  update public.reservations set status='cancelled' where id=p_id;
  update public.listings set available_quantity=available_quantity+reservation.quantity where id=target;
end; $$;

create function public.complete_pickup(p_id uuid, p_code text) returns boolean language plpgsql security definer set search_path = '' as $$
declare reservation public.reservations; secret public.pickup_secrets;
begin
  select * into reservation from public.reservations where id=p_id and seller_id=auth.uid() for update;
  if not found then raise exception 'Only the seller can confirm this pickup'; end if;
  if reservation.status='completed' then return true; end if;
  if reservation.status<>'reserved' then raise exception 'This reservation is cancelled'; end if;
  select * into secret from public.pickup_secrets where reservation_id=p_id for update;
  if secret.failed_attempts >= 10 then raise exception 'Too many incorrect codes. Cancel and reserve again.'; end if;
  if upper(trim(p_code)) is distinct from secret.code then
    update public.pickup_secrets set failed_attempts=failed_attempts+1 where reservation_id=p_id;
    return false;
  end if;
  update public.reservations set status='completed', completed_at=now() where id=p_id;
  return true;
end; $$;

create function public.impact_totals() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('pickups',count(*),'food',coalesce(sum(r.quantity) filter(where l.category='food'),0),'items',coalesce(sum(r.quantity) filter(where l.category='items'),0))
  from public.reservations r join public.listings l on l.id=r.listing_id where r.status='completed' and not l.is_demo;
$$;
create function public.consume_ai_quota() returns boolean language plpgsql security definer set search_path = '' as $$
declare used integer;
begin
  if auth.uid() is null then raise exception 'Sign in to use AI'; end if;
  insert into public.ai_usage(user_id,hour,requests) values(auth.uid(),date_trunc('hour',now()),1)
  on conflict(user_id,hour) do update set requests=public.ai_usage.requests+1 where public.ai_usage.requests<8 returning requests into used;
  return used is not null;
end; $$;

-- PostgreSQL gives PUBLIC execute by default: explicitly revoke every privileged entrypoint.
revoke all on function public.initialize_profile() from public, anon, authenticated;
revoke all on function public.save_listing(jsonb,uuid), public.remove_listing(uuid), public.reserve_listing(uuid,integer,uuid), public.cancel_reservation(uuid), public.complete_pickup(uuid,text), public.consume_ai_quota(), public.impact_totals() from public, anon, authenticated;
grant execute on function public.save_listing(jsonb,uuid), public.remove_listing(uuid), public.reserve_listing(uuid,integer,uuid), public.cancel_reservation(uuid), public.complete_pickup(uuid,text), public.consume_ai_quota() to authenticated;
grant execute on function public.impact_totals() to anon, authenticated;
grant all on public.profiles,public.listings,public.reservations,public.pickup_secrets,public.ai_usage to service_role;

-- Public photos only; never upload sensitive/private material. Upload/delete only under uid/.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('listing-images','listing-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
create policy listing_photos_read on storage.objects for select to anon, authenticated using (bucket_id='listing-images');
create policy listing_photos_upload on storage.objects for insert to authenticated with check (bucket_id='listing-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy listing_photos_delete on storage.objects for delete to authenticated using (bucket_id='listing-images' and (storage.foldername(name))[1]=(select auth.uid())::text and not exists(select 1 from public.listings where image_path=name));
commit;
