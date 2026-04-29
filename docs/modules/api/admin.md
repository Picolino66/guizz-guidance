# Admin do quiz

## Descricao
Operacoes administrativas para criar quizzes, gerenciar perguntas, alternativas e lista de e-mails liberados, alem de visualizar o dashboard da rodada.

## Localizacao no codigo
- `api/src/admin/admin.controller.ts`
- `api/src/admin/admin.service.ts`
- `api/src/admin/dto/*.dto.ts`

## Entrada
- `GET /admin/quizzes`
- `POST /admin/quizzes`
- `POST /admin/quizzes/:quizId/force-start`
- `POST /admin/quizzes/:quizId/finish`
- `POST /admin/quizzes/:quizId/questions`
- `POST /admin/quizzes/:quizId/allowed-emails`
- `POST /admin/questions/:questionId/alternatives`
- `POST /admin/allowed-emails`
- `GET /admin/allowed-emails`
- `DELETE /admin/allowed-emails/:allowedEmailId`
- `GET /admin/dashboard/:quizId`

## Saida
- Lista de quizzes com perguntas e alternativas
- Quiz criado ou atualizado
- Alternativa ou pergunta criada
- Lista de e-mails liberados
- Snapshot de dashboard com participantes, ranking e respostas

## Dependencias
- `AdminAuthGuard`
- `PrismaService`
- `QuizService`
- `RankingService`
- `RedisService` indiretamente, via cache de perguntas

## Regras de negocio
- Um quiz novo entra como `SCHEDULED` se o inicio estiver no futuro, ou `RUNNING` se o horario ja tiver chegado.
- Nao pode haver sobreposicao de janela entre quizzes agendados ou em execucao.
- Ao adicionar uma alternativa marcada como correta, as demais da mesma pergunta sao desmarcadas.
- A whitelist do quiz e substituida integralmente quando `setQuizAllowedEmails` e executado.
- Nao e permitido remover um e-mail liberado se existir participante com quiz em andamento.

## Fluxo resumido
1. O admin cria o quiz com inicio e duracao.
2. Adiciona perguntas e alternativas.
3. Vincula e-mails liberados ao quiz.
4. Pode forcar inicio ou encerramento da rodada.
5. Consulta o dashboard consolidado da rodada.

## Possiveis erros
- `400 Bad Request` em conflito de agendamento, whitelist invalida ou tentativa de encerrar quiz sem execucao
- `404 Not Found` quando quiz, pergunta ou e-mail liberado nao existem
- `403 Forbidden` quando a operacao exige autenticacao admin

