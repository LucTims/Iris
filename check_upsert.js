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

async function testUpdate() {
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError || !users.length) return console.log('No users', usersError);
  
  const user = users[0];
  console.log('Testing with user:', user.email);

  const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: 'Test Name',
          updated_at: new Date().toISOString()
        });
  console.log('Upsert error:', error);
}
testUpdate();
