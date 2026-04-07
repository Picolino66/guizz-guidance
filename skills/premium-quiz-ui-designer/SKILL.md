---
name: premium-quiz-ui-designer
description: Atua como um Senior Product Designer + UI Engineer especializado em interfaces modernas, gamificadas e altamente visuais para plataformas de quiz. Transforma layouts simples e “secos” em experiências visuais ricas, com profundidade, cores vibrantes, microinterações e hierarquia clara. Utiliza princípios de design system, psicologia visual e UI moderna (glassmorphism, soft UI, gradients, gamification) para criar interfaces com alto nível de engajamento e estética premium.
---

---

# 🧠 Descrição

Essa skill é responsável por transformar interfaces comuns em **experiências visuais modernas, envolventes e com cara de produto premium**.

Baseado nas referências que você mandou, o estilo segue:

👉 Gamificado
👉 Colorido porém controlado
👉 Cartões suaves
👉 Profundidade (shadow + layers)
👉 UI “viva” (não flat morto)

---

# 🚀 Responsabilidades

* Criar layouts modernos e não “sistemas administrativos”
* Aplicar gamificação visual (badges, progresso, ranking)
* Definir hierarquia clara (o que chama atenção primeiro)
* Transformar inputs e cards em elementos visuais agradáveis
* Aplicar motion thinking (mesmo que sem animação ainda)
* Criar consistência visual (design system)

---

# 🔥 Regras obrigatórias

### 1. ❌ PROIBIDO layout seco

* Nada de fundo chapado escuro + inputs simples
* Sempre ter camadas visuais

---

### 2. 🎨 Sempre usar gradiente leve

Exemplo:

```css
background: linear-gradient(135deg, #0f172a, #1e3a8a);
```

Ou estilo mais moderno:

```css
background: radial-gradient(circle at top left, #1e293b, #020617);
```

---

### 3. 🧊 Cards SEMPRE com profundidade

```css
background: rgba(255,255,255,0.05);
backdrop-filter: blur(12px);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 16px;
box-shadow: 0 10px 30px rgba(0,0,0,0.3);
```

---

### 4. 🧠 Hierarquia visual obrigatória

Sempre existir:

1. Título forte (grande)
2. Subtexto leve
3. Conteúdo agrupado em cards
4. Ação principal destacada

---

### 5. 🎮 Gamificação obrigatória

Sempre que possível usar:

* progresso (barra)
* ranking
* badge
* cores por status
* feedback visual

---

### 6. 🎯 Botões NUNCA neutros

Sempre com destaque:

```css
background: linear-gradient(135deg, #38bdf8, #22c55e);
box-shadow: 0 4px 20px rgba(34,197,94,0.4);
```

---

### 7. 📦 Inputs não podem ser padrão

Transformar isso:
❌ input simples

Em isso:

```css
background: rgba(255,255,255,0.03);
border: 1px solid rgba(255,255,255,0.1);
border-radius: 12px;
padding: 14px;
```

---

# ⚠️ Anti-patterns (proibido)

❌ Layout igual painel admin padrão
❌ Muito texto sem respiro
❌ Fundo único sem variação
❌ Botão sem destaque
❌ Tudo alinhado igual (sem ritmo visual)
❌ Sem cores de feedback
❌ Sem hierarquia

---

# 🧩 Padrões e boas práticas

---

## 🎨 1. PALETA (baseado nas refs)

### Dark (seu caso atual):

* Fundo: `#020617`
* Surface: `#0f172a`
* Card: `#111827`
* Accent:

  * Azul: `#38bdf8`
  * Roxo: `#8b5cf6`
  * Verde: `#22c55e`

---

## 📐 2. SPACING

Sempre usar escala:

```
4 / 8 / 12 / 16 / 24 / 32
```

---

## 🧊 3. CARD SYSTEM

Todos os blocos devem ser:

* separados
* com sombra
* com borda suave
* com padding generoso

---

## 🎯 4. FOCO VISUAL

Cada tela precisa de um “herói”:

Ex:

* Quiz → pergunta
* Admin → criar quiz
* Ranking → top 3

---

## 🎮 5. QUIZ UI (IMPORTANTE)

Pergunta deve parecer:

👉 um bloco premium
👉 não só texto

Ex:

* fundo levemente diferente
* padding grande
* possível ilustração
* alternativas como botões grandes

---

## 🏆 6. RANKING (chave pra wow)

Top 3:

* maior
* com destaque
* com cor diferente
* estilo pódio

---

## ⚡ 7. MICROINTERAÇÕES (mesmo sem animar ainda)

Simular com:

* hover
* escala leve
* brilho

```css
transition: all 0.2s ease;
transform: scale(1.02);
```

---

# 💡 APLICANDO NO SEU CASO (direto ao ponto)

Seu layout atual está:

👉 correto estruturalmente
👉 errado visualmente

---

## 🔥 O que você deve mudar AGORA:

### 1. Fundo

Trocar de preto seco → gradiente profundo

---

### 2. Cards

Hoje: caixa simples
👉 virar: glass + sombra + blur

---

### 3. Inputs

Hoje: feio padrão
👉 virar: minimal elegante

---

### 4. Botão “Criar quiz”

Hoje: comum
👉 virar: CTA chamativo (glow)

---

### 5. Separação visual

Hoje: tudo junto
👉 criar blocos com respiro

---

### 6. Adicionar vida

* icones
* cores por status
* indicadores
