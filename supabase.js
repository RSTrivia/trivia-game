// supabase.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Your Supabase project URL and anon key
const SUPABASE_URL = 'https://nnlkcwvqhkxasjtshvpw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubGtjd3ZxaGt4YXNqdHNodnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxODY4MzAsImV4cCI6MjA4MDc2MjgzMH0.BtEWYzE4ZA6Fc8rr0n28fPhvIcWdwzoBaOMbAqHYoAo';

// Create a single Supabase client instance
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
 auth: {
    persistSession: true, // ✅ this makes Supabase remember the logged-in user
    autoRefreshToken: true // optional, keeps session active automatically
  }
})





