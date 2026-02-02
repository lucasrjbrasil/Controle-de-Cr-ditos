# Controle de Créditos IRKO

> Sistema inteligente para gestão de créditos, empréstimos e compliance fiscal.

![Status do Projeto](https://img.shields.io/badge/status-active-success.svg) ![License](https://img.shields.io/badge/license-Private-blue.svg)

## ⚡ Quick Start

Comece a desenvolver em menos de 5 minutos.

### Pré-requisitos
- Node.js 18+
- Acesso ao projeto Supabase (`Project ID` e `Anon Key`)

### Instalação

```bash
# 1. Clone o repositório
git clone <repository-url>
cd Controle-de-Creditos

# 2. Instale dependências
npm install

# 3. Configure ambiente
cp .env.example .env

# ... Edite o .env com suas credenciais do Supabase ...

# 4. Inicie
npm run dev
```

Acesse: `http://localhost:5173`

---

## 🌟 Funcionalidades

- **Gestão Financeira**: Controle de Créditos, Empréstimos e Perdcomp.
- **Compliance**: Validação automática de CNPJ e cálculos fiscais precisos (`decimal.js`).
- **Automação**: Sincronização automática de taxas Selic e Câmbio (via BCB).
- **Segurança**: Autenticação robusta (Supabase Auth) e Proxy Seguro para APIs externas.
- **UI Moderna**: Interface responsiva com React 19, Tailwind v4 e Dark Mode.

---

## 🏗️ Arquitetura

```mermaid
graph TD
    A[Frontend React] -->|Auth & Data| B[Supabase]
    A -->|Secure API| C[Edge Functions]
    C -->|Fetch Rates| D[Banco Central (BCB)]
    B -->|Persist| E[PostgreSQL]
```

### Stack Tecnológico
- **Core**: React 19, Vite, Tailwind CSS v4
- **Dados**: Supabase (Postgres, Auth, Edge Functions)
- **Libs**: `date-fns`, `lucide-react`, `exceljs`

---

## 🛠️ Configuração Avançada

### Scripts Úteis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia servidor local |
| `npm run build` | Compila para produção |
| `npm run lint` | Verifica qualidade do código |

### Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave pública anônima |
| `VITE_N8N_WEBHOOK_URL` | (Opcional) Integração com n8n |

---

## 🤝 Contribuindo

Quer ajudar? Leia nosso [Guia de Contribuição](CONTRIBUTING.md) para detalhes sobre padrões de código e fluxo de trabalho.

---

© 2026 IRKO Contabilidade.
