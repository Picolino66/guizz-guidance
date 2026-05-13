# Portal WhatsApp

## Descricao
Area administrativa para operar a conexao WhatsApp, automacoes, logs e status da sessao.

## Localizacao no codigo
- `client/app/whatsapp/page.tsx`
- `client/app/whatsapp/layout.tsx`
- `client/app/whatsapp/automations/page.tsx`
- `client/app/whatsapp/logs/page.tsx`
- `client/app/whatsapp/connection/page.tsx`
- `client/components/whatsapp/*.tsx`
- `client/components/layout/app-shell.tsx`
- `client/lib/internal-session.ts`
- `client/lib/whatsapp-api.ts`

## Entrada
- Dashboard `/whatsapp`
- Automações `/whatsapp/automations`
- Logs `/whatsapp/logs`
- Conexão `/whatsapp/connection`

## Saida
- Dashboard com status da sessão e indicadores operacionais
- Tela de conexao focada em status, QR e acoes de pareamento
- Cadastro e manutencao de automacoes
- Lista de logs de execucao
- Formulario de automacao com destino obrigatorio, texto, foto opcional e mencoes por telefone/JID

## Dependencias
- Token admin salvo em storage local
- API de WhatsApp em `/whatsapp/*`
- Validacao de sessao interna em `GET /auth/session`
- Socket.IO no namespace `/whatsapp` para status e QR em tempo real
- `WhatsappLayout` renderiza o `AppShell` compartilhado com navegacao lateral e logout administrativo
- `qrcode` para renderizar o token de pareamento como QR escaneavel

## Regras de negocio
- O portal usa a mesma sessao admin do hub inicial.
- O layout WhatsApp redireciona para `/login` quando a sessao interna esta ausente, expirada ou invalida.
- A navegacao fica no grupo `WhatsApp` do sidebar compartilhado.
- O dashboard mostra o estado da conexao e cards de operacao.
- A pagina de conexao nao edita mais grupo padrao; ela apenas opera a sessao WhatsApp.
- A area de automacoes permite criar, pausar, disparar e excluir regras.
- Cada automacao exige um destino explicito, com selecao entre grupo e contato.
- A busca de grupos usa um catalogo persistido no banco e carrega autocomplete automaticamente conforme o usuario digita.
- A busca de contatos usa a agenda interna salva em `Contact`, carregando autocomplete automaticamente conforme o usuario digita.
- Quando o destino da automacao e `Contato`, o placeholder `[nome]` no corpo da mensagem e substituido pelo nome salvo na agenda para o contato selecionado.
- A tela de automacoes manteve sincronizacao manual apenas para grupos, para atualizar o catalogo persistido vindo do WhatsApp Web.
- O cadastro de automacao converte foto JPEG/PNG/WebP para Base64 no browser, mostra preview e envia `imageBase64`, `imageMimeType` e `imageFileName`.
- Menções no formulario de automacao sao escritas diretamente no corpo da mensagem; ao digitar `@`, a tela busca contatos da agenda interna e insere `@<telefone salvo no contato>`.
- As menções continuam restritas a automacoes com destino em grupo e a API recebe o numero salvo no contato para montar o JID de menção.
- A automacao de aniversario recebe dia e mes na UI (`DD-MM`) e o client converte para o formato interno esperado pela API.
- A lista de automacoes mostra apenas regras com disparo futuro (`nextRunAt`) ou regras periodicas.
- A lista de automacoes mostra um resumo discreto quando a regra tem foto ou mencoes.
- A pagina de logs filtra eventos por status e quantidade.
- A pagina de conexao ouve `whatsapp_session_updated` e mantem polling enquanto a sessao esta conectando ou aguardando QR.
- Disparos manuais ficam bloqueados ate a sessao estar `READY`.

## Fluxo resumido
1. O admin entra em `/whatsapp` pelo hub.
2. Confere o estado da sessao e pareia o WhatsApp quando necessario.
3. Cria automacoes escolhendo grupo persistido ou contato da agenda como destino e acompanha o proximo disparo.
4. Usa logs para auditar envios e falhas.

## Possiveis erros
- Sessao admin ausente, expirada ou invalida
- Falha ao carregar status, automacoes ou logs
- QR indisponivel quando a sessao ainda nao foi pareada
- Nenhum destino selecionado ao criar a automacao
