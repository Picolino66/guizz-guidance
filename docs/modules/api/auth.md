# Autenticacao

## Descricao
Fluxos de login e troca de senha para participante e admin.

## Localizacao no codigo
- `api/src/auth/auth.controller.ts`
- `api/src/auth/auth.service.ts`
- `api/src/auth/dto/*.dto.ts`

## Entrada
- `POST /auth/login-participant`
- `POST /auth/login-admin`
- `POST /auth/change-admin-password`

## Saida
- Token JWT com informacoes do usuario autenticado
- Dados publicos do participante ou admin
- Mensagem de confirmacao na troca de senha

## Dependencias
- `PrismaService`
- `JwtService`
- `AdminAuthGuard` para alteracao de senha
- `bcrypt` para validar e atualizar senha de admin

## Regras de negocio
- O participante so autentica se o e-mail estiver liberado em `AllowedEmail`.
- O login do participante cria ou reaproveita um `User` por e-mail.
- O login do admin aceita `username` ou `email`.
- A nova senha do admin precisa ser diferente da senha atual.

## Fluxo resumido
1. O participante envia e-mail corporativo.
2. O backend valida a lista liberada.
3. O admin envia login e senha.
4. O backend valida a senha e emite JWT.
5. O admin autenticado pode trocar a propria senha.

## Possiveis erros
- `401 Unauthorized` quando o e-mail nao esta autorizado ou as credenciais sao invalidas
- `400 Bad Request` quando a senha atual esta incorreta ou a nova senha repete a anterior
- `404 Not Found` se o admin autenticado nao existir mais

