"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Icon } from "./icons";
import { apiFetch, RankingItem } from "../lib/api";
import { getActiveQuizId, setActiveQuizId } from "../lib/session";
import { formatElapsedTime } from "../lib/time";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000/quiz";

function getRankLabel(position: number) {
  if (position === 1) {
    return "🥇";
  }

  if (position === 2) {
    return "🥈";
  }

  if (position === 3) {
    return "🥉";
  }

  return `${position}º`;
}

function getRankBadgeClassName(position: number) {
  if (position === 1) {
    return "ranking-row__badge ranking-row__badge--gold";
  }

  if (position === 2) {
    return "ranking-row__badge ranking-row__badge--silver";
  }

  if (position === 3) {
    return "ranking-row__badge ranking-row__badge--bronze";
  }

  return "ranking-row__badge ranking-row__badge--text";
}

export function RankingPageClient() {
  const searchParams = useSearchParams();
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const quizId = searchParams.get("quizId") ?? getActiveQuizId();
    if (!quizId) {
      setError("Quiz não informado para exibir o resultado.");
      return;
    }

    setActiveQuizId(quizId);
    setError(null);

    let socket: Socket | null = null;

    const loadRanking = async () => {
      try {
        const response = await apiFetch<RankingItem[]>(`/quiz/${quizId}/ranking`);
        setRanking(response);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Falha ao carregar ranking.");
      }
    };

    void loadRanking();

    socket = io(WS_URL);
    socket.on("ranking_updated", (payload: { quizId: string; ranking: RankingItem[] }) => {
      if (payload.quizId === quizId) {
        setRanking(payload.ranking);
        setError(null);
      }
    });

    return () => {
      socket?.disconnect();
    };
  }, [searchParams]);

  return (
    <div className="ranking-screen">
      <div aria-hidden="true" className="ranking-screen__ribbon" />
      <div aria-hidden="true" className="ranking-screen__ribbon ranking-screen__ribbon--secondary" />
      <div aria-hidden="true" className="ranking-screen__glow ranking-screen__glow--left" />
      <div aria-hidden="true" className="ranking-screen__glow ranking-screen__glow--right" />

      <main className="ranking-card">
        <section className="ranking-panel">
          <header className="ranking-panel__header">
            <h1 className="ranking-panel__title">
              <span aria-hidden="true" className="ranking-panel__title-icon">
                <Icon className="h-8 w-8" name="trophy" />
              </span>
              <span>RESULTADO</span>
            </h1>
          </header>

          <div aria-hidden="true" className="ranking-panel__divider" />

          {ranking.length > 0 ? (
            <div className="ranking-list" role="list">
              {ranking.map((item) => (
                <article className="ranking-row" key={item.participantId} role="listitem">
                  <div className="ranking-row__identity">
                    <span className={getRankBadgeClassName(item.position)}>{getRankLabel(item.position)}</span>
                    <strong className="ranking-row__name">{item.name}</strong>
                  </div>

                  <div className="ranking-row__meta">
                    <span className="ranking-row__score">{item.score} acertos</span>
                    <span className="ranking-row__time">{formatElapsedTime(item)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="ranking-empty">
              <p className="ranking-empty__title">Resultado em preparação</p>
              <p className="ranking-empty__text">
                Ainda não há participantes finalizados para montar o ranking desta rodada.
              </p>
            </div>
          )}

          {error ? (
            <p className="ranking-error" role="alert">
              {error}
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
