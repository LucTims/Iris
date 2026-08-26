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

supabase.from('chapters')
  .select('id, number, title')
  .eq('project_id', 'c56f962a-3dfd-49a5-862f-9f9f5f436f37')
  .then(res => {
     console.log("Chapters:", res.data);
     if (res.error) console.error(res.error);
  });
