# API

## Descricao
Backend NestJS responsavel por autenticacao, operacao do quiz, ranking em tempo real, dominio de RH/recrutamento e automacao de WhatsApp.

## Estrutura
- `auth`: login de participante, login admin e troca de senha
- `admin`: operacao administrativa do quiz
- `participant`: ciclo de vida do participante durante a rodada
- `quiz`: leitura do quiz ativo e das perguntas
- `ranking`: leitura do placar final
- `realtime`: eventos WebSocket do quiz
- `rh`: modulo de recrutamento com subdominios proprios

## Dependencias
- `Prisma` para persistencia
- `Redis` para cache de perguntas do quiz
- `Jwt` e guards para autenticacao
- `@nestjs/schedule` para sincronizacao automatica de status
- `socket.io` para eventos em tempo real
- `@nestjs/schedule` para sincronizacao automatica de status e disparos

## Mapa de features
- [Autenticacao](./auth.md)
- [Admin do quiz](./admin.md)
- [Participante](./participant.md)
- [Quiz](./quiz.md)
- [Ranking](./ranking.md)
- [Realtime](./realtime.md)
- [RH auth](./rh-auth.md)
- [RH users](./rh-users.md)
- [RH candidates](./rh-candidates.md)
- [RH jobs](./rh-jobs.md)
- [RH interviews](./rh-interviews.md)
- [RH form templates](./rh-form-templates.md)
- [RH form submissions](./rh-form-submissions.md)
- [WhatsApp automation](./whatsapp.md)
