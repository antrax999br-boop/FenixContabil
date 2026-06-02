import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://oghtkucqdxdippeovpdd.supabase.co';
const supabaseAnonKey = 'sb_publishable_0e926zX9HE_K3STGNswj7Q_24sgTko0';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
    .from('payables')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);
  
  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}
run();
