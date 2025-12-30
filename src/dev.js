require('dotenv').config({ path: process.env.CONFIG_PATH || '.env' });

// Inicializa o módulo compartilhado apenas para garantir que a configuração carregue
require('./index');
