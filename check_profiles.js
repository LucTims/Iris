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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

supabase.from('profiles').select('*').limit(1).then(res => {
     console.log('Profile fields:', res.data ? Object.keys(res.data[0] || {}) : null);
     console.log('Error?', res.error);
});
