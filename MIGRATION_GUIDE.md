# 🔄 Guia de Migração: Centralizando Variáveis de Ambiente

## Objetivo

Migrar todos os serviços para usar as variáveis centralizadas do `@enfinia/shared`, eliminando leituras diretas de `process.env` e garantindo segurança.

## ✅ Benefícios

- ✨ **Segurança**: Nunca mais expor credenciais no código
- 🎯 **Centralização**: Um único lugar para todas as variáveis
- 🔄 **Consistência**: Mesmos nomes em todos os serviços
- 📝 **Documentação**: Variáveis autodocumentadas
- ⚡ **Agilidade**: Mudanças sem deploy de código

---

## 📋 Checklist de Migração

### 1️⃣ Atualizar enfinia-shared

```bash
cd enfinia-shared
git add .
git commit -m "feat: centralizar todas as variáveis de ambiente"
git push
npm version patch
npm publish
```

### 2️⃣ Atualizar cada serviço

Para **CADA** serviço (bot-gateway, user-service, etc.):

#### A. Atualizar dependência

```bash
cd enfinia-[nome-do-servico]
npm install @enfinia/shared@latest
```

#### B. Substituir importações

**ANTES:**
```javascript
// ❌ Leitura direta
const supabaseUrl = process.env.SUPABASE_URL;
const openaiKey = process.env.OPENAI_API_KEY;
const pluggyClientId = process.env.PLUGGY_CLIENT_ID;
```

**DEPOIS:**
```javascript
// ✅ Usa variáveis centralizadas
const { ENV } = require('@enfinia/shared');

const supabaseUrl = ENV.database.SUPABASE_URL;
const openaiKey = ENV.openai.API_KEY;
const pluggyClientId = ENV.pluggy.CLIENT_ID;
```

#### C. Atualizar arquivos de configuração

**Exemplo: src/config/supabase.js**

```javascript
// ANTES
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// DEPOIS
const { ENV } = require('@enfinia/shared');

const SUPABASE_URL = ENV.database.SUPABASE_URL;
const SUPABASE_KEY = ENV.database.SUPABASE_KEY;
```

#### D. Atualizar validações

**ANTES:**
```javascript
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL não configurado');
}
```

**DEPOIS:**
```javascript
const { ENV } = require('@enfinia/shared');

if (!ENV.database.SUPABASE_URL) {
  throw new Error('❌ SUPABASE_URL não configurado. Configure no .env ou Railway.');
}
```

---

## 🔍 Serviços que Precisam de Migração

### 1. enfinia-bot-gateway
**Arquivos a verificar:**
- Não tem leitura direta de variáveis sensíveis ✅

### 2. enfinia-user-service
**Arquivos a migrar:**
- [ ] `src/config/supabase.js` - Trocar `process.env.SUPABASE_*` por `ENV.database.*`

### 3. enfinia-identity-service
**Arquivos a migrar:**
- [ ] `src/db-service.js` - Trocar `process.env.SUPABASE_*` por `ENV.database.*`
- [ ] `src/crypto-service.js` (se tiver chaves)

### 4. enfinia-transaction-service
**Arquivos a migrar:**
- [ ] `src/index.js` - Trocar `process.env.PLUGGY_*` por `ENV.pluggy.*`
- [ ] `src/puggly-openfinance-service.js`

### 5. enfinia-conversational-ai-service
**Arquivos a migrar:**
- [ ] `src/conversational-ai-service.js` - Trocar `process.env.OPENAI_*` por `ENV.openai.*`

### 6. enfinia-financial-plan-service
**Arquivos a migrar:**
- [ ] `src/openai-client.js` - Trocar `process.env.OPENAI_API_KEY` por `ENV.openai.API_KEY`

### 7. enfinia-file-processing-service
**Arquivos a verificar:**
- [ ] Verificar se usa variáveis sensíveis

