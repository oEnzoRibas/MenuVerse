create type public.member_role as enum ('admin', 'kitchen');
create type public.order_status as enum ('received', 'preparing', 'ready', 'finished');

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 80)
);
create table public.restaurant_members (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null,
  primary key (restaurant_id, user_id)
);
create index on public.restaurant_members(user_id);
create table public.categories (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  position integer not null default 0 check (position between 0 and 999),
  active boolean not null default true,
  primary key (restaurant_id, id)
);
create table public.products (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  category_id uuid not null,
  name text not null check (char_length(name) between 2 and 80),
  description text not null check (char_length(description) between 2 and 280),
  price integer not null check (price between 1 and 1000000),
  image text not null check (image in ('hero','smash','bacon','fries','chicken','soda','brownie')),
  available boolean not null default true,
  featured boolean not null default false,
  ingredients text[] not null default '{}',
  primary key (restaurant_id, id),
  foreign key (restaurant_id, category_id) references public.categories(restaurant_id, id)
);
create index on public.products(restaurant_id, category_id);
create table public.product_options (
  restaurant_id uuid not null,
  product_id uuid not null,
  id text not null,
  name text not null,
  mode text not null check (mode in ('single', 'multiple')),
  required boolean not null default false,
  position integer not null,
  primary key (restaurant_id, product_id, id),
  foreign key (restaurant_id, product_id) references public.products(restaurant_id, id) on delete cascade
);
create table public.product_option_values (
  restaurant_id uuid not null,
  product_id uuid not null,
  group_id text not null,
  id text not null,
  name text not null,
  price integer not null check (price between 0 and 100000),
  position integer not null,
  primary key (restaurant_id, product_id, group_id, id),
  foreign key (restaurant_id, product_id, group_id) references public.product_options(restaurant_id, product_id, id) on delete cascade
);
create table public.business_settings (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  hours text not null check (char_length(hours) between 2 and 120),
  pickup boolean not null default true,
  delivery boolean not null default false,
  fee integer not null default 0 check (fee between 0 and 100000),
  constraint valid_mode check (pickup or delivery)
);
create table public.orders (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  id text not null default ('MV-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 12))),
  request_id uuid not null,
  tracking_hash text not null,
  created_at timestamptz not null default now(),
  customer text not null check (char_length(customer) between 2 and 80),
  mode text not null check (mode in ('pickup', 'delivery')),
  address text not null default '',
  notes text not null default '',
  status public.order_status not null default 'received',
  subtotal bigint not null check (subtotal >= 0),
  fee integer not null check (fee >= 0),
  total bigint generated always as (subtotal + fee) stored,
  primary key (restaurant_id, id),
  unique (restaurant_id, request_id)
);
create index on public.orders(restaurant_id, created_at desc);
create index on public.orders(restaurant_id, status, created_at);
create table public.order_items (
  restaurant_id uuid not null,
  order_id text not null,
  id integer not null,
  product_id uuid not null,
  name text not null,
  unit bigint not null check (unit >= 0),
  quantity integer not null check (quantity between 1 and 20),
  removed text[] not null default '{}',
  notes text not null default '',
  primary key (restaurant_id, order_id, id),
  foreign key (restaurant_id, order_id) references public.orders(restaurant_id, id) on delete cascade
);
create table public.order_item_options (
  restaurant_id uuid not null,
  order_id text not null,
  item_id integer not null,
  id integer not null,
  name text not null,
  primary key (restaurant_id, order_id, item_id, id),
  foreign key (restaurant_id, order_id, item_id) references public.order_items(restaurant_id, order_id, id) on delete cascade
);
create table public.order_events (
  restaurant_id uuid not null,
  order_id text not null,
  status public.order_status not null,
  at timestamptz not null default now(),
  primary key (restaurant_id, order_id, status),
  foreign key (restaurant_id, order_id) references public.orders(restaurant_id, id) on delete cascade
);
create table public.demo_sessions (
  id text primary key check (id ~ '^[0-9a-f]{64}$'),
  version integer not null default 0,
  payload jsonb not null,
  expires_at timestamptz not null
);
create index on public.demo_sessions(expires_at);

create function public.has_restaurant_role(tenant uuid, admin_only boolean default false)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.restaurant_members
    where restaurant_id = tenant and user_id = (select auth.uid()) and (not admin_only or role = 'admin')
  );
$$;
revoke execute on function public.has_restaurant_role(uuid, boolean) from public, anon;
grant execute on function public.has_restaurant_role(uuid, boolean) to authenticated;

