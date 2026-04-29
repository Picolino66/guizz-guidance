# AGENTS.md

# Repository Guidelines

## Regra principal
- Responder somente em pt-BR.

## Fluxo obrigatório
- Antes de mudar qualquer coisa, ler `docs/index.md`.
- Depois, abrir o índice do módulo afetado:
  - API: `docs/modules/api/index.md`
  - Client: `docs/modules/client/index.md`
- Usar docs + `api/prisma/schema.prisma` como mapa/fonte de verdade para rotas, fluxos, contratos e dados.

## Roteamento por skill
- `api/` -> `nest-api-specialist`
- `client/` -> `senior-nextjs-frontend-specialist`
- API + client -> usar as duas skills

## Mapa do projeto
- `api/`: NestJS + Prisma + PostgreSQL + Redis + WebSocket
- `api/src/auth`: auth de participante, admin e troca de senha
- `api/src/admin`: operação administrativa do quiz
- `api/src/participant`: ciclo de vida do participante
- `api/src/quiz`: quiz ativo e perguntas
- `api/src/ranking`: placar final
- `api/src/realtime`: eventos Socket.IO
- `api/src/rh`: domínio de RH
- `api/src/common`: guards, decorators e tipos compartilhados
- `api/prisma`: schema, migrations e seed
- `client/`: Next.js App Router + React 19 + Tailwind CSS 4
- `client/app`: rotas e páginas
- `client/components`: componentes reutilizáveis
- `client/lib`: fetch, sessão e utilitários
- `client/app/globals.css`: estilos globais

## Fontes principais
- Contratos HTTP e regras: `api/src`
- Dados: `api/prisma/schema.prisma`
- Rotas e telas: `client/app`
- UI reutilizável: `client/components`
- Utilitários e acesso a dados: `client/lib`
- Visão geral: `README.md` e `docs/index.md`

## Comandos
- API dev: `cd api && npm run start:dev`
- API lint: `cd api && npm run lint`
- API prisma: `cd api && npm run prisma:generate && npm run prisma:migrate && npm run db:seed`
- API Docker: `cd api && docker compose --profile dev up`
- Client dev: `cd client && npm run dev`
- Client build/lint: `cd client && npm run build && npm run lint`
- Client Docker: `cd client && docker compose up`

## Padrões
- TypeScript estrito.
- 2 espaços, aspas duplas, sem ponto e vírgula.
- Backend: kebab-case e DTOs com sufixo `.dto.ts`.
- Frontend: `page.tsx` e `layout.tsx`.
- Lógica reutilizável fora de páginas/componentes de apresentação.

## Validação
- Antes de PR: `npm run lint` no pacote alterado e `npm run build` quando houver mudança de código.
- Se tocar API e client, validar os dois lados.
- Registrar verificação manual curta na entrega/PR.

## Docs e manutenção
- Mudou fluxo, contrato, rota, modelo, componente, tela, script ou arquitetura: atualizar docs relacionados.
- Mudou o mapa do projeto: atualizar este `AGENTS.md`.
- Manter `docs/index.md` e `docs/modules/*` sincronizados com a estrutura real.

## Segurança e configuração
- Usar `.env.example` como base.
- Não commitar segredos, `.env`, `node_modules` ou artefatos gerados.
- Destacar mudanças de Prisma, migrations e seed em PRs.
