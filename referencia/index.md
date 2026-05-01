# 🧠 1. FUNDAMENTO DO DESIGN SYSTEM

Antes de código, entenda isso (é o que manda no resto):

* A marca é sobre **decisão → foco → prioridade**
* O **amarelo NÃO é decorativo** → ele aponta o que importa 
* Visual = **minimalista + funcional + sem ruído**
* Comunicação = **direta, concreta, sem enrolação** 

👉 Traduzindo pra frontend:

> UI não é bonita, é **objetiva e direcionada**

---

# 🎨 2. DESIGN TOKENS (BASE DO SISTEMA)

## 🎯 Cores (CSS Variables / Tailwind config)

```css
:root {
  /* Brand */
  --color-primary: #FFC205;
  --color-primary-strong: #FBCD2D;
  --color-primary-soft: #FCE98B;

  /* Neutros */
  --color-bg-dark: #232323;
  --color-bg-light: #EDEDED;
  --color-text: #232323;
  --color-text-inverse: #FFFFFF;

  /* Estados */
  --color-success: #4CAF50;
  --color-warning: #FFC205;
  --color-error: #F44336;
}
```

📌 Regra mais importante:

* Amarelo = **ação / destaque / decisão**
* Nunca usar amarelo como “decoração solta”

---

## 🔤 Tipografia

```css
--font-primary: 'Manrope', sans-serif;
--font-secondary: 'IBM Plex Mono', monospace;
```

### Hierarquia:

| Uso              | Fonte         | Peso    |
| ---------------- | ------------- | ------- |
| Título           | Manrope       | 600     |
| Subtítulo        | Manrope       | 500     |
| Texto            | Manrope       | 400     |
| Destaque técnico | IBM Plex Mono | 400-500 |

📌 Baseado no guia 

---

## 📏 Espaçamento (grid mental da marca)

A marca usa lógica modular (grid invisível) 

👉 Tradução prática:

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
--spacing-2xl: 48px;
```

📌 Layout sempre respirado, sem poluição

---

# 🧩 3. COMPONENTIZAÇÃO (CORE UI)

## 🔘 Button

```ts
variants:
- primary (amarelo)
- secondary (outline)
- ghost (sem fundo)
```

### Regras:

* Primary = SEMPRE ação principal
* Nunca ter 2 botões amarelos competindo

```css
.btn-primary {
  background: var(--color-primary);
  color: #000;
}
```

---

## 📦 Card

```css
.card {
  background: var(--color-bg-dark);
  border: 1px solid rgba(255,255,255,0.05);
  padding: 24px;
}
```

📌 Card = bloco de decisão
📌 Sem sombra pesada, sem glassmorphism exagerado

---

## 📊 Data Components (ESSENCIAL PRA MARCA)

A marca é **data-driven**, então isso é obrigatório:

* KPI Card
* Data Table
* Chart wrappers

```ts
<KpiCard
  title="Margem perdida"
  value="R$ 2.3M"
  trend="down"
/>
```

📌 Sempre:

* número grande
* label claro
* impacto explícito

---

## 📍 Highlight (padrão visual Guidance)

```css
.highlight {
  background: var(--color-primary);
  padding: 2px 6px;
}
```

👉 Usado pra:

* chamar atenção
* destacar decisão

---

# 🧱 4. LAYOUT SYSTEM

## 🧭 Estrutura padrão

```txt
[Header]
[Hero → mensagem direta + impacto]
[Seção dados / insights]
[Ação]
```

📌 Nunca:

* texto longo
* blocos confusos

---

## 📐 Grid

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
}
```

```css
.grid {
  display: grid;
  gap: 24px;
}
```

---

# 🎯 5. REGRAS DE USO (O MAIS IMPORTANTE)

## ✔️ Faça

* Destaque UMA coisa por vez
* Use amarelo pra guiar atenção
* Texto curto e direto
* UI limpa

## ❌ Não faça

* Amarelo espalhado sem sentido
* UI decorativa
* Texto genérico tipo “solução inovadora”
* 10 elementos competindo

---

# 🧠 6. IDENTIDADE NO FRONT (DIFERENCIAL REAL)

Baseado no brandguide:

### UI precisa refletir isso:

* decisão → foco → resultado
* dado → ação → impacto



👉 Exemplo ruim:

```
Dashboard bonito cheio de gráfico
```

👉 Exemplo certo:

```
"Você perdeu R$ 2.1M por decisão de preço"
[Botão: corrigir agora]
```

---

# 🎨 7. GRAFISMO (DIFERENCIAL VISUAL)

A marca usa:

* padrões com setas
* grid pontilhado
* fluxo de dados



👉 Aplicação no front:

* background leve com pattern
* separators
* loading states

---

# ⚙️ 8. IMPLEMENTAÇÃO REAL (STACK)

## Tailwind (recomendado)

```js
theme: {
  colors: {
    primary: '#FFC205',
    dark: '#232323',
    light: '#EDEDED'
  },
  fontFamily: {
    sans: ['Manrope'],
    mono: ['IBM Plex Mono']
  }
}
```

---

## Angular / React structure

```txt
/design-system
  /tokens
  /components
    /button
    /card
    /kpi
    /table
  /layouts
  /patterns
```

---

# 🧠 RESUMO FINAL (MENTALIDADE)

Se tiver que resumir em 1 linha:

> Esse design system não é pra “ficar bonito”, é pra **forçar decisão visual**
