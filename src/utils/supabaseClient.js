// DEPRECATED: Use /src/lib/supabase.js instead
// This file is kept for backward compatibility only
import { supabase, supabaseAdmin } from '../lib/supabase.js';

// Re-export both instances
export { supabase, supabaseAdmin };
export default supabase;