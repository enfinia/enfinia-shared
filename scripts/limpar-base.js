#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL/SUPABASE_KEY não configurados no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLES = [
  'flow_states',
  'transactions',
  'financial_plan',
  'financial_baseline',
  'invited_contacts',
  'balance',
  'users',
  'accounts',
  'leads',
  'hash',
  'account_goals',
  'user_knowledge',
  'ai_knowledge_documents',
  'statement_layouts',
  'puggly_users',
];

async function clearTable(table) {
  if (DRY_RUN) {
    console.log(`🧪 [dry-run] limpar ${table}`);
    return;
  }

  const filters = [
    (q) => q.not('id', 'is', null),
    (q) => q.not('created_at', 'is', null),
    (q) => q.not('updated_at', 'is', null),
  ];

  let lastError = null;
  for (const withFilter of filters) {
    const query = withFilter(supabase.from(table).delete());
    const { error } = await query;
    if (!error) {
      console.log(`✅ ${table} limpo`);
      return;
    }
    lastError = error;
  }

  console.warn(`⚠️ ${table}: não foi possível limpar (${lastError?.message || 'erro desconhecido'})`);
}

async function main() {
  console.log(`🧹 Limpando base (${DRY_RUN ? 'dry-run' : 'execução real'})...`);
  for (const table of TABLES) {
    // eslint-disable-next-line no-await-in-loop
    await clearTable(table);
  }
  console.log('🏁 Finalizado.');
}

main().catch((err) => {
  console.error('❌ Falha ao limpar base:', err?.message || err);
  process.exit(1);
});

