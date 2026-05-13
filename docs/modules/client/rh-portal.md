# Portal RH

## Descricao
Area de recrutamento para usuarios RH e TECH com navegacao condicional por perfil.

## Localizacao no codigo
- `client/app/login/page.tsx`
- `client/app/rh/dashboard/page.tsx`
- `client/app/rh/candidates/page.tsx`
- `client/app/rh/jobs/page.tsx`
- `client/app/rh/form-templates/page.tsx`
- `client/app/rh/interviews/new/page.tsx`
- `client/app/rh/interviews/[id]/page.tsx`
- `client/app/rh/tech/dashboard/page.tsx`
- `client/app/rh/tech/interviews/[id]/page.tsx`
- `client/components/rh/rh-layout.tsx`
- `client/components/layout/app-shell.tsx`
- `client/components/rh/*.tsx`
- `client/lib/internal-session.ts`
- `client/lib/rh-api.ts`
- `client/lib/rh-session.ts`

## Entrada
- Login RH/TECH `/login?role=rh`
- RH dashboard `/rh/dashboard`
- Candidatos `/rh/candidates`
- Vagas `/rh/jobs`
- Templates `/rh/form-templates`
- Nova entrevista `/rh/interviews/new`
- Detalhe de entrevista `/rh/interviews/:id`
- Dashboard tech `/rh/tech/dashboard`
- Detalhe tech `/rh/tech/interviews/:id`

## Saida
- Sessao RH ou TECH salva no storage local
- Listagens e formularios do recrutamento
- Fluxo de entrevista com criacao, atribuicao, confirmacao e conclusao

## Dependencias
- Token interno unificado salvo como token admin
- `RhLayout` renderiza o `AppShell` compartilhado
- login unificado em `/login?role=rh`
- API de recrutamento em `/rh/*`
- Validacao de sessao interna em `GET /auth/session`

## Regras de negocio
- O menu muda conforme o papel do usuario.
- A navegacao fica no grupo `RH Recruiter` do sidebar compartilhado.
- RH ve painel, candidatos, vagas e templates.
- TECH ve apenas as telas de entrevista atribuida.
- O login redireciona para o painel correspondente ao papel do usuario.
- O layout RH redireciona para `/login` quando a sessao interna esta ausente, expirada ou invalida.

## Fluxo resumido
1. O usuario RH/TECH autentica.
2. O layout carrega os links permitidos para o papel.
3. RH administra candidatos, vagas, templates e entrevistas.
4. TECH acompanha suas entrevistas e responde aos fluxos de slot e formulario.

## Possiveis erros
- Sessao ausente, expirada ou invalida
- Falha de autorizacao por papel
- Erros de carregamento de entrevistas, candidatos, vagas ou templates
