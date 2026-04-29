const PARTICIPANT_TOKEN_KEY = "quizz.participant.token";
const ADMIN_TOKEN_KEY = "quizz.admin.token";
const SYSTEM_USER_KEY = "quizz.system.user";
const ACTIVE_QUIZ_ID_KEY = "quizz.activeQuizId";

export interface SystemUser {
  id: string;
  name?: string | null;
  username?: string | null;
  email: string;
  role: "ADMIN" | "USER";
}

export function getParticipantToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(PARTICIPANT_TOKEN_KEY);
}

export function setParticipantToken(token: string) {
  window.localStorage.setItem(PARTICIPANT_TOKEN_KEY, token);
}

export function clearParticipantToken() {
  window.localStorage.removeItem(PARTICIPANT_TOKEN_KEY);
}

export function clearParticipantSession() {
  clearParticipantToken();
  clearActiveQuizId();
}

export function getAdminToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  window.localStorage.removeItem(SYSTEM_USER_KEY);
}

export function getSystemUser(): SystemUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SYSTEM_USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setSystemUser(user: SystemUser) {
  window.localStorage.setItem(SYSTEM_USER_KEY, JSON.stringify(user));
}

export function clearSystemUser() {
  window.localStorage.removeItem(SYSTEM_USER_KEY);
}

export function setActiveQuizId(quizId: string) {
  window.localStorage.setItem(ACTIVE_QUIZ_ID_KEY, quizId);
}

export function clearActiveQuizId() {
  window.localStorage.removeItem(ACTIVE_QUIZ_ID_KEY);
}

export function getActiveQuizId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACTIVE_QUIZ_ID_KEY);
}
