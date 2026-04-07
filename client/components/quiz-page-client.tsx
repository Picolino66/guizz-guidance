"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "./icons";
import {
  apiFetch,
  formatCountdown,
  isUnauthorizedError,
  ParticipantQuizState,
  QuizQuestion
} from "../lib/api";
import {
  clearParticipantSession,
  getActiveQuizId,
  getParticipantToken,
  setActiveQuizId
} from "../lib/session";

interface StartResponse {
  participantId: string;
  quizId: string;
  startedAt: string;
  answeredQuestionIds: string[];
  answers: Array<{
    questionId: string;
    alternativeId: string;
  }>;
}

type QuizLoadState = "loading" | "recovering" | "ready" | "empty" | "error";

function getAnswerMap(state: ParticipantQuizState | null) {
  if (!state?.participant) {
    return {} as Record<string, string>;
  }

  return state.participant.answers.reduce<Record<string, string>>((accumulator, answer) => {
    accumulator[answer.questionId] = answer.alternativeId;
    return accumulator;
  }, {});
}

function getInitialQuestionIndex(questions: QuizQuestion[], answersByQuestionId: Record<string, string>) {
  const firstUnansweredIndex = questions.findIndex((question) => !answersByQuestionId[question.id]);
  if (firstUnansweredIndex >= 0) {
    return firstUnansweredIndex;
  }

  return Math.max(questions.length - 1, 0);
}

