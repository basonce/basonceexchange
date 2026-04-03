-- ============================================================
  -- PAPONCE TAM ŞEMA MIGRASYONU
  -- Kite Exchange → Paponce geçişi
  -- Oluşturuldu: 2026-04-02T23:57:34.836Z
  -- ============================================================

  -- Extensions
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  -- TABLE: bot_strategies
CREATE TABLE IF NOT EXISTS bot_strategies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  description text,
  risk_level text,
  timeframe text,
  target_profit_pct numeric,
  stop_loss_pct numeric,
  max_leverage integer,
  indicators text[],
  color text,
  icon text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bot_strategies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_bot_strategies ON bot_strategies;
CREATE POLICY allow_all_bot_strategies ON bot_strategies FOR ALL USING (true) WITH CHECK (true);

-- TABLE: bot_signals
CREATE TABLE IF NOT EXISTS bot_signals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coin_symbol text,
  coin_name text,
  strategy_id uuid,
  signal_type text,
  confidence_score integer,
  entry_price numeric,
  target_price numeric,
  stop_loss_price numeric,
  current_price numeric,
  rsi_value numeric,
  macd_value numeric,
  macd_signal numeric,
  ema9 numeric,
  ema21 numeric,
  ema50 numeric,
  volume_24h numeric,
  price_change_24h numeric,
  funding_rate numeric,
  reason text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bot_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_bot_signals ON bot_signals;
CREATE POLICY allow_all_bot_signals ON bot_signals FOR ALL USING (true) WITH CHECK (true);

-- TABLE: deposit_addresses
CREATE TABLE IF NOT EXISTS deposit_addresses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  coin_symbol text,
  network text,
  address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE deposit_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_deposit_addresses ON deposit_addresses;
CREATE POLICY allow_all_deposit_addresses ON deposit_addresses FOR ALL USING (true) WITH CHECK (true);

-- TABLE: wallet_scan_jobs
CREATE TABLE IF NOT EXISTS wallet_scan_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  triggered_by text,
  network text,
  wallets_checked integer,
  transactions_found integer,
  balances_credited integer,
  duration_ms integer,
  status text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz
);

ALTER TABLE wallet_scan_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_wallet_scan_jobs ON wallet_scan_jobs;
CREATE POLICY allow_all_wallet_scan_jobs ON wallet_scan_jobs FOR ALL USING (true) WITH CHECK (true);

-- TABLE: user_balances
CREATE TABLE IF NOT EXISTS user_balances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  symbol text,
  balance numeric,
  locked_balance numeric,
  updated_at timestamptz DEFAULT now(),
  daily_pnl numeric,
  daily_pnl_updated_at timestamptz,
  total_pnl numeric,
  futures_balance numeric,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz
);

ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_user_balances ON user_balances;
CREATE POLICY allow_all_user_balances ON user_balances FOR ALL USING (true) WITH CHECK (true);

-- TABLE: powerai_price
CREATE TABLE IF NOT EXISTS powerai_price (
  id bigserial PRIMARY KEY,
  current_price numeric,
  start_price numeric,
  initial_price_of_cycle numeric,
  target_multiplier numeric,
  change_percentage numeric,
  high_24h numeric,
  low_24h numeric,
  market_cap numeric,
  total_supply bigint,
  last_reset_at timestamptz,
  last_24h_reset_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE powerai_price ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_powerai_price ON powerai_price;
CREATE POLICY allow_all_powerai_price ON powerai_price FOR ALL USING (true) WITH CHECK (true);

-- TABLE: referrals
CREATE TABLE IF NOT EXISTS referrals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid,
  referred_id uuid,
  referral_code text,
  reward_earned numeric,
  status text,
  created_at timestamptz DEFAULT now(),
  total_traded_volume numeric,
  commission_earned numeric,
  commission_rate numeric,
  activated_at timestamptz
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_referrals ON referrals;
CREATE POLICY allow_all_referrals ON referrals FOR ALL USING (true) WITH CHECK (true);

-- TABLE: assistant_segments
CREATE TABLE IF NOT EXISTS assistant_segments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  description text,
  icon text,
  color text,
  criteria jsonb,
  member_count integer,
  is_dynamic boolean,
  is_active boolean DEFAULT true,
  last_computed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assistant_segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_assistant_segments ON assistant_segments;
CREATE POLICY allow_all_assistant_segments ON assistant_segments FOR ALL USING (true) WITH CHECK (true);

-- TABLE: assistant_segment_members
CREATE TABLE IF NOT EXISTS assistant_segment_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_id uuid,
  user_id uuid,
  added_at timestamptz,
  metadata jsonb
);

ALTER TABLE assistant_segment_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_assistant_segment_members ON assistant_segment_members;
CREATE POLICY allow_all_assistant_segment_members ON assistant_segment_members FOR ALL USING (true) WITH CHECK (true);

-- TABLE: bot_sessions
CREATE TABLE IF NOT EXISTS bot_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  strategy_id uuid,
  status text,
  selected_coins text[],
  starting_balance numeric,
  current_balance numeric,
  total_pnl numeric,
  total_pnl_pct numeric,
  win_count integer,
  loss_count integer,
  total_trades integer,
  win_rate numeric,
  max_drawdown_pct numeric,
  daily_loss_limit_pct numeric,
  todays_pnl numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bot_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_bot_sessions ON bot_sessions;
CREATE POLICY allow_all_bot_sessions ON bot_sessions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: bot_positions
CREATE TABLE IF NOT EXISTS bot_positions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid,
  user_id uuid,
  signal_id uuid,
  coin_symbol text,
  coin_name text,
  direction text,
  entry_price numeric,
  current_price numeric,
  target_price numeric,
  stop_loss_price numeric,
  quantity numeric,
  margin_used numeric,
  leverage integer,
  unrealized_pnl numeric,
  unrealized_pnl_pct numeric,
  realized_pnl numeric,
  status text,
  close_price numeric,
  close_reason text,
  opened_at timestamptz,
  closed_at timestamptz
);

ALTER TABLE bot_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_bot_positions ON bot_positions;
CREATE POLICY allow_all_bot_positions ON bot_positions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: bot_performance
CREATE TABLE IF NOT EXISTS bot_performance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid,
  user_id uuid,
  date text,
  daily_pnl numeric,
  daily_pnl_pct numeric,
  trades_count integer,
  win_count integer,
  balance_end numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bot_performance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_bot_performance ON bot_performance;
CREATE POLICY allow_all_bot_performance ON bot_performance FOR ALL USING (true) WITH CHECK (true);

-- TABLE: assistant_health_snapshots
CREATE TABLE IF NOT EXISTS assistant_health_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_time timestamptz,
  active_users_24h integer,
  new_registrations_24h integer,
  total_deposit_24h numeric,
  total_withdrawal_24h numeric,
  net_flow_24h numeric,
  open_positions_count integer,
  open_positions_margin numeric,
  pending_withdrawals_count integer,
  pending_withdrawals_amount numeric,
  unanswered_tickets_count integer,
  total_platform_balance numeric,
  mining_eq_distributed_24h numeric,
  fraud_flags_24h integer,
  health_score integer,
  issues jsonb,
  metrics jsonb
);

ALTER TABLE assistant_health_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_assistant_health_snapshots ON assistant_health_snapshots;
CREATE POLICY allow_all_assistant_health_snapshots ON assistant_health_snapshots FOR ALL USING (true) WITH CHECK (true);

-- TABLE: assistant_rules
CREATE TABLE IF NOT EXISTS assistant_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  description text,
  category text,
  trigger_condition jsonb,
  action jsonb,
  is_active boolean DEFAULT true,
  priority integer,
  execution_count integer,
  last_executed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assistant_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_assistant_rules ON assistant_rules;
CREATE POLICY allow_all_assistant_rules ON assistant_rules FOR ALL USING (true) WITH CHECK (true);

