# Quizz

Aplicação de quiz em arquitetura monorepo com:

- `api/`: backend em NestJS + Prisma + PostgreSQL + Redis
- `client/`: frontend em Next.js (App Router)

## Arquitetura

### API (`api/`)

Módulos principais em `api/src`:

- `auth`
- `admin`
- `participant`
- `quiz`
- `ranking`
- `realtime`
- `whatsapp`

Código compartilhado em `api/src/common` e persistência em `api/prisma`.

### Client (`client/`)

- Rotas App Router em `client/app`
- Componentes reutilizáveis em `client/components`
- Utilitários em `client/lib`
- Estilos globais em `client/app/globals.css`
- O hub administrativo abre `Quiz Admin`, `RH Recrutamento` e `WhatsApp`

## Pré-requisitos

- Node.js e npm instalados
- Docker e Docker Compose (opcional, para subir ambiente com containers)

## Configuração de ambiente

1. API:

```bash
cd api
cp .env.example .env
```

2. Client:

```bash
cd client
cp .env.example .env
```

Variáveis principais:

- API (`api/.env`)
  - `PORT` (padrão: `4000`)
  - `CORS_ORIGIN`
  - `JWT_SECRET`
  - `DATABASE_URL`
  - `REDIS_URL`
  - `ADMIN_SEED_USERNAME`
  - `ADMIN_SEED_EMAIL`
  - `ADMIN_SEED_PASSWORD`
- Client (`client/.env`)
  - `NEXT_PUBLIC_API_BASE_URL` (padrão: `http://localhost:4000`)
  - `NEXT_PUBLIC_WS_URL` (padrão: `http://localhost:4000/quiz`)

## Instalação

Instale dependências em cada app:

```bash
cd api && npm install
cd ../client && npm install
```

## Rodando localmente (sem Docker)

1. Suba PostgreSQL e Redis localmente (ou via Docker).
2. Prepare o banco da API:

```bash
cd api
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
```

3. Inicie a API (porta `4000`):

```bash
cd api
npm run start:dev
```

4. Inicie o Client (porta `3000`):

```bash
cd client
npm run dev
```

## Rodando com Docker

### API + banco + redis (modo dev)

```bash
cd api
docker compose --profile dev up
ou
docker compose --profile dev up --build
```

A automacao WhatsApp usa Baileys e persiste a sessao no banco via Prisma, sem depender de Chromium/Puppeteer.

### Client

```bash
cd client
docker compose up
```

## Scripts úteis

### API (`api/`)

- `npm run start:dev`: build + watch + execução em desenvolvimento
- `npm run build`: build de produção
- `npm run start`: executa build em produção
- `npm run lint`: validação TypeScript (`tsc --noEmit`)
- `npm run prisma:generate`: gera client Prisma
- `npm run prisma:migrate`: aplica migrations
- `npm run db:seed`: popula usuário admin inicial
- `npm run docker:dev`: atalho para `docker compose --profile dev up`

### Client (`client/`)

- `npm run dev`: desenvolvimento
- `npm run build`: build de produção
- `npm run start`: sobe app em produção
- `npm run lint`: validação TypeScript (`tsc --noEmit`)

## Qualidade e validação

Atualmente não há suíte de testes automatizados commitada. Antes de abrir PR:

- Rodar `npm run lint` em `api` e `client`
- Rodar `npm run build` no pacote alterado
- Descrever validação manual no PR

## Convenções do projeto

- TypeScript estrito nas duas aplicações
- Indentação com 2 espaços
- Strings com aspas duplas
- Sem ponto e vírgula
- Backend: arquivos em `kebab-case` e DTOs com sufixo `.dto.ts`
- Frontend: páginas App Router em `page.tsx` e layouts em `layout.tsx`

## Segurança

- Use os arquivos `.env.example` como base
- Não commitar segredos, `.env`, `node_modules` ou artefatos gerados
- Destacar alterações de Prisma/migrations no PR
