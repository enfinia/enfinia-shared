# 📝 Exemplo de Migração: conversational-ai-service

Este arquivo documenta passo a passo a migração do `enfinia-conversational-ai-service` para usar variáveis centralizadas.

## 🔍 Estado Atual (ANTES)

### conversational-ai-service.js (linha ~121)

```javascript
// ❌ Leitura direta de process.env
this.modelName = process.env.OPENAI_CONVERSATIONAL_MODEL || 'gpt-4o-mini';

// ❌ Leitura direta de process.env (linha ~141)
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey || apiKey.trim() === '') {
  Logger.warn('⚠️ OPENAI_API_KEY não configurada - IA conversacional desabilitada');
  this.enabled = false;
  return;
}
```

---

## ✅ Estado Desejado (DEPOIS)

### conversational-ai-service.js

```javascript
// ✅ Importa variáveis centralizadas
const { ENV } = require('@enfinia/shared');

// ... no constructor
this.modelName = ENV.openai.CONVERSATIONAL_MODEL;

// ... no initializeOpenAI()
const apiKey = ENV.openai.API_KEY;

if (!apiKey || apiKey.trim() === '') {
  Logger.warn('⚠️ OPENAI_API_KEY não configurada - IA conversacional desabilitada');
  Logger.info('💡 Configure no .env local ou Railway Shared Variables');
  this.enabled = false;
  return;
}
```

---

## 📋 Passo a Passo da Migração

### 1. Atualizar @enfinia/shared

```bash
cd enfinia-conversational-ai-service
npm install @enfinia/shared@latest
```

### 2. Adicionar importação no topo do arquivo

**Linha ~1-10** (próximo aos outros imports):

```javascript
const OpenAI = require('openai');
const Logger = require('@enfinia/shared/src/logger');
const { ENV } = require('@enfinia/shared'); // ⭐ ADICIONAR ESTA LINHA
```

### 3. Substituir leitura de variáveis

**Linha ~121** (constructor):

```diff
-   this.modelName = process.env.OPENAI_CONVERSATIONAL_MODEL || 'gpt-4o-mini';
+   this.modelName = ENV.openai.CONVERSATIONAL_MODEL;
```

**Linha ~141** (initializeOpenAI):

```diff
-   const apiKey = process.env.OPENAI_API_KEY;
+   const apiKey = ENV.openai.API_KEY;
    
    if (!apiKey || apiKey.trim() === '') {
      Logger.warn('⚠️ OPENAI_API_KEY não configurada - IA conversacional desabilitada');
+     Logger.info('💡 Configure no .env local ou Railway Shared Variables');
      this.enabled = false;
      return;
    }
```

### 4. Testar localmente

```bash
# Certifique-se que .env existe
cat .env

# Deve conter:
# OPENAI_API_KEY=sk-sua-chave
# OPENAI_CONVERSATIONAL_MODEL=gpt-4o-mini

# Iniciar serviço
CONFIG_PATH=.env.sandbox npm run dev

# Verificar logs
# ✅ Deve mostrar: "IA conversacional habilitada"
# ❌ NÃO deve mostrar: "OPENAI_API_KEY não configurada"
```

### 5. Commitar mudanças

```bash
git add src/conversational-ai-service.js package.json
git commit -m "feat: usar variáveis centralizadas do @enfinia/shared"
git push
```

### 6. Deploy no Railway

```bash
# Railway detecta push e faz deploy automático
# OU force rebuild:
# Railway → Service → Settings → Trigger Deploy
```

---

## 🎯 Vantagens Obtidas

✅ **Antes**: 2 leituras diretas de `process.env`  
✅ **Depois**: 0 leituras diretas - tudo centralizado

✅ **Antes**: Sem documentação sobre variáveis necessárias  
✅ **Depois**: Variáveis autodocumentadas no shared

✅ **Antes**: Cada serviço valida de forma diferente  
✅ **Depois**: Validação consistente via ENV

---

## 🔄 Aplicar Mesmo Padrão em Outros Serviços

Use este mesmo processo para:

- ✅ **enfinia-shared/lib/supabase-client.js** - JÁ MIGRADO
- ⏳ **enfinia-financial-plan-service** - OpenAI
- ⏳ **enfinia-transaction-service** - Pluggy
- ⏳ **enfinia-user-service** - Supabase
- ⏳ **enfinia-baseline-service** - Supabase
- ⏳ **enfinia-balance-service** - Supabase
- ⏳ **enfinia-backoffice-service** - Supabase
- ⏳ **enfinia-identity-service** - Supabase

---

## 📊 Checklist de Validação

Após migração de cada serviço:

- [ ] `npm install @enfinia/shared@latest` executado
- [ ] Importação `const { ENV } = require('@enfinia/shared')` adicionada
- [ ] Todas as leituras de `process.env.[VARIAVEL_SENSIVEL]` substituídas
- [ ] Mensagens de erro melhoradas com dicas de configuração
- [ ] Serviço inicia sem erros localmente
- [ ] Testes passam (se houver)
- [ ] Commit e push realizados
- [ ] Deploy no Railway bem-sucedido
- [ ] Logs de produção sem erros de variáveis

---

## 💡 Dica Pro

Busque todas as leituras diretas em um serviço:

```bash
cd enfinia-[nome-do-servico]
grep -r "process\.env\.(SUPABASE\|OPENAI\|PLUGGY\|SECRET\|PASSWORD\|KEY\|TOKEN)" src/
```

Depois, substitua uma por uma usando o padrão deste guia.
