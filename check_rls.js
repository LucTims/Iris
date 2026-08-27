const fs = require('fs');
const envStr = fs.readFileSync('.env.local', 'utf-8');
const env = envStr.split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if(k && v.length) {
    acc[k] = v.join('=').replace(/^"|"$/g, '').replace(/\r/g, '').trim();
  }
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRLS() {
  const { data, error } = await supabase.rpc('execute_sql', { sql: 'select * from pg_policies where tablename = \'profiles\';' });
  // Since we don't have execute_sql, let's query via Postgres if possible.
  // Wait, we can't.
}
checkRLS();
