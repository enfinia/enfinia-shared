const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.sandbox') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

(async () => {
  console.log('🧹 Limpando leads e hashes de teste...\n');
  
  // Delete leads first (foreign key dependency)
  const { error: leadsError } = await supabase
    .from('leads')
    .delete()
    .neq('id', 0);
  
  if (leadsError) {
    console.error('❌ Erro ao deletar leads:', leadsError.message);
  } else {
    console.log('✅ Leads deletados');
  }
  
  // Delete hashes
  const { error: hashError } = await supabase
    .from('hash')
    .delete()
    .neq('id', 0);
  
  if (hashError) {
    console.error('❌ Erro ao deletar hashes:', hashError.message);
  } else {
    console.log('✅ Hashes deletados');
  }
  
  console.log('\n✨ Limpeza concluída! Agora os novos hashes serão criados com HASH_SALT/SECRET consistentes.');
  process.exit(0);
})();
