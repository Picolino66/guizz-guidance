# Auditoria Técnica — Quizz Platform

> Data: 2026-05-04 | Stack: NestJS 11 · Prisma 6 · Next.js 15 · React 19 · Tailwind 4

---

## Índice

1. [Sumário Executivo](#1-sumário-executivo)
2. [Arquitetura Geral](#2-arquitetura-geral)
3. [API — NestJS Backend](#3-api--nestjs-backend)
   - [3.1 Visão Modular](#31-visão-modular)
   - [3.2 Problemas Críticos](#32-problemas-críticos)
   - [3.3 God Services e Acoplamento](#33-god-services-e-acoplamento)
   - [3.4 Autenticação e Guards](#34-autenticação-e-guards)
   - [3.5 Contratos de API](#35-contratos-de-api)
   - [3.6 WebSocket e Real-time](#36-websocket-e-real-time)
   - [3.7 Qualidade de Testes](#37-qualidade-de-testes)
   - [3.8 Violações de SOLID](#38-violações-de-solid)
4. [Client — Next.js Frontend](#4-client--nextjs-frontend)
   - [4.1 Estrutura e Rotas](#41-estrutura-e-rotas)
   - [4.2 Design System e CSS](#42-design-system-e-css)
   - [4.3 Componentização](#43-componentização)
   - [4.4 API Clients e Session Management](#44-api-clients-e-session-management)
   - [4.5 Gerenciamento de Estado](#45-gerenciamento-de-estado)
   - [4.6 Acessibilidade e Responsividade](#46-acessibilidade-e-responsividade)
   - [4.7 Qualidade de Testes](#47-qualidade-de-testes)
5. [Modelo de Dados](#5-modelo-de-dados)
   - [5.1 Entidades e Relacionamentos](#51-entidades-e-relacionamentos)
   - [5.2 Migrations](#52-migrations)
   - [5.3 Seed](#53-seed)
6. [Documentação](#6-documentação)
7. [Segurança](#7-segurança)
8. [Deployment e Infraestrutura](#8-deployment-e-infraestrutura)
9. [Plano de Ação Priorizado](#9-plano-de-ação-priorizado)
10. [Qualidades Positivas](#10-qualidades-positivas)

---

## 1. Sumário Executivo

O **Quizz** é uma plataforma monorepo funcional com quatro portais (Quiz, Admin, RH e WhatsApp). A base técnica é sólida — NestJS, Prisma, Next.js App Router e tipagem TypeScript estrita — mas carrega débitos arquiteturais que aumentam o custo de manutenção e introduzem riscos em produção.

### Score por Dimensão

| Dimensão | Score | Comentário |
|----------|-------|-----------|
| **Arquitetura API** | 6/10 | Modular, mas com God Services e auth duplicada |
| **Qualidade de Código API** | 7/10 | DTOs fortes, mas sem testes críticos |
| **Arquitetura Frontend** | 6/10 | Bem estruturado, mas com duplicações e CSS monolítico |
| **Design System** | 7/10 | Tokens centralizados, mas portais divergem |
| **Segurança** | 5/10 | WebSocket aberto, localStorage para tokens, sem rate limit |
| **Modelo de Dados** | 8/10 | Schema rico e normalizado, boa cobertura de domínio |
| **Documentação** | 7/10 | Boa cobertura, mas com inconsistências rastreadas |
| **Testes** | 2/10 | Cobertura crítica ausente |
| **Deployment** | 6/10 | Docker funcional, mas incompleto para produção |

### Problemas por Prioridade

| Prioridade | Quantidade |
|-----------|-----------|
| 🔴 P0 — Crítico | 3 |
| 🟠 P1 — Alto | 8 |
| 🟡 P2 — Médio | 14 |

---

## 2. Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Next.js 15)                  │
│  ┌──────────┐  ┌────────┐  ┌──────────┐  ┌─────────────┐   │
│  │Quiz Part.│  │ Admin  │  │   RH     │  │  WhatsApp   │   │
│  └────┬─────┘  └───┬────┘  └────┬─────┘  └──────┬──────┘   │
│       └────────────┴────────────┴────────────────┘          │
│                      apiFetch / rhFetch / whatsappFetch      │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP + WebSocket
┌─────────────────────────────▼───────────────────────────────┐
│                      API (NestJS 11)                        │
│  ┌──────┐ ┌───────┐ ┌──────┐ ┌──────────┐ ┌────────────┐   │
│  │ Auth │ │ Quiz  │ │ Part.│ │    RH    │ │  WhatsApp  │   │
│  └──┬───┘ └───┬───┘ └──┬───┘ └────┬─────┘ └─────┬──────┘   │
│     │         │        │          │              │           │
│  ┌──▼─────────▼────────▼──────────▼──────────────▼──────┐   │
│  │                  PrismaService                        │   │
│  └──────────────────────────┬────────────────────────────┘   │
│                             │        ┌─────────────────┐    │
│                             │        │   RedisService  │    │
│                             │        └─────────────────┘    │
└─────────────────────────────┼─────────────────────────────  ┘
                              │
               ┌──────────────▼──────────────┐
               │     PostgreSQL 15            │
               └─────────────────────────────┘
```

**Padrão arquitetural**: Monolito Modular (Modular Monolith) com separação por domínio. Não é DDD completo, não é MVC puro — é o padrão NestJS de módulos com controllers finos delegando para services.

**Positivo**: A escolha é adequada para o estágio do produto. Microserviços seria prematuro.

**Risco**: Services com múltiplas responsabilidades e acoplamento horizontal entre módulos reduz a isolabilidade de domínios.

---

## 3. API — NestJS Backend

### 3.1 Visão Modular

| Módulo | Responsabilidade | Qualidade |
|--------|-----------------|-----------|
| `auth` | Login participant/admin, troca de senha, session | ✅ Bom |
| `admin` | CRUD quizzes, questões, whitelist, dashboard | ✅ Bom |
| `quiz` | Cache Redis de questões, sync de status, conflito | ⚠️ God Service |
| `participant` | Início, resposta, finalização, presença, estado | ⚠️ God Service |
| `ranking` | Cálculo e snapshot de ranking | ✅ Excelente |
| `realtime` | WebSocket gateway para eventos | ⚠️ CORS aberto |
| `rh` (7 sub-módulos) | Entrevistas, candidatos, vagas, formulários | ⚠️ Auth duplicada |
| `whatsapp` | Conexão Baileys, automações, agendamento, logs | ⚠️ Service grande |
| `redis` | Cache distribuído com wrapper ioredis | ✅ Bom |
| `prisma` | ORM e client do banco | ✅ Bom |
| `common` | Guards, decorators, tipos compartilhados | ⚠️ JWT espalhado |

---

### 3.2 Problemas Críticos

#### 🔴 P0-1 — WebSocket com CORS aberto e sem autenticação

**Arquivo**: `api/src/realtime/quiz.gateway.ts:4-8`

```typescript
@WebSocketGateway({
  namespace: "/quiz",
  cors: { origin: "*" }  // ← qualquer origem aceita
})
export class QuizGateway { ... }
```

**Causa raiz**: Configuração padrão de desenvolvimento nunca corrigida para produção. Sem mecanismo de autenticação no handshake do Socket.IO.

**Impacto**: Qualquer cliente externo pode conectar ao namespace `/quiz` e receber todos os eventos em tempo real (quiz_started, ranking_updated, participant_finished). Em uma competição corporativa, isso expõe o placar ao vivo para participantes não autorizados, potencialmente comprometendo a integridade da competição.

**Recomendação**: Restringir `origin` via env var (mesmo padrão do CORS REST já implementado em `main.ts`). Adicionar validação de token no handshake:

```typescript
@WebSocketGateway({
  namespace: "/quiz",
  cors: { origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"] }
})
export class QuizGateway implements OnGatewayConnection {
  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    if (!token || !this.validateToken(token)) {
      client.disconnect(true);
    }
  }
}
```

---

#### 🔴 P0-2 — Ausência total de testes nos módulos críticos

**Módulos sem cobertura**: `auth`, `quiz`, `participant`, `ranking`, `admin`, `rh` (todos os sub-módulos)

**O que existe**: 2 spec files, ambos no módulo `whatsapp`:
- `whatsapp-schedule.spec.ts` — 7 testes de agendamento (bem escritos)
- `whatsapp.service.spec.ts` — aparentemente incompleto

**Causa raiz**: Ausência de cultura de testes desde o início do projeto.

**Impacto**: Qualquer refatoração nos fluxos de login, resposta de quiz, cálculo de score ou ranking é feita às cegas. O risco de regressão silenciosa é alto, especialmente em fluxos com lógica de negócio complexa como `finalizeQuiz` e `finalizeParticipant`.

**Recomendação por prioridade**:

1. Testes unitários para `ranking.utils.ts` (puras, triviais de testar)
2. Testes de integração para `AuthService.loginParticipant` e `loginAdmin`
3. Testes de integração para `ParticipantService.answer` (lógica de score)
4. Testes e2e para o fluxo completo: login → start → answer → finish

---

#### 🔴 P0-3 — `syncQuizStatuses` chamado a cada requisição de leitura

**Arquivo**: `api/src/quiz/quiz.service.ts:22,39,119,151,194,217`

```typescript
async getActiveQuiz() {
  await this.syncQuizStatuses();  // ← executa a cada chamada
  // ...
}

async getQuizSummaryById(quizId: string, options?: { sync?: boolean }) {
  if (options?.sync !== false) {
    await this.syncQuizStatuses();  // ← idem
  }
  // ...
}

async ensureNoSchedulingConflict(...) {
  await this.syncQuizStatuses();  // ← idem
  // ...
}
```

`syncQuizStatuses` faz uma query `findMany` com filtro de status SCHEDULED|RUNNING, e para cada quiz modificado, faz um `update`. Em um cenário com múltiplos usuários ativos, cada requisição de leitura dispara N queries adicionais no banco.

**Causa raiz**: Status de quiz não é gerenciado por evento, é verificado on-demand. Não há mecanismo de invalidação/transição baseado em tempo.

**Impacto**: À medida que o número de quizzes agendados cresce, o overhead aumenta linearmente. Em produção com 50+ participantes simultâneos, cada `POST /participant/start` dispara `syncQuizStatuses` → várias queries adicionais. Isso é um gargalo de throughput.

**Recomendação**: Mover `syncQuizStatuses` para um cron job exclusivo (ex: a cada 10s) e remover as chamadas inline. Usar cache de status no Redis com TTL curto (5-10s) para leituras rápidas. O cron já existe no `ParticipantService` (`@Cron(CronExpression.EVERY_30_SECONDS)`), o padrão pode ser replicado.

---

### 3.3 God Services e Acoplamento

#### QuizService — 8 responsabilidades distintas

**Arquivo**: `api/src/quiz/quiz.service.ts` (379 linhas)

| Responsabilidade | Método |
|-----------------|--------|
| Leitura de quiz ativo | `getActiveQuiz()` |
| Leitura por ID | `getQuizSummaryById()` |
| Cache de questões Redis | `getQuizQuestions()`, `refreshQuizQuestionsCache()` |
| Validação de execução | `ensureQuizIsRunning()` |
| Validação de conflito de horário | `ensureNoSchedulingConflict()` |
| Início forçado | `forceStartQuiz()` |
| Encerramento | `finishQuizNow()`, `finalizeQuiz()` |
| Sincronização de status | `syncQuizStatuses()` |
| Broadcast de eventos WebSocket | via `QuizGateway` (acoplamento direto) |

**Impacto**: Testar isoladamente qualquer comportamento exige mockar Prisma, Redis e QuizGateway simultaneamente. Qualquer alteração no cache quebra o encerramento; qualquer mudança no broadcast quebra o status.

**Recomendação**: Separar em serviços focados:
- `QuizReadService` — consultas e leituras
- `QuizCacheService` — Redis (questões)
- `QuizLifecycleService` — start/finish/sync
- Broadcasts via eventos NestJS (`EventEmitter2`) em vez de injeção direta do Gateway

---

#### ParticipantService — 7+ responsabilidades

**Arquivo**: `api/src/participant/participant.service.ts` (419 linhas)

| Responsabilidade | Método |
|-----------------|--------|
| Iniciar participação | `start()` |
| Registrar resposta | `answer()` |
| Finalizar participante | `finish()`, `finalizeParticipant()` |
| Presença na sala de espera | `markWaitingPresence()`, `clearWaitingPresence()` |
| Estado do participante | `getQuizState()` |
| Encerramento automático do quiz | `finishQuizIfEveryoneCompleted()` |
| Limpeza de presença expirada | `cleanupExpiredWaitingPresence()` |
| Snapshot de ranking inline | `getRankingSnapshot()` — duplica lógica do RankingService |

**Problema adicional**: `getRankingSnapshot()` em `ParticipantService` duplica consulta que já existe em `RankingService`. Uma mudança na lógica de ordenação precisa ser replicada nos dois lugares.

---

#### InterviewsService — 15+ métodos públicos

**Arquivo**: `api/src/rh/interviews/interviews.service.ts`

O service de entrevistas gerencia o ciclo completo de 8 estados (`DRAFT → CLOSED`), atribuição de entrevistadores, propostas de slot, confirmação, avaliação e auditoria — tudo em um único service. Qualquer mudança no fluxo de agendamento pode afetar inadvertidamente a avaliação ou auditoria.

**Recomendação**: Separar em `InterviewSchedulingService`, `InterviewEvaluationService` e manter `InterviewsService` como orquestrador leve.

---

### 3.4 Autenticação e Guards

#### Lógica JWT duplicada em 3 guards

**Arquivos**: `api/src/common/guards/admin-auth.guard.ts`, `api/src/common/guards/participant-auth.guard.ts`, `api/src/rh/auth/rh-auth.guard.ts`

Os três guards extraem o token do header `Authorization: Bearer`, chamam `jwtService.verifyAsync` com o secret da config, e tratam erros. A diferença é apenas o campo `role` verificado após a verificação.

**Impacto**: Um bug na extração do token (ex: suporte a múltiplos headers, token rotation) precisa ser corrigido em 3 lugares. Um desenvolvedor que só conhece `AdminAuthGuard` pode corrigir o bug e introduzir regressão nos outros dois sem perceber.

**Recomendação**: Extrair um `BaseJwtGuard` abstrato com a lógica de extração e verificação. Cada guard concreto apenas sobrescreve a validação de role:

```typescript
// common/guards/base-jwt.guard.ts
abstract class BaseJwtGuard implements CanActivate {
  abstract validatePayload(payload: AuthUser): boolean;

  async canActivate(ctx: ExecutionContext) {
    const token = this.extractToken(ctx.switchToHttp().getRequest());
    if (!token) throw new UnauthorizedException("Token ausente.");
    const payload = await this.jwtService.verifyAsync<AuthUser>(token, { secret: this.secret });
    if (!this.validatePayload(payload)) throw new ForbiddenException("Acesso negado.");
    ctx.switchToHttp().getRequest().user = payload;
    return true;
  }
}

// common/guards/admin-auth.guard.ts
class AdminAuthGuard extends BaseJwtGuard {
  validatePayload(p: AuthUser) { return p.role === "ADMIN" || p.role === "USER"; }
}
```

---

#### RhAuthService duplica AuthService

**Arquivos**: `api/src/auth/auth.service.ts:53-89`, `api/src/rh/auth/rh-auth.service.ts:15-31`

`RhAuthService.login` é funcionalmente idêntico ao `AuthService.loginAdmin`:

- Busca `SystemUser` por email (com `trim().toLowerCase()`)
- Compara senha com `bcrypt.compare`
- Assina JWT com `jwtService.signAsync`
- Retorna `{ accessToken, user }`

A única diferença: `loginAdmin` permite busca por `username` OU `email`, enquanto `RhAuthService.login` aceita apenas `email`. Ambos usam o mesmo `JWT_SECRET`.

**Impacto**: Qualquer mudança no processo de login de sistema (ex: 2FA, bloqueio por tentativas, auditoria de acesso) precisa ser replicada em dois services.

**Recomendação**: Unificar em `AuthService.loginSystemUser(email, password)`. A rota `/rh/auth/login` pode continuar existindo, mas delegar para o mesmo service. A diferença de busca por username pode ser parametrizada.

---

### 3.5 Contratos de API

#### DTOs — Validação forte, mas sem validações de negócio

O uso de `class-validator` com `ValidationPipe` global (`whitelist: true, forbidNonWhitelisted: true`) é excelente e protege contra payloads malformados.

**Gap**: Validações de negócio estão exclusivamente nos services. Isso é comum no NestJS, mas há casos onde custom validators no DTO melhorariam a clareza:

```typescript
// Atual: validação de negócio no service
const alternative = question.alternatives.find(item => item.id === dto.alternativeId);
if (!alternative) throw new BadRequestException("Alternativa inválida.");

// Melhor: DTO com contexto claro de que é um UUID válido (mas a validação de pertencimento ainda fica no service)
class AnswerQuestionDto {
  @IsUUID() questionId: string;
  @IsUUID() alternativeId: string;
  // A alternativa pertencer à questão é validação de negócio, ok ficar no service
}
```

#### Responses — Sem padrão de envelope

As responses HTTP variam em estrutura entre controllers:

```typescript
// auth/login-participant      → { accessToken, user }
// auth/change-admin-password  → { message: "Senha alterada..." }
// admin/allowed-emails        → { quizId, linked: 5 }
// rh/users (delete)           → { success: true }
// participant/start           → { participantId, quizId, startedAt, answers }
// ranking                     → RankingItem[]
```

**Impacto**: O frontend precisa conhecer a estrutura específica de cada endpoint. Erros do servidor também chegam em formatos diferentes dependendo do ponto de falha (NestJS exceptions vs erros Prisma não tratados).

**Recomendação**: Implementar um `TransformResponseInterceptor` global com envelope simples para respostas de sucesso, e um `GlobalExceptionFilter` para normalizar erros:

```typescript
// Sucesso
{ data: T, timestamp: string }

// Erro
{ error: string, message: string, statusCode: number }
```

---

### 3.6 WebSocket e Real-time

**Arquivos**: `api/src/realtime/quiz.gateway.ts`, `api/src/whatsapp/whatsapp.gateway.ts`

**Problema 1** (já detalhado em P0-1): CORS aberto e sem autenticação.

**Problema 2**: Todos os eventos são emitidos para **todos** os clientes conectados (`this.server.emit()`). Não há rooms por quiz. Se dois quizzes acontecerem simultaneamente (o sistema impede hoje via conflito, mas a restrição pode ser relaxada no futuro), todos os clientes receberão eventos de ambos.

**Recomendação**: Usar rooms do Socket.IO por `quizId`:

```typescript
// Cliente se junta ao room
socket.join(`quiz:${quizId}`);

// Server emite apenas para o room
this.server.to(`quiz:${quizId}`).emit("quiz_started", payload);
```

**Problema 3**: `QuizGateway` é injetado diretamente em `QuizService` e `ParticipantService`. Isso cria acoplamento entre domínios de negócio e infraestrutura de comunicação.

**Recomendação**: Usar `EventEmitter2` do NestJS. O gateway assina eventos de domínio e os broadcast:

```typescript
// quiz.service.ts
this.eventEmitter.emit("quiz.started", { quizId, startedAt });

// quiz.gateway.ts
@OnEvent("quiz.started")
handleQuizStarted(payload) { this.server.emit("quiz_started", payload); }
```

---

### 3.7 Qualidade de Testes

**Cobertura estimada**: < 5%

| Módulo | Testes | Status |
|--------|--------|--------|
| `auth` | ❌ 0 | Crítico |
| `quiz` | ❌ 0 | Crítico |
| `participant` | ❌ 0 | Crítico |
| `ranking` | ❌ 0 | `ranking.utils` é puro e trivial de testar |
| `admin` | ❌ 0 | Alto |
| `rh/*` | ❌ 0 | Alto |
| `whatsapp-schedule` | ✅ 7 testes | Bem escrito |
| `whatsapp.service` | ⚠️ parcial | Incompleto |

Os testes do WhatsApp são um bom modelo para replicar: usam a API nativa de testes do Node.js, sem dependências extras, com assertions claras.

---

### 3.8 Violações de SOLID

| Princípio | Violação | Onde |
|-----------|---------|------|
| **S** (Single Responsibility) | `QuizService`: 8 responsabilidades | `quiz.service.ts` |
| **S** | `ParticipantService`: 7 responsabilidades + duplica getRankingSnapshot | `participant.service.ts` |
| **S** | `InterviewsService`: 15+ métodos cobrindo 3 sub-domínios diferentes | `rh/interviews/interviews.service.ts` |
| **O** (Open/Closed) | `AuthService` e `RhAuthService` são cópias, não extensões | Ambos os arquivos |
| **D** (Dependency Inversion) | `QuizGateway` injetado diretamente em services de domínio | `quiz.service.ts:11`, `participant.service.ts:15` |

---

## 4. Client — Next.js Frontend

### 4.1 Estrutura e Rotas

```
/app
├── page.tsx → hub
├── login/ → admin/rh login
├── quiz-login/, quiz/, ranking/, waiting/ → portal do participante
├── admin-quiz/, admin-guidance/ → portal admin
├── rh/ (10 sub-rotas) → portal RH
└── whatsapp/ (4 sub-rotas) → portal WhatsApp
```

Estrutura clara, bem organizada por portal. O padrão de Server Component como shell + Client Component com lógica é correto para Next.js App Router.

**Inconsistência**: `admin/page.tsx` apenas redireciona para `/admin-quiz`. Isso é um resquício de refatoração — a rota antiga pode ser removida.

---

### 4.2 Design System e CSS

**Arquivo**: `client/app/globals.css` (6.576 linhas)

O arquivo é o único ponto de estilo global. Ele mistura três camadas distintas sem separação:

1. **Tokens CSS** (`--bg`, `--primary`, `--radius-*`, `--shadow-*`) — bem definidos
2. **Componentes reutilizáveis** (`.surface-card`, `.primary-button`, `.pill`) — bem definidos
3. **Classes por portal** (`.admin-*` ~100 classes, `.rh-*` ~70 classes, `.whatsapp-*` ~50 classes) — não separadas

**Problemas**:

| Problema | Impacto |
|---------|---------|
| 6.576 linhas em um único arquivo | Qualquer mudança exige busca manual; sem tree-shaking |
| Classes `.rh-*` e `.admin-*` sem conexão explícita com os componentes | Impossível saber se uma classe está em uso sem grep |
| Mistura de Tailwind utility classes inline nos componentes com BEM custom no CSS | Dois sistemas de estilo coexistindo sem convenção |
| Sem dark mode | Impossibilita feature futura sem reescrita |

**Recomendação**: Dividir em módulos por portal:
- `globals.css` — tokens e reset
- `components.css` — design system (cards, buttons, pills)
- `rh.css` — estilos do portal RH
- `whatsapp.css` — estilos do portal WhatsApp
- `quiz.css` — estilos do portal do participante

No Next.js 15 com CSS Modules ou `@import` em layouts específicos.

---

### 4.3 Componentização

#### Positivos

- UI primitivos em `client/components/ui/` são bem abstraídos (`Button`, `Card`, `FormField`, `KpiCard`, `StatusBadge`, `EmptyState`)
- Separação clara entre presentational e container components
- `AppShell` centraliza a navegação de todos os portais internos

#### Problemas

**Componentes gigantes**:
- `admin-dashboard-page-client.tsx` — 38 useState/useEffect hooks em um componente
- `quiz-page-client.tsx` — ~350 linhas com lógica de timer, socket, respostas e estado misturados

Componentes com muitos hooks são difíceis de testar e raciocinar. A extração em hooks customizados (`useQuizTimer`, `useQuizSocket`, `useQuizAnswers`) melhora a legibilidade e a testabilidade.

**Login pages triplicadas**:

`admin-login-page-client.tsx`, `rh-login-page-client.tsx` e `quiz-login-page-client.tsx` compartilham a mesma estrutura de formulário (email + password, estado de loading, redirect pós-login), mas sem abstração comum.

**Recomendação**: Extrair `useLogin(loginFn, redirectPath)` hook customizado com estado de loading, erro e redirect.

---

### 4.4 API Clients e Session Management

#### `rhFetch` duplica `apiFetch`

**Arquivos**: `client/lib/api.ts:89-131`, `client/lib/rh-api.ts:4-23`

`rhFetch` é uma cópia quase literal de `apiFetch` com a diferença de usar `getRhToken()` em vez de receber o token como parâmetro. Note que `whatsappFetch` já resolve isso corretamente — chama `apiFetch` com o token:

```typescript
// whatsapp-api.ts (correto)
export async function whatsappFetch<T>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(path, options, getAdminToken() ?? undefined)
}

// rh-api.ts (incorreto — cópia)
export async function rhFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getRhToken()
  const headers = new Headers(options.headers)
  // ... 15 linhas copiadas de apiFetch
}
```

**Recomendação**: Converter `rhFetch` para o padrão de `whatsappFetch`:

```typescript
export async function rhFetch<T>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(path, options, getRhToken() ?? undefined)
}
```

#### Session management disperso em 3 arquivos

**Arquivos**: `client/lib/session.ts`, `client/lib/rh-session.ts`, `client/lib/internal-session.ts`

- `session.ts` — funções de localStorage para tokens e usuário
- `rh-session.ts` — wrapper que chama `session.ts`, adiciona `getRhDashboardPath()`
- `internal-session.ts` — hook React que valida token no mount e redireciona

A validação de sessão é feita de forma diferente em cada portal: alguns usam `useRequireInternalSession`, outros verificam manualmente o token em `useEffect`.

**Impacto**: Qualquer mudança na estratégia de sessão (ex: migrar de localStorage para HttpOnly cookie) requer alterações em 3+ arquivos.

**Recomendação**: Centralizar em um único `useSession(role)` hook com lógica de validação, redirect e token retornado.

#### Tokens em localStorage

Todos os tokens JWT são armazenados em `localStorage`, acessível a qualquer script da página.

**Causa raiz**: Simplicidade de implementação. Tokens em cookies HttpOnly exigem mudanças no backend (CORS com credentials).

**Impacto**: Vulnerável a XSS. Qualquer script injetado (via dependência comprometida, extensão, etc.) pode exfiltrar os tokens.

**Recomendação a médio prazo**: Migrar para cookies HttpOnly com `SameSite=Strict`. O backend já tem suporte a `credentials: true` no CORS.

---

### 4.5 Gerenciamento de Estado

**Padrão atual**: `useState` local por página + `localStorage` para persistência de sessão + Socket.IO para real-time.

**Problemas**:

1. **Sem cache de dados**: Cada navegação entre páginas do portal RH dispara novas requisições para os mesmos dados (lista de candidatos, vagas, templates). Sem invalidação controlada.

2. **Props drilling implícito**: Dados de sessão acessados via `localStorage` diretamente nos componentes, em vez de via Context. Isso espalha o acoplamento com localStorage por toda a aplicação.

3. **Race conditions em useEffect**: Chamadas assíncronas em `useEffect` sem cleanup ou AbortController podem resultar em setState em componente desmontado.

**Recomendação**: Para o estágio atual do produto, uma Context simples para sessão + SWR/TanStack Query para cache de dados eliminam a maioria dos problemas sem overengineering.

---

### 4.6 Acessibilidade e Responsividade

#### Positivos

- `aria-current="page"` em links de navegação ativos
- `aria-expanded` em botões de collapse na sidebar
- Semantic HTML (`article`, `section`, `main`)
- Labels associadas a inputs com `htmlFor`
- `role="list"` / `role="listitem"` no ranking

#### Problemas

| Problema | Impacto |
|---------|---------|
| `AppShell` sem responsividade mobile (sem hamburger/drawer) | Inacessível em telas < 768px |
| Tabelas no RH e WhatsApp sem scroll horizontal | Overflow em mobile |
| Ausência de `:focus-visible` (apenas `:focus`) | Navegação por teclado invisível em alguns browsers |
| Contraste do amarelo primário (`#FFC205`) com branco | Relação de contraste ~2.8:1 (abaixo do WCAG AA: 4.5:1 para texto) |

---

### 4.7 Qualidade de Testes

**Cobertura**: 0 arquivos de teste no frontend.

Sem testes unitários de componentes, sem testes de hooks customizados e sem testes e2e com Playwright/Cypress.

**Recomendação de prioridade**:
1. Testes de `ranking.utils` (puras, sem DOM)
2. Testes de hooks customizados (`useLogin`, `useSession`)
3. Testes de componentes UI primitivos (`Button`, `FormField`)
4. Testes e2e do fluxo principal (login participante → quiz → ranking)

---

## 5. Modelo de Dados

### 5.1 Entidades e Relacionamentos

O schema é bem estruturado com três domínios claramente separados:

**Domínio Quiz** (participantes públicos):
```
User ←─────── Participant ──────→ Quiz
                  └──────────── Answer ──→ Question ──→ Alternative
AllowedEmail ←─ QuizAllowedEmail ─→ Quiz
Quiz ←───────── WaitingPresence ──→ User
```

**Domínio RH** (usuários internos):
```
SystemUser ←── InterviewAssignee ──→ Interview ──→ Candidate
                                         └──────── JobPosition
Interview ────→ InterviewSlot
Interview ────→ FormSubmission ──→ FormAnswer
Interview ────→ AuditLog ──→ SystemUser
FormTemplate ──→ FormQuestion
```

**Domínio WhatsApp** (automação):
```
WhatsappConnection ──→ WhatsappAutomation ──→ WhatsappDispatchLog
```

**Pontos fortes**:
- Separação clara entre `User` (quiz público) e `SystemUser` (interno)
- Índices compostos estratégicos em `WaitingPresence` e `WhatsappAutomation`
- Cascatas de delete bem definidas
- Enums expressivos para todos os estados

**Pontos de atenção**:
- Mix de `UUID` (domínio Quiz) e `CUID` (domínios RH e WhatsApp) — pode causar confusão
- `FormAnswer` usa 4 campos opcionais (`textValue`, `numberValue`, `booleanValue`, `choiceValue`) como polimorfismo — válido, mas pode ser modelado com um campo `value: Json` para simplificar
- `Interview.submission` é 1:1 com `FormSubmission` — considerar `embeddedFormSubmissionId` como unique constraint explícito

---

### 5.2 Migrations

**11 migrations** de 2026-04-01 a 2026-05-04.

| Problema | Migration | Impacto |
|---------|-----------|---------|
| Nome vago | `20260402015700_y` | Impossível entender o propósito sem abrir o SQL |

Todos os outros nomes são descritivos e rastreáveis. Renomear retroativamente não é possível sem mexer no histórico, mas o padrão deve ser documentado para futuras migrations.

---

### 5.3 Seed

**Arquivo**: `api/prisma/seed.ts`

**Problemas**:

1. **79 e-mails @guidance.dev hardcoded** na lista `AllowedEmail`. Isso é um resquício de configuração de piloto/demo que precisa ser gerenciado via interface administrativa ou variável de ambiente, não embutido no seed.

2. **Sem rota para gerenciar a whitelist global pós-deploy**. A `AllowedEmail` (whitelist global de participantes) só pode ser modificada rodando o seed ou via SQL direto. O módulo `admin` gerencia apenas `QuizAllowedEmail` (por quiz), não a whitelist global.

**Recomendação**: Criar rota `POST /admin/allowed-emails/global` (ou mover para configuração via env var/arquivo) para adicionar e-mails à whitelist global sem exigir redeploy.

---

## 6. Documentação

### 6.1 Qualidade e Cobertura

A documentação cobre ~80% do sistema com qualidade variável:

| Módulo | Qualidade | Observação |
|--------|-----------|-----------|
| WhatsApp | ✅ Excelente | Regras de negócio, limites, formatos JID |
| RH Entrevistas | ✅ Excelente | Fluxo de estados detalhado |
| Admin Portal | ✅ Bom | Rotas e regras de negócio |
| Auth | ✅ Bom | 4 rotas cobertas |
| Participant | ✅ Bom | Ciclo de vida documentado |
| Ranking | ⚠️ Mínimo | Apenas rotas, sem critérios de ordenação |
| Quiz (cache/Redis) | ⚠️ Ausente | Nenhuma menção ao comportamento de cache |

### 6.2 Inconsistências

| Inconsistência | Risco |
|---------------|-------|
| `CLAUDE.md` e `AGENTS.md` têm conteúdo idêntico. `CLAUDE.md:68` referencia "atualizar este `AGENTS.md`" — mas o arquivo em uso é `CLAUDE.md` | Confusão sobre qual atualizar |
| `WebSocket /quiz` sem documentação sobre autenticação (porque não há) | Omissão que mascara problema de segurança |
| Índices do banco (`WaitingPresence`, `WhatsappAutomation`) não mencionados em nenhum doc | Perda de contexto de performance |
| Seed com 79 e-mails não documentado como limitação de deployment | Risco de produção sem whitelist correta |

---

## 7. Segurança

| Risco | Severidade | Arquivo | Recomendação |
|-------|-----------|---------|-------------|
| WebSocket sem autenticação e CORS aberto | 🔴 Alto | `realtime/quiz.gateway.ts:5-8` | Autenticar handshake, restringir origin |
| Tokens JWT em localStorage | 🟠 Médio | `client/lib/session.ts` | Migrar para HttpOnly cookies |
| Sem rate limiting em rotas de login | 🟠 Médio | `api/src/main.ts` | Adicionar `@nestjs/throttler` |
| JWT sem expiração configurada em `AuthService.loginParticipant` | 🟠 Médio | `api/src/auth/auth.service.ts:41-45` | Adicionar `expiresIn: "4h"` |
| Sem refresh token | 🟠 Médio | `api/src/auth/` | Implementar refresh token flow |
| 79 e-mails hardcoded no seed (dado sensível no repositório) | 🟡 Baixo | `api/prisma/seed.ts` | Mover para env var ou arquivo externo |
| Body parser com limite 8MB (necessário para Base64 de imagens WhatsApp) | 🟡 Info | `api/src/main.ts:28-29` | Documentar e restringir apenas às rotas WhatsApp |
| `JWT_SECRET: "change-me"` em `.env.example` | 🟡 Info | `.env.example` | Documentar obrigatoriedade de trocar |

---

## 8. Deployment e Infraestrutura

### Positivos

- Docker Compose funcional com perfis dev/prod
- Healthchecks configurados para PostgreSQL e Redis
- Volume nomeado para PostgreSQL (`postgres_data_v15`)
- Hot reload com polling habilitado (compatível com WSL/Docker Desktop)
- Entrypoint da API automatiza `prisma migrate deploy` + seed

### Gaps

| Gap | Impacto |
|-----|---------|
| Sem `docker-compose.prod.yml` completo (falta o client) | Deploy de produção manual/incompleto |
| Sem nginx/reverse proxy documentado | HTTPS não coberto, portas expostas diretamente |
| Sem backup automatizado do PostgreSQL | Risco de perda de dados |
| Sem health endpoint na API (`/health`) | Kubernetes ou load balancers não conseguem verificar liveness |
| Sem multi-stage Dockerfile | Imagem de produção inclui devDependencies e source desnecessários |
| `api-dev` usa polling (WATCHPACK_POLLING) — pode consumir CPU excessivamente | Performance em ambientes com muitos arquivos |

---

## 9. Plano de Ação Priorizado

### 🔴 P0 — Crítico (corrigir antes do próximo deploy)

- [ ] **Restringir WebSocket CORS e adicionar autenticação no handshake**
  - `api/src/realtime/quiz.gateway.ts`
  - Usar `CORS_ORIGIN` env var (já existe em `main.ts`)
  - Validar token JWT no `handleConnection`

- [ ] **Criar suite de testes para os fluxos críticos**
  - `auth.service.spec.ts`: loginParticipant, loginAdmin
  - `participant.service.spec.ts`: answer (cálculo de responseTimeMs), finish (cálculo de score)
  - `ranking.utils.spec.ts`: buildRankingSnapshot, getRankingTimeMilliseconds (funções puras, fácil)

- [ ] **Mover `syncQuizStatuses` para cron exclusivo**
  - Remover chamadas inline de `getActiveQuiz`, `getQuizSummaryById`, `ensureNoSchedulingConflict`
  - Adicionar `@Cron` no `QuizService` a cada 10s
  - Cache de status no Redis com TTL de 15s para leituras rápidas

### 🟠 P1 — Alto (próximo sprint)

- [ ] **Unificar lógica JWT em BaseJwtGuard**
  - Criar `api/src/common/guards/base-jwt.guard.ts`
  - Refatorar `AdminAuthGuard`, `ParticipantAuthGuard`, `RhAuthGuard`

- [ ] **Unificar `AuthService` e `RhAuthService`**
  - Mover `RhAuthService.login` para `AuthService.loginSystemUser`
  - `rh-auth.controller.ts` delega para `AuthService`

- [ ] **Corrigir `rhFetch` para usar `apiFetch`**
  - `client/lib/rh-api.ts` (mudança de ~15 linhas para 3)

- [ ] **Adicionar `@nestjs/throttler` para rate limiting**
  - Configurar 5 tentativas/minuto nas rotas de login
  - `api/src/main.ts` + `app.module.ts`

- [ ] **Adicionar `expiresIn` ao JWT do loginParticipant**
  - `api/src/auth/auth.service.ts:41-45`
  - Sugestão: `4h` (duração típica de um evento)

- [ ] **Consolidar documentação (CLAUDE.md vs AGENTS.md)**
  - Escolher um nome, remover o outro
  - Corrigir referência interna em linha 68

- [ ] **Criar rota para gestão da whitelist global**
  - `POST /admin/allowed-emails/global` com validação de ADMIN
  - Remover e-mails hardcoded do seed ou mover para env var

- [ ] **Breakar `QuizService` em serviços focados**
  - `QuizCacheService` (Redis)
  - `QuizLifecycleService` (start/finish/sync)
  - `QuizReadService` (leituras simples)

### 🟡 P2 — Médio (backlog técnico)

- [ ] **Implementar GlobalExceptionFilter**
  - Normalizar responses de erro: `{ error, message, statusCode }`
  - Logar erros 5xx com pino

- [ ] **Implementar TransformResponseInterceptor**
  - Envelope: `{ data: T, timestamp: string }` para respostas de sucesso

- [ ] **Configurar logging estruturado com pino**
  - Pino já está instalado
  - Substituir `console.log` por logger injetado

- [ ] **Centralizar tipos do client em `/client/types/`**
  - `quiz.types.ts`, `rh.types.ts`, `whatsapp.types.ts`
  - Remover interfaces dos lib files

- [ ] **Extrair `useLogin` hook customizado**
  - Eliminar triplicação entre portais de login

- [ ] **Dividir `globals.css` em módulos por portal**
  - `globals.css` → tokens + reset
  - `quiz.css`, `rh.css`, `whatsapp.css`

- [ ] **Adicionar responsividade mobile ao AppShell**
  - Hamburger menu ou drawer em telas < 768px
  - `client/components/layout/app-shell.tsx`

- [ ] **Usar rooms do Socket.IO por quizId**
  - `this.server.to(`quiz:${quizId}`).emit(...)`
  - Preparar para múltiplos quizzes simultâneos

- [ ] **Documentar `syncQuizStatuses` como cron (após P0)**
  - Atualizar `docs/modules/api/quiz.md`

- [ ] **Multi-stage Dockerfile para API e Client**
  - Stage build + stage runtime mínimo

- [ ] **Adicionar health endpoint**
  - `GET /health` com status do PostgreSQL e Redis
  - `app.controller.ts` já existe como placeholder

- [ ] **Migrar tokens para HttpOnly cookies**
  - Requer mudança coordenada API + Client
  - API: `res.cookie()` + `SameSite=Strict`
  - Client: remover localStorage, usar cookies automáticos

- [ ] **Investigar contraste do amarelo primário**
  - `#FFC205` em fundo escuro: ok. Em fundo claro: verificar com ferramenta WCAG

---

## 10. Qualidades Positivas

Antes de fechar, é importante registrar o que está bem-feito:

| Aspecto | Detalhe |
|---------|---------|
| **Injeção de dependência** | Excelente uso do DI do NestJS; nenhum singleton manual |
| **DTOs com class-validator** | Validação forte em todos os endpoints com `whitelist: true` |
| **Prisma Schema** | Rico, normalizado, enums expressivos, índices estratégicos |
| **Redis como cache** | Fallback de cache miss implementado corretamente |
| **Ranking module** | Pequeno, focado, com funções puras em `ranking.utils.ts` |
| **WhatsApp scheduler** | Lógica de agendamento isolada e testada (`whatsapp-schedule.spec.ts`) |
| **Design system base** | Tokens CSS centralizados, componentes UI primitivos reutilizáveis |
| **TypeScript estrito** | Cobertura de tipos em toda a stack |
| **Docker** | Ambiente de dev e prod funcionais com healthchecks |
| **Documentação** | 80% de cobertura com qualidade acima da média para o estágio do projeto |
| **Separação de portais** | Quiz, Admin, RH e WhatsApp com layouts e auth independentes |
| **Accessibilidade básica** | aria-* corretos, semantic HTML, labels associadas |

---

*Gerado por `system-review-engine` em 2026-05-04*