-- TABLE: blockchain_withdrawals
CREATE TABLE IF NOT EXISTS blockchain_withdrawals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  currency text,
  network text,
  amount numeric,
  fee numeric,
  total_amount numeric,
  to_address text,
  from_address text,
  tx_hash text,
  status text,
  admin_approved boolean,
  approved_by uuid,
  approved_at timestamptz,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blockchain_withdrawals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_blockchain_withdrawals ON blockchain_withdrawals;
CREATE POLICY allow_all_blockchain_withdrawals ON blockchain_withdrawals FOR ALL USING (true) WITH CHECK (true);

-- TABLE: mining_equipment_types
CREATE TABLE IF NOT EXISTS mining_equipment_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  description text,
  hash_rate numeric,
  earning_rate numeric,
  price numeric,
  electricity_cost numeric,
  rarity text,
  icon text,
  color text,
  max_level integer,
  is_starter boolean,
  created_at timestamptz DEFAULT now(),
  level integer,
  daily_earning numeric,
  withdrawal_limit numeric,
  badge text,
  is_free boolean,
  mining_duration_hours integer
);

ALTER TABLE mining_equipment_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_mining_equipment_types ON mining_equipment_types;
CREATE POLICY allow_all_mining_equipment_types ON mining_equipment_types FOR ALL USING (true) WITH CHECK (true);

-- TABLE: user_mining_purchases
CREATE TABLE IF NOT EXISTS user_mining_purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  shop_item_id uuid,
  equipment_type_id uuid,
  purchase_price_usdt numeric,
  status text,
  total_earned_usdt numeric,
  session_earned_usdt numeric,
  purchased_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_mining_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_user_mining_purchases ON user_mining_purchases;
CREATE POLICY allow_all_user_mining_purchases ON user_mining_purchases FOR ALL USING (true) WITH CHECK (true);

-- TABLE: support_agents
CREATE TABLE IF NOT EXISTS support_agents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  country_code text,
  country_name text,
  avatar_url text,
  status text,
  languages text[],
  specialty text,
  created_at timestamptz DEFAULT now(),
  flag_emoji text,
  region text,
  active_tickets integer,
  timezone text,
  language_code text
);

ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_support_agents ON support_agents;
CREATE POLICY allow_all_support_agents ON support_agents FOR ALL USING (true) WITH CHECK (true);

-- TABLE: support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  customer_id text,
  email text,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  assigned_agent_id uuid,
  customer_country text,
  bot_active boolean
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_support_tickets ON support_tickets;
CREATE POLICY allow_all_support_tickets ON support_tickets FOR ALL USING (true) WITH CHECK (true);

-- TABLE: alpha_token_holders
CREATE TABLE IF NOT EXISTS alpha_token_holders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id uuid,
  user_id uuid,
  username text,
  avatar_url text,
  amount numeric,
  avg_buy_price numeric,
  total_invested numeric,
  percentage numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alpha_token_holders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_alpha_token_holders ON alpha_token_holders;
CREATE POLICY allow_all_alpha_token_holders ON alpha_token_holders FOR ALL USING (true) WITH CHECK (true);

-- TABLE: cryptocurrencies
CREATE TABLE IF NOT EXISTS cryptocurrencies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text,
  name text,
  icon_url text,
  current_price numeric,
  price_change_24h numeric,
  market_cap numeric,
  volume_24h numeric,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cryptocurrencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_cryptocurrencies ON cryptocurrencies;
CREATE POLICY allow_all_cryptocurrencies ON cryptocurrencies FOR ALL USING (true) WITH CHECK (true);

-- TABLE: wallets
CREATE TABLE IF NOT EXISTS wallets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  currency_id uuid,
  balance numeric,
  locked_balance numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_wallets ON wallets;
CREATE POLICY allow_all_wallets ON wallets FOR ALL USING (true) WITH CHECK (true);

-- TABLE: user_mining_equipment
CREATE TABLE IF NOT EXISTS user_mining_equipment (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  equipment_type_id uuid,
  level integer,
  purchased_at timestamptz,
  last_claim_at timestamptz,
  total_earned numeric,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  status text,
  session_earned_usdt numeric,
  total_earned_usdt numeric,
  used_mining_seconds numeric,
  started_at timestamptz,
  ends_at timestamptz,
  total_earned_from_equipment numeric,
  times_used integer
);

ALTER TABLE user_mining_equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_user_mining_equipment ON user_mining_equipment;
CREATE POLICY allow_all_user_mining_equipment ON user_mining_equipment FOR ALL USING (true) WITH CHECK (true);

-- TABLE: mining_earnings
CREATE TABLE IF NOT EXISTS mining_earnings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  equipment_id uuid,
  amount numeric,
  earning_type text,
  claimed boolean,
  claimed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mining_earnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_mining_earnings ON mining_earnings;
CREATE POLICY allow_all_mining_earnings ON mining_earnings FOR ALL USING (true) WITH CHECK (true);

-- TABLE: alpha_tokens
CREATE TABLE IF NOT EXISTS alpha_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid,
  name text,
  symbol text,
  description text,
  logo_url text,
  network text,
  tag text,
  website_url text,
  twitter_url text,
  telegram_url text,
  raised_amount numeric,
  target_amount numeric,
  raised_token text,
  current_price numeric,
  market_cap numeric,
  holder_count integer,
  transaction_count integer,
  volume_24h numeric,
  community_score integer,
  is_graduated boolean,
  is_featured boolean,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  total_supply numeric,
  circulating_supply numeric,
  initial_price numeric,
  price_change_24h numeric,
  ath_price numeric,
  liquidity numeric,
  creator_initial_buy numeric,
  hot_score numeric,
  logo_source text,
  price_seed numeric,
  cycle_hours numeric,
  last_price_update timestamptz,
  price_cycle_start timestamptz,
  base_price numeric,
  total_comments integer
);

ALTER TABLE alpha_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_alpha_tokens ON alpha_tokens;
CREATE POLICY allow_all_alpha_tokens ON alpha_tokens FOR ALL USING (true) WITH CHECK (true);

-- TABLE: alpha_votes
CREATE TABLE IF NOT EXISTS alpha_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id uuid,
  user_id uuid,
  vote_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alpha_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_alpha_votes ON alpha_votes;
CREATE POLICY allow_all_alpha_votes ON alpha_votes FOR ALL USING (true) WITH CHECK (true);

-- TABLE: earnquest_price
CREATE TABLE IF NOT EXISTS earnquest_price (
  id bigserial PRIMARY KEY,
  current_price numeric,
  start_price numeric,
  initial_price_of_cycle numeric,
  target_multiplier numeric,
  change_percentage numeric,
  high_24h numeric,
  low_24h numeric,
  market_cap numeric,
  total_supply bigint,
  last_reset_at timestamptz,
  last_24h_reset_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE earnquest_price ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_earnquest_price ON earnquest_price;
CREATE POLICY allow_all_earnquest_price ON earnquest_price FOR ALL USING (true) WITH CHECK (true);

-- TABLE: mining_discover_users
CREATE TABLE IF NOT EXISTS mining_discover_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text,
  username text,
  avatar_url text,
  country text,
  total_earned numeric,
  total_withdrawn numeric,
  mining_power numeric,
  last_active timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mining_discover_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_mining_discover_users ON mining_discover_users;
CREATE POLICY allow_all_mining_discover_users ON mining_discover_users FOR ALL USING (true) WITH CHECK (true);

-- TABLE: mining_discover_activities
CREATE TABLE IF NOT EXISTS mining_discover_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  discover_user_id uuid,
  activity_type text,
  amount numeric,
  message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mining_discover_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_mining_discover_activities ON mining_discover_activities;
CREATE POLICY allow_all_mining_discover_activities ON mining_discover_activities FOR ALL USING (true) WITH CHECK (true);

-- TABLE: mining_boosts
CREATE TABLE IF NOT EXISTS mining_boosts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  boost_type text,
  multiplier numeric,
  duration_hours integer,
  activated_at timestamptz,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mining_boosts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_mining_boosts ON mining_boosts;
CREATE POLICY allow_all_mining_boosts ON mining_boosts FOR ALL USING (true) WITH CHECK (true);

-- TABLE: backup_restore_log
CREATE TABLE IF NOT EXISTS backup_restore_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_id uuid,
  restored_table text,
  restored_record_id uuid,
  restore_type text,
  restored_by uuid,
  restored_at timestamptz,
  notes text
);

