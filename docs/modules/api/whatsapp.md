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
- `GET /whatsapp/logs?page=...&limit=...`
- `POST /whatsapp/test-message`
- `GET /whatsapp/groups?search=...`
- `GET /whatsapp/contacts?search=...`
- `POST /whatsapp/sync`
- `GET /whatsapp/participants?groupJid=...`
- WebSocket `/whatsapp` com evento `whatsapp_session_updated`

## Saida
- Status operacional da conexão
- Lista, criacao, atualizacao e exclusao de automacoes
- Logs de execucao e falha
- Logs paginados de execucao e falha, com nome resolvido do destino e titulo da automacao quando houver
- Disparo manual de teste
- Mensagens WhatsApp com texto, foto opcional e mencoes manuais
- Destino explicito por automacao com `targetType` (`GROUP` ou `CONTACT`), `targetJid` e suporte a `targetJids` para contato multiplo
- Catalogo persistido de grupos para autocomplete de destino
- Contatos da agenda interna elegiveis para WhatsApp, usados em destino e mencoes
- Sincronizacao manual da sessao com o WhatsApp Web para atualizar e persistir o catalogo de grupos
- Participantes do grupo selecionado seguem disponiveis por compatibilidade, fora do fluxo principal de automacoes

## Dependencias
- `AdminAuthGuard`
- `PrismaService`
- `@nestjs/schedule`
- `baileys` para pareamento, restauracao de sessao e envio
- `socket.io` para publicar atualizacoes de QR/status em tempo real
- Tabela `WhatsappGroup` para catalogo persistido de grupos
- Tabela `Contact` como agenda interna usada por contatos e mencoes

## Regras de negocio
- A entrada e protegida pela sessao admin existente.
- O backend mantem uma conexao principal e multiplas automacoes.
- O scheduler processa apenas automacoes ativas, com `nextRunAt` vencido e sessao realmente `READY`.
- Uma automacao pode ser one-shot, lembrete, diaria, semanal, mensal ou aniversario.
- Cada automacao precisa de um destino explicito: um grupo ou um ou mais contatos.
- Automacoes e `POST /whatsapp/test-message` aceitam `imageBase64`, `imageMimeType`, `imageFileName` e `mentionNumbers`.
- `imageBase64` pode ser Base64 puro ou `data:image/...;base64,...`; apenas JPEG, PNG e WebP sao aceitos, com limite de 5 MB depois da decodificacao.
- O bootstrap da API aceita JSON/urlencoded ate 8 MB para comportar o overhead de Base64; a regra de negocio continua limitada a 5 MB decodificados.
- Menções podem vir de `mentionNumbers` ou de marcacoes `@numero` dentro de `message`; o backend normaliza para `${digits}@s.whatsapp.net` e remove duplicados.
- `GET /whatsapp/groups` le o catalogo persistido no banco, aceita `search` opcional e nao depende de sessao `READY`.
- `GET /whatsapp/contacts` le a agenda interna `Contact`, aceita `search` opcional e retorna apenas registros com telefone, convertendo o numero salvo para `jid = ${phoneNumber}@s.whatsapp.net`.
- `GET /whatsapp/logs` aceita `page` e `limit`, pagina por `createdAt desc` e devolve `items` com `targetName` e `automationTitle`, alem do bloco `pagination`.
- Durante o disparo de automacoes com destino `CONTACT`, o backend usa `targetJids` para fazer fan-out e enviar uma mensagem separada para cada contato.
- Durante o disparo de automacoes com destino `CONTACT`, o placeholder `[nome]` no campo `message` e substituido pelo nome salvo do contato correspondente a cada destinatario.
- `POST /whatsapp/sync` exige sessao `READY`, força um `resyncAppState` da sessao e faz upsert dos grupos no banco.
- Grupos que sumirem em sincronizacoes futuras permanecem salvos, mas ficam com `isAvailable = false` e saem do autocomplete.
- A busca de grupos e contatos usa campos persistidos `searchText`, sem diferenciar acentos, maiusculas e minusculas.
- `GET /whatsapp/participants` exige sessao `READY` e `groupJid` explicito na query; retorna JID, nome, telefone e texto de mencao.
- O nome retornado em participantes prioriza o contato salvo no WhatsApp sincronizado pela sessao Baileys; se indisponivel, usa nome publico/verificado ou telefone.
- Quando houver mencoes, o backend anexa `@numero` ao texto/caption se a marcacao ainda nao estiver na mensagem.
- Fotos ficam persistidas somente em `WhatsappAutomation`; `WhatsappDispatchLog.metadata` registra apenas se houve foto, MIME, nome do arquivo e JIDs mencionados.
- Logs duplicados sao evitados por chave unica de disparo.
- JIDs de grupo devem usar o formato `120363000000000000@g.us`.
- JIDs de contato devem usar o formato `5511999999999@s.whatsapp.net` ou `contato@lid`.
- Automações legadas sem destino explicito sao arquivadas na migracao que remove o grupo padrao da conexao.
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
