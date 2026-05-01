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
- `client/lib/whatsapp-api.ts`

## Entrada
- Dashboard `/whatsapp`
- Automações `/whatsapp/automations`
- Logs `/whatsapp/logs`
- Conexão `/whatsapp/connection`

## Saida
- Dashboard com status da sessão e indicadores operacionais
- Formulario de configuracao do canal principal
- Cadastro e manutencao de automacoes
- Lista de logs de execucao

## Dependencias
- Token admin salvo em storage local
- API de WhatsApp em `/whatsapp/*`
- Socket.IO no namespace `/whatsapp` para status e QR em tempo real
- Layout com navegacao lateral e logout administrativo
- `qrcode` para renderizar o token de pareamento como QR escaneavel

## Regras de negocio
- O portal usa a mesma sessao admin do hub inicial.
- O dashboard mostra o estado da conexao e cards de operacao.
- A area de automacoes permite criar, pausar, disparar e excluir regras.
- A pagina de logs filtra eventos por status e quantidade.
- A pagina de conexao ouve `whatsapp_session_updated` e mantem polling enquanto a sessao esta conectando ou aguardando QR.
- Disparos manuais ficam bloqueados ate a sessao estar `READY`.

## Fluxo resumido
1. O admin entra em `/whatsapp` pelo hub.
2. Ajusta a conexao e confere o estado da sessao.
3. Cria automacoes e acompanha o proximo disparo.
4. Usa logs para auditar envios e falhas.

## Possiveis erros
- Sessao admin ausente ou expirada
- Falha ao carregar status, automacoes ou logs
- QR indisponivel quando a sessao ainda nao foi pareada
- JID do grupo fora do formato esperado
