const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
};

/**
 * Service-role client — bypasses RLS. Use for all backend operations.
 */
const supabase = createClient(supabaseUrl, supabaseServiceKey, clientOptions);

/**
 * Auth client — used only for Supabase Auth operations (login, invite, delete user).
 */
const authSupabase = createClient(supabaseUrl, supabaseServiceKey, clientOptions);

module.exports = { supabase, authSupabase, supabaseUrl, supabaseAnonKey };