### 8. enfinia-baseline-service
**Arquivos a migrar:**
- [ ] `src/config/supabase.js` - Trocar `process.env.SUPABASE_*` por `ENV.database.*`

### 9. enfinia-summary-service
**Arquivos a verificar:**
- [ ] Verificar se usa variáveis sensíveis

### 10. enfinia-balance-service
**Arquivos a migrar:**
- [ ] `src/config/supabase.js` - Trocar `process.env.SUPABASE_*` por `ENV.database.*`

### 11. enfinia-orchestration-service
**Arquivos a verificar:**
- [ ] Verificar se usa variáveis sensíveis

### 12. enfinia-backoffice-service
**Arquivos a migrar:**
- [ ] `config/supabase.js` - Trocar `process.env.SUPABASE_*` por `ENV.database.*`

---

## 🧪 Teste Após Migração

Para cada serviço migrado:

```bash
# 1. Instalar dependências
npm install

# 2. Verificar que .env existe
ls -la .env

# 3. Testar inicialização
CONFIG_PATH=.env.sandbox npm run dev

# 4. Verificar logs
# Deve mostrar: "✅ Conectado ao Supabase" (ou similar)
# NÃO deve mostrar: "❌ Variáveis não configuradas"
```

---

## 🚀 Deploy no Railway

### 1. Configure Shared Variables

Acesse: `Railway → Enfinia Project → Settings → Shared Variables`

Adicione:
```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-service-role
OPENAI_API_KEY=sk-sua-chave
PLUGGY_CLIENT_ID=seu-client-id
PLUGGY_CLIENT_SECRET=seu-client-secret
ASSINATURA_VALOR=12.90
```

### 2. Reinicie todos os serviços

```bash
# No Railway dashboard
Services → [Cada serviço] → Restart
```

### 3. Verifique logs

Cada serviço deve iniciar sem erros de variáveis não configuradas.

---

## 📝 Padrão para Novos Serviços

Sempre que criar um novo serviço:

```javascript
// 1. Importar variáveis centralizadas
const { ENV } = require('@enfinia/shared');

// 2. Validar obrigatórias
if (!ENV.database.SUPABASE_URL || !ENV.database.SUPABASE_KEY) {
  throw new Error('❌ Variáveis de banco não configuradas');
}

// 3. Usar variáveis
const supabase = createClient(
  ENV.database.SUPABASE_URL,
  ENV.database.SUPABASE_KEY
);
```

---

## ❓ FAQ

### Q: E se eu precisar de uma variável nova?

**R:** Adicione no `enfinia-shared/src/variables.js`:

```javascript
const ENV = {
  // ... existentes
  
  novoServico: {
    get API_KEY() {
      return process.env.NOVO_SERVICO_API_KEY;
    }
  }
};
```

Depois:
1. `npm version patch` e `npm publish` no shared
2. `npm install @enfinia/shared@latest` nos serviços
3. Use `ENV.novoServico.API_KEY` nos serviços

### Q: Posso ainda usar process.env diretamente?

**R:** Tecnicamente sim, mas **NÃO RECOMENDADO**. Use sempre `ENV` para:
- Consistência entre serviços
- Facilitar futuras mudanças
- Documentação centralizada

### Q: Como testar localmente sem Railway?

**R:** Crie um arquivo `.env` baseado no `.env.example` do shared:

```bash
cp enfinia-shared/.env.example seu-servico/.env
# Edite .env com suas credenciais locais
```

### Q: Preciso reiniciar serviços após mudar variáveis?

**R:** **SIM**. Variáveis são lidas na inicialização. Para aplicar mudanças:
- Local: Ctrl+C e restart
- Railway: Restart service no dashboard

---

## 🎯 Resultado Final

✅ Todas as credenciais centralizadas no shared  
✅ Nenhum valor sensível exposto no Git  
✅ Railway como única fonte de verdade para produção  
✅ .env local para desenvolvimento  
✅ Documentação completa de todas as variáveis  
✅ Fácil adicionar novas variáveis no futuro
