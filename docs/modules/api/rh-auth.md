# RH auth

## Descricao
Autenticacao do modulo de recrutamento para usuarios com papel `RH` ou `TECH`.

## Localizacao no codigo
- `api/src/rh/auth/rh-auth.controller.ts`
- `api/src/rh/auth/rh-auth.service.ts`
- `api/src/rh/auth/rh-auth.guard.ts`

## Entrada
- `POST /rh/auth/login`

## Saida
- `accessToken`
- Dados do usuario RH autenticado

## Dependencias
- `PrismaService`
- `JwtService`
- `RhAuthGuard`
- `RhRoles` para controle por perfil

## Regras de negocio
- O login valida e-mail e senha.
- O token carrega o papel do usuario para liberar rotas RH ou TECH.

## Fluxo resumido
1. O usuario informa e-mail e senha.
2. O backend valida as credenciais.
3. O client armazena token e usuario e redireciona para o painel correspondente.

## Possiveis erros
- `401 Unauthorized` quando as credenciais sao invalidas

