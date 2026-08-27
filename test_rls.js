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
const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testProfileUpdate() {
  const email = 'test_update_rls@example.com';
  const password = 'password123';

  // Create user
  let { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError && createError.message.includes('already exists')) {
     const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
     user = users.find(u => u.email === email);
  } else if (createError) {
     return console.log('Create error:', createError);
  }

  // Ensure profile exists
  await supabaseAdmin.from('profiles').upsert({ id: user.id, full_name: 'Old Name' });

  // Sign in
  const { error: signInError } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (signInError) return console.log('SignIn error:', signInError);

  // Try UPSERT
  const { error: upsertError } = await supabaseAnon.from('profiles').upsert({ id: user.id, full_name: 'New Name Upsert' });
  console.log('Upsert Error:', upsertError?.message || 'Success');

  // Try UPDATE
  const { error: updateError } = await supabaseAnon.from('profiles').update({ full_name: 'New Name Update' }).eq('id', user.id);
  console.log('Update Error:', updateError?.message || 'Success');
}

testProfileUpdate();
