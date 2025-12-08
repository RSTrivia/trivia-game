import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Read Cloudflare Pages environment variables
const supabaseUrl = window.__env.SUPABASE_URL;
const supabaseKey = window.__env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);







