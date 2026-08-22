/**
 * Iris Admin Operational Dashboard - Data & Entity Types
 * Defines comprehensive TypeScript interfaces for all 10 priority admin modules.
 */

export type PlanType = 'free' | 'pro' | 'studio';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'banned';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'user';
  plan: PlanType;
  subscription_status: SubscriptionStatus;
  payment_provider?: 'sebpay' | 'stripe' | 'manual';
  renewal_date?: string;
  words_generated: number;
  ai_tokens_used: number;
  projects_count: number;
  created_at: string;
  last_active: string;
  banned_reason?: string;
}

export type ProjectStatus = 'brouillon' | 'en_cours' | 'termine' | 'publie';

export interface AdminProject {
  id: string;
  title: string;
  subtitle?: string;
  author_id: string;
  author_name: string;
  author_email: string;
  genre: string;
  word_count: number;
  chapters_count: number;
  estimated_pages: number;
  status: ProjectStatus;
  cover_url?: string;
  created_at: string;
  updated_at: string;
  exported_formats: ('pdf' | 'docx' | 'epub')[];
}

export interface AdminKPIData {
  total_users: number;
  users_growth_pct: number;
  mrr_fcfa: number;
  mrr_growth_pct: number;
  ai_cost_usd: number;
  ai_tokens_total: number;
  total_projects: number;
  projects_growth_pct: number;
  total_words_generated: number;
  conversion_rate_pct: number;
  system_uptime_pct: number;
}

export interface ActivityDataPoint {
  date: string;
  ai_generations: number;
  words_count: number;
  new_projects: number;
  new_users: number;
  revenue_fcfa: number;
}

export interface AIModelUsage {
  model_id: string;
  model_name: string;
  provider: string;
  requests_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  average_latency_ms: number;
  error_rate_pct: number;
  status: 'active' | 'degraded' | 'offline';
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface AdminLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  endpoint: string;
  status_code: number;
  user_email?: string;
  ip_address: string;
  message: string;
  payload?: Record<string, any>;
  stack_trace?: string;
}

export type ServiceStatus = 'operational' | 'degraded' | 'down';

export interface ServiceHealthItem {
  id: string;
  name: string;
  category: 'database' | 'auth' | 'ai' | 'payment' | 'runtime';
  status: ServiceStatus;
  latency_ms: number;
  uptime_pct: number;
  details: string;
  last_checked: string;
}

export interface AdminSettingsState {
  maintenance_banner: {
    enabled: boolean;
    message: string;
    type: 'info' | 'warning' | 'danger';
    dismissible: boolean;
  };
  feature_flags: {
    tiptap_v3_editor: boolean;
    imagen_3_covers: boolean;
    kdp_high_res_export: boolean;
    sebpay_wave_momo: boolean;
    strict_rate_limiting: boolean;
  };
  ai_safety: {
    default_fallback_model: string;
    max_tokens_per_request: number;
    daily_spend_cap_usd: number;
    user_daily_quota_free: number;
  };
  admin_whitelist: string[];
}

export interface AdminActivityEvent {
  id: string;
  timestamp: string;
  type: 'subscription' | 'export' | 'quota_alert' | 'user_joined' | 'project_created' | 'system';
  title: string;
  description: string;
  user_email?: string;
  badge_color?: string;
}

export interface AdminCreditTransaction {
  id: string;
  user_id: string;
  user_email: string;
  amount_words: number;
  type: 'grant' | 'deduction' | 'monthly_refill' | 'purchase';
  reason: string;
  admin_email: string;
  timestamp: string;
}

export interface AdminSubscriptionRecord {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  plan: PlanType;
  amount_fcfa: number;
  provider: 'sebpay' | 'stripe' | 'wave' | 'orange_money' | 'mtn_momo';
  status: 'active' | 'past_due' | 'canceled';
  current_period_end: string;
  created_at: string;
}

export interface AdminSecurityMetric {
  score: number;
  two_factor_adoption_pct: number;
  active_sessions_count: number;
  failed_login_attempts_24h: number;
  blocked_ips_count: number;
}

export type TransactionStatus = 'pending' | 'paid' | 'failed';

export interface AdminTransaction {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  plan_id: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  provider_reference?: string;
  created_at: string;
  updated_at: string;
}

