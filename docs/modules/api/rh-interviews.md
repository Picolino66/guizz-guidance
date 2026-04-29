# RH interviews

## Descricao
Gestao do ciclo de entrevistas, incluindo criacao, atribuicao, sugerir/confirmar slots, aprovacao, conclusao e auditoria.

## Localizacao no codigo
- `api/src/rh/interviews/interviews.controller.ts`
- `api/src/rh/interviews/interviews.service.ts`
- `api/src/rh/interviews/dto/interview.dto.ts`

## Entrada
- `POST /rh/interviews`
- `GET /rh/interviews`
- `GET /rh/interviews/:id`
- `PUT /rh/interviews/:id`
- `POST /rh/interviews/:id/assign`
- `POST /rh/interviews/:id/slots`
- `POST /rh/interviews/:id/confirm-slot`
- `POST /rh/interviews/:id/counter-slots`
- `POST /rh/interviews/:id/rh-approve-slot`
- `POST /rh/interviews/:id/mark-done`
- `POST /rh/interviews/:id/close`
- `GET /rh/interviews/:id/audit`

## Saida
- Entrevista criada ou atualizada
- Slots propostos, confirmados ou contrapropostos
- Status operacional da entrevista
- Registro de auditoria

## Dependencias
- `RhAuthGuard`
- `CurrentRhUser`
- `PrismaService`

## Regras de negocio
- O fluxo de entrevista transita por estados como `DRAFT`, `SCHEDULING`, `WAITING_TECH_CONFIRMATION`, `WAITING_RH_APPROVAL`, `SCHEDULED`, `DONE`, `EVALUATED` e `CLOSED`.
- A entrevista pode ter responsaveis, slot confirmado e template de formulario associado.
- O historico e persistido em `AuditLog`.

## Fluxo resumido
1. O RH cria a entrevista com candidato e vaga.
2. Atribui entrevistadores e propõe horarios.
3. O tecnico confirma ou contrapropoe.
4. O RH aprova e a entrevista pode ser marcada como concluida ou encerrada.

## Possiveis erros
- `401 Unauthorized` ou `403 Forbidden`
- `404 Not Found` quando entrevista, candidato ou vaga nao existem