do $$
declare resource text;
begin
  foreach resource in array array['restaurants','restaurant_members','categories','products','product_options','product_option_values','business_settings','orders','order_items','order_item_options','order_events','demo_sessions']
  loop
    execute format('alter table public.%I enable row level security', resource);
    execute format('revoke all on public.%I from public, anon, authenticated', resource);
    execute format('grant all on public.%I to service_role', resource);
  end loop;
  foreach resource in array array['categories','products','product_options','product_option_values','business_settings','order_items','order_item_options','order_events']
  loop
    execute format('grant select on public.%I to authenticated', resource);
    execute format('create policy staff_read on public.%I for select to authenticated using (public.has_restaurant_role(restaurant_id))', resource);
  end loop;
end $$;

grant select on public.restaurants, public.restaurant_members to authenticated;
grant select (restaurant_id,id,created_at,customer,mode,notes,status,subtotal,fee,total) on public.orders to authenticated;
create policy restaurant_read on public.restaurants for select to authenticated using (public.has_restaurant_role(id));
create policy own_memberships on public.restaurant_members for select to authenticated using (user_id = (select auth.uid()));
create policy staff_orders on public.orders for select to authenticated using (public.has_restaurant_role(restaurant_id));

create function public.order_addresses(tenant uuid)
returns table (id text, address text) language sql stable security definer set search_path = ''
as $$
  select o.id, o.address from public.orders o where o.restaurant_id = tenant and public.has_restaurant_role(tenant, true)
  order by o.created_at desc limit 150;
$$;
revoke execute on function public.order_addresses(uuid) from public, anon;
grant execute on function public.order_addresses(uuid) to authenticated;

-- Derive the next status inside the database and compare-and-swap against the visible status.
create function public.advance_order(tenant uuid, code text, current_status public.order_status)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare next_step public.order_status;
begin
  if not public.has_restaurant_role(tenant) then raise exception 'Acesso negado.' using errcode = '42501'; end if;
  next_step := case current_status when 'received' then 'preparing' when 'preparing' then 'ready' when 'ready' then 'finished' end;
  if next_step is null then return false; end if;
  update public.orders set status = next_step where restaurant_id = tenant and id = code and status = current_status;
  if not found then return false; end if;
  insert into public.order_events(restaurant_id, order_id, status) values (tenant, code, next_step);
  return true;
end;
$$;
revoke execute on function public.advance_order(uuid,text,public.order_status) from public, anon;
grant execute on function public.advance_order(uuid,text,public.order_status) to authenticated;

create function public.save_catalog(tenant uuid, resource text, payload jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
declare group_data jsonb; group_position integer; product_id_input uuid;
begin
  if not public.has_restaurant_role(tenant, true) then raise exception 'Acesso negado.' using errcode = '42501'; end if;
  perform 1 from public.restaurants where id = tenant for update;
  case resource
    when 'category' then
      insert into public.categories(restaurant_id,id,name,position,active)
      values (tenant,(payload->>'id')::uuid,payload->>'name',(payload->>'position')::integer,(payload->>'active')::boolean)
      on conflict (restaurant_id,id) do update set name = excluded.name, position = excluded.position, active = excluded.active;
    when 'settings' then
      update public.restaurants set name = payload->>'name' where id = tenant;
      insert into public.business_settings(restaurant_id,hours,pickup,delivery,fee)
      values (tenant,payload->>'hours',(payload->>'pickup')::boolean,(payload->>'delivery')::boolean,(payload->>'fee')::integer)
      on conflict (restaurant_id) do update set hours = excluded.hours, pickup = excluded.pickup, delivery = excluded.delivery, fee = excluded.fee;
    when 'product' then
      product_id_input := (payload->>'id')::uuid;
      insert into public.products(restaurant_id,id,category_id,name,description,price,image,available,featured,ingredients)
      values (tenant,product_id_input,(payload->>'categoryId')::uuid,payload->>'name',payload->>'description',(payload->>'price')::integer,
        payload->>'image',(payload->>'available')::boolean,(payload->>'featured')::boolean,array(select jsonb_array_elements_text(payload->'ingredients')))
      on conflict (restaurant_id,id) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description,
        price = excluded.price, image = excluded.image, available = excluded.available, featured = excluded.featured, ingredients = excluded.ingredients;
      delete from public.product_options where restaurant_id = tenant and product_id = product_id_input;
      for group_data, group_position in select value, ordinality::integer from jsonb_array_elements(payload->'groups') with ordinality
      loop
        insert into public.product_options values (tenant,product_id_input,group_data->>'id',group_data->>'name',group_data->>'mode',(group_data->>'required')::boolean,group_position);
        insert into public.product_option_values
        select tenant,product_id_input,group_data->>'id',value->>'id',value->>'name',(value->>'price')::integer,ordinality::integer
        from jsonb_array_elements(group_data->'values') with ordinality;
      end loop;
    else raise exception 'Recurso inválido.';
  end case;
end;
$$;
revoke execute on function public.save_catalog(uuid,text,jsonb) from public, anon;
grant execute on function public.save_catalog(uuid,text,jsonb) to authenticated;
