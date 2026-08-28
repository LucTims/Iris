-- Retire le contournement "email en dur" utilisé pour reconnaître les admins,
-- qui était dupliqué (et parfois divergent : emails différents selon les
-- fichiers) dans plusieurs routes API ET dans ces fonctions SQL. Un rôle en
-- base est la seule source de vérité désormais.
--
-- On backfill D'ABORD le rôle 'admin' pour les comptes qui dépendaient du
-- contournement, pour ne verrouiller personne hors de l'admin en retirant le
-- fallback juste après.
UPDATE public.profiles p
SET role = 'admin', updated_at = NOW()
FROM auth.users u
WHERE u.id = p.id
  AND u.email IN (
    'www.martau@gmail.com',
    'www.boombooks1@gmail.com',
    'amadou.diallo@iris-editions.com'
  )
  AND p.role <> 'admin';

-- Source unique de vérité pour "l'appelant est-il admin ?", basée uniquement
-- sur profiles.role. Remplace le fallback email codé en dur.
CREATE OR REPLACE FUNCTION public.is_current_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.is_current_admin() TO authenticated;

-- Recrée get_admin_users() / get_admin_stats() pour déléguer à
-- is_current_admin() au lieu de dupliquer la vérification (avec le fallback
-- email) inline.
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_current_admin() THEN
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

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_current_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'users_total', (SELECT count(*) FROM public.profiles),
    'new_users_7d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
    'wallets_total_balance', COALESCE((SELECT sum(balance) FROM public.wallets), 0),
    'coins_purchased', COALESCE((SELECT sum(amount) FROM public.coin_transactions WHERE type = 'credit'), 0),
    'coins_spent', COALESCE((SELECT sum(amount) FROM public.coin_transactions WHERE type = 'debit'), 0),
    'api_cost_usd', COALESCE((SELECT sum((metadata->>'usd_cost')::numeric) FROM public.coin_transactions WHERE type = 'debit' AND (metadata ? 'usd_cost')), 0),
    'revenue_fcfa', COALESCE((SELECT sum(amount) FROM public.transactions WHERE status = 'paid'), 0),
    'revenue_7d_fcfa', COALESCE((SELECT sum(amount) FROM public.transactions WHERE status = 'paid' AND created_at > now() - interval '7 days'), 0),
    'tx_paid', (SELECT count(*) FROM public.transactions WHERE status = 'paid'),
    'tx_pending', (SELECT count(*) FROM public.transactions WHERE status = 'pending'),
    'tx_failed', (SELECT count(*) FROM public.transactions WHERE status = 'failed'),
    'projects_total', (SELECT count(*) FROM public.projects),
    'chapters_total', (SELECT count(*) FROM public.chapters),
    'words_total', COALESCE((SELECT sum(word_count) FROM public.chapters), 0),
    'revenue_by_plan', COALESCE((SELECT jsonb_object_agg(plan_id, obj) FROM (
        SELECT COALESCE(plan_id, 'inconnu') AS plan_id,
               jsonb_build_object('count', count(*), 'fcfa', sum(amount)) AS obj
        FROM public.transactions WHERE status = 'paid' GROUP BY plan_id) t), '{}'::jsonb),
    'usage_by_action', COALESCE((SELECT jsonb_object_agg(action, cnt) FROM (
        SELECT action, count(*) cnt FROM public.ai_usage GROUP BY action ORDER BY count(*) DESC) a), '{}'::jsonb),
    'usage_by_model', COALESCE((SELECT jsonb_object_agg(model, cnt) FROM (
        SELECT model, count(*) cnt FROM public.ai_usage GROUP BY model) m), '{}'::jsonb),
    'recent_transactions', COALESCE((SELECT jsonb_agg(r) FROM (
        SELECT jsonb_build_object(
          'id', t.id, 'amount', t.amount, 'plan_id', t.plan_id, 'status', t.status,
          'created_at', t.created_at, 'email', u.email, 'name', p.full_name
        ) AS r
        FROM public.transactions t
        LEFT JOIN auth.users u ON u.id = t.user_id
        LEFT JOIN public.profiles p ON p.id = t.user_id
        ORDER BY t.created_at DESC LIMIT 12) x), '[]'::jsonb),
    'top_spenders', COALESCE((SELECT jsonb_agg(r) FROM (
        SELECT jsonb_build_object(
          'email', u.email, 'name', p.full_name, 'spent', s.spent, 'balance', w.balance
        ) AS r
        FROM (
          SELECT w2.user_id, sum(ct.amount) AS spent
          FROM public.coin_transactions ct
          JOIN public.wallets w2 ON w2.id = ct.wallet_id
          WHERE ct.type = 'debit'
          GROUP BY w2.user_id ORDER BY sum(ct.amount) DESC LIMIT 8
        ) s
        LEFT JOIN auth.users u ON u.id = s.user_id
        LEFT JOIN public.profiles p ON p.id = s.user_id
        LEFT JOIN public.wallets w ON w.user_id = s.user_id) x), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
