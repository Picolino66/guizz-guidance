# RH form submissions

## Descricao
Submissao e consulta de formularios preenchidos em entrevistas.

## Localizacao no codigo
- `api/src/rh/form-submissions/form-submissions.controller.ts`
- `api/src/rh/form-submissions/form-submissions.service.ts`
- `api/src/rh/form-submissions/dto/form-submission.dto.ts`

## Entrada
- `POST /rh/interviews/:interviewId/submission`
- `GET /rh/interviews/:interviewId/submission`

## Saida
- Formulario preenchido da entrevista
- Consulta da submissao existente

## Dependencias
- `RhAuthGuard`
- `CurrentRhUser`
- `PrismaService`

## Regras de negocio
- Cada entrevista possui no maximo uma submissao.
- O formulario usa as perguntas do template associado a entrevista.

## Fluxo resumido
1. O entrevistador preenche o formulario durante ou apos a entrevista.
2. O backend grava a submissao e suas respostas.
3. Depois a equipe pode recuperar a submissao por entrevista.

## Possiveis erros
- `401 Unauthorized` ou `403 Forbidden`
- `404 Not Found` se a entrevista nao existir

