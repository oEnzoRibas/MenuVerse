alter table public.restaurants add column catalog_version bigint not null default 0;
alter table public.restaurants add column published boolean not null default false;
alter table public.product_options add constraint option_name check (char_length(name) between 1 and 60);
alter table public.product_option_values add constraint option_value_name check (char_length(name) between 1 and 60);
alter table public.orders add constraint order_text_limits check (char_length(address) <= 220 and char_length(notes) <= 240 and char_length(tracking_hash) = 64);

create function public.bump_catalog_version()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.restaurants set catalog_version = catalog_version + 1 where id = old.restaurant_id;
  else
    update public.restaurants set catalog_version = catalog_version + 1 where id = new.restaurant_id;
    if tg_op = 'UPDATE' and new.restaurant_id <> old.restaurant_id then
      update public.restaurants set catalog_version = catalog_version + 1 where id = old.restaurant_id;
    end if;
  end if;
  return null;
end;
$$;
do $$
declare resource text;
begin
  foreach resource in array array['categories','products','product_options','product_option_values','business_settings']
  loop
    execute format('create trigger catalog_changed after insert or update or delete on public.%I for each row execute function public.bump_catalog_version()', resource);
  end loop;
end $$;

create function public.restaurant_catalog(tenant uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'version', r.catalog_version,
    'settings', jsonb_build_object('name',r.name,'hours',coalesce(s.hours,'Consulte o restaurante'),'pickup',coalesce(s.pickup,true),'delivery',coalesce(s.delivery,false),'fee',coalesce(s.fee,0)),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'position',c.position,'active',c.active) order by c.position,c.name)
      from public.categories c where c.restaurant_id = r.id), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.id,'categoryId',p.category_id,'name',p.name,'description',p.description,'price',p.price,'image',p.image,
      'available',p.available,'featured',p.featured,'ingredients',p.ingredients,
      'groups',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'mode',g.mode,'required',g.required,
        'values',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'price',v.price) order by v.position)
         from public.product_option_values v where (v.restaurant_id,v.product_id,v.group_id) = (g.restaurant_id,g.product_id,g.id)),'[]'::jsonb)
      ) order by g.position) from public.product_options g where (g.restaurant_id,g.product_id) = (p.restaurant_id,p.id)),'[]'::jsonb)
    ) order by p.name) from public.products p where p.restaurant_id = r.id),'[]'::jsonb)
  ) from public.restaurants r left join public.business_settings s on s.restaurant_id = r.id where r.id = tenant;
$$;
revoke execute on function public.restaurant_catalog(uuid) from public, anon;
grant execute on function public.restaurant_catalog(uuid) to authenticated, service_role;

-- This RPC is private to the server. The server prices against the catalog snapshot.
-- The row lock and version comparison prevent checkout with a stale snapshot.
create function public.place_order(tenant uuid, version bigint, key_hash text, payload jsonb)
returns text language plpgsql security invoker set search_path = ''
as $$
declare current_version bigint; code text; line jsonb; line_index integer;
begin
  select catalog_version into current_version from public.restaurants where id = tenant and published for update;
  if not found then raise exception 'Restaurante indisponível.'; end if;
  select id into code from public.orders where restaurant_id = tenant and request_id = (payload->>'requestId')::uuid and tracking_hash = key_hash;
  if found then return code; end if;
  if current_version <> version then raise exception 'O cardápio mudou. Atualize a página.' using errcode = '40001'; end if;
  insert into public.orders(restaurant_id,request_id,tracking_hash,customer,mode,address,notes,subtotal,fee)
  values (tenant,(payload->>'requestId')::uuid,key_hash,payload->>'customer',payload->>'mode',payload->>'address',payload->>'notes',
    (payload->>'subtotal')::bigint,(payload->>'fee')::integer) returning id into code;
  for line, line_index in select value, ordinality::integer from jsonb_array_elements(payload->'items') with ordinality
  loop
    insert into public.order_items(restaurant_id,order_id,id,product_id,name,unit,quantity,removed,notes)
    values (tenant,code,line_index,(line->>'productId')::uuid,line->>'name',(line->>'unit')::bigint,(line->>'quantity')::integer,
      array(select jsonb_array_elements_text(line->'removed')),line->>'notes');
    insert into public.order_item_options(restaurant_id,order_id,item_id,id,name)
    select tenant,code,line_index,ordinality::integer,value from jsonb_array_elements_text(line->'options') with ordinality;
  end loop;
  insert into public.order_events(restaurant_id,order_id,status) values (tenant,code,'received');
  return code;
end;
$$;
revoke execute on function public.place_order(uuid,bigint,text,jsonb) from public, anon, authenticated;
grant execute on function public.place_order(uuid,bigint,text,jsonb) to service_role;
