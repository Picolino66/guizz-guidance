# Ranking

## Descricao
Consulta do placar final da rodada.

## Localizacao no codigo
- `api/src/ranking/ranking.controller.ts`
- `api/src/ranking/ranking.service.ts`
- `api/src/ranking/ranking.utils.ts`

## Entrada
- `GET /quiz/:id/ranking`

## Saida
- Lista ordenada de participantes finalizados com posicao, nome, score e tempo total

## Dependencias
- `PrismaService`
- Funcoes de ranking em `ranking.utils`

## Regras de negocio
- Apenas participantes finalizados entram no ranking.
- A ordenacao prioriza maior pontuacao e, em empate, menor tempo total.
- A visualizacao do client pode ser atualizada em tempo real via WebSocket.

## Fluxo resumido
1. O client de ranking solicita o placar pelo quiz atual.
2. O backend filtra apenas participantes concluidos.
3. O helper monta o snapshot com posicao e metadados de exibicao.

## Possiveis erros
- `404 Not Found` se o quiz nao existir