ALTER TABLE backup_restore_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_backup_restore_log ON backup_restore_log;
CREATE POLICY allow_all_backup_restore_log ON backup_restore_log FOR ALL USING (true) WITH CHECK (true);

-- TABLE: ai_bot_performance
CREATE TABLE IF NOT EXISTS ai_bot_performance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  date text,
  total_trades integer,
  winning_trades integer,
  losing_trades integer,
  win_rate numeric,
  total_pnl_usdt numeric,
  best_trade_pnl numeric,
  worst_trade_pnl numeric,
  strategy text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_bot_performance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_ai_bot_performance ON ai_bot_performance;
CREATE POLICY allow_all_ai_bot_performance ON ai_bot_performance FOR ALL USING (true) WITH CHECK (true);

-- TABLE: orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  currency_id uuid,
  order_type text,
  price numeric,
  amount numeric,
  filled_amount numeric,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_orders ON orders;
CREATE POLICY allow_all_orders ON orders FOR ALL USING (true) WITH CHECK (true);

-- TABLE: wallet_pool
CREATE TABLE IF NOT EXISTS wallet_pool (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  address text,
  network text,
  is_assigned boolean,
  assigned_to_user_id uuid,
  assigned_at timestamptz,
  total_received numeric,
  created_at timestamptz DEFAULT now(),
  encrypted_private_key text,
  api_key text,
  api_key_label text
);

ALTER TABLE wallet_pool ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_wallet_pool ON wallet_pool;
CREATE POLICY allow_all_wallet_pool ON wallet_pool FOR ALL USING (true) WITH CHECK (true);

-- TABLE: anonymous_profiles
CREATE TABLE IF NOT EXISTS anonymous_profiles (
  id bigserial PRIMARY KEY,
  username text,
  avatar_url text,
  country text,
  created_at timestamptz DEFAULT now(),
  level integer
);

ALTER TABLE anonymous_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_anonymous_profiles ON anonymous_profiles;
CREATE POLICY allow_all_anonymous_profiles ON anonymous_profiles FOR ALL USING (true) WITH CHECK (true);

-- TABLE: live_rooms
CREATE TABLE IF NOT EXISTS live_rooms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text,
  description text,
  topic text,
  listener_count integer,
  is_active boolean DEFAULT true,
  coin_symbol text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  host_id bigint,
  host_name text,
  host_avatar text,
  is_vip boolean,
  required_level integer,
  access_type text,
  room_category text,
  background_gradient text,
  icon_color text
);

ALTER TABLE live_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_live_rooms ON live_rooms;
CREATE POLICY allow_all_live_rooms ON live_rooms FOR ALL USING (true) WITH CHECK (true);

-- TABLE: live_room_messages
CREATE TABLE IF NOT EXISTS live_room_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid,
  message text,
  created_at timestamptz DEFAULT now(),
  user_id bigint,
  username text,
  avatar_url text
);

ALTER TABLE live_room_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_live_room_messages ON live_room_messages;
CREATE POLICY allow_all_live_room_messages ON live_room_messages FOR ALL USING (true) WITH CHECK (true);

-- TABLE: alpha_competitions
CREATE TABLE IF NOT EXISTS alpha_competitions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text,
  description text,
  start_date timestamptz,
  end_date timestamptz,
  prize_pool numeric,
  status text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alpha_competitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_alpha_competitions ON alpha_competitions;
CREATE POLICY allow_all_alpha_competitions ON alpha_competitions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: assistant_alerts
CREATE TABLE IF NOT EXISTS assistant_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text,
  message text,
  priority text,
  category text,
  data jsonb,
  is_read boolean,
  is_resolved boolean,
  resolved_by uuid,
  resolved_at timestamptz,
  auto_generated boolean,
  related_user_id uuid,
  action_required boolean,
  action_taken text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE assistant_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_assistant_alerts ON assistant_alerts;
CREATE POLICY allow_all_assistant_alerts ON assistant_alerts FOR ALL USING (true) WITH CHECK (true);

