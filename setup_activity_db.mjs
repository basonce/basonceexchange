import { createClient } from '/home/runner/workspace/node_modules/.pnpm/@supabase+supabase-js@2.100.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/@supabase/supabase-js/dist/index.cjs';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY bulunamadı');
  process.exit(1);
}

const supabase = createClient('https://mgfviqdxeupajntpylig.supabase.co', SERVICE_KEY);

// Test
const { error: testErr } = await supabase.from('user_profiles').select('id').limit(1);
if (testErr) { console.error('Test failed:', testErr.message); process.exit(1); }
console.log('✅ Service role bağlantısı başarılı');

// Check table
const { error: tableErr } = await supabase.from('activity_log').select('id').limit(1);
if (!tableErr) {
  console.log('✅ activity_log tablosu zaten mevcut, her şey hazır!');
  process.exit(0);
}
console.log('Tablo yok, Management API ile oluşturuluyor...');
console.log('Table check error:', tableErr.code);

// Use Management API to execute SQL
const SQL = `
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
CREATE INDEX IF NOT EXISTS activity_log_action_idx ON activity_log(action);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS activity_log_allow_all ON activity_log;
CREATE POLICY activity_log_allow_all ON activity_log FOR ALL USING (true) WITH CHECK (true);
`;

const resp = await fetch(
  'https://api.supabase.com/v1/projects/mgfviqdxeupajntpylig/database/query',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: SQL })
  }
);

const result = await resp.json();
console.log('Management API status:', resp.status);

if (resp.status === 200 || resp.status === 201) {
  console.log('✅ Tablo başarıyla oluşturuldu!');
  
  // Now try to enable realtime (separate call as it may fail)
  const realtimeResp = await fetch(
    'https://api.supabase.com/v1/projects/mgfviqdxeupajntpylig/database/query',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: 'ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;' })
    }
  );
  const realtimeResult = await realtimeResp.json();
  if (realtimeResp.ok) {
    console.log('✅ Realtime aktif edildi');
  } else {
    console.log('Realtime (önemsiz hata):', JSON.stringify(realtimeResult).slice(0, 100));
  }
  
  // Verify table exists now
  const { error: verify } = await supabase.from('activity_log').select('id').limit(1);
  if (!verify) {
    console.log('✅ Doğrulandı: activity_log tablosu erişilebilir!');
  } else {
    console.log('Verification:', verify.message);
  }
} else {
  console.error('❌ Hata:', JSON.stringify(result).slice(0, 400));
}
