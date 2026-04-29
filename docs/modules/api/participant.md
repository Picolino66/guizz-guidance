# Participante

## Descricao
Fluxo do participante durante a rodada: inicio da tentativa, respostas, finalizacao, presenca na espera e leitura do estado do quiz.

## Localizacao no codigo
- `api/src/participant/participant.controller.ts`
- `api/src/participant/participant.service.ts`
- `api/src/participant/dto/*.dto.ts`

## Entrada
- `POST /participant/start`
- `POST /participant/answer`
- `POST /participant/finish`
- `POST /participant/waiting-presence/:quizId`
- `DELETE /participant/waiting-presence/:quizId`
- `GET /participant/quiz-state/:quizId`

## Saida
- Identificador da tentativa do participante
- Respostas ja salvas para recuperacao da tela
- Estado consolidado do quiz para decidir entre waiting, quiz ou ranking
- Atualizacao de presenca na fila de espera

## Dependencias
- `ParticipantAuthGuard`
- `QuizService`
- `QuizGateway`
- `PrismaService`

## Regras de negocio
- O participante so consegue iniciar se o quiz estiver em execucao e se o e-mail estiver na whitelist daquele quiz.
- Uma tentativa finalizada nao pode ser reiniciada.
- Cada pergunta aceita apenas uma resposta por participante.
- A resposta atualiza `score` e `responseTimeMs` e dispara atualizacao de ranking.
- A presenca de espera expira por TTL e e renovada por heartbeat do client.

## Fluxo resumido
1. O client chama `start` para abrir ou recuperar a tentativa.
2. A tela carrega o estado do quiz e as perguntas.
3. Cada resposta e persistida por upsert.
4. Ao finalizar, o participante entra no consolidado final e o ranking e atualizado.
5. Enquanto aguarda, o client mantem presenca ativa por polling e heartbeat.

## Possiveis erros
- `401 Unauthorized` se o token for invalido ou expirado
- `403 Forbidden` se o participante nao estiver liberado ou tentar responder fora do estado permitido
- `404 Not Found` se a pergunta ou quiz nao existir
- `400 Bad Request` se a alternativa nao pertencer a pergunta