-- TABLE: withdrawal_limits
CREATE TABLE IF NOT EXISTS withdrawal_limits (
  user_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_limit numeric,
  daily_used numeric,
  last_reset timestamptz,
  requires_2fa boolean,
  requires_email_confirm boolean,
  whitelisted_addresses jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE withdrawal_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_withdrawal_limits ON withdrawal_limits;
CREATE POLICY allow_all_withdrawal_limits ON withdrawal_limits FOR ALL USING (true) WITH CHECK (true);

-- TABLE: alpha_comments
CREATE TABLE IF NOT EXISTS alpha_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id uuid,
  user_id uuid,
  username text,
  avatar_url text,
  content text,
  likes integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alpha_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_alpha_comments ON alpha_comments;
CREATE POLICY allow_all_alpha_comments ON alpha_comments FOR ALL USING (true) WITH CHECK (true);

-- TABLE: voice_messages
CREATE TABLE IF NOT EXISTS voice_messages (
  id bigserial PRIMARY KEY,
  user_id bigint,
  text_content text,
  audio_url text,
  emotion text,
  duration_seconds integer,
  voice_gender text,
  voice_name text,
  category text,
  play_order integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_voice_messages ON voice_messages;
CREATE POLICY allow_all_voice_messages ON voice_messages FOR ALL USING (true) WITH CHECK (true);

-- TABLE: user_futures_favorites
CREATE TABLE IF NOT EXISTS user_futures_favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  symbol text,
  is_tradfi boolean,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_futures_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_user_futures_favorites ON user_futures_favorites;
CREATE POLICY allow_all_user_futures_favorites ON user_futures_favorites FOR ALL USING (true) WITH CHECK (true);

-- TABLE: alpha_launch_queue
CREATE TABLE IF NOT EXISTS alpha_launch_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  symbol text,
  description text,
  logo_url text,
  network text,
  tag text,
  initial_price numeric,
  target_amount numeric,
  raised_token text,
  total_supply bigint,
  scheduled_at timestamptz,
  launched boolean,
  launched_at timestamptz
);

ALTER TABLE alpha_launch_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_alpha_launch_queue ON alpha_launch_queue;
CREATE POLICY allow_all_alpha_launch_queue ON alpha_launch_queue FOR ALL USING (true) WITH CHECK (true);

-- TABLE: spot_orders
CREATE TABLE IF NOT EXISTS spot_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  symbol text,
  side text,
  type text,
  price numeric,
  quantity numeric,
  total numeric,
  status text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE spot_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_spot_orders ON spot_orders;
CREATE POLICY allow_all_spot_orders ON spot_orders FOR ALL USING (true) WITH CHECK (true);

-- TABLE: user_trades
CREATE TABLE IF NOT EXISTS user_trades (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  order_id uuid,
  symbol text,
  side text,
  price numeric,
  quantity numeric,
  total numeric,
  fee numeric,
  realized_pnl numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_trades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_user_trades ON user_trades;
CREATE POLICY allow_all_user_trades ON user_trades FOR ALL USING (true) WITH CHECK (true);

-- TABLE: assistant_actions_log
CREATE TABLE IF NOT EXISTS assistant_actions_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type text,
  category text,
  description text,
  performed_by uuid,
  target_user_id uuid,
  target_entity text,
  target_entity_id text,
  parameters jsonb,
  result jsonb,
  affected_rows integer,
  status text,
  error_message text,
  execution_time_ms integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE assistant_actions_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_assistant_actions_log ON assistant_actions_log;
CREATE POLICY allow_all_assistant_actions_log ON assistant_actions_log FOR ALL USING (true) WITH CHECK (true);

-- TABLE: mining_stats
CREATE TABLE IF NOT EXISTS mining_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  stat_date text,
  total_hash_rate numeric,
  total_earned numeric,
  total_claimed numeric,
  uptime_percentage numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mining_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_mining_stats ON mining_stats;
CREATE POLICY allow_all_mining_stats ON mining_stats FOR ALL USING (true) WITH CHECK (true);

-- TABLE: suggested_traders
CREATE TABLE IF NOT EXISTS suggested_traders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text,
  avatar_url text,
  country text,
  flag text,
  win_rate numeric,
  monthly_return numeric,
  total_pnl numeric,
  followers integer,
  specialty text,
  badge text,
  recent_trades jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  avatar_pool text[]
);

ALTER TABLE suggested_traders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_suggested_traders ON suggested_traders;
CREATE POLICY allow_all_suggested_traders ON suggested_traders FOR ALL USING (true) WITH CHECK (true);

-- TABLE: exchange_mode_config
CREATE TABLE IF NOT EXISTS exchange_mode_config (
  id bigserial PRIMARY KEY,
  mode text,
  frozen_at timestamptz,
  frozen_prices jsonb,
  activated_by uuid,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE exchange_mode_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_exchange_mode_config ON exchange_mode_config;
CREATE POLICY allow_all_exchange_mode_config ON exchange_mode_config FOR ALL USING (true) WITH CHECK (true);

-- TABLE: assistant_natural_commands
CREATE TABLE IF NOT EXISTS assistant_natural_commands (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  raw_command text,
  interpreted_intent text,
  actions_taken jsonb,
  result_summary text,
  status text,
  execution_time_ms integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE assistant_natural_commands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_assistant_natural_commands ON assistant_natural_commands;
CREATE POLICY allow_all_assistant_natural_commands ON assistant_natural_commands FOR ALL USING (true) WITH CHECK (true);

-- TABLE: audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  table_name text,
  operation text,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  changed_at timestamptz
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_audit_log ON audit_log;
CREATE POLICY allow_all_audit_log ON audit_log FOR ALL USING (true) WITH CHECK (true);

-- TABLE: profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_profiles ON profiles;
CREATE POLICY allow_all_profiles ON profiles FOR ALL USING (true) WITH CHECK (true);

-- TABLE: reward_wheel_prizes
CREATE TABLE IF NOT EXISTS reward_wheel_prizes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prize_type text,
  prize_name text,
  prize_value numeric,
  probability numeric,
  color text,
  icon text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reward_wheel_prizes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_reward_wheel_prizes ON reward_wheel_prizes;
CREATE POLICY allow_all_reward_wheel_prizes ON reward_wheel_prizes FOR ALL USING (true) WITH CHECK (true);

-- TABLE: alpha_transactions
CREATE TABLE IF NOT EXISTS alpha_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id uuid,
  user_id uuid,
  tx_type text,
  amount numeric,
  price numeric,
  total_value numeric,
  wallet_address text,
  username text,
  avatar_url text,
  token_symbol text,
  token_name text,
  raised_token text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alpha_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_alpha_transactions ON alpha_transactions;
CREATE POLICY allow_all_alpha_transactions ON alpha_transactions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text,
  full_name text,
  is_admin boolean,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  avatar_url text,
  user_id bigint,
  verification_status text,
  user_level integer,
  referral_code text,
  total_trades integer,
  total_volume_usdt numeric,
  last_login_at timestamptz,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  is_real_user boolean DEFAULT true,
  username text
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_user_profiles ON user_profiles;
CREATE POLICY allow_all_user_profiles ON user_profiles FOR ALL USING (true) WITH CHECK (true);

-- TABLE: transactions
CREATE TABLE IF NOT EXISTS transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  type text,
  symbol text,
  amount numeric,
  balance_before numeric,
  balance_after numeric,
  admin_id uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  pnl numeric,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_transactions ON transactions;
CREATE POLICY allow_all_transactions ON transactions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: ai_bot_stats
CREATE TABLE IF NOT EXISTS ai_bot_stats (
  user_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  total_trades integer,
  winning_trades integer,
  total_pnl numeric,
  win_rate numeric,
  best_trade_pct numeric,
  worst_trade_pct numeric,
  current_streak integer,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_bot_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_ai_bot_stats ON ai_bot_stats;
CREATE POLICY allow_all_ai_bot_stats ON ai_bot_stats FOR ALL USING (true) WITH CHECK (true);

-- TABLE: wallet_addresses
CREATE TABLE IF NOT EXISTS wallet_addresses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  network text,
  address text,
  currency text,
  private_key_encrypted text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz
);

ALTER TABLE wallet_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_wallet_addresses ON wallet_addresses;
CREATE POLICY allow_all_wallet_addresses ON wallet_addresses FOR ALL USING (true) WITH CHECK (true);

-- TABLE: blockchain_deposits
CREATE TABLE IF NOT EXISTS blockchain_deposits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  wallet_address_id uuid,
  tx_hash text,
  network text,
  currency text,
  amount numeric,
  from_address text,
  to_address text,
  confirmations integer,
  required_confirmations integer,
  status text,
  block_number bigint,
  gas_used numeric,
  credited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blockchain_deposits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_blockchain_deposits ON blockchain_deposits;
CREATE POLICY allow_all_blockchain_deposits ON blockchain_deposits FOR ALL USING (true) WITH CHECK (true);

-- TABLE: sznp_price
CREATE TABLE IF NOT EXISTS sznp_price (
  id bigserial PRIMARY KEY,
  current_price numeric,
  start_price numeric,
  initial_price_of_cycle numeric,
  target_multiplier numeric,
  change_percentage numeric,
  high_24h numeric,
  low_24h numeric,
  market_cap numeric,
  total_supply bigint,
  last_reset_at timestamptz,
  last_24h_reset_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sznp_price ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_sznp_price ON sznp_price;
CREATE POLICY allow_all_sznp_price ON sznp_price FOR ALL USING (true) WITH CHECK (true);

-- TABLE: alpha_price_history
CREATE TABLE IF NOT EXISTS alpha_price_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id uuid,
  timestamp timestamptz,
  open_price numeric,
  high_price numeric,
  low_price numeric,
  close_price numeric,
  volume numeric,
  price numeric,
  market_cap numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alpha_price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_alpha_price_history ON alpha_price_history;
CREATE POLICY allow_all_alpha_price_history ON alpha_price_history FOR ALL USING (true) WITH CHECK (true);

-- TABLE: supported_coins
CREATE TABLE IF NOT EXISTS supported_coins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text,
  name text,
  icon_url text,
  is_trending boolean,
  sort_order integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  binance_symbol text,
  is_spot_enabled boolean,
  is_futures_enabled boolean,
  logo_url text,
  coingecko_id text
);

ALTER TABLE supported_coins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_supported_coins ON supported_coins;
CREATE POLICY allow_all_supported_coins ON supported_coins FOR ALL USING (true) WITH CHECK (true);

-- TABLE: supported_networks
CREATE TABLE IF NOT EXISTS supported_networks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coin_id uuid,
  network_name text,
  network_code text,
  chain_id text,
  contract_address text,
  min_deposit numeric,
  min_withdrawal numeric,
  withdrawal_fee numeric,
  confirmations_required integer,
  estimated_arrival_minutes integer,
  is_active boolean DEFAULT true,
  is_mainnet boolean,
  sort_order integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE supported_networks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_supported_networks ON supported_networks;
CREATE POLICY allow_all_supported_networks ON supported_networks FOR ALL USING (true) WITH CHECK (true);

-- TABLE: admin_actions
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid,
  action_type text,
  target_user_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_admin_actions ON admin_actions;
CREATE POLICY allow_all_admin_actions ON admin_actions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: bnc_price
CREATE TABLE IF NOT EXISTS bnc_price (
  id bigserial PRIMARY KEY,
  current_price numeric,
  start_price numeric,
  initial_price_of_cycle numeric,
  target_multiplier numeric,
  change_percentage numeric,
  high_24h numeric,
  low_24h numeric,
  market_cap numeric,
  total_supply bigint,
  last_reset_at timestamptz,
  last_24h_reset_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bnc_price ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_bnc_price ON bnc_price;
CREATE POLICY allow_all_bnc_price ON bnc_price FOR ALL USING (true) WITH CHECK (true);

-- TABLE: blockchain_transactions
CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  type text,
  tx_hash text,
  network text,
  currency text,
  amount numeric,
  from_address text,
  to_address text,
  status text,
  block_number bigint,
  confirmations integer,
  gas_price numeric,
  gas_used numeric,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blockchain_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_blockchain_transactions ON blockchain_transactions;
CREATE POLICY allow_all_blockchain_transactions ON blockchain_transactions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: assistant_bulk_operations
CREATE TABLE IF NOT EXISTS assistant_bulk_operations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_type text,
  description text,
  target_segment text,
  target_criteria jsonb,
  parameters jsonb,
  total_targets integer,
  processed_count integer,
  success_count integer,
  failed_count integer,
  status text,
  started_at timestamptz,
  completed_at timestamptz,
  performed_by uuid,
  error_log jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE assistant_bulk_operations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_assistant_bulk_operations ON assistant_bulk_operations;
CREATE POLICY allow_all_assistant_bulk_operations ON assistant_bulk_operations FOR ALL USING (true) WITH CHECK (true);

-- TABLE: assistant_scheduled_tasks
CREATE TABLE IF NOT EXISTS assistant_scheduled_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  description text,
  task_type text,
  cron_expression text,
  schedule_label text,
  action jsonb,
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_run_status text,
  run_count integer,
  error_count integer,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assistant_scheduled_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_assistant_scheduled_tasks ON assistant_scheduled_tasks;
CREATE POLICY allow_all_assistant_scheduled_tasks ON assistant_scheduled_tasks FOR ALL USING (true) WITH CHECK (true);

-- TABLE: user_statistics
CREATE TABLE IF NOT EXISTS user_statistics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  spot_trades integer,
  futures_trades integer,
  total_deposits numeric,
  total_withdrawals numeric,
  highest_pnl numeric,
  lowest_pnl numeric,
  win_rate numeric,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_user_statistics ON user_statistics;
CREATE POLICY allow_all_user_statistics ON user_statistics FOR ALL USING (true) WITH CHECK (true);

-- TABLE: referral_commissions
CREATE TABLE IF NOT EXISTS referral_commissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid,
  referred_id uuid,
  referral_id uuid,
  trade_type text,
  trade_volume numeric,
  fee_amount numeric,
  commission_amount numeric,
  commission_rate numeric,
  status text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_referral_commissions ON referral_commissions;
CREATE POLICY allow_all_referral_commissions ON referral_commissions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: system_safety_rules
CREATE TABLE IF NOT EXISTS system_safety_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_number integer,
  rule_category text,
  rule_title text,
  rule_description text,
  severity text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by text
);

ALTER TABLE system_safety_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_system_safety_rules ON system_safety_rules;
CREATE POLICY allow_all_system_safety_rules ON system_safety_rules FOR ALL USING (true) WITH CHECK (true);

-- TABLE: copy_traders
CREATE TABLE IF NOT EXISTS copy_traders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  avatar_url text,
  strategy_type text,
  coin_symbol text,
  follower_count integer,
  max_followers integer,
  pnl_30d numeric,
  roi_30d numeric,
  roi_7d numeric,
  total_pnl numeric,
  win_rate numeric,
  runtime_days integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE copy_traders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_copy_traders ON copy_traders;
CREATE POLICY allow_all_copy_traders ON copy_traders FOR ALL USING (true) WITH CHECK (true);

-- TABLE: daily_missions
CREATE TABLE IF NOT EXISTS daily_missions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_type text,
  mission_name text,
  mission_description text,
  target_value numeric,
  spin_reward integer,
  icon text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE daily_missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_daily_missions ON daily_missions;
CREATE POLICY allow_all_daily_missions ON daily_missions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: mining_shop_items
CREATE TABLE IF NOT EXISTS mining_shop_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_type_id uuid,
  tier text,
  name text,
  price numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mining_shop_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_mining_shop_items ON mining_shop_items;
CREATE POLICY allow_all_mining_shop_items ON mining_shop_items FOR ALL USING (true) WITH CHECK (true);

-- TABLE: pending_wallet_notifications
CREATE TABLE IF NOT EXISTS pending_wallet_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  wallet_address text,
  network text,
  tx_hash text,
  from_address text,
  token_symbol text,
  amount numeric,
  amount_usd numeric,
  block_time timestamptz,
  created_at timestamptz DEFAULT now(),
  email text,
  full_name text
);

ALTER TABLE pending_wallet_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_pending_wallet_notifications ON pending_wallet_notifications;
CREATE POLICY allow_all_pending_wallet_notifications ON pending_wallet_notifications FOR ALL USING (true) WITH CHECK (true);

-- TABLE: campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text,
  description text,
  reward_type text,
  reward_amount numeric,
  reward_label text,
  badge_color text,
  banner_gradient text,
  coin_symbol text,
  participants integer,
  max_participants integer,
  ends_at timestamptz,
  is_active boolean DEFAULT true,
  campaign_type text,
  requirements jsonb,
  created_at timestamptz DEFAULT now(),
  claim_type text,
  claim_condition jsonb,
  claim_reward_usdt numeric,
  claim_reward_eq numeric,
  duration_hours integer
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_campaigns ON campaigns;
CREATE POLICY allow_all_campaigns ON campaigns FOR ALL USING (true) WITH CHECK (true);

-- TABLE: futures_orders
CREATE TABLE IF NOT EXISTS futures_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  symbol text,
  side text,
  type text,
  price numeric,
  trigger_price numeric,
  trailing_delta numeric,
  amount numeric,
  filled numeric,
  total numeric,
  leverage integer,
  margin_mode text,
  post_only boolean,
  reduce_only boolean,
  time_in_force text,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE futures_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_futures_orders ON futures_orders;
CREATE POLICY allow_all_futures_orders ON futures_orders FOR ALL USING (true) WITH CHECK (true);

-- TABLE: mining_success_feed
CREATE TABLE IF NOT EXISTS mining_success_feed (
  id bigserial PRIMARY KEY,
  user_id bigint,
  username text,
  avatar_url text,
  type text,
  amount numeric,
  coin text,
  network text,
  wallet_address text,
  tx_id text,
  message text,
  status text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mining_success_feed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_mining_success_feed ON mining_success_feed;
CREATE POLICY allow_all_mining_success_feed ON mining_success_feed FOR ALL USING (true) WITH CHECK (true);

-- TABLE: announcements
CREATE TABLE IF NOT EXISTS announcements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text,
  content text,
  announcement_type text,
  icon_type text,
  badge_color text,
  is_pinned boolean,
  is_active boolean DEFAULT true,
  read_count integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_announcements ON announcements;
CREATE POLICY allow_all_announcements ON announcements FOR ALL USING (true) WITH CHECK (true);

-- TABLE: sgp_price
CREATE TABLE IF NOT EXISTS sgp_price (
  id bigserial PRIMARY KEY,
  current_price numeric,
  start_price numeric,
  initial_price_of_cycle numeric,
  target_multiplier numeric,
  change_percentage numeric,
  high_24h numeric,
  low_24h numeric,
  market_cap numeric,
  total_supply bigint,
  last_reset_at timestamptz,
  last_24h_reset_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sgp_price ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_sgp_price ON sgp_price;
CREATE POLICY allow_all_sgp_price ON sgp_price FOR ALL USING (true) WITH CHECK (true);

-- TABLE: mining_chat_messages
CREATE TABLE IF NOT EXISTS mining_chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text,
  avatar_url text,
  message text,
  message_type text,
  amount numeric,
  level integer,
  country text,
  is_featured boolean,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mining_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_mining_chat_messages ON mining_chat_messages;
CREATE POLICY allow_all_mining_chat_messages ON mining_chat_messages FOR ALL USING (true) WITH CHECK (true);

-- TABLE: assistant_fraud_flags
CREATE TABLE IF NOT EXISTS assistant_fraud_flags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  flag_type text,
  risk_score integer,
  details jsonb,
  evidence jsonb,
  status text,
  auto_action_taken text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assistant_fraud_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_assistant_fraud_flags ON assistant_fraud_flags;
CREATE POLICY allow_all_assistant_fraud_flags ON assistant_fraud_flags FOR ALL USING (true) WITH CHECK (true);

-- TABLE: analytics_online_users
CREATE TABLE IF NOT EXISTS analytics_online_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text,
  user_id uuid,
  page text,
  country text,
  city text,
  device text,
  is_authenticated boolean,
  last_seen timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_online_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_analytics_online_users ON analytics_online_users;
CREATE POLICY allow_all_analytics_online_users ON analytics_online_users FOR ALL USING (true) WITH CHECK (true);

-- TABLE: wallet_monitor_log
CREATE TABLE IF NOT EXISTS wallet_monitor_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at timestamptz,
  network text,
  wallets_checked integer,
  transactions_found integer,
  error_message text,
  duration_ms integer
);

ALTER TABLE wallet_monitor_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_wallet_monitor_log ON wallet_monitor_log;
CREATE POLICY allow_all_wallet_monitor_log ON wallet_monitor_log FOR ALL USING (true) WITH CHECK (true);

-- TABLE: user_coin_history
CREATE TABLE IF NOT EXISTS user_coin_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  coin_id uuid,
  last_used_at timestamptz,
  usage_count integer
);

ALTER TABLE user_coin_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_user_coin_history ON user_coin_history;
CREATE POLICY allow_all_user_coin_history ON user_coin_history FOR ALL USING (true) WITH CHECK (true);

-- TABLE: admin_large_withdrawals
CREATE TABLE IF NOT EXISTS admin_large_withdrawals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text,
  amount numeric,
  coin_symbol text,
  hours_pending numeric
);

ALTER TABLE admin_large_withdrawals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_admin_large_withdrawals ON admin_large_withdrawals;
CREATE POLICY allow_all_admin_large_withdrawals ON admin_large_withdrawals FOR ALL USING (true) WITH CHECK (true);

-- TABLE: withdrawal_transactions
CREATE TABLE IF NOT EXISTS withdrawal_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  coin_symbol text,
  network text,
  amount numeric,
  network_fee numeric,
  receive_amount numeric,
  destination_address text,
  txid text,
  status text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  processing_note text,
  approved_at timestamptz,
  approved_by uuid,
  estimated_completion timestamptz,
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid
);

