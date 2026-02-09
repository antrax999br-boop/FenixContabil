import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oghtkucqdxdippeovpdd.supabase.co'
const supabaseKey = 'sb_publishable_0e926zX9HE_K3STGNswj7Q_24sgTko0'
const supabase = createClient(supabaseUrl, supabaseKey)

async function getEmails() {
    const { data, error } = await supabase.from('profiles').select('email, name')
    if (error) {
        console.error(error)
        return
    }
    console.log(JSON.stringify(data, null, 2))
}

getEmails()
