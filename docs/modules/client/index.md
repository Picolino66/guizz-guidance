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
- [Portal RH](./rh-portal.md)
- [Portal WhatsApp](./whatsapp-portal.md)

## Layout interno
- Home, Quizz/Admin Quiz, RH Recruiter e WhatsApp compartilham o mesmo sidebar.
- O sidebar usa grupos expansíveis por modulo.
- A Home (`/` e `/hub`) mantém apenas o shell e não exibe conteúdo central por enquanto.
- Login, espera, quiz público e ranking continuam fora do shell interno.
