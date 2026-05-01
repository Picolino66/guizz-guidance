import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_SEED_USERNAME ?? "admin";
  const email = process.env.ADMIN_SEED_EMAIL ?? "admin@guidance.dev";
  const password = process.env.ADMIN_SEED_PASSWORD ?? "Admin123!";
  const passwordHash = await bcrypt.hash(password, 10);

  const existingAdmin = await prisma.systemUser.findFirst({
    where: { OR: [{ username }, { email }] }
  });

  if (!existingAdmin) {
    await prisma.systemUser.create({
      data: { username, email, passwordHash, role: "ADMIN" }
    });
  }

  const allowedEmails = [
    "alexandre.jaenicke@guidance.dev",
    "amanda.noronha@guidance.dev",
    "ana.santos@guidance.dev",
    "ana.ferreira@guidance.dev",
    "arianne.viana@guidance.dev",
    "arthur.coutinho@guidance.dev",
    "arthur.vinicius@guidance.dev",
    "breno.moreira@guidance.dev",
    "caio.motta@guidance.dev",
    "carlos.rodrigues@guidance.dev",
    "cloves.rodrigues@guidance.dev",
    "dalila.portela@guidance.dev",
    "darlan.cardoso@guidance.dev",
    "enzo.pierazolli@guidance.dev",
    "erick.giarola@guidance.dev",
    "fabio.martins@guidance.dev",
    "felipe.waks@guidance.dev",
    "fernando.souza@guidance.dev",
    "flavio.peixoto@guidance.dev",
    "frederico.marques@guidance.dev",
    "gabriel.mendes@guidance.dev",
    "gabrielle.vasconcelos@guidance.dev",
    "geraldo@guidance.dev",
    "guilherme.ramos@guidance.dev",
    "iann.guerra@guidance.dev",
    "isaias.ribeiro@guidance.dev",
    "joao.aguiar@guidance.dev",
    "joao.vale@guidance.dev",
    "joao.victor@guidance.dev",
    "leonardo.rodrigues@guidance.dev",
    "marcelo@guidance.dev",
    "marcos.pinho@guidance.dev",
    "elias.gomes@guidance.dev",
    "matheus.gonzaga@guidance.dev",
    "matheus.barreto@guidance.dev",
    "mathews.mattar@guidance.dev",
    "murillo@guidance.dev",
    "paulo.vaz@guidance.dev",
    "paulo.lopes@guidance.dev",
    "pedro.bernardina@guidance.dev",
    "pedro.martins@guidance.dev",
    "pedro.melo@guidance.dev",
    "pedro.oliveira@guidance.dev",
    "pedro.toledo@guidance.dev",
    "rafael.braga@guidance.dev",
    "rafael.fajardo@guidance.dev",
    "raissa.drubscky@guidance.dev",
    "renata.fernandes@guidance.dev",
    "richard.souza@guidance.dev",
    "sara.pinheiro@guidance.dev",
    "thiago.ribeiro@guidance.dev",
    "tiago.cardoso@guidance.dev",
    "veronica.borges@guidance.dev",
    "victor.pereira@guidance.dev",
    "victor.hespanha@guidance.dev",
    "victor.ribeiro@guidance.dev",
    "victor.mattar@guidance.dev",
    "vinicius@guidance.dev",
    "vitor.soier@guidance.dev",
    "waber.junior@guidance.dev",
    "ana.correa@guidance.dev",
    "antonio.queiroz@guidance.dev",
    "arthur.caldas@guidance.dev",
    "eric.salignac@guidance.dev",
    "francisco.silva@guidance.dev",
    "israel.guerra@guidance.dev",
    "joao.oldenburg@guidance.dev",
    "julia.pimentel@guidance.dev",
    "lailson.gabriel@guidance.dev",
    "luan.pieri@guidance.dev",
    "marcelo.aguiar@guidance.dev",
    "matheus.francelino@guidance.dev",
    "mohamad.nasser@guidance.dev",
    "pedro.santos@guidance.dev",
    "peterson.bozza@guidance.dev",
    "rafael.bortolucci@guidance.dev",
    "rafael.lima@guidance.dev",
    "raul.ferreira@guidance.dev",
    "richart.gertz@guidance.dev",
    "saulo.mendes@guidance.dev",
    "willian.brandao@guidance.dev"
  ]

  await prisma.allowedEmail.createMany({
    data: allowedEmails.map((email) => ({ email })),
    skipDuplicates: true
  })
/*
  const seedQuizId = "44166625-8fd9-4f3b-a44b-9c2e5392c4b3";
  const existingQuiz = await prisma.quiz.findUnique({
    where: { id: seedQuizId }
  });

  const quiz =
    existingQuiz ??
    (await prisma.quiz.create({
      data: {
        id: seedQuizId,
        title: "Teste 1",
        startTime: new Date(Date.now() + 60 * 60 * 1000),
        durationSeconds: 900,
        status: QuizStatus.SCHEDULED
      }
    }));

  const existingQuestions = await prisma.question.count({
    where: { quizId: quiz.id }
  });

  if (existingQuestions === 0) {
    const question = await prisma.question.create({
      data: {
        quizId: quiz.id,
        title: "Quem mexe com dinheiro?",
        order: 1
      }
    });

    await prisma.alternative.createMany({
      data: [
        {
          questionId: question.id,
          text: "Guidance",
          isCorrect: false,
          order: 1
        },
        {
          questionId: question.id,
          text: "Marketing",
          isCorrect: false,
          order: 2
        },
        {
          questionId: question.id,
          text: "Financeiro",
          isCorrect: true,
          order: 3
        }
      ]
    });


    const question2 = await prisma.question.create({
      data: {
        quizId: quiz.id,
        title: "Quem mexe sou eu?",
        order: 2
      }
    });

    await prisma.alternative.createMany({
      data: [
        {
          questionId: question2.id,
          text: "Eu",
          isCorrect: true,
          order: 1
        },
        {
          questionId: question2.id,
          text: "Você",
          isCorrect: false,
          order: 2
        },
        {
          questionId: question2.id,
          text: "Não sei",
          isCorrect: false,
          order: 3
        }
      ]
    });
  
  }
    */
}

async function seedRh() {
  const userPassword = await bcrypt.hash("User123!", 10);

  await prisma.systemUser.upsert({
    where: { email: "rh@guidance.dev" },
    update: { role: "USER" },
    create: { name: "RH Guidance", email: "rh@guidance.dev", role: "USER", passwordHash: userPassword }
  });
  await prisma.systemUser.upsert({
    where: { email: "tech1@guidance.dev" },
    update: { role: "USER" },
    create: { name: "Entrevistador 1", email: "tech1@guidance.dev", role: "USER", passwordHash: userPassword }
  });
}

async function seedWhatsapp() {
  await prisma.whatsappConnection.upsert({
    where: { key: "primary" },
    update: {
      label: "Canal WhatsApp Guidance"
    },
    create: {
      key: "primary",
      label: "Canal WhatsApp Guidance"
    }
  })
}

main()
  .then(async () => {
    await seedRh();
    await seedWhatsapp();
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
