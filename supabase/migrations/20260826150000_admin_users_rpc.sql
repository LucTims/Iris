-- Liste des utilisateurs enrichie pour l'admin (données réelles).
-- SECURITY DEFINER + contrôle admin interne.
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_is_admin boolean;
BEGIN
  SELECT (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR COALESCE((SELECT email FROM auth.users WHERE id = auth.uid()), '') = 'www.martau@gmail.com'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'created_at') DESC), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'email', u.email,
      'full_name', p.full_name,
      'role', p.role,
      'plan', p.plan,
      'created_at', p.created_at,
      'balance', COALESCE(w.balance, 0),
      'coins_spent', COALESCE(sp.spent, 0),
      'projects', COALESCE(pr.cnt, 0),
      'last_activity', la.last_activity
    ) AS r
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    LEFT JOIN public.wallets w ON w.user_id = p.id
    LEFT JOIN (
      SELECT w2.user_id, sum(ct.amount) AS spent
      FROM public.coin_transactions ct
      JOIN public.wallets w2 ON w2.id = ct.wallet_id
      WHERE ct.type = 'debit'
      GROUP BY w2.user_id
    ) sp ON sp.user_id = p.id
    LEFT JOIN (SELECT user_id, count(*) AS cnt FROM public.projects GROUP BY user_id) pr ON pr.user_id = p.id
    LEFT JOIN (SELECT user_id, max(created_at) AS last_activity FROM public.ai_usage GROUP BY user_id) la ON la.user_id = p.id
  ) x INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;
