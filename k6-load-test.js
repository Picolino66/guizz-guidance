import http from "k6/http"
import { check, sleep } from "k6"

// ─── Configuração ────────────────────────────────────────────────────────────

const QUIZ_ID = "01e919e8-c688-49c4-971c-4184eb516ce2"
const API_BASE = "http://0.0.0.0:4000"
const CLIENT_BASE = "http://0.0.0.0:3000"

// Intervalo de polling na sala de espera (segundos)
const POLLING_INTERVAL_S = 5

// Pausa entre respostas de perguntas (segundos) — simula tempo de leitura
const ANSWER_DELAY_S = 2

// ─── Emails dos participantes ─────────────────────────────────────────────────

const EMAILS = [
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
  "willian.brandao@guidance.dev",
]

// ─── Opções do K6 ─────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    quiz_participants: {
      executor: "shared-iterations",
      vus: EMAILS.length,
      iterations: EMAILS.length,
      maxDuration: "30m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<3000"],
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonHeaders(token) {
  const h = { "Content-Type": "application/json" }
  if (token) h["Authorization"] = `Bearer ${token}`
  return h
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Cenário principal ────────────────────────────────────────────────────────

export default function () {
  // Cada VU pega seu email pelo índice (__VU começa em 1)
  const email = EMAILS[__VU - 1]
  if (!email) {
    console.error(`VU ${__VU}: sem email disponível, abortando.`)
    return
  }

  console.log(`[${email}] Iniciando...`)

  // ── 1. Acessar página inicial (warmup) ──────────────────────────────────────
  const homeRes = http.get(CLIENT_BASE)
  check(homeRes, { "home: status 200": (r) => r.status === 200 })

  // ── 2. Login na API ──────────────────────────────────────────────────────────
  const loginRes = http.post(
    `${API_BASE}/auth/login-participant`,
    JSON.stringify({ email }),
    { headers: jsonHeaders() }
  )

  const loginOk = check(loginRes, {
    "login: status 201": (r) => r.status === 201,
    "login: tem accessToken": (r) => {
      try { return !!JSON.parse(r.body).accessToken } catch { return false }
    },
  })

  if (!loginOk) {
    console.error(`[${email}] Falha no login: ${loginRes.status} — ${loginRes.body}`)
    return
  }

  const token = JSON.parse(loginRes.body).accessToken
  console.log(`[${email}] Login OK. Entrando na sala de espera...`)

  // ── 3. Sala de espera — polling até o quiz iniciar ───────────────────────────
  let quizRunning = false

  while (!quizRunning) {
    // Heartbeat de presença
    http.post(
      `${API_BASE}/participant/waiting-presence/${QUIZ_ID}`,
      null,
      { headers: jsonHeaders(token) }
    )

    // Verificar estado do quiz
    const stateRes = http.get(
      `${API_BASE}/participant/quiz-state/${QUIZ_ID}`,
      { headers: jsonHeaders(token) }
    )

    if (stateRes.status === 200) {
      try {
        const state = JSON.parse(stateRes.body)
        if (state.quiz && state.quiz.status === "RUNNING") {
          quizRunning = true
          console.log(`[${email}] Quiz iniciado! Entrando...`)
        }
      } catch (e) {
        console.warn(`[${email}] Erro ao parsear estado: ${e}`)
      }
    }

    if (!quizRunning) {
      sleep(POLLING_INTERVAL_S)
    }
  }

  // ── 4. Iniciar participação ──────────────────────────────────────────────────
  const startRes = http.post(
    `${API_BASE}/participant/start`,
    JSON.stringify({ quizId: QUIZ_ID }),
    { headers: jsonHeaders(token) }
  )

  const startOk = check(startRes, {
    "start: status 201": (r) => r.status === 201,
  })

  if (!startOk) {
    console.error(`[${email}] Falha ao iniciar: ${startRes.status} — ${startRes.body}`)
    return
  }

  // ── 5. Buscar perguntas ──────────────────────────────────────────────────────
  const questionsRes = http.get(
    `${API_BASE}/quiz/${QUIZ_ID}/questions`,
    { headers: jsonHeaders(token) }
  )

  const questionsOk = check(questionsRes, {
    "questions: status 200": (r) => r.status === 200,
  })

  if (!questionsOk) {
    console.error(`[${email}] Falha ao buscar perguntas: ${questionsRes.status}`)
    return
  }

  let questions = []
  try {
    const quizData = JSON.parse(questionsRes.body)
    questions = quizData.questions || []
  } catch (e) {
    console.error(`[${email}] Erro ao parsear perguntas: ${e}`)
    return
  }

  if (questions.length === 0) {
    console.warn(`[${email}] Nenhuma pergunta retornada.`)
    return
  }

  console.log(`[${email}] ${questions.length} perguntas recebidas. Respondendo...`)

  // ── 6. Responder cada pergunta ───────────────────────────────────────────────
  for (const question of questions) {
    const alternatives = question.alternatives || []

    if (alternatives.length === 0) {
      console.warn(`[${email}] Pergunta sem alternativas: ${question.id}`)
      continue
    }

    const chosen = randomItem(alternatives)

    const answerRes = http.post(
      `${API_BASE}/participant/answer`,
      JSON.stringify({
        questionId: question.id,
        alternativeId: chosen.id,
      }),
      { headers: jsonHeaders(token) }
    )

    check(answerRes, {
      "answer: status 201": (r) => r.status === 201,
    })

    if (answerRes.status !== 201) {
      console.warn(
        `[${email}] Resposta rejeitada (${answerRes.status}) — pergunta ${question.id}: ${answerRes.body}`
      )
    }

    sleep(ANSWER_DELAY_S)
  }

  // ── 7. Finalizar quiz ────────────────────────────────────────────────────────
  const finishRes = http.post(
    `${API_BASE}/participant/finish`,
    JSON.stringify({ quizId: QUIZ_ID }),
    { headers: jsonHeaders(token) }
  )

  check(finishRes, {
    "finish: status 201": (r) => r.status === 201,
  })

  if (finishRes.status === 201) {
    try {
      const result = JSON.parse(finishRes.body)
      console.log(
        `[${email}] Finalizado! Score: ${result.score}, Tempo: ${result.totalTimeSeconds}s`
      )
    } catch {
      console.log(`[${email}] Finalizado!`)
    }
  } else {
    console.error(`[${email}] Falha ao finalizar: ${finishRes.status} — ${finishRes.body}`)
  }
}
