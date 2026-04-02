// Uses Supabase Management API with sb_secret_ format key
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = 'mgfviqdxeupajntpylig';

if (!SERVICE_KEY) { console.error('No key'); process.exit(1); }
console.log('Key format:', SERVICE_KEY.startsWith('sb_secret_') ? 'New format ✅' : 'Old format');

const SQL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS activity_log (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    action text NOT NULL,
    page text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS activity_log_user_created_idx ON activity_log(user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS activity_log_created_idx ON activity_log(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS activity_log_action_idx ON activity_log(action)`,
  `ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS activity_log_allow_all ON activity_log`,
  `CREATE POLICY activity_log_allow_all ON activity_log FOR ALL USING (true) WITH CHECK (true)`,
];

// Try the Management API v1 - run each statement
async function runSQL(sql) {
  const resp = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    }
  );
  const data = await resp.json();
  return { status: resp.status, data };
}

// Also try the REST API path used by Supabase CLI
async function runSQLViaREST(sql) {
  const resp = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/sql`,
    {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    }
  );
  const data = await resp.json();
  return { status: resp.status, data };
}

// Test first
const test = await runSQL('SELECT 1 as test');
console.log('Database query test:', test.status, JSON.stringify(test.data).slice(0,100));

const test2 = await runSQLViaREST('SELECT 1 as test');
console.log('SQL endpoint test:', test2.status, JSON.stringify(test2.data).slice(0,100));

