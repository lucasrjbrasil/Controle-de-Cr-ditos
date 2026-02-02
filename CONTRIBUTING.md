# Guia de Contribuição

Obrigado por ajudar a melhorar o Controle de Créditos! Focamos em qualidade e simplicidade.

## 🚀 Como Contribuir

1.  **Crie uma Branch**: Sempre a partir de `develop`.
    - `feat/nova-funcionalidade`
    - `fix/correcao-bug`
2.  **Desenvolva**: Faça commits pequenos e descritivos.
3.  **Abra um PR**: Descreva o "Porquê" e o "Como".
4.  **Code Review**: Aguarde a aprovação antes do merge.

---

## 📋 Padrões de Código (Cheatsheet)

| Categoria | ✅ Faça (Do) | ❌ Não Faça (Don't) |
|-----------|----------------|---------------------|
| **Nomes** | `CreditForm`, `calculateTotal`, `useSelic` | `form1`, `calc`, `hook` |
| **Componentes** | Pequenos (<200 linhas), Funcionais | Classes, Monolitos gigantes |
| **Estilos** | Tailwind (`className="p-4"`) | CSS Inline (`style={{padding: 20}}`) |
| **Async** | `try/catch` com `toast.error()` | `.then().catch()` ou `alert()` |
| **Comentários** | Explique o *Porquê* (regra de negócia) | Explique o *O que* (óbvio no código) |

### Exemplo de Componente Ideal

```javascript
/**
 * Exibe saldo atualizado.
 * Regra: Saldo negativo deve ser vermelho.
 */
export default function BalanceDisplay({ value }) {
    const { theme } = useTheme();
    
    // Formatação centralizada
    const formatted = formatCurrency(value);
    const isNegative = value < 0;

    return (
        <div className={`p-4 ${isNegative ? 'text-red-500' : 'text-green-500'}`}>
            {formatted}
        </div>
    );
}
```

---

## 🛡️ Segurança & Qualidade

Antes de enviar seu PR, verifique:

- [ ] **Sanitização**: Inputs de usuário usam `sanitize()`?
- [ ] **Feedback**: Usuário recebe `toast` de sucesso/erro?
- [ ] **Logs**: Removeu todos os `console.log` de debug?
- [ ] **Responsivo**: Testou em Mobile e Desktop?
- [ ] **Dark Mode**: Testou com o tema escuro ativado?

## 🧪 Comandos de Teste

```bash
npm run lint   # Verificar estilo
npm test       # Rodar testes unitários
npm run build  # Verificar se o build passa
```

---

Dúvidas? Chame a equipe no Slack/Discord. Bom código! 🚀
