import { createClient } from '@supabase/supabase-js'

// Replace with your Supabase details
const SUPABASE_URL = "https://nnlkcwvqhkxasjtshvpw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubGtjd3ZxaGt4YXNqdHNodnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxODY4MzAsImV4cCI6MjA4MDc2MjgzMH0.BtEWYzE4ZA6Fc8rr0n28fPhvIcWdwzoBaOMbAqHYoAo";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
