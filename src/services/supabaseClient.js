import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nnaymteoxvdnsnhlyvkk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uYXltdGVveHZkbnNuaGx5dmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MjcwMzYsImV4cCI6MjA2NTQwMzAzNn0.L7CLWRSqOq91Lz0zRq6ddRLyEN6lBgewtcfGaqLiceM';
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations
let supabaseAdmin = null;
if (supabaseServiceRoleKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} else {
  console.warn("Supabase service role key not found. Admin operations will be disabled.");
}

export { supabaseAdmin };