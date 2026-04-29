# Quiz

## Descricao
Leitura do quiz ativo e das perguntas de um quiz especifico.

## Localizacao no codigo
- `api/src/quiz/quiz.controller.ts`
- `api/src/quiz/quiz.service.ts`

## Entrada
- `GET /quiz/active`
- `GET /quiz/:id/questions`

## Saida
- Resumo do quiz ativo para a tela de espera
- Lista ordenada de perguntas e alternativas do quiz

## Dependencias
- `PrismaService`
- `RedisService` para cache de perguntas
- `QuizGateway` para eventos de sincronizacao de status
- `ParticipantAuthGuard` na rota de perguntas

## Regras de negocio
- O quiz ativo e calculado a partir de quizzes agendados ou em execucao.
- As perguntas sao lidas da cache Redis quando disponiveis.
- Em cache miss, o backend busca no banco e reaquece o cache.
- O status do quiz e sincronizado antes das leituras relevantes.

## Fluxo resumido
1. A tela de espera busca o quiz ativo.
2. Quando precisa entrar na rodada, o client busca as perguntas por quiz.
3. O backend retorna perguntas ordenadas por `order` e alternativas ordenadas por `order`.

## Possiveis erros
- `404 Not Found` se o quiz nao existir ao buscar perguntas por id
- `403 Forbidden` se o usuario nao estiver autenticado para acessar as perguntas

