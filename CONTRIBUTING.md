# Guia de Contribuição

Obrigado por contribuir com o projeto Controle de Créditos IRKO! Este documento fornece diretrizes para manter a qualidade e consistência do código.

## 📋 Padrões de Código

### Estrutura de Arquivos

- **Componentes**: Use PascalCase para nomes de arquivos (ex: `CreditForm.jsx`)
- **Hooks**: Use camelCase com prefixo `use` (ex: `useSelic.js`)
- **Utilitários**: Use camelCase (ex: `formatters.js`)
- **Constantes**: Use camelCase (ex: `constants.js`)

### Convenções de Nomenclatura

#### JavaScript/React
```javascript
// Componentes: PascalCase
function CreditForm() { }

// Hooks: camelCase com prefixo 'use'
function useDebounce() { }

// Funções: camelCase
function calculateTotal() { }

// Constantes: UPPER_SNAKE_CASE
const API_ENDPOINT = 'https://api.example.com';

// Variáveis: camelCase
const userName = 'João';
```

#### CSS/Tailwind
- Use classes utilitárias do Tailwind sempre que possível
- Para estilos customizados, use a camada `@layer` apropriada
- Prefira dark mode com `dark:` ao invés de media queries

### Componentes React

#### Estrutura Padrão
```javascript
import React, { useState } from 'react';
import { Icon } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Button from './ui/Button';

/**
 * Descrição do componente
 * @param {Object} props - Props do componente
 */
export default function MyComponent({ prop1, prop2 }) {
    const toast = useToast();
    const [state, setState] = useState(initialValue);

    const handleAction = () => {
        // Lógica
    };

    return (
        <div className="container">
            {/* JSX */}
        </div>
    );
}
```

#### Boas Práticas
- ✅ Use hooks customizados para lógica reutilizável
- ✅ Extraia componentes quando houver mais de 200 linhas
- ✅ Use `React.memo` para componentes que renderizam listas
- ✅ Prefira composição ao invés de herança
- ✅ Use PropTypes ou TypeScript para validação de props

### Tratamento de Erros

#### Notificações
Use o hook `useToast` ao invés de `alert()`:

```javascript
const toast = useToast();

// Sucesso
toast.success('Operação concluída com sucesso!');

// Erro
toast.error('Erro ao processar solicitação');

// Aviso
toast.warning('Preencha todos os campos');

// Informação
toast.info('Dados atualizados');
```

#### Try-Catch
```javascript
try {
    await someAsyncOperation();
    toast.success('Sucesso!');
} catch (error) {
    toast.error(`Erro: ${error.message}`);
    console.error('Detalhes do erro:', error);
}
```

### Validação de Formulários

Use as funções de validação centralizadas:

```javascript
import { validateForm, ERROR_MESSAGES } from '../utils/validationUtils';

const rules = {
    email: { required: true, email: true },
    password: { required: true, minLength: 6 },
    age: { numeric: true, range: [18, 100] }
};

const errors = validateForm(formData, rules);
if (Object.keys(errors).length > 0) {
    // Mostrar erros
}
```

### Formatação

#### Datas
```javascript
import { format } from 'date-fns';

const formatted = format(new Date(), 'dd/MM/yyyy');
```

#### Moeda
```javascript
import { formatCurrency } from '../utils/formatters';

const value = formatCurrency(1234.56); // R$ 1.234,56
```

## 🔄 Workflow de Git

### Branches
- `main` - Produção
- `develop` - Desenvolvimento
- `feature/nome-da-feature` - Novas funcionalidades
- `fix/nome-do-bug` - Correções

### Commits

Use mensagens descritivas em português:

```
feat: adiciona validação de formulário de créditos
fix: corrige cálculo de juros compostos
docs: atualiza README com instruções de deploy
style: ajusta espaçamento no componente Header
refactor: extrai lógica de cálculo para utilitário
test: adiciona testes para LoanCalculator
```

Prefixos:
- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação (sem mudança de lógica)
- `refactor:` - Refatoração de código
- `test:` - Testes
- `chore:` - Tarefas de manutenção

### Pull Requests

1. Crie uma branch a partir de `develop`
2. Faça suas alterações
3. Teste localmente
4. Crie um PR para `develop`
5. Aguarde revisão

## ✅ Checklist Antes de Commit

- [ ] Código está formatado corretamente
- [ ] Sem `console.log` no código
- [ ] Sem `alert()` - use `toast`
- [ ] Componentes têm JSDoc quando apropriado
- [ ] Validações usam `validationUtils`
- [ ] Estilos seguem o design system
- [ ] Testado em modo claro e escuro
- [ ] Sem erros no console do navegador
- [ ] Build funciona (`npm run build`)

## 🧪 Testes

```bash
# Executar testes
npm test

# Executar com coverage
npm test -- --coverage
```

## 📚 Recursos

- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase Docs](https://supabase.com/docs)
- [Lucide Icons](https://lucide.dev/)

## 💬 Dúvidas?

Entre em contato com a equipe de desenvolvimento da IRKO.