ALTER TABLE withdrawal_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_withdrawal_transactions ON withdrawal_transactions;
CREATE POLICY allow_all_withdrawal_transactions ON withdrawal_transactions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: daily_pnl_history
CREATE TABLE IF NOT EXISTS daily_pnl_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  date text,
  daily_pnl numeric,
  total_trades integer,
  winning_trades integer,
  losing_trades integer,
  starting_balance numeric,
  ending_balance numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE daily_pnl_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_daily_pnl_history ON daily_pnl_history;
CREATE POLICY allow_all_daily_pnl_history ON daily_pnl_history FOR ALL USING (true) WITH CHECK (true);

-- TABLE: news_items
CREATE TABLE IF NOT EXISTS news_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id text,
  title text,
  summary text,
  url text,
  source text,
  coin text,
  category text,
  sentiment text,
  change_percent numeric,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_news_items ON news_items;
CREATE POLICY allow_all_news_items ON news_items FOR ALL USING (true) WITH CHECK (true);

-- TABLE: deposit_transactions
CREATE TABLE IF NOT EXISTS deposit_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  coin_symbol text,
  network text,
  amount numeric,
  address text,
  txid text,
  status text,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz
);

ALTER TABLE deposit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_deposit_transactions ON deposit_transactions;
CREATE POLICY allow_all_deposit_transactions ON deposit_transactions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: ai_bot_configs
CREATE TABLE IF NOT EXISTS ai_bot_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  strategy text,
  is_active boolean DEFAULT true,
  selected_coins text[],
  max_daily_loss_pct numeric,
  position_size_usdt numeric,
  leverage integer,
  auto_trade boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  risk_level text,
  sim_balance numeric
);

