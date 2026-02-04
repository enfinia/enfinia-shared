require('dotenv').config({ path: process.env.CONFIG_PATH || '.env' });

const BASE_URL = (process.env.PLUGGY_BASE_URL || 'https://api.pluggy.ai').replace(/\/$/, '');
const CLIENT_ID = process.env.PLUGGY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET || '';

async function getApiKey() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET são obrigatórios');
  }

  const url = `${BASE_URL}/auth`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET })
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Falha ao autenticar em /auth (status ${resp.status}): ${text}`);
  }

  const json = await resp.json();
  if (!json.apiKey) {
    throw new Error('Resposta /auth não contém apiKey');
  }

  return json.apiKey;
}

async function main() {
  try {
    const itemId = process.env.PLUGGY_ITEM_ID || process.argv[2];

    if (!itemId) {
      console.error('Uso: PLUGGY_ITEM_ID=<id> CONFIG_PATH=.env.sandbox node test-pluggy-item-apikey.js');
      console.error('   ou: CONFIG_PATH=.env.sandbox node test-pluggy-item-apikey.js <itemId>');
      process.exit(1);
    }

    const apiKey = await getApiKey();

    const url = `${BASE_URL}/items/${encodeURIComponent(itemId)}`;

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey
      }
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Falha ao buscar item (status ${resp.status}): ${text}`);
    }

    const item = await resp.json();

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
    console.error('ERRO AO BUSCAR ITEM VIA API KEY:', err);
    process.exit(1);
  }
}

main();
