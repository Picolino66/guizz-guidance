---
name: responsive-ui-engineer
description: Atua como um UI Engineer especializado em construção de interfaces totalmente responsivas, adaptáveis e fluidas para aplicações modernas. Garante que o sistema funcione perfeitamente em mobile, tablet e desktop, mantendo consistência visual, usabilidade e performance. Utiliza princípios de mobile-first, layout fluido, breakpoints inteligentes e adaptação de componentes para criar experiências profissionais em qualquer dispositivo.
---

---

# 🧠 Descrição

Essa skill garante que seu sistema:

👉 funcione perfeitamente em qualquer tela
👉 não quebre layout
👉 mantenha estética premium
👉 seja confortável de usar no mobile

---

# 🚀 Responsabilidades

* Criar layouts mobile-first
* Adaptar componentes para diferentes tamanhos
* Garantir legibilidade e usabilidade
* Controlar espaçamento e proporções
* Evitar overflow e quebra de layout
* Garantir experiência fluida entre dispositivos

---

# 🔥 Regras obrigatórias

---

## 📱 1. MOBILE FIRST (obrigatório)

Sempre começar pensando no mobile.

❌ Errado:

```css
.container { width: 1200px }
```

✅ Certo:

```css
.container { width: 100% }
```

---

## 📏 2. BREAKPOINTS PADRÃO

Use sempre:

```ts
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

---

## 📦 3. GRID FLEXÍVEL (NUNCA FIXO)

❌ Errado:

```css
grid-template-columns: 300px 300px 300px;
```

✅ Certo:

```css
grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
```

---

## 📐 4. ESPAÇAMENTO ESCALÁVEL

Sempre usar padding adaptável:

```css
padding: 16px;
@media (min-width: 768px) {
  padding: 24px;
}
```

---

## 🧱 5. CARDS RESPONSIVOS

* Nunca ter largura fixa
* Sempre ocupar espaço disponível
* Adaptar quantidade por linha

---

## 🧠 6. TIPOGRAFIA FLUIDA

```css
font-size: clamp(14px, 2vw, 18px);
```

---

## 🎯 7. BOTÕES E TOQUE (mobile)

* Altura mínima: **44px**
* Espaçamento entre elementos
* Área clicável confortável

---

## 🧩 8. INPUTS MOBILE

* Full width
* Altura maior
* Fácil de tocar

---

## 🖥 9. LAYOUT ADAPTATIVO

### Desktop:

* multi colunas
* mais informação

### Mobile:

* 1 coluna
* foco no essencial

---

# ⚠️ Anti-patterns (proibido)

❌ Scroll horizontal
❌ Elemento saindo da tela
❌ Texto pequeno demais
❌ Botões grudados
❌ Layout desktop “espremido” no mobile
❌ Sidebar fixa quebrando mobile

---

# 🧩 Padrões e boas práticas

---

## 📱 1. ESTRUTURA BASE

```css
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 16px;
}
```

---

## 🧱 2. GRID RESPONSIVO

### Admin (seu caso):

```css
grid-template-columns: 1fr;
@media (min-width: 1024px) {
  grid-template-columns: 1fr 1fr;
}
```

---

## 🧠 3. STACK NO MOBILE

Tudo vira:

```
[bloco 1]
[bloco 2]
[bloco 3]
```

---

## 🧭 4. MENU RESPONSIVO

Desktop:

* navbar horizontal

Mobile:

* menu hambúrguer ou bottom nav

---

## 🎮 5. QUIZ (CRÍTICO)

### Desktop:

* pergunta + alternativas central

### Mobile:

* foco total na pergunta
* alternativas grandes (tipo app)

---

## 🏆 6. RANKING

Desktop:

* tabela ou grid

Mobile:

* lista vertical com destaque

---

## 📊 7. DASHBOARD

Desktop:

* grid com cards

Mobile:

* cards empilhados

---

## ⚡ 8. PERFORMANCE

* evitar imagens pesadas
* usar lazy loading
* evitar render desnecessário

---

# 💡 APLICANDO NO SEU PROJETO

---

## 🔥 O que ajustar no seu layout atual:

---

### 1. Grid do Admin

Hoje:
👉 fixo (lado a lado)

Corrigir:

```css
grid-cols-1 lg:grid-cols-2
```

---

### 2. Inputs

👉 mobile = full width

---

### 3. Botões

👉 ocupar 100% no mobile

---

### 4. Cards

👉 stack no mobile
👉 grid no desktop

---

### 5. Navbar

👉 transformar em menu mobile

---

### 6. Quiz (muito importante)

👉 parecer app no mobile
👉 não parecer sistema web

---

# 🚀 RESULTADO FINAL

Com essa skill + a anterior, seu sistema vira:

🔥 bonito
🔥 profissional
🔥 responsivo
🔥 com cara de produto real