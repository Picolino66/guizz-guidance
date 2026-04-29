# Wireframe mapeado do client

## Objetivo
Mapear a navegacao, os estados de tela e os wireframes estruturais do frontend `client/` com base nas rotas reais, nos componentes-client e no schema Prisma.

## Fontes de verdade
- `docs/index.md`
- `docs/modules/client/index.md`
- `docs/modules/client/public-quiz.md`
- `docs/modules/client/admin-portal.md`
- `docs/modules/client/rh-portal.md`
- `client/app`
- `client/components`
- `client/lib/api.ts`
- `client/lib/session.ts`
- `client/lib/rh-api.ts`
- `client/lib/rh-session.ts`
- `api/prisma/schema.prisma`

## Como ler este documento
- Cada rota tem fluxo de entrada, estados, saidas e wireframe low-fi.
- Os redirecionamentos legados aparecem como rotas sem tela propria.
- Estados de loading, vazio, erro e cancelamento aparecem explicitamente.
- Fluxos assicronos usam `POST`, `GET` periodico, polling ou Socket.IO quando aplicavel.

## Dependencias e contratos
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_WS_URL`
- Token admin salvo em `localStorage`
- Token do participante salvo em `localStorage`
- `activeQuizId` salvo em `localStorage`
- `RhLayout` e `rh-session` para o portal RH

## Vocabulario de estados
- `QuizStatus`: `DRAFT`, `SCHEDULED`, `RUNNING`, `FINISHED`
- `ParticipantViewerState`: `PRE_QUIZ_WAITING`, `IN_PROGRESS`, `POST_QUIZ_WAITING`, `RESULT_READY`
- `InterviewStatus`: `DRAFT`, `SCHEDULING`, `WAITING_TECH_CONFIRMATION`, `WAITING_RH_APPROVAL`, `SCHEDULED`, `DONE`, `EVALUATED`, `CLOSED`
- `SlotStatus`: `PROPOSED`, `CONFIRMED`, `REJECTED`

## Mapa macro
```text
/ -> hub administrativo sem redirect

/login
  - token admin ja existe -> redirect /
  - submit login -> /
  - query `role=rh` -> render login RH/TECH

/admin/login -> 404
/admin-guidance -> redirect /hub
/admin -> redirect /admin-quiz

/hub
  - token admin ausente -> redirect /login
  - card Quiz Admin -> /admin-quiz
  - card RH Recrutamento -> /rh/dashboard | /rh/tech/dashboard se houver sessao RH, senao /login?role=rh

/quiz-login
  - submit e-mail -> /waiting

/waiting
  - sem token participante -> /quiz-login
  - viewerState = IN_PROGRESS -> /quiz?quizId=...
  - viewerState = RESULT_READY -> /ranking?quizId=...

/quiz
  - sem token participante -> /quiz-login
  - sem quizId -> /waiting
  - quiz encerrado -> /ranking?quizId=...
  - viewerState pre/post waiting -> /waiting?quizId=...

/ranking
  - quizId ausente -> estado de erro inline
  - socket ranking_updated -> atualiza lista

