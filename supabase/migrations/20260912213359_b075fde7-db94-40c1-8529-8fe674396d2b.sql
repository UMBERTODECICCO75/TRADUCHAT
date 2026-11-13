ALTER TABLE public.rooms DROP COLUMN org_id;
ALTER TABLE public.translations DROP COLUMN org_id;
DROP TABLE public.organization_members;
DROP TABLE public.organizations;