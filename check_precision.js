import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://oghtkucqdxdippeovpdd.supabase.co', 'sb_publishable_0e926zX9HE_K3STGNswj7Q_24sgTko0');

async function run() {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .ilike('invoice_number', '%0326%');
  
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
run();
