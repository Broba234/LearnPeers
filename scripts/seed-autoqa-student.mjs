import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const EMAIL = 'autoqa.student@learnpeers.com';
const PASSWORD = 'AutoQA-Student-2026!';

// Does it already exist?
const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
let user = list?.users?.find(u => u.email === EMAIL);
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true });
  if (error) { console.error('createUser failed:', error.message); process.exit(1); }
  user = data.user;
  console.log('auth user created:', user.id);
} else {
  // make sure the password is what we expect
  await admin.auth.admin.updateUserById(user.id, { password: PASSWORD, email_confirm: true });
  console.log('auth user existed, password reset:', user.id);
}

const { error: pErr } = await admin.from('Profiles').upsert({
  id: user.id,
  email: EMAIL,
  name: 'AutoQA Test Student',
  role: 'student',
  profile_setup: true,
  email_verified: true,
}, { onConflict: 'id' });
if (pErr) { console.error('profile upsert failed:', pErr.message); process.exit(1); }
console.log('profile ready: AutoQA Test Student <' + EMAIL + '>');
