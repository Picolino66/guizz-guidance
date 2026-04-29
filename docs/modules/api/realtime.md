# Realtime

## Descricao
Canal WebSocket para eventos do quiz em tempo real.

## Localizacao no codigo
- `api/src/realtime/quiz.gateway.ts`
- `client/components/ranking-page-client.tsx`

## Entrada
Namespace Socket.IO: `/quiz`

## Eventos emitidos
- `quiz_started`
- `quiz_finished`
- `participant_finished`
- `ranking_updated`

## Saida
- Payloads usados pelo client para atualizar telas sem recarregar

## Dependencias
- `socket.io`
- `QuizGateway`
- Emissoes vindas de `QuizService` e `ParticipantService`

## Regras de negocio
- O gateway publica eventos no namespace `/quiz`.
- O ranking do client assina `ranking_updated` para refletir mudancas imediatas.

## Fluxo resumido
1. O backend inicia ou encerra um quiz.
2. O backend emite evento correspondente.
3. O client escuta e re-renderiza a tela sem polling pesado.

## Possiveis erros
- Falhas de conexao do Socket.IO no client

