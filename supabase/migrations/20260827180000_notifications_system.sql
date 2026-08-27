-- 1. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  link TEXT,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USER NOTIFICATIONS READ TRACKER
CREATE TABLE IF NOT EXISTS public.user_notifications_read (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, notification_id)
);

-- ENABLE RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications_read ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR NOTIFICATIONS
CREATE POLICY "Users can view relevant notifications" ON public.notifications
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      target_user_id IS NULL OR target_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage notifications" ON public.notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- POLICIES FOR READ TRACKER
CREATE POLICY "Users can view own read status" ON public.user_notifications_read
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can mark notifications as read" ON public.user_notifications_read
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view read tracker" ON public.user_notifications_read
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
