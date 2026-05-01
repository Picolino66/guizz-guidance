# Fluxo publico do quiz

## Descricao
Fluxo do participante desde o login ate o ranking final.

## Localizacao no codigo
- `client/app/page.tsx`
- `client/app/quiz-login/page.tsx`
- `client/app/waiting/page.tsx`
- `client/app/quiz/page.tsx`
- `client/app/ranking/page.tsx`
- `client/components/quiz-login-page-client.tsx`
- `client/components/quiz-page-client.tsx`
- `client/components/waiting-page-client.tsx`
- `client/components/ranking-page-client.tsx`
- `client/lib/api.ts`
- `client/lib/session.ts`

## Entrada
- Login `/quiz-login`
- Espera `/waiting`
- Quiz `/quiz`
- Ranking `/ranking`

## Saida
- Login do participante
- Estado de espera com contagem regressiva
- Execucao das perguntas
- Ranking final atualizado em tempo real

## Observacoes
- A home `/` agora renderiza o shell administrativo compartilhado de `/hub`, sem redirect e com conteudo central vazio.
- O fluxo do participante nao entra mais pelo hub.
- O login do participante, espera, quiz e ranking permanecem fora do sidebar compartilhado.

## Dependencias
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_WS_URL`
- Token do participante salvo em storage local

## Regras de negocio
- O login do participante usa e-mail corporativo.
- Depois do login, o participante segue para `/waiting`.
- Se o quiz ainda nao comecou ou ja terminou, a tela redireciona para espera ou ranking.
- A tela do quiz recupera respostas ja salvas quando o participante recarrega a pagina.
- O ranking recebe atualizacoes por Socket.IO.

## Fluxo resumido
1. O usuario entra em `/quiz-login` e autentica com e-mail.
2. A waiting page confirma presenca e acompanha o cronometro.
3. Quando a rodada inicia, a tela de quiz carrega perguntas e respostas.
4. Ao final, o ranking mostra posicao, acertos e tempo.

## Possiveis erros
- Sessao ausente ou expirada
- Quiz nao informado no redirecionamento
- Falha de rede ao buscar quiz, perguntas ou ranking