export function QuizPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quizState, setQuizState] = useState<ParticipantQuizState | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState("00:00:00");
  const [loadState, setLoadState] = useState<QuizLoadState>("loading");
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recoveryAttemptedRef = useRef(false);
  const recoveryRequestRef = useRef<(() => Promise<void>) | null>(null);

  const currentQuestion = useMemo(
    () => questions[currentIndex] ?? null,
    [questions, currentIndex]
  );
  const answeredCount = useMemo(
    () => Object.keys(answersByQuestionId).length,
    [answersByQuestionId]
  );
  const progressValue =
    questions.length > 0 ? Math.min(((currentIndex + 1) / questions.length) * 100, 100) : 0;
  const compactCountdown = useMemo(
    () => (countdown.startsWith("00:") ? countdown.slice(3) : countdown),
    [countdown]
  );
  const questionLabel =
    questions.length > 0 ? `Pergunta ${currentIndex + 1} de ${questions.length}` : "Pergunta 0 de 0";
  const isLoading = loadState === "loading";
  const isRecovering = loadState === "recovering";
  const isLastQuestion = questions.length > 0 && currentIndex === questions.length - 1;

  const invalidateParticipantSession = () => {
    clearParticipantSession();
    router.replace("/");
  };

  useEffect(() => {
    const token = getParticipantToken();
    const quizId = searchParams.get("quizId") ?? getActiveQuizId();

    if (!token || !quizId) {
      router.replace("/waiting");
      return;
    }

    let disposed = false;
    recoveryAttemptedRef.current = false;
    setQuizState(null);
    setQuestions([]);
    setAnswersByQuestionId({});
    setCurrentIndex(0);
    setLoadState("loading");
    setError(null);

    const redirectFromState = (state: ParticipantQuizState) => {
      if (state.viewerState === "PRE_QUIZ_WAITING" || state.viewerState === "POST_QUIZ_WAITING") {
        router.replace(`/waiting?quizId=${state.quiz.id}`);
        return true;
      }

      if (state.viewerState === "RESULT_READY") {
        router.replace(`/ranking?quizId=${state.quiz.id}`);
        return true;
      }

      return false;
    };

    const applyQuizPayload = (
      stateResponse: ParticipantQuizState,
      questionsResponse: { questions: QuizQuestion[] }
    ) => {
      const initialAnswers = getAnswerMap(stateResponse);
      const nextQuestions = questionsResponse.questions;

      setQuizState(stateResponse);
      setQuestions(nextQuestions);
      setAnswersByQuestionId(initialAnswers);
      setCurrentIndex(getInitialQuestionIndex(nextQuestions, initialAnswers));

      return nextQuestions.length > 0;
    };

    const loadQuiz = async (forceRequest = false) => {
      try {
        if (!disposed) {
          setLoadState(forceRequest ? "recovering" : "loading");
          setError(null);
        }

        await apiFetch<StartResponse>(
          "/participant/start",
          {
            method: "POST",
            body: JSON.stringify({ quizId })
          },
          token
        );

        const [stateResponse, questionsResponse] = await Promise.all([
          apiFetch<ParticipantQuizState>(`/participant/quiz-state/${quizId}`, {}, token),
          apiFetch<{ questions: QuizQuestion[] }>(
            forceRequest
              ? `/quiz/${quizId}/questions?refresh=${Date.now()}`
              : `/quiz/${quizId}/questions`,
            {},
            token
          )
        ]);

        if (disposed) {
          return;
        }

        setActiveQuizId(quizId);
        if (redirectFromState(stateResponse)) {
          return;
        }

        const hasQuestions = applyQuizPayload(stateResponse, questionsResponse);
        if (hasQuestions) {
          setLoadState("ready");
          return;
        }

        if (!recoveryAttemptedRef.current) {
          recoveryAttemptedRef.current = true;
          void loadQuiz(true);
          return;
        }

        setLoadState("empty");
      } catch (bootstrapError) {
        if (isUnauthorizedError(bootstrapError)) {
          if (!disposed) {
            invalidateParticipantSession();
          }
          return;
        }

        if (!forceRequest && !recoveryAttemptedRef.current) {
          recoveryAttemptedRef.current = true;
          void loadQuiz(true);
          return;
        }

        try {
          const latestState = await apiFetch<ParticipantQuizState>(
            `/participant/quiz-state/${quizId}`,
            {},
            token
          );

          if (disposed) {
            return;
          }

          setActiveQuizId(quizId);
          if (redirectFromState(latestState)) {
            return;
          }
        } catch (stateError) {
          if (isUnauthorizedError(stateError)) {
            if (!disposed) {
              invalidateParticipantSession();
            }
            return;
          }
        }

        if (disposed) {
          return;
        }

        setLoadState("error");
        setError(
          bootstrapError instanceof Error
            ? bootstrapError.message
            : "Falha ao carregar as perguntas do quiz."
        );
      }
    };

    recoveryRequestRef.current = () => loadQuiz(true);
    void loadQuiz();

    const poll = window.setInterval(async () => {
      try {
        const stateResponse = await apiFetch<ParticipantQuizState>(
          `/participant/quiz-state/${quizId}`,
          {},
          token
        );

        if (disposed) {
          return;
        }

        if (redirectFromState(stateResponse)) {
          return;
        }

        setQuizState(stateResponse);
      } catch (pollError) {
        if (!disposed && isUnauthorizedError(pollError)) {
          invalidateParticipantSession();
        }
      }
    }, 4000);

    return () => {
      disposed = true;
      recoveryRequestRef.current = null;
      window.clearInterval(poll);
    };
  }, [router, searchParams]);

  useEffect(() => {
    if (
      loadState !== "ready" ||
      quizState?.viewerState !== "IN_PROGRESS" ||
      currentQuestion ||
      recoveryAttemptedRef.current ||
      !recoveryRequestRef.current
    ) {
      return;
    }

    recoveryAttemptedRef.current = true;
    setLoadState("recovering");
    setError(null);
    void recoveryRequestRef.current();
  }, [currentQuestion, loadState, quizState]);

  useEffect(() => {
    if (!quizState) {
      return;
    }

    const update = () => {
      setCountdown(formatCountdown(quizState.quiz.endTime));

      if (Date.now() >= new Date(quizState.quiz.endTime).getTime()) {
        router.replace(`/ranking?quizId=${quizState.quiz.id}`);
      }
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [quizState, router]);

  async function handleAnswer(alternativeId: string) {
    const token = getParticipantToken();
    if (!token || !currentQuestion || !quizState || finishing) {
      return;
    }

    const previousAlternativeId = answersByQuestionId[currentQuestion.id];
    setSavingQuestionId(currentQuestion.id);
    setError(null);
    setAnswersByQuestionId((currentAnswers) => ({
      ...currentAnswers,
      [currentQuestion.id]: alternativeId
    }));

    try {
      await apiFetch(
        "/participant/answer",
        {
          method: "POST",
          body: JSON.stringify({
            questionId: currentQuestion.id,
            alternativeId
          })
        },
        token
      );
    } catch (submissionError) {
      if (isUnauthorizedError(submissionError)) {
        invalidateParticipantSession();
        return;
      }

      setAnswersByQuestionId((currentAnswers) => {
        const nextAnswers = { ...currentAnswers };

        if (previousAlternativeId) {
          nextAnswers[currentQuestion.id] = previousAlternativeId;
        } else {
          delete nextAnswers[currentQuestion.id];
        }

        return nextAnswers;
      });
      setError(submissionError instanceof Error ? submissionError.message : "Falha ao salvar resposta.");
    } finally {
      setSavingQuestionId(null);
    }
  }

  async function handleFinishQuiz() {
    const token = getParticipantToken();
    if (!token || !quizState) {
      return;
    }

    setFinishing(true);
    setError(null);

    try {
      await apiFetch(
        "/participant/finish",
        {
          method: "POST",
          body: JSON.stringify({ quizId: quizState.quiz.id })
        },
        token
      );

      router.replace(`/waiting?quizId=${quizState.quiz.id}`);
    } catch (finishError) {
      if (isUnauthorizedError(finishError)) {
        invalidateParticipantSession();
        return;
      }

      setError(finishError instanceof Error ? finishError.message : "Falha ao enviar o quiz.");
    } finally {
      setFinishing(false);
    }
  }

  const currentAnswerId = currentQuestion ? answersByQuestionId[currentQuestion.id] : null;

  return (
    <div className="quiz-screen">
      <div aria-hidden="true" className="quiz-screen__ribbon" />
      <div aria-hidden="true" className="quiz-screen__ribbon quiz-screen__ribbon--secondary" />
      <div aria-hidden="true" className="quiz-screen__glow quiz-screen__glow--left" />
      <div aria-hidden="true" className="quiz-screen__glow quiz-screen__glow--right" />

      <main className="quiz-card">
        <header className="quiz-card__topbar">
          <span className="quiz-card__pill">
            <Icon className="h-4 w-4" name="bolt" />
            {questions.length > 0 ? `${currentIndex + 1}/${questions.length}` : "0/0"}
          </span>

          <h1 className="quiz-card__title">{quizState?.quiz.title ?? "Quiz de Cultura Guidance"}</h1>

          <span className="quiz-card__pill quiz-card__pill--timer">
            <Icon className="h-4 w-4" name="clock" />
            {compactCountdown}
          </span>
        </header>

        <section className="quiz-card__body">
          <div className="quiz-progress">
            <div className="quiz-progress__row">
              <p>{questionLabel}</p>
              <p>{answeredCount}/{questions.length} respostas</p>
            </div>
            <div className="quiz-progress__track">
              <div
                className="quiz-progress__fill transition-[width] duration-300 ease-out"
                style={{ width: `${progressValue}%` }}
              />
            </div>
          </div>

          {isLoading ? (
            <section className="quiz-panel quiz-panel--message">
              <div className="quiz-panel__message">
                <span className="quiz-panel__message-icon">
                  <Icon className="h-7 w-7" name="sparkles" />
                </span>
                <p>Carregando estrutura do quiz e respostas já registradas...</p>
              </div>
            </section>
          ) : isRecovering ? (
            <section className="quiz-panel quiz-panel--message">
              <div className="quiz-panel__message">
                <span className="quiz-panel__message-icon">
                  <Icon className="h-7 w-7" name="sparkles" />
                </span>
                <p>As perguntas ainda não responderam. Atualizando o quiz agora...</p>
              </div>
            </section>
          ) : currentQuestion ? (
            <>
              <section className="quiz-panel">
                <div className="quiz-panel__question">
                  <div className="quiz-panel__avatar">
                    <span className="quiz-panel__avatar-core">
                      <Icon className="h-7 w-7" name="question" />
                    </span>
                  </div>

                  <div className="quiz-panel__copy">
                    <h2>{currentQuestion.title}</h2>
                  </div>
                </div>

                <div className="quiz-options">
                  {currentQuestion.alternatives.map((alternative, index) => {
                    const isSelected = currentAnswerId === alternative.id;

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`quiz-answer${isSelected ? " is-selected" : ""}`}
                        disabled={savingQuestionId === currentQuestion.id || finishing}
                        key={alternative.id}
                        onClick={() => handleAnswer(alternative.id)}
                        type="button"
                      >
                        <span className="quiz-answer__letter">{String.fromCharCode(65 + index)}</span>

                        <span className="quiz-answer__content">
                          <strong>{alternative.text}</strong>
                        </span>

                        <span className="quiz-answer__cta">
                          {isSelected ? "Selecionada" : "Selecionar"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="quiz-controls">
                <div className="quiz-controls__nav">
                  <button
                    className="quiz-nav-button"
                    disabled={currentIndex === 0 || finishing}
                    onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
                    type="button"
                  >
                    ← Voltar
                  </button>

                  <span aria-hidden="true" className="quiz-controls__divider" />

                  <button
                    className="quiz-nav-button"
                    disabled={currentIndex >= questions.length - 1 || finishing}
                    onClick={() => setCurrentIndex((index) => Math.min(index + 1, questions.length - 1))}
                    type="button"
                  >
                    Próximo →
                  </button>
                </div>

                {isLastQuestion ? (
                  <div className="quiz-submit-row">
                    <button
                      className="quiz-submit-button"
                      disabled={finishing || savingQuestionId !== null}
                      onClick={handleFinishQuiz}
                      type="button"
                    >
                      {finishing ? "Enviando..." : "Enviar Quiz"}
                    </button>
                  </div>
                ) : null}
              </section>
            </>
          ) : loadState === "empty" ? (
            <section className="quiz-panel quiz-panel--message">
              <div className="quiz-panel__message">
                <span className="quiz-panel__message-icon">
                  <Icon className="h-7 w-7" name="question" />
                </span>
                <p>Nenhuma pergunta foi cadastrada neste quiz ainda.</p>
              </div>
            </section>
          ) : (
            <section className="quiz-panel quiz-panel--message">
              <div className="quiz-panel__message">
                <span className="quiz-panel__message-icon">
                  <Icon className="h-7 w-7" name="sparkles" />
                </span>
                <p>{error ?? "Falha ao carregar as perguntas do quiz."}</p>
              </div>
            </section>
          )}

          {error && loadState !== "error" ? (
            <p className="quiz-error" role="alert">
              {error}
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
