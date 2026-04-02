-- ACTIVITY LOG TABLE — Run this in Supabase SQL Editor
-- Tracks user page visits and key actions in real-time

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
CREATE POLICY activity_log_allow_all ON activity_log FOR ALL USING (true) WITH CHECK (true);
