"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "./icons";
import {
  API_BASE_URL,
  apiFetch,
  formatCountdown,
  isUnauthorizedError,
  ParticipantQuizState,
  QuizSummary
} from "../lib/api";
import {
  clearActiveQuizId,
  clearParticipantSession,
  getParticipantToken,
  setActiveQuizId
} from "../lib/session";

const WAITING_PRESENCE_HEARTBEAT_MS = 10_000;

type WaitingContent = {
  eyebrow: string;
  title: string;
  lead: string;
  note: string;
  metaPrimaryLabel: string;
  metaSecondaryLabel: string;
  centerIcon: "clock" | "trophy";
  isPostQuiz: boolean;
};

function getWaitingContent(state: ParticipantQuizState | null): WaitingContent {
  if (!state) {
    return {
      eyebrow: "Lobby oficial",
      title: "Quiz de Cultura Guidance",
      lead: "Nenhuma rodada ativa no momento.",
      note: "Assim que uma nova rodada for agendada, esta tela exibirá a contagem oficial.",
      metaPrimaryLabel: "Próxima rodada",
      metaSecondaryLabel: "Confirmados",
      centerIcon: "clock",
      isPostQuiz: false
    };
  }

  if (state.viewerState === "POST_QUIZ_WAITING") {
    return {
      eyebrow: "Pós-quiz",
      title: "Quiz finalizado",
      lead: "Aguardando outros participantes",
      note: "O resultado será exibido em breve",
      metaPrimaryLabel: "Encerramento oficial",
      metaSecondaryLabel: "Confirmados na espera",
      centerIcon: "clock",
      isPostQuiz: true
    };
  }

  return {
    eyebrow: "Pré-quiz",
    title: state.quiz.title,
    lead: "O quiz começará em:",
    note: "Aguarde o início do quiz...",
    metaPrimaryLabel: "Início oficial",
    metaSecondaryLabel: "Confirmados",
    centerIcon: "clock",
    isPostQuiz: false
  };
}

