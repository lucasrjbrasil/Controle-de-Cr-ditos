# 📖 Documentação Completa de APIs

## Visão Geral
Este documento mapeia detalhadamente **100% da superfície de chamadas de rede API / HTTP** no front-end do projeto **Controle de Créditos IRKO**. Nossa infraestrutura trabalha em arquitetura *Serverless / API-First*, onde todo processamento externo passa pelos microsserviços listados abaixo.

---

## 🏢 1. BrasilAPI (Cadeia de CNPJ)

**Finalidade:** Automação de Input e Anti-fraude de digitação. Coleta a Razão Social, Nome Fantasia e geolocalização quando o usuário digita um CNPJ na tela de Cadastro de Empresa.

- **Implementação Local:** `src/services/cnpjService.js`
- **Autenticação:** API Pública Aberta (Sem chaves).
- **Documentação Base:** [Swagger / Docs BrasilAPI](https://brasilapi.com.br/docs#cnpj)
- **Endpoint Principal:**
  ```http
  GET https://brasilapi.com.br/api/cnpj/v1/{cnpj_formatado}
  ```

**Tratamento de Estabilidade no Frontend:**
- **`200 OK`**: Puxa o JSON de resposta (com campos como `razao_social`, `cnpj`, `descricao_situacao_cadastral`) e empurra para os campos do formulário na tela *(controlled forms)*.
- **`404 Not Found`**: Dispara toast informando *"CNPJ não existe na base da RFB"*.
- **`429 Too Many Requests`**: Em caso de volume de cadastros muito grande, congela via `AbortController` o gatilho, forçando tempo de recarga seguro.

---

## 🏦 2. Banco Central do Brasil (SGS & Olinda)

**Finalidade:** Gestão e acompanhamento oficial e diário da **Taxa Selic**, **Câmbios do PTAX** (Dólar, Euro) e **Índices de Inflação** (IPCA, IGP-M), garantindo cálculos homologados pela união.

- **Implementação Local:** `src/services/bcbService.js` (Gerencia Cache L1 com sessionStorage para evitar redundância).

### 2.1 PTAX (API Olinda) - Cotações Históricas de Câmbio
Retorna os parâmetros de compra, venda e datas diárias de todas as moedas abertas pelo BC.
- **Endpoint Oficial:** 
  ```http
  GET https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(...)
  ```
- **Autenticação:** API Aberta (Sem token).
- **Doc Externa:** [Swagger Olinda PTAX](https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/swagger-ui3)

### 2.2 Índices Econômicos Temporais (API SGS)
Retorna percentuais de acumulados mensais ou diários.
- **Endpoint Oficial:**
  ```http
  GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.{CHAVE_ID}/dados?formato=json&dataInicial={DD/MM/YYYY}&dataFinal={DD/MM/YYYY}
  ```
- **Ids Mapeados:**
  - `4390`: Selic (Mensal)
  - `433`: IPCA
  - `189`: IGP-M

### 🛡️ 2.3 Proxy de Segurança / Fallback (Edge Function)
Muitas redes corporativas implementam políticas de CORS muito estritas bloqueando acessos ao `bcb.gov`. O frontend possui um fallback silencioso: **se a chamada direta pro Banco Central falhar na máquina do usuário**, repassamos para nosso Supabase agir como ponte.
- **Endpoint de Proxy:**
  ```http
  POST {VITE_SUPABASE_URL}/functions/v1/fetch-bcb?url={url_do_bcb_em_base64}
  ```
- **Autenticação no Proxy:** Header obrigatório `Authorization: Bearer {JWT_SESSÃO_USUÁRIO}` (ou a chave JWT Anônima caso não deslogado).

---

## 🌩️ 3. Supabase (BaaS - Backend & Autenticação)

**Finalidade:** O projeto usa o Supabase como seu **único servidor central persistente** (PaaS). Ele expõe uma API REST/GraphQL automatizada para nosso Banco de Dados PostgreSQL, regras de acesso RLS e controle de autenticação JWT dos usuários do escritório.

- **Implementação Local:** SDK iniciada em `src/services/supabase.js`.
- **Autenticação Global:** Inicializa injetando a chave `VITE_SUPABASE_ANON_KEY` contida no `.env`. Automaticamente puxa sessões JWT armazenadas no navegador.
- **Como explorar a API:** Como o Supabase gera "endpoints fantasmas" sob o escopo DB baseados nas tabelas criadas (exemplo: `tabela empresas`, `tabela darfs`), você pode testar e extrair o *cURL* e parâmetros pelo painel do [Dashboard Projeto Supabase -> API Docs](https://supabase.com/docs).
- **Entidades de Endpoint Ativas no Frontend via SDK:**
  - `supabase.auth.*` -> Geração e Renovação de Sessão, Login.
  - `supabase.from('companies').*` -> Tabela Raiz do Sistema (CRUD das firmas cadastradas).
  - `supabase.from('selic_overrides')`  | `supabase.from('exchange_overrides')` -> Tabelas que operam como Cache Permanente do Banco Central para não sobrecarregar as APIs Públicas no login e garantir valores caso a BCB saia do ar.
  - `supabase.from('darfs')` -> Tabela atrelada à Arrecadações e Filtros de PDF.

---

## 🤖 4. n8n (Webhooks de Extração por IA)

**Finalidade:** Devido ao peso computacional imenso necessário para transformar PDFs bancários/impostos em String via OCR (Optical Character Recognition) e mapear os valores com o serviço de LLM da OpenAI (GPT), essa área roda de forma Assíncrona no provedor "n8n", conectado via **Webhook**.

- **Endpoints Internos Referenciados no `.env`:**
  ```http
  POST {VITE_N8N_WEBHOOK_URL}
  ```
- **Status Local:** A chave que dispara para a esteira é montada como variável de ambiente (por ex: `https://n8n-callback.sua-infra.com/webhook/perdcomp-ai`).
- **Comportamento Mapeado:**
  1. O usuário sobe *N* Darfs pelo Dropzone (Página Arrecadação).
  2. O Front disparada de forma assíncrona o POST para o Webhook com um Multi-form Data.
  3. Respondemos sucesso para o usuário (*"Documentos em processamento"*).
  4. O back-office n8n quebra os arquivos, joga pra LLM estruturar um JSON e executa por conta própria via Node HTTP/Python a inserção (`POST`) direto na base do Supabase sem retornar o tráfego pesado para o Frontend.
