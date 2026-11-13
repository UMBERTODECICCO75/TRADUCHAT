CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.organizations IS 'Server-only: deny-by-default RLS, accessed via trusted server functions.';

CREATE TABLE public.organization_members (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id),
  CONSTRAINT organization_members_role_check CHECK (role IN ('owner', 'member'))
);
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.organization_members IS 'Server-only: deny-by-default RLS, accessed via trusted server functions.';

CREATE INDEX organization_members_user_idx ON public.organization_members (user_id);

CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.rooms ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.translations ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
CREATE INDEX rooms_org_idx ON public.rooms (org_id);
CREATE INDEX translations_org_idx ON public.translations (org_id);

DO $$
DECLARE
  owner record;
  new_org uuid;
  org_name text;
BEGIN
  FOR owner IN
    SELECT DISTINCT owner_id AS uid FROM public.rooms WHERE owner_id IS NOT NULL
    UNION
    SELECT DISTINCT user_id AS uid FROM public.translations
  LOOP
    SELECT COALESCE(NULLIF(p.display_name, ''), split_part(COALESCE(p.email, 'Azienda'), '@', 1))
      INTO org_name
      FROM public.profiles p WHERE p.id = owner.uid;

    INSERT INTO public.organizations (name, owner_id)
    VALUES (COALESCE(NULLIF(org_name, ''), 'La mia azienda'), owner.uid)
    RETURNING id INTO new_org;

    INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (new_org, owner.uid, 'owner')
    ON CONFLICT DO NOTHING;

    UPDATE public.rooms SET org_id = new_org WHERE owner_id = owner.uid AND org_id IS NULL;
    UPDATE public.translations SET org_id = new_org WHERE user_id = owner.uid AND org_id IS NULL;
  END LOOP;
END $$;