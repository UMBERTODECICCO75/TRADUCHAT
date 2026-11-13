insert into public.user_roles (user_id, role)
values ('8f227fd9-1324-44cf-b634-b676fe1b3ead', 'admin')
on conflict (user_id, role) do nothing;