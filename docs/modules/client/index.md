# Client

## Descricao
Frontend Next.js App Router responsavel pelas telas publicas do quiz e pelas areas internas com shell administrativo compartilhado.

## Estrutura
- Rotas em `client/app`
- Componentes de pagina em `client/components`
- Shell interno compartilhado em `client/components/layout/app-shell.tsx`
- Componentes base de UI em `client/components/ui`
- Chamadas HTTP e estado de sessao em `client/lib`
- Estilos globais em `client/app/globals.css`

## Dependencias
- `Next.js 15`
- `React 19`
- `socket.io-client`
- `Tailwind CSS 4`

## Mapa de features
- [Fluxo publico do quiz](./public-quiz.md)
- [Portal admin](./admin-portal.md)
- [Portal de contatos](./contacts-portal.md)
- [Portal RH](./rh-portal.md)
- [Portal WhatsApp](./whatsapp-portal.md)

## Layout interno
- Home, Contato, Quizz/Admin Quiz, RH Recruiter e WhatsApp compartilham o mesmo sidebar.
- O sidebar usa grupos expansíveis por modulo.
- Os grupos `RH Recruiter` e `Quizz` estao visiveis no sidebar, mas temporariamente desativados para clique/expansao.
- A Home (`/` e `/hub`) mantém o shell interno e exibe a mensagem `Estamos em construção` no conteúdo central.
- Login, espera, quiz público e ranking continuam fora do shell interno.
- Home, Contato, Admin Quiz, RH e WhatsApp validam a sessao interna em `/auth/session` antes de renderizar.
- `middleware.ts` nao e usado para essa protecao porque o token interno fica em `localStorage`, inacessivel no middleware server-side do Next.js.

## Design system
- Botões devem usar `client/components/ui/button.tsx` em novas telas e fluxos refatorados.
- As variantes padrao sao `primary`, `secondary`, `ghost` e `danger`, com tamanhos `sm`, `md` e `lg`.
- Classes legadas de botao (`admin-button`, `rh-btn`, `whatsapp-button`, `login-submit`, `quiz-nav-button`, `quiz-submit-button`, `primary-button`, `secondary-button`, `ghost-button`) compartilham os mesmos estados globais de hover, active, focus e disabled.
- A cor amarela (`--color-primary`) fica reservada para acao principal ou decisao, conforme `referencia/index.md`.
- Textos de telas internas devem usar `--color-text`, `--color-text-muted` e variantes semanticas (`--color-text-success`, `--color-text-warning`, `--color-text-danger`, `--color-text-info`), evitando paletas locais por modulo.
