-- ============================================================
-- KITE EXCHANGE — KAPSAMLI AKTİVİTE TAKIP SİSTEMİ
-- Bu SQL'i Supabase SQL Editor'da çalıştır (tek seferlik)
-- Kullanıcının borsada dokunduğu HER şeyi kaydeder:
--   her buton, her sayfa, her form, her tıklama
--   + IP, ülke, cihaz, geçirilen süre
-- 7 gün sonra otomatik silinir (app tarafından)
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  page text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Hızlı sorgular için index'ler
CREATE INDEX IF NOT EXISTS activity_log_user_created_idx
  ON activity_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS activity_log_created_idx
  ON activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS activity_log_action_idx
  ON activity_log(action);

-- Tüm işlemlere izin ver (admin paneli okur, tracker yazar)
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_log_allow_all ON activity_log;
CREATE POLICY activity_log_allow_all ON activity_log
  FOR ALL USING (true) WITH CHECK (true);

-- Real-time abonelik için replication aktif et
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;

-- ============================================================
-- KURULUM TAMAMLANDI
-- Admin Panelde "Canlı" sekmesi artık çalışacak
-- ============================================================
