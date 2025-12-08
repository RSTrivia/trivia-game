import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Read Cloudflare Pages environment variables
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);





