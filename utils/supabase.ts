
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Key is missing! Check your .env setup.');
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://oghtkucqdxdippeovpdd.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_0e926zX9HE_K3STGNswj7Q_24sgTko0'
);
