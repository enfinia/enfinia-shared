# @enfinia/shared

Pacote compartilhado com configurações, variáveis de ambiente e utilitários usados por todos os serviços da plataforma Enfinia.

## 📦 Instalação

```bash
npm install @enfinia/shared
```

## 🔐 Configuração de Variáveis de Ambiente

### ⚠️ SEGURANÇA PRIMEIRO

**NUNCA inclua valores sensíveis (senhas, tokens, API keys) diretamente no código!**

Todas as credenciais devem ser definidas como variáveis de ambiente:
- **Localmente**: Arquivo `.env` (nunca commitado no Git)
- **Railway**: Shared Variables ou variáveis específicas do serviço

### 📝 Como Configurar

#### 1. **Desenvolvimento Local**

Copie o arquivo de exemplo para cada serviço:

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais reais.

#### 2. **Railway (Produção)**

Configure as variáveis no dashboard:

**Shared Variables** (afeta todos os serviços):
```
Settings → Shared Variables → Add Variable
```

Exemplo:
- `SUPABASE_URL` = https://seu-projeto.supabase.co
- `SUPABASE_KEY` = sua-chave-service-role
- `OPENAI_API_KEY` = sk-sua-chave
- `ASSINATURA_VALOR` = 12.90

**Service-Specific Variables** (afeta apenas um serviço):
```
Service → Variables → Add Variable
```

### 🎯 Como Usar nos Serviços

#### Importar variáveis centralizadas:

```javascript
const { ENV } = require('@enfinia/shared');

// ✅ CORRETO - Usa variáveis centralizadas
const supabaseUrl = ENV.database.SUPABASE_URL;
const openaiKey = ENV.openai.API_KEY;
const assinaturaValor = ENV.assinatura.VALOR;

// ❌ EVITE - Leitura direta de process.env
const supabaseUrl = process.env.SUPABASE_URL; // Prefira usar ENV
```

#### Exemplo prático em um serviço:

```javascript
// src/config/database.js
const { ENV } = require('@enfinia/shared');
const { createClient } = require('@supabase/supabase-js');

if (!ENV.database.SUPABASE_URL) {
  throw new Error('❌ SUPABASE_URL não configurado');
}

if (!ENV.database.SUPABASE_KEY) {
  throw new Error('❌ SUPABASE_KEY não configurado');
}

const supabase = createClient(
  ENV.database.SUPABASE_URL,
  ENV.database.SUPABASE_KEY
);

module.exports = { supabase };
```

### 📋 Variáveis Disponíveis

#### 🔐 **Database** (OBRIGATÓRIAS)
```javascript
ENV.database.SUPABASE_URL
ENV.database.SUPABASE_KEY
```

#### 🤖 **OpenAI** (OBRIGATÓRIAS)
```javascript
ENV.openai.API_KEY
ENV.openai.CONVERSATIONAL_MODEL  // default: gpt-4o-mini
ENV.openai.PLANNING_MODEL        // default: gpt-4o
```

#### 🔌 **Pluggy** (OBRIGATÓRIAS para Open Finance)
```javascript
ENV.pluggy.CLIENT_ID
ENV.pluggy.CLIENT_SECRET
ENV.pluggy.BASE_URL              // default: https://api.pluggy.ai
ENV.pluggy.CONNECT_URL           // default: https://connect.pluggy.ai
ENV.pluggy.DEFAULT_ACCOUNT_ID
```

#### 💳 **Assinatura** (OPCIONAL)
```javascript
ENV.assinatura.VALOR             // default: "12,90"
```

#### 🌐 **URLs de Serviços** (OPCIONAL - defaults localhost)
```javascript
ENV.services.BOT_GATEWAY_URL
ENV.services.USER_SERVICE_URL
ENV.services.IDENTITY_SERVICE_URL
ENV.services.BASELINE_SERVICE_URL
ENV.services.TRANSACTION_SERVICE_URL
ENV.services.FILE_PROCESSING_SERVICE_URL
ENV.services.SUMMARY_SERVICE_URL
ENV.services.CONVERSATIONAL_AI_SERVICE_URL
ENV.services.BALANCE_SERVICE_URL
ENV.services.FINANCIAL_PLAN_SERVICE_URL
ENV.services.ORCHESTRATION_SERVICE_URL
ENV.services.BACKOFFICE_SERVICE_URL
```

#### 🔧 **Configurações Gerais** (OPCIONAL)
```javascript
ENV.config.NODE_ENV              // default: development
ENV.config.PORT                  // default: 3000
ENV.config.LOG_LEVEL             // default: info
```

## 🔄 Atualização de Valores

### Para alterar configurações em produção:

1. Acesse Railway → Shared Variables
2. Edite o valor desejado (ex: `ASSINATURA_VALOR`)
3. Reinicie os serviços para aplicar as mudanças

**Vantagem**: Não precisa fazer deploy de código para mudar configurações!

## 📚 Outras Funcionalidades

### Variáveis de Domínio

```javascript
const AppVars = require('@enfinia/shared');

// Configurações do produto
AppVars.produto.RESUMO_CAPACIDADES

// Limites de trial
AppVars.trial.LIMITE_ARQUIVOS

// Distribuição 50/30/20
AppVars.distribuicao503020

// Categorias e baseline
AppVars.categorias.BASELINE

// Comandos reconhecidos
AppVars.comandos.ACEITACAO
```

### Funções Utilitárias

```javascript
const { 
  getCategoryByIndex, 
  categoryIndexToTitle,
  encontrarRecomendacaoPorCategoria 
} = require('@enfinia/shared');

const categoria = await getCategoryByIndexAsync(3);
const titulo = await categoryIndexToTitleAsync(3);
```

## 🚀 Deploy

### Publicar nova versão

```bash
npm version patch  # ou minor, major
npm publish
```

### Atualizar em outros serviços

```bash
npm install @enfinia/shared@latest
```

## 📖 Documentação Completa

Para mais detalhes sobre categorização, distribuição financeira e fluxos, consulte os comentários em [src/variables.js](src/variables.js).
