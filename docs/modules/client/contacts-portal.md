# Portal de contatos

## Descricao
Area interna para consultar contatos salvos, completar cadastros importados do quiz e salvar telefones prontos para uso no WhatsApp.

## Localizacao no codigo
- `client/app/contacts/page.tsx`
- `client/components/contacts/contacts-page-client.tsx`
- `client/components/layout/app-shell.tsx`
- `client/lib/contacts-api.ts`
- `client/lib/internal-session.ts`
- `client/app/globals.css`

## Entrada
- `/contacts`

## Saida
- Lista pesquisavel e paginada de contatos salvos
- Formulario unico para salvar ou complementar nome, e-mail e telefone
- Edicao inline de nome, e-mail e telefone na propria listagem
- Link direto para abrir `wa.me` quando o telefone estiver disponivel

## Dependencias
- Token interno salvo em `localStorage`
- API `/contacts`
- Validacao de sessao interna em `GET /auth/session`
- `AppShell` compartilhado com Home, Quizz, RH e WhatsApp

## Regras de negocio
- A tela usa o mesmo shell lateral das demais areas internas.
- Ao carregar, a pagina busca a lista de contatos previamente populada pelo seed com base em `allowedEmails`.
- A busca e a paginacao sao resolvidas pela API.
- O formulario aceita todos os campos vazios, porque o backend trata os campos como opcionais.
- Se o e-mail ou telefone ja existir, o salvamento complementa o contato existente.
- Cada linha da listagem pode entrar em modo de edicao inline para alterar os tres campos sem sair da pagina.
- O telefone exibido na lista ja fica no formato esperado pelo WhatsApp, permitindo abrir `https://wa.me/<numero>`.
- O backend remove caracteres nao numericos do telefone antes de normalizar o valor final.
- A busca filtra por nome, e-mail ou telefone.

## Fluxo resumido
1. O usuario interno entra em `/contacts`.
2. A pagina lista os contatos gerados pelo seed e permite busca textual.
3. O usuario pode editar qualquer contato diretamente na linha correspondente.
4. O formulario lateral salva um novo contato ou completa um contato importado.
5. Quando houver telefone, o usuario pode abrir a conversa direto no WhatsApp.

## Possiveis erros
- Sessao interna ausente ou expirada
- Falha ao carregar a lista
- E-mail invalido
- Telefone fora do padrao esperado