ALTER TABLE ai_bot_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_ai_bot_configs ON ai_bot_configs;
CREATE POLICY allow_all_ai_bot_configs ON ai_bot_configs FOR ALL USING (true) WITH CHECK (true);

-- TABLE: copy_trade_history
CREATE TABLE IF NOT EXISTS copy_trade_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  trader_id uuid,
  trader_name text,
  trader_avatar text,
  investment_amount numeric,
  final_value numeric,
  final_pnl numeric,
  final_roi numeric,
  duration_hours numeric,
  status text,
  started_at timestamptz,
  ended_at timestamptz
);

ALTER TABLE copy_trade_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_copy_trade_history ON copy_trade_history;
CREATE POLICY allow_all_copy_trade_history ON copy_trade_history FOR ALL USING (true) WITH CHECK (true);

-- TABLE: database_backups
CREATE TABLE IF NOT EXISTS database_backups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_type text,
  status text,
  size_mb numeric,
  tables_count integer,
  created_by text,
  created_at timestamptz DEFAULT now(),
  backup_data jsonb,
  tables_backed_up integer
);

ALTER TABLE database_backups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_database_backups ON database_backups;
CREATE POLICY allow_all_database_backups ON database_backups FOR ALL USING (true) WITH CHECK (true);

-- TABLE: wallet_alert_settings
CREATE TABLE IF NOT EXISTS wallet_alert_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid,
  sound_enabled boolean,
  notify_on_any_incoming boolean,
  min_amount_usd numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallet_alert_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_wallet_alert_settings ON wallet_alert_settings;
CREATE POLICY allow_all_wallet_alert_settings ON wallet_alert_settings FOR ALL USING (true) WITH CHECK (true);

-- TABLE: leverage_settings
CREATE TABLE IF NOT EXISTS leverage_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  symbol text,
  leverage integer,
  margin_mode text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leverage_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_leverage_settings ON leverage_settings;
CREATE POLICY allow_all_leverage_settings ON leverage_settings FOR ALL USING (true) WITH CHECK (true);

-- TABLE: support_messages
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid,
  sender_type text,
  sender_name text,
  message text,
  created_at timestamptz DEFAULT now(),
  read boolean,
  original_message text,
  original_language text
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_support_messages ON support_messages;
CREATE POLICY allow_all_support_messages ON support_messages FOR ALL USING (true) WITH CHECK (true);

-- TABLE: user_active_equipment
CREATE TABLE IF NOT EXISTS user_active_equipment (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  equipment_type_id uuid,
  is_active boolean DEFAULT true,
  status text,
  session_earned_usdt numeric,
  total_earned_usdt numeric,
  total_earned_from_equipment numeric,
  used_mining_seconds numeric,
  started_at timestamptz,
  ends_at timestamptz,
  times_used integer,
  purchased_at timestamptz,
  created_at timestamptz DEFAULT now(),
  equipment_name text,
  equipment_icon text,
  hash_rate numeric,
  earning_rate numeric,
  daily_earning numeric,
  withdrawal_limit numeric,
  mining_duration_hours integer,
  type_level integer,
  is_free boolean,
  rarity text,
  color text,
  badge text,
  has_time_limit boolean,
  is_currently_usable boolean
);

ALTER TABLE user_active_equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_user_active_equipment ON user_active_equipment;
CREATE POLICY allow_all_user_active_equipment ON user_active_equipment FOR ALL USING (true) WITH CHECK (true);

