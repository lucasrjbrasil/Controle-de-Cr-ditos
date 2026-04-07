# 🎨 IRKO - Guia de Estilo e Padrões de Design (Theme & Design System)

Este documento define as regras e padrões visuais do projeto, baseados no uso do **Tailwind CSS v4** e customizações da marca IRKO. Todos os novos componentes e interfaces devem seguir estritamente estes padrões para garantir consistência visual e experiência de usuário uniforme.

---

## 1. 🌈 Cores e Paleta (Theme Colors)

A paleta de cores é definida no `src/index.css` dentro da diretiva `@theme` e utiliza as variáveis CSS nativas do Tailwind v4.

### 🔷 Cores da Marca (Brand)

Essas cores são usadas para ações primárias, destaques e identidade da marca.

| Variável | Hex | Uso Padrão |
| :--- | :--- | :--- |
| `irko-blue` | `#003B71` | **Cor Primária**. Botões principais, cabeçalhos de destaque, links ativos. |
| `irko-orange` | `#F37021` | **Destaque Secundário**. Ações de atenção, focus rings. |
| `irko-blue-hover` | `#002d56` | Estado de hover para elementos `irko-blue`. |

### 🔵 Escala de Azuis Customizados (Support Blues)

Usados para fundos sutis, bordas e estados intermediários.

| Variável | Hex | Uso |
| :--- | :--- | :--- |
| `blue-50` | `#f0f4f9` | Fundos muito claros. |
| `blue-100` | `#dde5f0` | |
| `blue-200` | `#c1d0e5` | Bordas sutis. |
| `blue-300` | `#99b3d4` | |
| `blue-400` | `#6b8dc0` | |
| `blue-500` | `#4D629B` | Textos de suporte com cor. |

### 🌑 Cores Neutras (Neutrals)

Utiliza-se a escala `Slate` do Tailwind para neutros.

*   **Fundo da Página (Light):** `bg-slate-50`
*   **Fundo da Página (Dark):** `bg-slate-950`
*   **Texto Principal:** `text-slate-900` (Light) / `text-slate-50` (Dark)
*   **Texto Secundário:** `text-slate-600` (Light) / `text-slate-400` (Dark)
*   **Bordas:** `border-slate-200` (Light) / `border-slate-800` (Dark)

### 🚦 Cores de Feedback (Status)

Sempre use estas cores para indicar estados do sistema.

*   **Sucesso:** `Emerald` (ex: `text-emerald-600`, `bg-emerald-100`)
*   **Erro/Perigo:** `Red` (ex: `text-red-600`, `bg-red-50`)
*   **Aviso:** `Amber` (ex: `text-amber-600`, `bg-amber-100`)
*   **Info:** `Blue` (ex: `text-blue-600`, `bg-blue-100`)

---

## 2. 🔤 Tipografia (Typography)

*   **Fonte Principal:** `"Inter", sans-serif`, `system-ui`, `-apple-system`.
*   **Tamanho Base:** `text-sm` (14px) é o padrão para o corpo do texto (`body`).
*   **Pesos:**
    *   `font-normal` (400): Texto corrido.
    *   `font-medium` (500): Botões, labels de input, destaques sutis.
    *   `font-semibold` (600): Títulos de seções, badges.
    *   `font-bold` (700): Títulos principais.

---

## 3. 🧩 Componentes Padrão (UI Components)

Utilize os componentes da pasta `src/components/ui` ao invés de criar HTML puro. Abaixo estão as especificações dos principais componentes.

### 🔘 Botões (`Button.jsx`)

*   **Border Radius:** `rounded-xl`
*   **Focus Ring:** `focus-visible:ring-irko-orange`
*   **Transição:** `transition-all active:scale-95` (efeito de clique)

**Variantes:**

1.  **Primary (`variant="primary"`)**:
    *   `bg-irko-blue` text-white
    *   `hover:bg-irko-blue-hover`
    *   `shadow-lg shadow-irko-blue/20`
    *   *Uso:* Ação principal da tela (ex: "Salvar", "Confirmar").

2.  **Secondary (`variant="secondary"`)**:
    *   `bg-white` border `border-slate-200`
    *   `hover:bg-slate-50 hover:text-irko-blue`
    *   *Uso:* Ações secundárias (ex: "Cancelar", "Voltar").

3.  **Danger (`variant="danger"`)**:
    *   `bg-red-50 text-red-600`
    *   `hover:bg-red-100`
    *   *Uso:* Ações destrutivas (ex: "Excluir").

4.  **Ghost (`variant="ghost"`)**:
    *   `text-slate-600`
    *   `hover:bg-slate-100`
    *   *Uso:* Botões em tabelas, ícones clicáveis.

### 📝 Inputs (`Input.jsx`)

*   **Base:** `h-10 w-full`
*   **Border Radius:** `rounded-lg`
*   **Cores:** `bg-slate-50` (Light) / `bg-slate-800` (Dark)
*   **Borda:** `border-none` (o background define a área)
*   **Focus:** `ring-2 ring-blue-500` (Note: Input usa azul padrão no focus, Botão usa laranja).
*   **Placeholder:** `text-slate-500`

### 📦 Cards (`Card.jsx`)

*   **Border Radius:** `rounded-xl`
*   **Borda:** `border border-slate-200` (Light) / `border-slate-800` (Dark)
*   **Background:** `bg-white` (Light) / `bg-slate-900` (Dark)
*   **Sombra:** `shadow-sm`
*   **Padding Padrão:** `p-6`

### 🏷️ Badges (`Badge.jsx`)

*   **Shape:** `rounded-full`
*   **Padding:** `px-2.5 py-0.5`
*   **Font:** `text-xs font-semibold`
*   **Variantes Comuns:**
    *   `success`: `bg-emerald-100 text-emerald-800`
    *   `warning`: `bg-amber-100 text-amber-800`
    *   `danger`: `bg-red-100 text-red-800`
    *   `secondary`: `bg-irko-orange/10 text-irko-orange`

---

## 4. 🌙 Dark Mode

O projeto suporte Dark Mode via classe `.dark` no elemento `html`.
As cores devem sempre contemplar o modo escuro usando o prefixo `dark:`.

*   **Padrão de inversão:**
    *   `bg-white` -> `dark:bg-slate-900`
    *   `bg-slate-50` -> `dark:bg-slate-950`
    *   `text-slate-900` -> `dark:text-slate-50`
    *   `border-slate-200` -> `dark:border-slate-800`

---

## 5. 🛠️ Utilitários Globais

### Scrollbar Customizada (`.custom-scrollbar`)
Definida no `index.css`. Use esta classe em containers com scroll (`overflow-auto`).
*   **Width:** 6px
*   **Thumb:** `bg-slate-200` (hover: `slate-300`)
*   **Dark Thumb:** `bg-slate-800` (hover: `slate-700`)

### Layout
*   O `body` possui `overflow: hidden` por padrão. A rolagem deve ser gerenciada nos containers internos (ex: Main Content).
*   `#root` tem altura e largura de 100%.

---

## 6. 🚀 Exemplo de Componente Padrão

Ao criar uma nova tela, siga esta estrutura:

```jsx
import { Button } from "../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";

export function NovaTela() {
  return (
    // Container principal com padding e scroll se necessário
    <div className="p-6 h-full overflow-auto custom-scrollbar space-y-6">
      
      {/* Cabeçalho da Página */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Minha Nova Tela
        </h1>
        <Button variant="primary">Criar Novo</Button>
      </div>

      {/* Conteúdo em Card */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 dark:text-slate-400">
            Conteúdo aqui seguindo o padrão de cores neutras.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```
