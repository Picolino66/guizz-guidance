# RH jobs

## Descricao
Cadastro e manutencao de vagas/processos seletivos.

## Localizacao no codigo
- `api/src/rh/jobs/jobs.controller.ts`
- `api/src/rh/jobs/jobs.service.ts`
- `api/src/rh/jobs/dto/job.dto.ts`

## Entrada
- `POST /rh/jobs`
- `GET /rh/jobs`
- `GET /rh/jobs/:id`
- `PUT /rh/jobs/:id`
- `DELETE /rh/jobs/:id`

## Saida
- Vaga criada, listada, detalhada, atualizada ou removida

## Dependencias
- `RhAuthGuard`
- `RhRoles(RH)`
- `PrismaService`

## Regras de negocio
- O CRUD e restrito ao papel `RH`.
- A vaga e referenciada por entrevistas e painel de recrutamento.

## Fluxo resumido
1. O RH cadastra uma vaga.
2. A vaga fica disponivel para associar entrevistas.

## Possiveis erros
- `401 Unauthorized` ou `403 Forbidden` para acesso invalido
- `404 Not Found` quando a vaga nao existe

