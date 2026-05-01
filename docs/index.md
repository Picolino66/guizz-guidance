# Quizz

## Visao geral
Aplicacao de quiz em monorepo com tres superficies principais:

- `api/`: backend NestJS com Prisma, PostgreSQL, Redis e WebSocket
- `client/`: frontend Next.js App Router com telas publicas, painel admin, portal RH e portal WhatsApp

## Como navegar
1. Leia primeiro os indices dos modulos.
2. Depois abra a feature que corresponde ao fluxo que voce quer entender.
3. Use o schema Prisma como fonte de verdade para entidades e relacoes.

## Mapa do projeto
- [API](./modules/api/index.md)
- [Client](./modules/client/index.md)

## Fontes principais
- Contratos HTTP e regras de negocio do backend em `api/src`
- Modelo de dados em `api/prisma/schema.prisma`
- Rotas e telas do frontend em `client/app`
- Componentes e fluxos de tela em `client/components`
- Funcoes de fetch, session e utilitarios em `client/lib`
