require('dotenv').config({ path: process.env.CONFIG_PATH || '.env' });

const PluggyClient = require('./src/pluggy-client');

(async () => {
  try {
    const c = new PluggyClient();
    const items = await c.listItems();
    console.log('LIST ITEMS RESULT:\n', JSON.stringify(items, null, 2));
  } catch (err) {
    console.error('ERRO AO LISTAR ITENS:', err);
  }
})();
