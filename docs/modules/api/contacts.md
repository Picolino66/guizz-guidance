# Contatos internos

## Descricao
Dominio administrativo para listar e complementar a agenda interna de contatos usada fora do quiz, RH e WhatsApp.

## Localizacao no codigo
- `api/src/contacts/contacts.module.ts`
- `api/src/contacts/contacts.controller.ts`
- `api/src/contacts/contacts.service.ts`
- `api/src/contacts/dto/create-contact.dto.ts`
- `api/prisma/schema.prisma`

## Entrada
- `GET /contacts?page=1&pageSize=10&search=...`
- `POST /contacts`
- `PATCH /contacts/:id`

## Saida
- Lista paginada de contatos salvos com `items`, `page`, `pageSize`, `total` e `totalPages`
- Persistencia de novos contatos ou complemento de contatos ja existentes
- Atualizacao inline de `name`, `company`, `email` e `phoneNumber`
- Base normalizada de busca persistida em `searchText`

## Dependencias
- `AdminAuthGuard`
- `PrismaService`
- Tabela `Contact`
- `api/prisma/seed.ts` para carga inicial dos e-mails baseados em `allowedEmails`

## Regras de negocio
- A rota usa a mesma sessao interna de Home, Quizz, RH e WhatsApp.
- O seed popula `Contact` com todos os e-mails presentes em `allowedEmails`.
- `GET /contacts` aceita busca textual e paginacao server-side.
- `POST /contacts` aceita `name`, `company`, `email` e `phoneNumber` como opcionais.
- `PATCH /contacts/:id` permite limpar ou alterar `name`, `company`, `email` e `phoneNumber` no proprio contato.
- `email`, quando enviado, e normalizado para lowercase.
- `phoneNumber`, quando enviado, e salvo no formato `55 + DDD + numero com 8 ou 9 digitos`.
- `searchText` e recalculado automaticamente a partir de nome, empresa, e-mail e telefone normalizado.
- Caracteres nao numericos como `(`, `)`, espaco, `-` e `+` sao descartados antes da validacao.
- Se `email` ou `phoneNumber` ja existir, o cadastro vira complemento do contato existente em vez de duplicacao.
- `PATCH /contacts/:id` rejeita quando o novo e-mail ou telefone ja pertence a outro contato.
- `POST /contacts` continua rejeitando quando `email` e `phoneNumber` apontarem para contatos diferentes.
- A busca textual usa `searchText`, permitindo encontrar registros sem diferenciar acentos, maiusculas e minusculas.

## Fluxo resumido
1. O usuario interno acessa a tela `/contacts`.
2. A tela lista a base atual gerada previamente pelo seed.
3. A tela permite salvar nome, empresa, e-mail e telefone.
4. A propria listagem permite editar os campos inline e navegar entre paginas.
5. Quando houver telefone, o valor pode ser usado diretamente em links `wa.me`.

## Possiveis erros
- `401 Unauthorized` ou `403 Forbidden`
- E-mail invalido
- Telefone sem DDD ou com quantidade de digitos fora da regra (aceito 8 ou 9 locais)
- Tentativa de mesclar e-mail e telefone de contatos diferentes