-- TABLE: wallet_transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  wallet_address text,
  network text,
  tx_hash text,
  from_address text,
  token_symbol text,
  token_contract text,
  amount numeric,
  amount_usd numeric,
  confirmations integer,
  status text,
  block_number bigint,
  block_time timestamptz,
  is_notified boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_credited boolean
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_wallet_transactions ON wallet_transactions;
CREATE POLICY allow_all_wallet_transactions ON wallet_transactions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: wallet_deposit_queue
CREATE TABLE IF NOT EXISTS wallet_deposit_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_tx_id uuid,
  user_id uuid,
  coin_symbol text,
  amount numeric,
  status text,
  credited_by uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallet_deposit_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_wallet_deposit_queue ON wallet_deposit_queue;
CREATE POLICY allow_all_wallet_deposit_queue ON wallet_deposit_queue FOR ALL USING (true) WITH CHECK (true);

-- TABLE: reward_wheel_history
CREATE TABLE IF NOT EXISTS reward_wheel_history (
  id bigserial PRIMARY KEY,
  user_id uuid,
  anonymous_profile_id bigint,
  prize_id uuid,
  prize_name text,
  prize_value text,
  prize_type text,
  is_visible_in_feed boolean,
  claimed_at timestamptz
);

ALTER TABLE reward_wheel_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_reward_wheel_history ON reward_wheel_history;
CREATE POLICY allow_all_reward_wheel_history ON reward_wheel_history FOR ALL USING (true) WITH CHECK (true);

-- TABLE: staking_positions
CREATE TABLE IF NOT EXISTS staking_positions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  asset text,
  amount numeric,
  apy numeric,
  stake_type text,
  lock_period_days integer,
  started_at timestamptz,
  ends_at timestamptz,
  earned_rewards numeric,
  status text,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staking_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_staking_positions ON staking_positions;
CREATE POLICY allow_all_staking_positions ON staking_positions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: exchange_settings
CREATE TABLE IF NOT EXISTS exchange_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text,
  value jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

ALTER TABLE exchange_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_exchange_settings ON exchange_settings;
CREATE POLICY allow_all_exchange_settings ON exchange_settings FOR ALL USING (true) WITH CHECK (true);

-- TABLE: staking_rewards_history
CREATE TABLE IF NOT EXISTS staking_rewards_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  staking_position_id uuid,
  user_id uuid,
  asset text,
  amount numeric,
  reward_date text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staking_rewards_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_staking_rewards_history ON staking_rewards_history;
CREATE POLICY allow_all_staking_rewards_history ON staking_rewards_history FOR ALL USING (true) WITH CHECK (true);

-- TABLE: hot_wallet_config
CREATE TABLE IF NOT EXISTS hot_wallet_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  network text,
  currency text,
  address text,
  private_key_encrypted text,
  balance numeric,
  min_balance_threshold numeric,
  is_active boolean DEFAULT true,
  last_balance_check timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hot_wallet_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_hot_wallet_config ON hot_wallet_config;
CREATE POLICY allow_all_hot_wallet_config ON hot_wallet_config FOR ALL USING (true) WITH CHECK (true);

-- TABLE: payai_price
CREATE TABLE IF NOT EXISTS payai_price (
  id bigserial PRIMARY KEY,
  current_price numeric,
  start_price numeric,
  initial_price_of_cycle numeric,
  target_multiplier numeric,
  change_percentage numeric,
  high_24h numeric,
  low_24h numeric,
  market_cap numeric,
  total_supply bigint,
  last_reset_at timestamptz,
  last_24h_reset_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payai_price ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_payai_price ON payai_price;
CREATE POLICY allow_all_payai_price ON payai_price FOR ALL USING (true) WITH CHECK (true);

-- TABLE: punch_price
CREATE TABLE IF NOT EXISTS punch_price (
  id bigserial PRIMARY KEY,
  current_price numeric,
  start_price numeric,
  initial_price_of_cycle numeric,
  target_multiplier numeric,
  change_percentage numeric,
  high_24h numeric,
  low_24h numeric,
  market_cap numeric,
  total_supply bigint,
  last_reset_at timestamptz,
  last_24h_reset_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE punch_price ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_punch_price ON punch_price;
CREATE POLICY allow_all_punch_price ON punch_price FOR ALL USING (true) WITH CHECK (true);

-- TABLE: master_wallets
CREATE TABLE IF NOT EXISTS master_wallets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  network text,
  address text,
  label text,
  usdt_balance numeric,
  total_collected numeric,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE master_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_master_wallets ON master_wallets;
CREATE POLICY allow_all_master_wallets ON master_wallets FOR ALL USING (true) WITH CHECK (true);

-- TABLE: futures_history
CREATE TABLE IF NOT EXISTS futures_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  symbol text,
  side text,
  leverage integer,
  entry_price numeric,
  close_price numeric,
  position_size numeric,
  margin numeric,
  liquidation_price numeric,
  maintenance_margin_rate numeric,
  realized_pnl numeric,
  trading_fee numeric,
  close_reason text,
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz
);

ALTER TABLE futures_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_futures_history ON futures_history;
CREATE POLICY allow_all_futures_history ON futures_history FOR ALL USING (true) WITH CHECK (true);

-- TABLE: ai_bot_signals
CREATE TABLE IF NOT EXISTS ai_bot_signals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  coin_symbol text,
  direction text,
  confidence numeric,
  entry_price numeric,
  target_price numeric,
  stop_loss numeric,
  timeframe text,
  rsi numeric,
  macd_signal text,
  trend text,
  volume_trend text,
  strategy text,
  is_active boolean DEFAULT true,
  triggered_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_bot_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_ai_bot_signals ON ai_bot_signals;
CREATE POLICY allow_all_ai_bot_signals ON ai_bot_signals FOR ALL USING (true) WITH CHECK (true);

-- TABLE: wallet_assignments_audit
CREATE TABLE IF NOT EXISTS wallet_assignments_audit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address text,
  wallet_network text,
  user_id uuid,
  action text,
  performed_by uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallet_assignments_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_wallet_assignments_audit ON wallet_assignments_audit;
CREATE POLICY allow_all_wallet_assignments_audit ON wallet_assignments_audit FOR ALL USING (true) WITH CHECK (true);

-- TABLE: alpha_pump_predictions
CREATE TABLE IF NOT EXISTS alpha_pump_predictions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id uuid,
  user_id uuid,
  username text,
  avatar_url text,
  prediction text,
  timeframe_hours integer,
  entry_price numeric,
  stake_amount numeric,
  resolved boolean,
  is_correct boolean,
  reward_amount numeric,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alpha_pump_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_alpha_pump_predictions ON alpha_pump_predictions;
CREATE POLICY allow_all_alpha_pump_predictions ON alpha_pump_predictions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: social_posts
CREATE TABLE IF NOT EXISTS social_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text,
  avatar_url text,
  content text,
  coin_symbol text,
  trade_type text,
  entry_price numeric,
  exit_price numeric,
  profit_loss numeric,
  profit_loss_percent numeric,
  leverage integer,
  image_url text,
  likes_count integer,
  comments_count integer,
  shares_count integer,
  is_bullish boolean,
  created_at timestamptz DEFAULT now(),
  sentiment text,
  post_type text,
  sub_positions jsonb,
  asset_change_30d numeric,
  coin_tags jsonb,
  image_url_2 text,
  chart_coin text,
  live_room_data jsonb
);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_social_posts ON social_posts;
CREATE POLICY allow_all_social_posts ON social_posts FOR ALL USING (true) WITH CHECK (true);

-- TABLE: ai_bot_positions
CREATE TABLE IF NOT EXISTS ai_bot_positions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  signal_id uuid,
  symbol text,
  side text,
  entry_price numeric,
  current_price numeric,
  exit_price numeric,
  size_usdt numeric,
  leverage integer,
  pnl numeric,
  pnl_pct numeric,
  status text,
  close_reason text,
  strategy text,
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  target_price numeric,
  stop_loss numeric
);