export function WaitingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quizState, setQuizState] = useState<ParticipantQuizState | null>(null);
  const [countdown, setCountdown] = useState("00:00:00");
  const [error, setError] = useState<string | null>(null);

  const content = useMemo(() => getWaitingContent(quizState), [quizState]);
  const targetDate = useMemo(() => {
    if (!quizState) {
      return null;
    }

    return quizState.viewerState === "POST_QUIZ_WAITING"
      ? quizState.quiz.endTime
      : quizState.quiz.startTime;
  }, [quizState]);

  const formattedTargetDate = useMemo(() => {
    if (!targetDate) {
      return "Em breve";
    }

    return new Date(targetDate).toLocaleString("pt-BR");
  }, [targetDate]);

  const invalidateParticipantSession = () => {
    clearParticipantSession();
    router.replace("/quiz-login");
  };

  useEffect(() => {
    const token = getParticipantToken();
    if (!token) {
      router.replace("/quiz-login");
      return;
    }

    let disposed = false;

    const resolveActiveState = async (currentQuizId?: string | null) => {
      if (!token) {
        return;
      }

      try {
        const targetQuizId = currentQuizId ?? (await resolveCurrentQuizId());
        if (!targetQuizId) {
          if (!disposed) {
            clearActiveQuizId();
            setQuizState(null);
            setError(null);
          }
          return;
        }

        const response = await apiFetch<ParticipantQuizState>(
          `/participant/quiz-state/${targetQuizId}`,
          {},
          token
        );

        if (disposed) {
          return;
        }

        setActiveQuizId(response.quiz.id);
        setQuizState(response);
        setError(null);

        if (response.viewerState === "IN_PROGRESS") {
          router.replace(`/quiz?quizId=${response.quiz.id}`);
          return;
        }

        if (response.viewerState === "RESULT_READY") {
          router.replace(`/ranking?quizId=${response.quiz.id}`);
        }
      } catch (loadError) {
        if (!disposed) {
          if (isUnauthorizedError(loadError)) {
            invalidateParticipantSession();
            return;
          }

          setError(loadError instanceof Error ? loadError.message : "Falha ao buscar o status do quiz.");
        }
      }
    };

    const resolveCurrentQuizId = async () => {
      const activeQuiz = await apiFetch<QuizSummary | null>("/quiz/active");
      return activeQuiz?.id ?? null;
    };

    const initialQuizId = searchParams.get("quizId");
    resolveActiveState(initialQuizId);

    const poll = window.setInterval(() => {
      resolveActiveState(initialQuizId);
    }, 4000);

    return () => {
      disposed = true;
      window.clearInterval(poll);
    };
  }, [router, searchParams]);

  useEffect(() => {
    if (!targetDate) {
      setCountdown("00:00:00");
      return;
    }

    const update = () => {
      setCountdown(formatCountdown(targetDate));
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [targetDate]);

  useEffect(() => {
    const token = getParticipantToken();
    const quizId = quizState?.quiz.id;
    const viewerState = quizState?.viewerState;
    if (
      !token ||
      !quizId ||
      (viewerState !== "PRE_QUIZ_WAITING" && viewerState !== "POST_QUIZ_WAITING")
    ) {
      return;
    }

    const presenceUrl = `${API_BASE_URL}/participant/waiting-presence/${quizId}`;
    const sendPresence = async (method: "POST" | "DELETE", keepalive = false) => {
      try {
        const response = await fetch(presenceUrl, {
          method,
          headers: {
            Authorization: `Bearer ${token}`
          },
          cache: "no-store",
          keepalive
        });

        if (response.status === 401) {
          invalidateParticipantSession();
        }
      } catch {
        // O polling do estado segue como fonte principal; falhas pontuais de presença expiram via TTL.
      }
    };

    void sendPresence("POST");

    const heartbeat = window.setInterval(() => {
      void sendPresence("POST");
    }, WAITING_PRESENCE_HEARTBEAT_MS);

    const handlePageHide = () => {
      void sendPresence("DELETE", true);
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.clearInterval(heartbeat);
      void sendPresence("DELETE", true);
    };
  }, [quizState?.quiz.id, quizState?.viewerState, router]);

  return (
    <div className="waiting-screen">
      <div aria-hidden="true" className="waiting-screen__ribbon" />
      <div aria-hidden="true" className="waiting-screen__ribbon waiting-screen__ribbon--secondary" />
      <div aria-hidden="true" className="waiting-screen__glow waiting-screen__glow--left" />
      <div aria-hidden="true" className="waiting-screen__glow waiting-screen__glow--right" />

      <main className={`waiting-card${content.isPostQuiz ? " waiting-card--post" : ""}`}>
        {content.isPostQuiz ? (
          <section className="waiting-post">
            <header className="waiting-post__status">
              <h1 className="waiting-post__title">
                <span>{content.title}</span>
                <span aria-hidden="true" className="waiting-post__check">
                  <Icon className="h-5 w-5" name="check" />
                </span>
              </h1>
            </header>

            <div aria-hidden="true" className="waiting-post__divider" />

            <p className="waiting-post__lead">{content.lead}</p>

            <div className="waiting-post__stats">
              <article className="waiting-post__stat">
                <span className="waiting-post__stat-head">
                  <Icon className="h-4 w-4" name="check" />
                  Finalizados
                </span>
                <strong className="waiting-post__stat-value">{quizState?.finishedParticipants ?? 0}</strong>
              </article>

              <article className="waiting-post__stat">
                <span className="waiting-post__stat-head">
                  <Icon className="h-4 w-4" name="play" />
                  Ainda fazendo
                </span>
                <strong className="waiting-post__stat-value">{quizState?.pendingParticipants ?? 0}</strong>
              </article>
            </div>

            <div className="waiting-post__timer">
              <span aria-hidden="true" className="waiting-post__timer-icon">
                <Icon className="h-7 w-7" name="clock" />
              </span>
              <strong className="waiting-post__countdown">{countdown}</strong>
            </div>

            <p className="waiting-post__note">{content.note}</p>
          </section>
        ) : (
          <>
            <header className="waiting-card__header">
              <p className="waiting-eyebrow">{content.eyebrow}</p>
              <h1 className="waiting-title">{content.title}</h1>
              <p className="waiting-lead">{content.lead}</p>
            </header>

            <section className="waiting-timer-block">
              <div className="waiting-stopwatch" data-mode={content.isPostQuiz ? "post" : "pre"}>
                <span aria-hidden="true" className="waiting-stopwatch__crown" />
                <span aria-hidden="true" className="waiting-stopwatch__button waiting-stopwatch__button--left" />
                <span aria-hidden="true" className="waiting-stopwatch__button waiting-stopwatch__button--right" />

                <div className="waiting-stopwatch__ring">
                  <div className="waiting-stopwatch__face">
                    <strong className="waiting-stopwatch__countdown">{countdown}</strong>
                  </div>
                </div>
              </div>

              <p className="waiting-note">{content.note}</p>
            </section>

            <div className="waiting-meta">
              <article className="waiting-meta__tile">
                <p>{content.metaPrimaryLabel}</p>
                <strong>{formattedTargetDate}</strong>
              </article>

              <article className="waiting-meta__tile">
                <p>{content.metaSecondaryLabel}</p>
                <strong>
                  {quizState
                    ? `${quizState.confirmedParticipants}/${quizState.whitelistParticipants}`
                    : "Sem quiz ativo"}
                </strong>
              </article>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
