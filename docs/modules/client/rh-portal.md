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
- `client/components/rh/*.tsx`
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
- Token RH
- `RhLayout` para navegacao por papel
- login unificado em `/login?role=rh`
- API de recrutamento em `/rh/*`

## Regras de negocio
- O menu muda conforme o papel do usuario.
- RH ve painel, candidatos, vagas e templates.
- TECH ve apenas as telas de entrevista atribuida.
- O login redireciona para o painel correspondente ao papel do usuario.
- O logout e os guards retornam para `/login?role=rh` em vez de usar `/rh/login`.

## Fluxo resumido
1. O usuario RH/TECH autentica.
2. O layout carrega os links permitidos para o papel.
3. RH administra candidatos, vagas, templates e entrevistas.
4. TECH acompanha suas entrevistas e responde aos fluxos de slot e formulario.

## Possiveis erros
- Sessao ausente ou invalida
- Falha de autorizacao por papel
- Erros de carregamento de entrevistas, candidatos, vagas ou templates
