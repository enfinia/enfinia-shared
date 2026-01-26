// Supabase client compartilhado para os microserviços Enfinia

const { createClient } = require('@supabase/supabase-js');
const { ENV } = require('../src/variables');

const SUPABASE_URL = ENV.database.SUPABASE_URL;
const SUPABASE_KEY = ENV.database.SUPABASE_KEY;

let supabase = null;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[enfinia-shared] Variáveis do Supabase não configuradas:', {
    hasSUPABASE_URL: Boolean(SUPABASE_URL),
    hasSUPABASE_KEY: Boolean(SUPABASE_KEY)
  });
} else {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'enfinia-shared' } }
  });
}

module.exports = { supabase };
