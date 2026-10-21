-- Empêche un utilisateur de s'auto-promouvoir admin ou de changer son plan.
-- La policy "Users can update own profile" autorise l'UPDATE de toute la ligne :
-- sans ce garde-fou, `supabase.from('profiles').update({ role: 'admin' })`
-- depuis le navigateur (clé anon + session) suffisait à devenir admin.
-- Seuls service_role (routes serveur, webhooks, admin) et les rôles internes
-- (postgres, migrations) peuvent modifier role, plan, email et id.

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') IN ('authenticated', 'anon') THEN
    IF NEW.role  IS DISTINCT FROM OLD.role
       OR NEW.plan  IS DISTINCT FROM OLD.plan
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.id    IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'forbidden: role, plan, email and id cannot be changed by the user'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_columns ON public.profiles;
CREATE TRIGGER protect_profile_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_columns();

-- Défense en profondeur : la policy n'avait pas de WITH CHECK.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);
