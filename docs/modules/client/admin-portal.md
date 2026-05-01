# Portal admin

## Descricao
Area administrativa para operar quizzes, whitelist, dashboard da rodada e a entrada para o portal WhatsApp.

## Localizacao no codigo
- `client/app/page.tsx`
- `client/app/login/page.tsx`
- `client/app/hub/page.tsx`
- `client/app/admin-quiz/page.tsx`
- `client/app/admin/page.tsx`
- `client/components/admin-login-page-client.tsx`
- `client/components/admin-dashboard-page-client.tsx`
- `client/components/layout/app-shell.tsx`
- `client/components/rh/hub-page-client.tsx`
- `client/components/whatsapp/whatsapp-layout.tsx`
- `client/app/admin-guidance/page.tsx`
- `client/lib/session.ts`
- `client/lib/rh-session.ts`

## Entrada
- Login admin `/login`
- Login RH/TECH `/login?role=rh`
- Hub `/`
- Hub legado `/hub`
- Dashboard `/admin-quiz`
- Portal WhatsApp `/whatsapp`
- Legados `/admin`, `/admin-guidance`
- 404 `/admin/login`

## Saida
- Token admin salvo em storage local
- Lista e criacao de quizzes
- Painel com participantes, ranking e respostas
- Gestao de emails liberados

## Dependencias
- `NEXT_PUBLIC_API_BASE_URL`
- Token do admin
- API de admin em `/auth` e `/admin`

## Regras de negocio
- O login redireciona para `/` quando o token admin ja existe.
- O login RH/TECH usa a mesma tela `/login` com `role=rh`.
- O hub e a entrada administrativa renderiza o shell compartilhado com conteudo central vazio.
- O acesso aos modulos ocorre pelo sidebar compartilhado.
- O dashboard canônico e `/admin-quiz`; `/admin` e redirecionamento legado.
- O grupo `Quizz` do sidebar controla as views internas do dashboard administrativo.
- A dashboard seleciona automaticamente o quiz com maior prioridade operacional.
- O formulario de criacao de quiz exige inicio, duracao e titulo.

## Fluxo resumido
1. O admin autentica em `/login`.
2. Entra no shell em `/` ou `/hub`.
3. Usa o sidebar para abrir Quiz, RH ou WhatsApp.
4. Pode abrir o portal WhatsApp em `/whatsapp` para gerenciar automacoes, logs e conexao.
5. Abre o dashboard em `/admin-quiz` para acompanhar a rodada.
5. Pode criar quiz, adicionar perguntas e gerenciar emails liberados.
6. Pode forcar inicio, encerrar quiz e revisar respostas.

## Possiveis erros
- Credenciais invalidas
- Token ausente ou expirado
- Validacao de formularios de quiz, pergunta ou whitelist
