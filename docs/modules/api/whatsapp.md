# WhatsApp automation

## Descricao
Dominio administrativo para conectar uma sessao WhatsApp, cadastrar automacoes, executar disparos e consultar logs.

## Localizacao no codigo
- `api/src/whatsapp/whatsapp.controller.ts`
- `api/src/whatsapp/whatsapp.service.ts`
- `api/src/whatsapp/whatsapp.adapter.ts`
- `api/src/whatsapp/dto/*.dto.ts`

## Entrada
- `GET /whatsapp/overview`
- `GET /whatsapp/status`
- `PATCH /whatsapp/connection`
- `POST /whatsapp/connect`
- `POST /whatsapp/disconnect`
- `GET /whatsapp/automations`
- `POST /whatsapp/automations`
- `PATCH /whatsapp/automations/:id`
- `PATCH /whatsapp/automations/:id/toggle`
- `POST /whatsapp/automations/:id/run-now`
- `DELETE /whatsapp/automations/:id`
- `GET /whatsapp/logs`
- `POST /whatsapp/test-message`
- `GET /whatsapp/groups`
- WebSocket `/whatsapp` com evento `whatsapp_session_updated`

## Saida
- Status operacional da conexão
- Lista, criacao, atualizacao e exclusao de automacoes
- Logs de execucao e falha
- Disparo manual de teste

## Dependencias
- `AdminAuthGuard`
- `PrismaService`
- `@nestjs/schedule`
- `baileys` para pareamento, restauracao de sessao e envio
- `socket.io` para publicar atualizacoes de QR/status em tempo real

## Regras de negocio
- A entrada e protegida pela sessao admin existente.
- O backend mantem uma conexao principal e multiplas automacoes.
- O scheduler processa apenas automacoes ativas, com `nextRunAt` vencido e sessao realmente `READY`.
- Uma automacao pode ser one-shot, lembrete, diaria, semanal, mensal ou aniversario.
- Logs duplicados sao evitados por chave unica de disparo.
- JIDs de grupo devem usar o formato `120363000000000000@g.us`.
- A sessao do WhatsApp fica persistida em `WhatsappConnection.session` para sobreviver a restart.
- Quedas temporarias entram em `CONNECTING` e disparam tentativa controlada de reconexao.

## Fluxo resumido
1. O admin abre o portal e carrega o status da conexao.
2. Quando necessario, inicia o pareamento e registra QR/estado.
3. Cadastra automacoes e monitora os proximos disparos.
4. O scheduler executa envios e grava logs de sucesso ou falha.

## Possiveis erros
- `401 Unauthorized` ou `403 Forbidden`
- Falha de pareamento ou ausencia do adaptador de WhatsApp
- Validacao de payloads de automacao, conexao e teste
