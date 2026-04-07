export type QuizStatus = "DRAFT" | "SCHEDULED" | "RUNNING" | "FINISHED";

export interface QuizSummary {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  status: QuizStatus;
}

export interface QuizQuestion {
  id: string;
  title: string;
  order: number;
  alternatives: Array<{
    id: string;
    text: string;
    order: number;
  }>;
}

export interface RankingItem {
  position: number;
  participantId: string;
  name: string;
  score: number;
  totalTimeSeconds: number;
  totalTimeMilliseconds: number;
}

export type ParticipantViewerState =
  | "PRE_QUIZ_WAITING"
  | "IN_PROGRESS"
  | "POST_QUIZ_WAITING"
  | "RESULT_READY";

export interface ParticipantQuizState {
  quiz: QuizSummary;
  viewerState: ParticipantViewerState;
  participant: {
    id: string;
    startedAt: string;
    finishedAt: string | null;
    score: number;
    totalTimeSeconds: number;
    answers: Array<{
      questionId: string;
      alternativeId: string;
      answeredAt: string;
    }>;
  } | null;
  totalParticipants: number;
  finishedParticipants: number;
  pendingParticipants: number;
  whitelistParticipants: number;
  confirmedParticipants: number;
  waitingPendingParticipants: number;
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const raw = await response.text();
    let payload: unknown = raw;
    let message = raw || "Falha na requisição.";

    try {
      payload = JSON.parse(raw);

      if (
        payload &&
        typeof payload === "object" &&
        "message" in payload &&
        typeof payload.message === "string"
      ) {
        message = payload.message;
      }
    } catch {
      // Mantém o corpo textual quando a resposta não for JSON.
    }

    throw new ApiError(message, response.status, payload);
  }

  return response.json() as Promise<T>;
}

export function formatCountdown(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) {
    return "00:00:00";
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}
