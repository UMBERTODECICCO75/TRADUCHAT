revoke execute on function public.has_role(uuid, public.app_role) from anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to service_role;

comment on function public.has_role(uuid, public.app_role) is 'Internal role check; executed only by trusted service_role callers.';