ALTER TABLE ai_bot_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_ai_bot_positions ON ai_bot_positions;
CREATE POLICY allow_all_ai_bot_positions ON ai_bot_positions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: user_copy_trades
CREATE TABLE IF NOT EXISTS user_copy_trades (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  trader_id uuid,
  investment_amount numeric,
  current_value numeric,
  entry_usdt numeric,
  pnl numeric,
  roi numeric,
  stop_loss_pct numeric,
  take_profit_pct numeric,
  status text,
  created_at timestamptz DEFAULT now(),
  stopped_at timestamptz
);

ALTER TABLE user_copy_trades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_user_copy_trades ON user_copy_trades;
CREATE POLICY allow_all_user_copy_trades ON user_copy_trades FOR ALL USING (true) WITH CHECK (true);

-- TABLE: copy_trade_positions
CREATE TABLE IF NOT EXISTS copy_trade_positions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  copy_trade_id uuid,
  user_id uuid,
  coin_symbol text,
  direction text,
  entry_price numeric,
  current_price numeric,
  size_usdt numeric,
  leverage integer,
  pnl_usdt numeric,
  pnl_pct numeric,
  status text,
  opened_at timestamptz,
  closed_at timestamptz,
  close_reason text,
  created_at timestamptz DEFAULT now(),
  unrealized_pnl numeric,
  unrealized_pnl_pct numeric
);

ALTER TABLE copy_trade_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_copy_trade_positions ON copy_trade_positions;
CREATE POLICY allow_all_copy_trade_positions ON copy_trade_positions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: admin_platform_stats
CREATE TABLE IF NOT EXISTS admin_platform_stats (
  total_users bigint,
  users_today bigint,
  active_users_24h bigint,
  total_usdt_balances numeric,
  total_futures_balances numeric,
  total_deposits numeric,
  total_withdrawals numeric,
  deposits_24h numeric,
  withdrawals_24h numeric,
  open_positions bigint,
  total_position_value numeric,
  pending_withdrawals bigint,
  pending_withdrawal_amount numeric
);

ALTER TABLE admin_platform_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_admin_platform_stats ON admin_platform_stats;
CREATE POLICY allow_all_admin_platform_stats ON admin_platform_stats FOR ALL USING (true) WITH CHECK (true);

-- TABLE: admin_price_overrides
CREATE TABLE IF NOT EXISTS admin_price_overrides (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coin_symbol text,
  override_price numeric,
  original_price numeric,
  reason text,
  applied_by uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE admin_price_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_admin_price_overrides ON admin_price_overrides;
CREATE POLICY allow_all_admin_price_overrides ON admin_price_overrides FOR ALL USING (true) WITH CHECK (true);

-- TABLE: futures_positions
CREATE TABLE IF NOT EXISTS futures_positions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  symbol text,
  side text,
  leverage integer,
  entry_price numeric,
  position_size numeric,
  margin numeric,
  liquidation_price numeric,
  maintenance_margin_rate numeric,
  unrealized_pnl numeric,
  take_profit numeric,
  stop_loss numeric,
  trading_fee numeric,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  margin_mode text,
  realized_pnl numeric,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz
);

ALTER TABLE futures_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_futures_positions ON futures_positions;
CREATE POLICY allow_all_futures_positions ON futures_positions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: user_positions
CREATE TABLE IF NOT EXISTS user_positions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  symbol text,
  total_quantity numeric,
  average_price numeric,
  total_invested numeric,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_user_positions ON user_positions;
CREATE POLICY allow_all_user_positions ON user_positions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: user_campaign_claims
CREATE TABLE IF NOT EXISTS user_campaign_claims (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  campaign_id uuid,
  claimed_at timestamptz,
  reward_usdt numeric,
  reward_eq numeric,
  status text
);

ALTER TABLE user_campaign_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_user_campaign_claims ON user_campaign_claims;
CREATE POLICY allow_all_user_campaign_claims ON user_campaign_claims FOR ALL USING (true) WITH CHECK (true);

-- TABLE: user_spin_balance
CREATE TABLE IF NOT EXISTS user_spin_balance (
  user_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  available_spins integer,
  total_spins_earned integer,
  total_spins_used integer,
  last_daily_spin timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_spin_balance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_user_spin_balance ON user_spin_balance;
CREATE POLICY allow_all_user_spin_balance ON user_spin_balance FOR ALL USING (true) WITH CHECK (true);

-- TABLE: tradfi_logos
CREATE TABLE IF NOT EXISTS tradfi_logos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text,
  logo_url text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

ALTER TABLE tradfi_logos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_tradfi_logos ON tradfi_logos;
CREATE POLICY allow_all_tradfi_logos ON tradfi_logos FOR ALL USING (true) WITH CHECK (true);

-- TABLE: trades
CREATE TABLE IF NOT EXISTS trades (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id uuid,
  seller_id uuid,
  currency_id uuid,
  buy_order_id uuid,
  sell_order_id uuid,
  price numeric,
  amount numeric,
  total numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_trades ON trades;
CREATE POLICY allow_all_trades ON trades FOR ALL USING (true) WITH CHECK (true);

-- TABLE: daily_portfolio_snapshots
CREATE TABLE IF NOT EXISTS daily_portfolio_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  snapshot_date text,
  total_value_usdt numeric,
  balances jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE daily_portfolio_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_daily_portfolio_snapshots ON daily_portfolio_snapshots;
CREATE POLICY allow_all_daily_portfolio_snapshots ON daily_portfolio_snapshots FOR ALL USING (true) WITH CHECK (true);

-- TABLE: live_room_participants
CREATE TABLE IF NOT EXISTS live_room_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid,
  user_id uuid,
  role text,
  is_speaking boolean,
  joined_at timestamptz,
  left_at timestamptz
);

ALTER TABLE live_room_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_live_room_participants ON live_room_participants;
CREATE POLICY allow_all_live_room_participants ON live_room_participants FOR ALL USING (true) WITH CHECK (true);

-- TABLE: futures_tpsl_orders
CREATE TABLE IF NOT EXISTS futures_tpsl_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  position_id uuid,
  type text,
  trigger_price numeric,
  order_price numeric,
  quantity numeric,
  status text,
  created_at timestamptz DEFAULT now(),
  triggered_at timestamptz
);

ALTER TABLE futures_tpsl_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_futures_tpsl_orders ON futures_tpsl_orders;
CREATE POLICY allow_all_futures_tpsl_orders ON futures_tpsl_orders FOR ALL USING (true) WITH CHECK (true);

-- ACTIVITY LOG (for live tracking)
  CREATE TABLE IF NOT EXISTS activity_log (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL,
    action text NOT NULL,
    page text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS activity_log_user_created_idx ON activity_log(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS activity_log_created_idx ON activity_log(created_at DESC);
  CREATE INDEX IF NOT EXISTS activity_log_action_idx ON activity_log(action);

  ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS activity_log_allow_all ON activity_log;
  CREATE POLICY activity_log_allow_all ON activity_log FOR ALL USING (true) WITH CHECK (true);

  -- Realtime for activity_log
  ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
  
  -- 7-day auto-cleanup for activity_log
  CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
  RETURNS void LANGUAGE plpgsql AS $$
  BEGIN
    DELETE FROM activity_log WHERE created_at < now() - interval '7 days';
  END;
  $$;
  
-- ============================================================
-- AUTH TRIGGER: user_profiles otomatik oluşturur
-- ============================================================

-- user_profiles eksik kolonları ekle
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS user_id_display text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone text;

-- Auth trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, is_active, is_real_user, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    true,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- complete_user_setup RPC function
CREATE OR REPLACE FUNCTION public.complete_user_setup(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, is_active, is_real_user, created_at, updated_at)
  SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), true, true, now(), now()
  FROM auth.users WHERE id = p_user_id
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Realtime for activity_log
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;

