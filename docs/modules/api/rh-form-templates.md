# RH form templates

## Descricao
Cadastro e manutencao de templates de formulario usados em entrevistas.

## Localizacao no codigo
- `api/src/rh/form-templates/form-templates.controller.ts`
- `api/src/rh/form-templates/form-templates.service.ts`
- `api/src/rh/form-templates/dto/form-template.dto.ts`

## Entrada
- `POST /rh/form-templates`
- `GET /rh/form-templates`
- `GET /rh/form-templates/:id`
- `PUT /rh/form-templates/:id`
- `POST /rh/form-templates/:id/duplicate`

## Saida
- Template criado, listado, detalhado, atualizado ou duplicado

## Dependencias
- `RhAuthGuard`
- `RhRoles(RH)`
- `PrismaService`

## Regras de negocio
- Apenas RH pode criar e editar templates.
- O template possui versao, lock e perguntas ordenadas.
- A duplicacao cria uma copia operacional para novas entrevistas.

## Fluxo resumido
1. O RH cria um template com perguntas.
2. Pode versionar ou duplicar o template para novo ciclo.
3. O template pode ser vinculado a entrevistas.

## Possiveis erros
- `401 Unauthorized` ou `403 Forbidden`
- `404 Not Found` quando o template nao existe

