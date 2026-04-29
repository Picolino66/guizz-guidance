# RH users

## Descricao
Cadastro e manutencao de usuarios do modulo RH.

## Localizacao no codigo
- `api/src/rh/users/rh-users.controller.ts`
- `api/src/rh/users/rh-users.service.ts`
- `api/src/rh/users/dto/create-rh-user.dto.ts`

## Entrada
- `POST /rh/users`
- `GET /rh/users`
- `GET /rh/users/:id`
- `DELETE /rh/users/:id`

## Saida
- Usuario RH criado, listado, detalhado ou removido

## Dependencias
- `RhAuthGuard`
- `RhRoles(RH)`
- `PrismaService`

## Regras de negocio
- Apenas usuarios com papel `RH` podem manter usuarios RH.

## Fluxo resumido
1. O RH autenticado abre a lista de usuarios.
2. Pode criar, consultar ou remover usuarios do modulo.

## Possiveis erros
- `401 Unauthorized` quando nao autenticado
- `403 Forbidden` quando o papel nao for `RH`
- `404 Not Found` se o usuario nao existir

