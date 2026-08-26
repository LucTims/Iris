-- RPC d'agrégats pour le tableau de bord admin (données RÉELLES).
-- SECURITY DEFINER + contrôle du rôle admin à l'intérieur : un utilisateur non
-- admin ne peut rien lire. Appelé avec le client user-scoped (auth.uid() = admin).
CREATE OR REPLACE FUNCTION public.get_admin_stats()
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
