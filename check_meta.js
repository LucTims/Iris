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
  console.log('Testing with user:', user.email, 'Current meta:', user.user_metadata);

  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          bio: 'Test bio',
          website_url: 'https://test.com'
        }
      });
  console.log('Update result:', data.user.user_metadata, error);
}
testUpdate();