/rh/*
  - token RH ausente -> /login?role=rh
  - token TECH ausente -> /login?role=rh
  - RhLayout troca a navegacao conforme o papel
```

## Fluxo publico

### `/quiz-login`
#### Fluxo
```text
/quiz-login
  render
    - mostra o formulario de e-mail corporativo
  submit
    - POST /auth/login-participant
      - erro (401, 400, rede) -> permanece em /quiz-login com mensagem inline
      - sucesso (200)
        -> salva accessToken do participante
        -> limpa activeQuizId
        -> redirect /waiting
```

#### Wireframe
```text
+--------------------------------------------------+
| [Mascote / marca]                                |
|                                                  |
| Quiz Guidance                                    |
| Informe seu e-mail corporativo para participar   |
|                                                  |
| [ input e-mail ]                                 |
| [ Entrar no Quiz ]                               |
|                                                  |
| Apenas funcionarios cadastrados podem participar |
+--------------------------------------------------+
```

#### Estados e acoes
- `idle`: formulario pronto para digitar
- `submitting`: botao fica desabilitado e texto muda para `Entrando...`
- `error`: mensagem inline sem troca de rota

### `/waiting`
#### Fluxo
```text
/waiting
  guard
    - sem token -> redirect /quiz-login
  bootstrap
    - tenta quizId da query
    - se nao houver, busca /quiz/active
  load estado
    - GET /participant/quiz-state/:quizId
      - PRE_QUIZ_WAITING -> render lobby de espera
      - POST_QUIZ_WAITING -> render pos-quiz
      - IN_PROGRESS -> redirect /quiz?quizId=...
      - RESULT_READY -> redirect /ranking?quizId=...
  presencia
    - POST /participant/waiting-presence/:quizId a cada 10s
    - DELETE no pagehide e no cleanup
  erro 401
    - limpa sessao do participante
    - redirect /quiz-login
```

#### Wireframe
```text
+--------------------------------------------------+
| Eyebrow / status da rodada                       |
| Titulo do quiz ou "Quiz de Cultura Guidance"     |
| Lead / mensagem de espera                        |
|                                                  |
|              [ contador central ]                |
|                                                  |
| Nota contextual                                  |
|                                                  |
| [ Inicio oficial / data ] [ Confirmados ]        |
+--------------------------------------------------+
```

#### Wireframe pos-quiz
```text
+--------------------------------------------------+
| Quiz finalizado                                  |
| Aguardando outros participantes                  |
|                                                  |
| [ Finalizados ] [ Ainda fazendo ]                |
|                                                  |
|              [ contador central ]                |
|                                                  |
| O resultado sera exibido em breve                |
+--------------------------------------------------+
```

#### Estados e acoes
- `sem quiz ativo`: mostra lobby neutro e aguarda nova rodada
- `pre-quiz`: mostra contagem regressiva para o inicio
- `pos-quiz`: mostra contagem regressiva para o fechamento do resultado
- `redirect`: ocorre quando o polling detecta quiz em andamento ou resultado pronto

### `/quiz`
#### Fluxo
```text
/quiz
  guard
    - sem token -> redirect /quiz-login
    - sem quizId -> redirect /waiting
  bootstrap
    - POST /participant/start { quizId }
    - GET /participant/quiz-state/:quizId
    - GET /quiz/:quizId/questions
  resposta de estado
    - PRE_QUIZ_WAITING ou POST_QUIZ_WAITING -> redirect /waiting?quizId=...
    - RESULT_READY -> redirect /ranking?quizId=...
  carregamento
    - carrega perguntas e respostas ja salvas
    - se nao houver perguntas, tenta refresh uma vez
    - se continuar vazio, mostra estado empty
  interacao
    - POST /participant/answer para cada resposta
    - rollback visual se salvar falhar
  finalizar
    - POST /participant/finish
    - redirect /waiting?quizId=...
  tempo
    - quando `endTime` expira, redirect /ranking?quizId=...
```

#### Wireframe
```text
+--------------------------------------------------------------+
| [ progresso 1/10 ]  Titulo do quiz  [ timer ]                |
|--------------------------------------------------------------|
| Barra de progresso                                            |
|--------------------------------------------------------------|
| Card da pergunta                                              |
|  Pergunta atual                                               |
|                                                               |
|  [A] alternativa 1                                            |
|  [B] alternativa 2                                            |
|  [C] alternativa 3                                            |
|  [D] alternativa 4                                            |
|--------------------------------------------------------------|
| [ Voltar ]                [ Proximo ] / [ Enviar Respostas ]  |
+--------------------------------------------------------------+
```

#### Estados e acoes
- `loading`: carrega estado do quiz e respostas ja persistidas
- `recovering`: tenta nova carga quando a pergunta ainda nao apareceu
- `ready`: navega entre perguntas e salva respostas
- `empty`: mostra aviso de que nao ha perguntas cadastradas
- `error`: mostra falha de carregamento ou falha ao enviar resposta

### `/ranking`
#### Fluxo
```text
/ranking
  entrada
    - quizId da query ou activeQuizId salvo
    - se nao houver quizId -> erro inline
  carga inicial
    - GET /quiz/:quizId/ranking
  realtime
    - conecta Socket.IO em NEXT_PUBLIC_WS_URL
    - evento ranking_updated para o mesmo quizId atualiza a lista
  saida
    - nenhuma navegacao automatica
```

#### Wireframe
```text
+--------------------------------------------------+
| RESULTADO                                         |
|--------------------------------------------------|
| #1  Nome do participante                          |
|     acertos + tempo                               |
| #2  Nome do participante                          |
|     acertos + tempo                               |
| #3  Nome do participante                          |
|     acertos + tempo                               |
|                                                  |
| [ estado vazio ] ou [ mensagem de erro ]         |
+--------------------------------------------------+
```

#### Estados e acoes
- `populated`: ranking com posicao, acertos e tempo
- `empty`: aguarda participantes finalizados
- `error`: quiz ausente ou falha de rede

## Fluxo admin

### `/`
#### Fluxo
```text
/
  guard
    - sem token admin -> redirect /login
  render
    - mesmo conteudo de /hub
```

#### Wireframe
```text
+----------------------------------------------------------+
| H  Guidance Hub                                          |
| Escolha o modulo administrativo que deseja acessar       |
|                                                          |
| [ Quiz Admin ]   -> abre o dashboard do quiz             |
| [ RH Recrutamento ] -> abre o portal RH / TECH          |
+----------------------------------------------------------+
```

### `/login`
#### Fluxo
```text
/login
  mount
    - se token admin ja existir -> redirect /
    - se query role=rh -> render login RH/TECH
  submit
    - POST /auth/login-admin
      - erro -> permanece em /login com mensagem inline
      - sucesso -> salva token admin -> redirect /
```

#### Wireframe
```text
+-----------------------------------------------+
| [ Mascote ]                                   |
| Login admin                                   |
| Use seu login e sua senha                     |
|                                               |
| [ login ]                                     |
| [ senha ]                                     |
| [ Entrar ]                                    |
|                                               |
| [ erro inline ]                               |
+-----------------------------------------------+
```

#### Estados e acoes
- `idle`: formulario pronto
- `submitting`: botao desabilitado e texto `Entrando...`
- `error`: erro inline de autenticacao

### `/hub`
#### Fluxo
```text
/hub
  guard
    - sem token admin -> redirect /login
  render
    - card Quiz Admin -> /admin-quiz
    - card RH Recrutamento -> /login?role=rh ou direto ao dashboard RH/TECH se houver sessao
```

#### Wireframe
```text
+----------------------------------------------------------+
| H  Guidance Hub                                          |
| Escolha o modulo administrativo que deseja acessar       |
|                                                          |
| [ Quiz Admin ]   -> abre o dashboard do quiz             |
| [ RH Recrutamento ] -> abre o portal RH / TECH          |
+----------------------------------------------------------+
```

#### Estados e acoes
- `mounted`: aguarda verificar token e evita render prematuro
- `sem token`: redireciona para login

### `/admin-quiz`
#### Fluxo
```text
/admin-quiz
  guard
    - sem token -> redirect /login
  bootstrap
    - GET /admin/quizzes
    - seleciona quiz por prioridade operacional
      - RUNNING
      - proximo SCHEDULED
      - ultimo FINISHED
      - DRAFT como fallback
    - GET /admin/dashboard/:quizId
  refresh
    - polling a cada 4s nas views dashboard, results e quizzes(list)
  views internas
    - dashboard
    - quizzes
    - results
    - participants
    - settings
    - create wizard
  navegacao interna
    - nao troca rota, troca apenas o estado da tela
```

#### Shell
```text
+----------------------+-------------------------------------------+
| Sidebar              | Topbar                                    |
| - Dashboard          | Admin A                                   |
| - Quizzes            |                                           |
| - Participantes      |-------------------------------------------|
| - Configuracoes      | Titulo da view atual                      |
| - Sair               | Subtitulo / contexto                      |
|                      |-------------------------------------------|
|                      | Conteudo dinamico da view                 |
|                      |                                           |
|                      | [ alertas / erros / sucesso ]            |
+----------------------+-------------------------------------------+
```

#### Dashboard
```text
admin-quiz / dashboard
  - mostra quiz ativo, participantes e tempo
  - acoes rapidas: iniciar quiz, encerrar quiz, ver quizzes, ver ranking
  - estados: sem quiz, quiz agendado, quiz em andamento, quiz encerrado
```

#### Quizzes
```text
admin-quiz / quizzes
  - lista quizzes cadastrados em ordem de prioridade
  - acoes: forcar inicio, forcar encerramento, ver resultado
  - estados: lista vazia, carregando, quiz em andamento
```

#### Results
```text
admin-quiz / results
  - ranking consolidado do quiz selecionado
  - acao: exportar CSV
  - estados: carregando, ranking vazio, ranking preenchido
```

#### Participants
```text
admin-quiz / participants
  - campo para adicionar e-mail liberado
  - lista de e-mails permitidos
  - acao: remover participante liberado
  - estados: lista vazia, carregando, erro de validacao
```

#### Settings
```text
admin-quiz / settings
  - trocar senha do admin
  - confirma senha nova e encerra a sessao ao salvar
  - estados: validacao, carregando, erro
```

#### Create wizard
```text
admin-quiz / create
  step 1: criar quiz
  step 2: selecionar e-mails participantes
  step 3: criar perguntas e alternativas

  step 1 -> cria quiz com titulo, inicio e duracao
  step 2 -> move e-mails do painel esquerdo para o direito
  step 3 -> cadastra perguntas, alternativas e correta
  finalizar -> persiste tudo e volta para a lista / resultado
```

#### Wireframe do wizard
```text
+--------------------------------------------------+
| Step 1 / Step 2 / Step 3                         |
|--------------------------------------------------|
| Step 1: form do quiz                             |
| Step 2: transferencia de e-mails                 |
| Step 3: editor de perguntas                      |
|--------------------------------------------------|
| Acoes de cancelar / continuar / finalizar        |
+--------------------------------------------------+
```

### Rotas legadas do admin
#### `/admin`
```text
/admin -> redirect /admin-quiz
```

#### `/admin/login`
```text
/admin/login -> 404
```

#### `/admin-guidance`
```text
/admin-guidance -> redirect /hub
```

## Fluxo RH / TECH

### `RhLayout`
#### Fluxo
```text
/rh/*
  guard
    - sem token RH/TECH -> redirect /login?role=rh
  shell
    - carrega usuario salvo em localStorage
    - papel RH -> links: dashboard, candidates, jobs, form-templates
    - papel TECH -> link: minhas entrevistas
  logout
    - limpa sessao RH
    - redirect /login?role=rh
```

#### Wireframe
```text
+--------------------------------------------------------------------------------+
| Brand RH | Link 1 | Link 2 | Link 3 | ... | Usuario | Papel | Sair             |
|--------------------------------------------------------------------------------|
| Conteudo da pagina protegida                                                   |
+--------------------------------------------------------------------------------+
```

### `/login?role=rh`
#### Fluxo
```text
/login?role=rh
  render
    - formulario de e-mail e senha
  submit
    - POST /rh/auth/login
      - erro -> permanece em /login?role=rh com mensagem inline
      - sucesso -> salva token e usuario
        -> role RH -> /rh/dashboard
        -> role TECH -> /rh/tech/dashboard
```

#### Wireframe
```text
+-----------------------------------------------+
| RH                                             |
| RH Recrutamento                                |
| Acesso exclusivo para RH e entrevistadores     |
|                                                |
| [ e-mail ]                                     |
| [ senha ]                                      |
| [ Entrar ]                                     |
|                                                |
| [ erro inline ]                                |
+-----------------------------------------------+
```

#### Estados e acoes
- `idle`: formulario pronto
- `submitting`: botao desabilitado
- `error`: autenticacao negada ou falha de rede

### `/rh/dashboard`
#### Fluxo
```text
/rh/dashboard
  guard
    - sem token -> /login?role=rh
  load
    - GET /rh/interviews
    - filtro de status atualiza a query de busca
  saida
    - abrir /rh/interviews/new
    - abrir /rh/interviews/:id
```

#### Wireframe
```text
+---------------------------------------------------------------+
| Entrevistas                              [ Nova Entrevista ]  |
|---------------------------------------------------------------|
| cards / estatisticas: total | agendadas | aguardando | fim    |
|---------------------------------------------------------------|
| filtro de status                                              |
|---------------------------------------------------------------|
| tabela: candidato | vaga | entrevistadores | status | data    |
|         criado em | abrir                                     |
+---------------------------------------------------------------+
```

#### Estados e acoes
- `loading`: mostra `Carregando...`
- `empty`: nenhuma entrevista encontrada
- `lista`: tabela com status, data confirmada e link de detalhe

### `/rh/candidates`
#### Fluxo
```text
/rh/candidates
  load
    - GET /rh/candidates
  interacoes
    - buscar por nome ou cidade
    - abrir modal de criar
    - abrir modal de editar
    - excluir com confirmacao
```

#### Wireframe
```text
+--------------------------------------------------------------+
| Candidatos                               [ Novo Candidato ]  |
|--------------------------------------------------------------|
| busca por nome / cidade                                      |
|--------------------------------------------------------------|
| tabela: nome | senioridade | cidade/estado | formacao | acoes|
|--------------------------------------------------------------|
| modal por cima para criar/editar candidato                   |
+--------------------------------------------------------------+
```

#### Estados e acoes
- `loading`: lista ainda nao carregada
- `empty`: nenhum candidato cadastrado
- `modal`: formulario com campos do candidato

### `/rh/jobs`
#### Fluxo
```text
/rh/jobs
  load
    - GET /rh/jobs
  interacoes
    - criar vaga
    - editar vaga
    - excluir vaga
```

#### Wireframe
```text
+--------------------------------------------------------------+
| Vagas                                     [ Nova Vaga ]      |
|--------------------------------------------------------------|
| tabela: titulo | nivel | stack | acoes                       |
|--------------------------------------------------------------|
| modal por cima para criar/editar vaga                        |
+--------------------------------------------------------------+
```

#### Estados e acoes
- `loading`: lista ainda nao carregada
- `empty`: nenhuma vaga cadastrada
- `modal`: formulario com titulo, nivel, descricao e stack tags

### `/rh/form-templates`
#### Fluxo
```text
/rh/form-templates
  load
    - GET /rh/form-templates
  interacoes
    - criar template
    - editar template
    - duplicar template
  detalhe importante
    - template locked mostra aviso de uso
```

#### Wireframe
```text
+--------------------------------------------------------------+
| Templates de Formulario                   [ Novo Template ]  |
|--------------------------------------------------------------|
| cards com nome, versao, perguntas e status de lock           |
|--------------------------------------------------------------|
| modal por cima para editor de perguntas dinamicas            |
+--------------------------------------------------------------+
```

#### Estados e acoes
- `loading`: templates ainda nao carregados
- `empty`: nenhum template cadastrado
- `modal`: editor com perguntas, tipo e opcional de alternativas

### `/rh/interviews/new`
#### Fluxo
```text
/rh/interviews/new
  preload
    - GET /rh/candidates
    - GET /rh/jobs
    - GET /rh/form-templates
  submit
    - POST /rh/interviews
      - erro -> permanece na tela com mensagem inline
      - sucesso -> redirect /rh/interviews/:id
  validacao
    - candidato e vaga sao obrigatorios
    - template e opcional
```

#### Wireframe
```text
+--------------------------------------------------+
| Nova Entrevista                                  |
|--------------------------------------------------|
| [ candidato ]                                    |
| [ vaga ]                                         |
| [ template opcional ]                            |
|                                                  |
| [ Cancelar ]           [ Criar Entrevista ]      |
+--------------------------------------------------+
```

#### Estados e acoes
- `loading`: carregando listas de selecao
- `form`: campos com candidato, vaga e template
- `error`: validacao ou falha de criacao

### `/rh/interviews/:id`
#### Fluxo
```text
/rh/interviews/:id
  load
    - GET /rh/interviews/:id
    - GET /rh/users
    - filtra usuarios com role TECH para atribuicao
  acoes RH
    - sugerir datas
    - aprovar slot
    - vincular entrevistadores TECH
    - marcar entrevista como realizada
    - encerrar com decisao APPROVED | REJECTED | HOLD
  acoes TECH
    - confirmar slot quando aplicavel
    - marcar realizada quando agendada
  historico
    - audit log com timeline da entrevista
```

#### Wireframe
```text
+--------------------------------------+----------------------------------+
| Coluna principal                     | Sidebar                         |
|--------------------------------------|---------------------------------|
| Candidato                            | Vaga                            |
| - dados pessoais                    | - titulo / nivel                |
| - resumo                            | - stack tags                    |
| - motivacao                         |                                 |
|                                      | Slot confirmado?                |
| Datas propostas                      |                                 |
| - lista de slots                     |                                 |
| - aprovar / confirmar               |                                 |
|                                      |---------------------------------|
| Entrevistadores / vinculos          | Historico / timeline            |
+--------------------------------------+----------------------------------+
```

#### Estados e acoes
- `loading`: detalhe ainda nao carregado
- `not found`: entrevista inexistente
- `detail`: dados do candidato, vaga, slots, vinculos e timeline
- `error`: mensagem inline de falha de operacao

### `/rh/tech/dashboard`
#### Fluxo
```text
/rh/tech/dashboard
  load
    - GET /rh/interviews
    - agrupa em aguardando confirmacao, agendadas e outras
  saida
    - abrir /rh/tech/interviews/:id
```

#### Wireframe
```text
+---------------------------------------------------------------+
| Minhas Entrevistas                                            |
|---------------------------------------------------------------|
| Aguardando sua confirmacao                                    |
| [ cards ]                                                     |
|---------------------------------------------------------------|
| Agendadas                                                     |
| [ cards ]                                                     |
|---------------------------------------------------------------|
| Outras                                                        |
| [ cards ]                                                     |
+---------------------------------------------------------------+
```

#### Estados e acoes
- `loading`: dashboard ainda nao carregado
- `empty`: nenhuma entrevista atribuida
- `cards`: cada card abre o detalhe tecnico

### `/rh/tech/interviews/:id`
#### Fluxo
```text
/rh/tech/interviews/:id
  load
    - GET /rh/interviews/:id
  acoes TECH
    - confirmar slot proposto
    - sugerir contrapropostas
    - marcar como realizada
    - submeter formulario de avaliacao
  formulario
    - renderiza perguntas do template dinamicamente
    - suporta YES_NO, TEXT, TEXTAREA, SINGLE_CHOICE e NUMBER
  finalizacao
    - se houver submissao, mostra estado de sucesso
```

#### Wireframe
```text
+-----------------------------------------------+----------------------+
| Candidato                                     | Vaga                 |
| - dados e resumo                              | - titulo / stack     |
|-----------------------------------------------|----------------------|
| Confirmar data / contra-propor                | Slot confirmado      |
| - slots propostos                             |                      |
| - datas alternativas                          |                      |
|-----------------------------------------------|----------------------|
| Formulario de avaliacao dinamico              |                      |
| [ perguntas renderizadas por tipo ]           |                      |
| [ Submeter Formulario ]                       |                      |
+-----------------------------------------------+----------------------+
```

#### Estados e acoes
- `loading`: detalhe ainda nao carregado
- `confirmacao`: slot proposto visivel com botao confirmar
- `contraproposta`: datas alternativas enviadas
- `form`: formulario dinamico disponivel
- `success`: formulario enviado com sucesso

## Estados globais
- `loading`: mostra skeleton simples ou `Carregando...`
- `empty`: indica ausencia de quizzes, candidatos, vagas, templates, entrevistas ou ranking
- `error`: exibe erro inline sem quebrar o fluxo
- `unauthorized`: limpa a sessao e redireciona para a tela de login correspondente
- `polling`: `waiting`, `quiz` e `admin-quiz` atualizam dados periodicamente
- `sync`: `ranking` usa Socket.IO para atualizar resultado em tempo real
- `heartbeat`: `waiting` envia presenca periodica e remove ao sair da pagina

## Observacoes finais
- `client/app/page.tsx` renderiza o hub administrativo sem redirect
- `client/app/admin/page.tsx` e `client/app/admin-guidance/page.tsx` sao rotas legadas de redirecionamento
- `client/app/admin/login/page.tsx` e `client/app/rh/login/page.tsx` foram removidas e retornam 404
- `client/app/login/page.tsx` serve login admin por padrao e login RH/TECH quando recebe `role=rh`
- `admin-quiz` e uma unica rota com varios estados internos, nao varias rotas
- O portal RH usa o mesmo shell para `RH` e `TECH`, mas a navegacao muda conforme o papel
