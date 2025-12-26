// Supabase client compartilhado para os microserviços Enfinia

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[enfinia-shared] Variáveis do Supabase não configuradas:', {
    hasSUPABASE_URL: Boolean(SUPABASE_URL),
    hasSUPABASE_KEY: Boolean(process.env.SUPABASE_KEY),
    hasSUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  });
} else {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'enfinia-shared' } }
  });
}

module.exports = { supabase };
