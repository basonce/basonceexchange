-- ACTIVITY LOG TABLE — Run this in Supabase SQL Editor
-- Tracks user page visits and key button actions in real-time
-- Records are automatically purged after 7 days by the app on every session start

CREATE TABLE IF NOT EXISTS activity_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  page text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_user_created_idx ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_created_idx ON activity_log(created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_log_allow_all ON activity_log;
CREATE POLICY activity_log_allow_all ON activity_log FOR ALL USING (true) WITH CHECK (true);

-- Optional: Enable pg_cron for automatic 7-day cleanup (requires pg_cron extension)
-- If pg_cron is enabled on your Supabase plan, uncomment below:
-- SELECT cron.schedule(
--   'cleanup-activity-log',
--   '0 3 * * *',  -- runs at 3am daily
--   $$DELETE FROM activity_log WHERE created_at < now() - interval '7 days'$$
-- );
