# Controle de Créditos IRKO

Sistema de gerenciamento de créditos, empréstimos e taxas financeiras desenvolvido para IRKO Contabilidade.

## 📋 Sobre o Projeto

O Controle de Créditos é uma aplicação web moderna que permite gerenciar:

- **Créditos**: Controle de créditos com cálculo de evolução mensal
- **Empréstimos**: Gestão completa de empréstimos com diferentes tipos de juros e amortização
- **Taxas Selic**: Histórico e gerenciamento de taxas Selic mensais
- **Perdcomp**: Gerenciamento de compensações
- **Empresas**: Cadastro e organização de empresas
- **Câmbio**: Cotações e histórico de moedas estrangeiras

## 🚀 Tecnologias

- **Frontend**: React 19 + Vite
- **Estilização**: Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Auth)
- **Bibliotecas**:
  - `date-fns` - Manipulação de datas
  - `decimal.js` - Cálculos financeiros precisos
  - `lucide-react` - Ícones
  - `xlsx` - Exportação para Excel

## 🛠️ Configuração

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn

### Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd Controle-de-Creditos
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:

Crie um arquivo `.env` na raiz do projeto (veja `.env.example`):

```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes de UI reutilizáveis
│   ├── *Manager.jsx    # Componentes de gerenciamento
│   └── *Form.jsx       # Formulários
├── context/            # Contexts do React (estado global)
├── hooks/              # Hooks customizados
├── services/           # Serviços (API, Supabase, BCB)
├── utils/              # Utilitários e helpers
├── App.jsx             # Componente principal
└── main.jsx            # Ponto de entrada
```

## 🎨 Design System

O projeto utiliza um design system customizado baseado nas cores da marca IRKO:

- **Azul IRKO**: `#003B71` - Cor principal
- **Laranja IRKO**: `#F37021` - Cor de destaque
- **Tema**: Suporte a modo claro e escuro

## 📝 Scripts Disponíveis

```bash
npm run dev      # Inicia servidor de desenvolvimento
npm run build    # Cria build de produção
npm run preview  # Preview do build de produção
npm run lint     # Executa linter
```

## 🔐 Autenticação

A aplicação utiliza Supabase Auth para autenticação de usuários. Funcionalidades:

- Login com email/senha
- Registro de novos usuários
- Gerenciamento de perfil
- Logout

## 💾 Banco de Dados

O schema do banco de dados está disponível em `schema.sql`. Principais tabelas:

- `credits` - Créditos
- `loans` - Empréstimos
- `loan_payments` - Pagamentos de empréstimos
- `selic_rates` - Taxas Selic
- `perdcomps` - Compensações
- `companies` - Empresas
- `exchange_rates` - Taxas de câmbio

## 🤝 Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes sobre padrões de código e processo de contribuição.

## 📄 Licença

© 2026 IRKO Contabilidade. Todos os direitos reservados.

## 🆘 Suporte

Para suporte, entre em contato com a equipe de desenvolvimento da IRKO.
