# RH candidates

## Descricao
Cadastro e manutencao de candidatos do processo seletivo.

## Localizacao no codigo
- `api/src/rh/candidates/candidates.controller.ts`
- `api/src/rh/candidates/candidates.service.ts`
- `api/src/rh/candidates/dto/candidate.dto.ts`

## Entrada
- `POST /rh/candidates`
- `GET /rh/candidates`
- `GET /rh/candidates/:id`
- `PUT /rh/candidates/:id`
- `DELETE /rh/candidates/:id`

## Saida
- Cadastro, lista, detalhe, atualizacao ou remocao de candidato

## Dependencias
- `RhAuthGuard`
- `RhRoles(RH)`
- `PrismaService`

## Regras de negocio
- O CRUD e restrito ao papel `RH`.
- O cadastro alimenta entrevistas e a trilha do recrutamento.

## Fluxo resumido
1. O RH cria ou atualiza o candidato.
2. O candidato pode ser usado na criacao de entrevistas.

## Possiveis erros
- `401 Unauthorized` ou `403 Forbidden` para acesso invalido
- `404 Not Found` quando o candidato nao existe

