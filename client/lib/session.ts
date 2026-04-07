const PARTICIPANT_TOKEN_KEY = "quizz.participant.token";
const ADMIN_TOKEN_KEY = "quizz.admin.token";
const ACTIVE_QUIZ_ID_KEY = "quizz.activeQuizId";

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
