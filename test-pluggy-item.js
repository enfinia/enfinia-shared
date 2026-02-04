require('dotenv').config({ path: process.env.CONFIG_PATH || '.env' });

const PluggyClient = require('./src/pluggy-client');

async function main() {
  try {
    const itemId = process.env.PLUGGY_ITEM_ID || process.argv[2];

    if (!itemId) {
      console.error('Uso: PLUGGY_ITEM_ID=<id> CONFIG_PATH=.env.sandbox node test-pluggy-item.js');
      console.error('   ou: CONFIG_PATH=.env.sandbox node test-pluggy-item.js <itemId>');
      process.exit(1);
    }

    const client = new PluggyClient();

    if (!client.isEnabled()) {
      console.error('PluggyClient desabilitado: configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET');
      process.exit(1);
    }

    const item = await client.getItem(itemId);

    console.log('ITEM DETAIL:\n', JSON.stringify(item, null, 2));

    if (item) {
      console.log('\nResumo:');
      console.log('- id:', item.id);
      console.log('- status:', item.status);
      console.log('- executionStatus:', item.executionStatus);
      console.log('- lastUpdatedAt:', item.lastUpdatedAt || item.updatedAt);
      console.log('- clientUserId:', item.clientUserId);
      if (item.error) {
        console.log('- error:', JSON.stringify(item.error));
      }
    }
  } catch (err) {
    console.error('ERRO AO BUSCAR ITEM:', err);
    process.exit(1);
  }
}

main();
