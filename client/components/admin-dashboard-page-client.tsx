"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons";
import { QuizStatus, apiFetch, isUnauthorizedError } from "../lib/api";
import { clearAdminToken, getAdminToken } from "../lib/session";
import { formatElapsedTime } from "../lib/time";

type AdminView = "dashboard" | "quizzes" | "results" | "participants" | "settings";
type QuizzesMode = "list" | "create" | "questions";

interface AdminAlternativeSummary {
  id: string;
  text: string;
  order: number;
  isCorrect: boolean;
}

interface AdminQuestionSummary {
  id: string;
  title: string;
  order: number;
  alternatives: AdminAlternativeSummary[];
}

interface AdminQuizSummary {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  status: QuizStatus;
  questions: AdminQuestionSummary[];
}

interface CreatedQuizResponse {
  id: string;
  title: string;
  startTime: string;
  durationSeconds: number;
  status: QuizStatus;
}

interface CreatedQuestionResponse {
  id: string;
}

interface DashboardParticipant {
  id: string;
  name: string;
  email: string;
  startedAt: string;
  finishedAt: string | null;
  score: number;
  totalTimeSeconds: number;
}

interface DashboardResponse {
  quiz: Omit<AdminQuizSummary, "questions">;
  totalParticipants: number;
  enteredParticipants: number;
  confirmedParticipants: number;
  startedParticipants: number;
  finishedParticipants: number;
  pendingParticipants: number;
  ranking: Array<{
    position: number;
    participantId: string;
    name: string;
    score: number;
    totalTimeSeconds: number;
    totalTimeMilliseconds: number;
  }>;
  participants: DashboardParticipant[];
}

interface AllowedEmailEntry {
  id: string;
  email: string;
  createdAt: string;
}

interface ChangeAdminPasswordResponse {
  message: string;
}

interface QuizFormState {
  title: string;
  startTime: string;
  durationSeconds: string;
}

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordVisibilityState {
  newPassword: boolean;
  confirmPassword: boolean;
}

interface AlternativeDraft {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuestionDraft {
  id: string;
  title: string;
  alternatives: AlternativeDraft[];
}

const sidebarNavigationItems = [
  { label: "Dashboard", mobileLabel: "Dash", icon: "home", view: "dashboard" },
  { label: "Quizzes", mobileLabel: "Quiz", icon: "layers", view: "quizzes" },
  { label: "Participantes", mobileLabel: "Partic.", icon: "users", view: "participants" },
  { label: "Configurações", mobileLabel: "Config", icon: "shield", view: "settings" }
] as const;

const mobileNavigationItems = sidebarNavigationItems;

const DEFAULT_QUIZ_FORM: QuizFormState = {
  title: "",
  startTime: "",
  durationSeconds: ""
};

const DEFAULT_PASSWORD_FORM: PasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

const DEFAULT_PASSWORD_VISIBILITY: PasswordVisibilityState = {
  newPassword: false,
  confirmPassword: false
};

const ADMIN_AUTO_REFRESH_INTERVAL_MS = 4_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMIN_PASSWORD_MIN_LENGTH = 8;
const MIN_QUESTIONS_PER_QUIZ = 1;
const MIN_ALTERNATIVES_PER_QUESTION = 2;

function createDraftId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyAlternatives(): AlternativeDraft[] {
  return Array.from({ length: 3 }, () => ({
    id: createDraftId(),
    text: "",
    isCorrect: false
  }));
}

function createEmptyQuestion(): QuestionDraft {
  return {
    id: createDraftId(),
    title: "",
    alternatives: createEmptyAlternatives()
  };
}

function getQuizStartTimestamp(startTime: string) {
  return new Date(startTime).getTime();
}

function selectPriorityQuiz(quizzes: AdminQuizSummary[], preferredQuizId?: string) {
  if (preferredQuizId) {
    const preferredQuiz = quizzes.find((quiz) => quiz.id === preferredQuizId);
    if (preferredQuiz) {
      return preferredQuiz;
    }
  }

  const runningQuiz = quizzes.find((quiz) => quiz.status === "RUNNING");
  if (runningQuiz) {
    return runningQuiz;
  }

  const nextScheduledQuiz = quizzes
    .filter((quiz) => quiz.status === "SCHEDULED")
    .sort((quizA, quizB) => getQuizStartTimestamp(quizA.startTime) - getQuizStartTimestamp(quizB.startTime))[0];

  if (nextScheduledQuiz) {
    return nextScheduledQuiz;
  }

  const latestFinishedQuiz = quizzes
    .filter((quiz) => quiz.status === "FINISHED")
    .sort((quizA, quizB) => getQuizStartTimestamp(quizB.startTime) - getQuizStartTimestamp(quizA.startTime))[0];

  if (latestFinishedQuiz) {
    return latestFinishedQuiz;
  }

  return quizzes.find((quiz) => quiz.status === "DRAFT") ?? null;
}

function formatStatusLabel(status: QuizStatus) {
  if (status === "RUNNING") {
    return "Em andamento";
  }

  if (status === "SCHEDULED") {
    return "Agendado";
  }

  if (status === "FINISHED") {
    return "Encerrado";
  }

  return "Rascunho";
}

function formatClockValue(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getQuizTimeSummary(quiz: DashboardResponse["quiz"] | null, now: number) {
  if (!quiz) {
    return {
      value: "--:--",
      label: "Sem quiz disponível"
    };
  }

  if (quiz.status === "RUNNING") {
    const remainingSeconds = Math.ceil((new Date(quiz.endTime).getTime() - now) / 1000);
    return {
      value: formatClockValue(remainingSeconds),
      label: "Restante"
    };
  }

  if (quiz.status === "SCHEDULED") {
    const remainingSeconds = Math.ceil((new Date(quiz.startTime).getTime() - now) / 1000);
    return {
      value: formatClockValue(remainingSeconds),
      label: "Para iniciar"
    };
  }

  if (quiz.status === "FINISHED") {
    return {
      value: "Encerrado",
      label: "Quiz finalizado"
    };
  }

  return {
    value: "Aguardando",
    label: "Quiz ainda não iniciado"
  };
}

function formatAverageScore(participants: DashboardParticipant[]) {
  if (participants.length === 0) {
    return "0,0";
  }

  const totalScore = participants.reduce((sum, participant) => sum + participant.score, 0);
  return (totalScore / participants.length).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

function getStatusClassName(status: QuizStatus) {
  if (status === "RUNNING") {
    return "admin-status admin-status--running";
  }

  if (status === "SCHEDULED") {
    return "admin-status admin-status--scheduled";
  }

  if (status === "FINISHED") {
    return "admin-status admin-status--finished";
  }

  return "admin-status admin-status--draft";
}

function formatQuizStart(startTime: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(startTime));
}

function formatDurationLabel(durationSeconds: number) {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  if (seconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes} min ${seconds}s`;
}

function escapeCsvValue(value: string | number) {
  const normalizedValue = String(value);
  if (/[",\n]/.test(normalizedValue)) {
    return `"${normalizedValue.replace(/"/g, '""')}"`;
  }

  return normalizedValue;
}

function getResultsFileName(quizTitle: string) {
  const slug = quizTitle
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "resultado-quiz"}.csv`;
}

function validateQuizForm(form: QuizFormState) {
  const durationSeconds = Number(form.durationSeconds);
  const startTime = new Date(form.startTime);

  if (!form.title.trim()) {
    return "Informe o nome do quiz.";
  }

  if (!form.startTime || Number.isNaN(startTime.getTime())) {
    return "Informe uma data e hora de início válidas.";
  }

  if (!Number.isInteger(durationSeconds) || durationSeconds < 60) {
    return "A duração precisa ser um número inteiro maior ou igual a 60 segundos.";
  }

  return null;
}

function validateQuestionDrafts(questions: QuestionDraft[]) {
  if (questions.length < MIN_QUESTIONS_PER_QUIZ) {
    return "Adicione pelo menos uma pergunta antes de finalizar.";
  }

  for (const [questionIndex, question] of questions.entries()) {
    if (!question.title.trim()) {
      return `Preencha o texto da Pergunta ${questionIndex + 1}.`;
    }

    if (question.alternatives.length < MIN_ALTERNATIVES_PER_QUESTION) {
      return `A Pergunta ${questionIndex + 1} precisa ter pelo menos duas alternativas.`;
    }

    const hasBlankAlternative = question.alternatives.some((alternative) => !alternative.text.trim());
    if (hasBlankAlternative) {
      return `Preencha todas as alternativas da Pergunta ${questionIndex + 1}.`;
    }

    if (!question.alternatives.some((alternative) => alternative.isCorrect)) {
      return `Marque a alternativa correta da Pergunta ${questionIndex + 1}.`;
    }
  }

  return null;
}

function validateAllowedEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return "Informe o e-mail do participante.";
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return "Informe um e-mail válido.";
  }

  return null;
}

function validatePasswordForm(form: PasswordFormState) {
  if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
    return "Preencha todos os campos da senha.";
  }

  if (form.newPassword.length < ADMIN_PASSWORD_MIN_LENGTH) {
    return `A nova senha precisa ter pelo menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres.`;
  }

  if (form.currentPassword === form.newPassword) {
    return "A nova senha precisa ser diferente da senha atual.";
  }

  if (form.newPassword !== form.confirmPassword) {
    return "A confirmação da nova senha não confere.";
  }

  return null;
}

async function fetchAdminQuizzes(token: string) {
  return apiFetch<AdminQuizSummary[]>("/admin/quizzes", {}, token);
}

async function fetchAllowedEmails(token: string) {
  return apiFetch<AllowedEmailEntry[]>("/admin/allowed-emails", {}, token);
}

export function AdminDashboardPageClient() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [startingQuizId, setStartingQuizId] = useState<string | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [quizzes, setQuizzes] = useState<AdminQuizSummary[]>([]);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [activeView, setActiveView] = useState<AdminView>("dashboard");
  const [quizzesMode, setQuizzesMode] = useState<QuizzesMode>("list");
  const [quizForm, setQuizForm] = useState<QuizFormState>(DEFAULT_QUIZ_FORM);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(DEFAULT_PASSWORD_FORM);
  const [passwordVisibility, setPasswordVisibility] =
    useState<PasswordVisibilityState>(DEFAULT_PASSWORD_VISIBILITY);
  const [questionDrafts, setQuestionDrafts] = useState<QuestionDraft[]>(() => [createEmptyQuestion()]);
  const [createdQuizId, setCreatedQuizId] = useState<string | null>(null);
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmailEntry[]>([]);
  const [participantEmail, setParticipantEmail] = useState("");
  const [isParticipantsLoading, setIsParticipantsLoading] = useState(false);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSubmittingQuestions, setIsSubmittingQuestions] = useState(false);
  const [removingParticipantId, setRemovingParticipantId] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const isAdminDataRequestInFlightRef = useRef(false);
  const hasQueuedAdminRefreshRef = useRef(false);
  const queuedPreferredQuizIdRef = useRef<string | undefined>(undefined);
  const queuedLockToQuizRef = useRef(false);

  const selectedQuizDetails = useMemo(() => {
    return quizzes.find((quiz) => quiz.id === selectedQuizId) ?? null;
  }, [quizzes, selectedQuizId]);

  const selectedQuiz = useMemo(() => {
    return selectedQuizDetails ?? dashboard?.quiz ?? null;
  }, [dashboard, selectedQuizDetails]);

  const timeSummary = useMemo(() => getQuizTimeSummary(dashboard?.quiz ?? null, now), [dashboard, now]);
  const averageScore = useMemo(() => {
    return formatAverageScore(dashboard?.participants ?? []);
  }, [dashboard?.participants]);

  const orderedQuizzes = useMemo(() => {
    const runningQuizzes = quizzes.filter((quiz) => quiz.status === "RUNNING");
    const remainingQuizzes = quizzes.filter((quiz) => quiz.status !== "RUNNING");
    return [...runningQuizzes, ...remainingQuizzes];
  }, [quizzes]);
  const lockedResultsQuizId =
    activeView === "results" ? selectedQuizId || dashboard?.quiz.id || null : null;
  const shouldAutoRefreshAdminData =
    activeView === "dashboard" ||
    Boolean(lockedResultsQuizId) ||
    (activeView === "quizzes" && quizzesMode === "list");

  useEffect(() => {
    const storedToken = getAdminToken();

    if (!storedToken) {
      setIsReady(true);
      router.replace("/admin/login");
      return;
    }

    setToken(storedToken);
    setIsReady(true);
  }, [router]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    if (!token || !shouldAutoRefreshAdminData) {
      return;
    }

    const preferredQuizId = activeView === "results" ? lockedResultsQuizId ?? undefined : undefined;
    const lockToQuiz = activeView === "results";

    void loadAdminData(token, preferredQuizId, { lockToQuiz });

    const poll = window.setInterval(() => {
      const currentToken = tokenRef.current;
      if (!currentToken) {
        return;
      }

      void loadAdminData(currentToken, preferredQuizId, { lockToQuiz });
    }, ADMIN_AUTO_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(poll);
    };
  }, [activeView, lockedResultsQuizId, shouldAutoRefreshAdminData, token]);

  useEffect(() => {
    if (!token || activeView !== "participants") {
      return;
    }

    void loadAllowedEmails(token);
  }, [activeView, token]);

  async function loadAdminData(
    currentToken: string,
    preferredQuizId?: string,
    options?: { lockToQuiz?: boolean }
  ) {
    if (isAdminDataRequestInFlightRef.current) {
      hasQueuedAdminRefreshRef.current = true;
      queuedPreferredQuizIdRef.current = preferredQuizId;
      queuedLockToQuizRef.current = options?.lockToQuiz ?? false;
      return;
    }

    isAdminDataRequestInFlightRef.current = true;
    setIsRefreshing(true);

    try {
      const quizzesResponse = await fetchAdminQuizzes(currentToken);
      const nextQuiz = options?.lockToQuiz
        ? (preferredQuizId
            ? quizzesResponse.find((quiz) => quiz.id === preferredQuizId) ?? null
            : null)
        : selectPriorityQuiz(quizzesResponse, preferredQuizId);

      setQuizzes(quizzesResponse);
      setSelectedQuizId(options?.lockToQuiz ? preferredQuizId ?? "" : nextQuiz?.id ?? "");
      setError(null);

      if (!nextQuiz) {
        setDashboard(null);
        return;
      }

      setDashboard((currentDashboard) =>
        currentDashboard?.quiz.id === nextQuiz.id ? currentDashboard : null
      );

      const dashboardResponse = await apiFetch<DashboardResponse>(
        `/admin/dashboard/${nextQuiz.id}`,
        {},
        currentToken
      );

      setDashboard(dashboardResponse);
    } catch (loadError) {
      if (isUnauthorizedError(loadError)) {
        clearAdminToken();
        tokenRef.current = null;
        setToken(null);
        router.replace("/admin/login");
        return;
      }

      setError(
        loadError instanceof Error ? loadError.message : "Falha ao carregar a área administrativa."
      );
    } finally {
      isAdminDataRequestInFlightRef.current = false;
      setIsRefreshing(false);

      if (hasQueuedAdminRefreshRef.current) {
        const queuedToken = tokenRef.current;
        const queuedPreferredQuizId = queuedPreferredQuizIdRef.current;
        const queuedLockToQuiz = queuedLockToQuizRef.current;

        hasQueuedAdminRefreshRef.current = false;
        queuedPreferredQuizIdRef.current = undefined;
        queuedLockToQuizRef.current = false;

        if (queuedToken) {
          void loadAdminData(queuedToken, queuedPreferredQuizId, {
            lockToQuiz: queuedLockToQuiz
          });
        }
      }
    }
  }

  async function loadAllowedEmails(currentToken: string) {
    setIsParticipantsLoading(true);

    try {
      const allowedEmailsResponse = await fetchAllowedEmails(currentToken);
      setAllowedEmails(allowedEmailsResponse);
      setError(null);
    } catch (loadError) {
      if (isUnauthorizedError(loadError)) {
        clearAdminToken();
        tokenRef.current = null;
        setToken(null);
        router.replace("/admin/login");
        return;
      }

      setError(
        loadError instanceof Error ? loadError.message : "Falha ao carregar os participantes."
      );
    } finally {
      setIsParticipantsLoading(false);
    }
  }

  function resetQuizBuilder() {
    setQuizForm(DEFAULT_QUIZ_FORM);
    setQuestionDrafts([createEmptyQuestion()]);
    setCreatedQuizId(null);
    setIsCreatingQuiz(false);
    setIsSubmittingQuestions(false);
  }

  function resetPasswordForm() {
    setPasswordForm(DEFAULT_PASSWORD_FORM);
    setPasswordVisibility(DEFAULT_PASSWORD_VISIBILITY);
    setIsChangingPassword(false);
  }

  function openDashboard() {
    setActiveView("dashboard");
  }

  function openResults(quizId: string) {
    setActiveView("results");
    setMessage(null);
    setError(null);

    if (!token) {
      return;
    }

    setSelectedQuizId(quizId);

    if (dashboard?.quiz.id !== quizId) {
      setDashboard(null);
    }

    void loadAdminData(token, quizId, { lockToQuiz: true });
  }

  function openQuizList() {
    setActiveView("quizzes");
    setQuizzesMode("list");
  }

  function openParticipants() {
    setActiveView("participants");
    setMessage(null);
    setError(null);
  }

  function openSettings() {
    resetPasswordForm();
    setActiveView("settings");
    setMessage(null);
    setError(null);
  }

  function openQuizCreator() {
    resetQuizBuilder();
    setMessage(null);
    setError(null);
    setActiveView("quizzes");
    setQuizzesMode("create");
  }

  function handleNavigationSelection(view: AdminView) {
    if (view === "dashboard") {
      openDashboard();
      return;
    }

    if (view === "quizzes") {
      openQuizList();
      return;
    }

    if (view === "participants") {
      openParticipants();
      return;
    }

    openSettings();
  }

  async function handleStartQuiz(quizId: string) {
    if (!token) {
      return;
    }

    setStartingQuizId(quizId);
    setSelectedQuizId(quizId);
    setError(null);
    setMessage(null);

    try {
      await apiFetch(
        `/admin/quizzes/${quizId}/force-start`,
        {
          method: "POST"
        },
        token
      );

      setMessage("Quiz iniciado com sucesso.");
      await loadAdminData(token, quizId);
    } catch (submissionError) {
      if (isUnauthorizedError(submissionError)) {
        clearAdminToken();
        tokenRef.current = null;
        setToken(null);
        router.replace("/admin/login");
        return;
      }

      setError(
        submissionError instanceof Error ? submissionError.message : "Falha ao iniciar o quiz."
      );
    } finally {
      setStartingQuizId(null);
    }
  }

  function handleLogout() {
    clearAdminToken();
    tokenRef.current = null;
    setToken(null);
    router.replace("/admin/login");
  }

  function handleExportResults() {
    if (!selectedQuiz || !dashboard?.ranking.length) {
      return;
    }

    const rows = dashboard.ranking.map((item) =>
      [
        item.position,
        item.name,
        item.score,
        item.totalTimeSeconds,
        item.totalTimeMilliseconds
      ]
        .map(escapeCsvValue)
        .join(",")
    );
    const csvContent = [
      ["posicao", "nome", "pontuacao", "tempo_total_segundos", "tempo_total_milissegundos"]
        .map(escapeCsvValue)
        .join(","),
      ...rows
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");

    anchor.href = url;
    anchor.download = getResultsFileName(selectedQuiz.title);
    window.document.body.appendChild(anchor);
    anchor.click();
    window.document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }

  function handleQuizFormChange(field: keyof QuizFormState, value: string) {
    setQuizForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  function handlePasswordFormChange(field: keyof PasswordFormState, value: string) {
    setPasswordForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  function togglePasswordVisibility(field: keyof PasswordVisibilityState) {
    setPasswordVisibility((currentVisibility) => ({
      ...currentVisibility,
      [field]: !currentVisibility[field]
    }));
  }

  async function handleAddParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    const validationError = validateAllowedEmail(participantEmail);
    if (validationError) {
      setError(validationError);
      setMessage(null);
      return;
    }

    setIsAddingParticipant(true);
    setError(null);
    setMessage(null);

    try {
      await apiFetch(
        "/admin/allowed-emails",
        {
          method: "POST",
          body: JSON.stringify({
            email: participantEmail.trim().toLowerCase()
          })
        },
        token
      );

      setParticipantEmail("");
      setMessage("Participante liberado com sucesso.");
      await loadAllowedEmails(token);
    } catch (submissionError) {
      if (isUnauthorizedError(submissionError)) {
        clearAdminToken();
        tokenRef.current = null;
        setToken(null);
        router.replace("/admin/login");
        return;
      }

      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Falha ao liberar o participante."
      );
    } finally {
      setIsAddingParticipant(false);
    }
  }

  async function handleRemoveParticipant(allowedEmailId: string) {
    if (!token) {
      return;
    }

    setRemovingParticipantId(allowedEmailId);
    setError(null);
    setMessage(null);

    try {
      await apiFetch(
        `/admin/allowed-emails/${allowedEmailId}`,
        {
          method: "DELETE"
        },
        token
      );

      setMessage("Participante removido com sucesso.");
      await loadAllowedEmails(token);
    } catch (submissionError) {
      if (isUnauthorizedError(submissionError)) {
        clearAdminToken();
        tokenRef.current = null;
        setToken(null);
        router.replace("/admin/login");
        return;
      }

      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Falha ao remover o participante."
      );
    } finally {
      setRemovingParticipantId(null);
    }
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    const validationError = validatePasswordForm(passwordForm);
    if (validationError) {
      setError(validationError);
      setMessage(null);
      return;
    }

    setIsChangingPassword(true);
    setError(null);
    setMessage(null);

    try {
      await apiFetch<ChangeAdminPasswordResponse>(
        "/auth/change-admin-password",
        {
          method: "POST",
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword
          })
        },
        token
      );

      resetPasswordForm();
      clearAdminToken();
      tokenRef.current = null;
      setToken(null);
      router.replace("/admin/login");
    } catch (submissionError) {
      if (isUnauthorizedError(submissionError)) {
        clearAdminToken();
        tokenRef.current = null;
        setToken(null);
        router.replace("/admin/login");
        return;
      }

      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Falha ao alterar a senha do administrador."
      );
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleCreateQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    const validationError = validateQuizForm(quizForm);
    if (validationError) {
      setError(validationError);
      setMessage(null);
      return;
    }

    setIsCreatingQuiz(true);
    setError(null);
    setMessage(null);

    try {
      const durationSeconds = Number(quizForm.durationSeconds);
      const createdQuiz = await apiFetch<CreatedQuizResponse>(
        "/admin/quizzes",
        {
          method: "POST",
          body: JSON.stringify({
            title: quizForm.title.trim(),
            startTime: new Date(quizForm.startTime).toISOString(),
            durationSeconds
          })
        },
        token
      );

      setCreatedQuizId(createdQuiz.id);
      setSelectedQuizId(createdQuiz.id);
      setQuizzesMode("questions");
      setMessage("Quiz criado. Agora adicione as perguntas.");
      await loadAdminData(token, createdQuiz.id);
    } catch (submissionError) {
      if (isUnauthorizedError(submissionError)) {
        clearAdminToken();
        tokenRef.current = null;
        setToken(null);
        router.replace("/admin/login");
        return;
      }

      setError(
        submissionError instanceof Error ? submissionError.message : "Falha ao criar o quiz."
      );
    } finally {
      setIsCreatingQuiz(false);
    }
  }

  function updateQuestionTitle(questionId: string, title: string) {
    setQuestionDrafts((currentQuestions) =>
      currentQuestions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              title
            }
          : question
      )
    );
  }

  function updateAlternativeText(questionId: string, alternativeId: string, text: string) {
    setQuestionDrafts((currentQuestions) =>
      currentQuestions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              alternatives: question.alternatives.map((alternative) =>
                alternative.id === alternativeId
                  ? {
                      ...alternative,
                      text
                    }
                  : alternative
              )
            }
          : question
      )
    );
  }

  function markAlternativeAsCorrect(questionId: string, alternativeId: string) {
    setQuestionDrafts((currentQuestions) =>
      currentQuestions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              alternatives: question.alternatives.map((alternative) => ({
                ...alternative,
                isCorrect: alternative.id === alternativeId
              }))
            }
          : question
      )
    );
  }

  function addAlternative(questionId: string) {
    setQuestionDrafts((currentQuestions) =>
      currentQuestions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              alternatives: [
                ...question.alternatives,
                {
                  id: createDraftId(),
                  text: "",
                  isCorrect: false
                }
              ]
            }
          : question
      )
    );
  }

  function removeAlternative(questionId: string, alternativeId: string) {
    setQuestionDrafts((currentQuestions) =>
      currentQuestions.map((question) => {
        if (
          question.id !== questionId ||
          question.alternatives.length <= MIN_ALTERNATIVES_PER_QUESTION
        ) {
          return question;
        }

        return {
          ...question,
          alternatives: question.alternatives.filter((alternative) => alternative.id !== alternativeId)
        };
      })
    );
  }

  function addQuestion() {
    setQuestionDrafts((currentQuestions) => [...currentQuestions, createEmptyQuestion()]);
  }

  function removeQuestion(questionId: string) {
    setQuestionDrafts((currentQuestions) => {
      if (currentQuestions.length <= MIN_QUESTIONS_PER_QUIZ) {
        return currentQuestions;
      }

      return currentQuestions.filter((question) => question.id !== questionId);
    });
  }

  async function handleFinalizeQuiz() {
    if (!token || !createdQuizId) {
      return;
    }

    const validationError = validateQuestionDrafts(questionDrafts);
    if (validationError) {
      setError(validationError);
      setMessage(null);
      return;
    }

    setIsSubmittingQuestions(true);
    setError(null);
    setMessage(null);

    try {
      const latestQuizzes = await fetchAdminQuizzes(token);
      const persistedQuiz = latestQuizzes.find((quiz) => quiz.id === createdQuizId);

      for (const [questionIndex, question] of questionDrafts.entries()) {
        const existingQuestion = persistedQuiz?.questions.find(
          (storedQuestion) => storedQuestion.order === questionIndex + 1
        );

        const persistedQuestion =
          existingQuestion ??
          (await apiFetch<CreatedQuestionResponse>(
            `/admin/quizzes/${createdQuizId}/questions`,
            {
              method: "POST",
              body: JSON.stringify({
                title: question.title.trim(),
                order: questionIndex + 1
              })
            },
            token
          ));

        const persistedAlternatives = existingQuestion?.alternatives ?? [];

        for (const [alternativeIndex, alternative] of question.alternatives.entries()) {
          const existingAlternative = persistedAlternatives.find(
            (storedAlternative) => storedAlternative.order === alternativeIndex + 1
          );

          if (existingAlternative) {
            continue;
          }

          await apiFetch(
            `/admin/questions/${persistedQuestion.id}/alternatives`,
            {
              method: "POST",
              body: JSON.stringify({
                text: alternative.text.trim(),
                isCorrect: alternative.isCorrect,
                order: alternativeIndex + 1
              })
            },
            token
          );
        }
      }

      await loadAdminData(token, createdQuizId);
      resetQuizBuilder();
      setActiveView("quizzes");
      setQuizzesMode("list");
      setMessage("Quiz finalizado e listado com sucesso.");
    } catch (submissionError) {
      if (isUnauthorizedError(submissionError)) {
        clearAdminToken();
        tokenRef.current = null;
        setToken(null);
        router.replace("/admin/login");
        return;
      }

      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Falha ao cadastrar as perguntas do quiz."
      );
    } finally {
      setIsSubmittingQuestions(false);
    }
  }

  const canStartSelectedQuiz =
    Boolean(selectedQuiz) &&
    selectedQuiz?.status !== "RUNNING" &&
    selectedQuiz?.status !== "FINISHED";

  const canViewResults = Boolean(selectedQuizId);
  const canExportResults = Boolean(dashboard?.ranking.length);
  const participantSummaryLabel =
    selectedQuiz?.status === "RUNNING" || selectedQuiz?.status === "FINISHED"
      ? "Já entraram na rodada"
      : "Confirmaram presença";
  const pageEyebrow =
    activeView === "dashboard"
      ? "Visão geral"
      : activeView === "results"
        ? "Resultado do quiz"
      : activeView === "participants"
        ? "Acesso"
        : activeView === "settings"
          ? "Segurança"
        : quizzesMode === "list"
          ? "Operação"
          : quizzesMode === "create"
            ? "Novo quiz"
            : "Estrutura";
  const pageTitle =
    activeView === "dashboard"
      ? "Dashboard"
      : activeView === "results"
        ? "Resultados"
      : activeView === "participants"
        ? "Participantes"
        : activeView === "settings"
          ? "Configurações"
        : quizzesMode === "list"
          ? "Quizzes"
          : quizzesMode === "create"
            ? "Criar Quiz"
            : "Adicionar Perguntas";
  const pageSubtitle =
    activeView === "dashboard"
      ? "Aqui o admin bate o olho e entende tudo."
      : activeView === "results"
        ? "Lista completa do ranking com exportação em CSV dentro do painel administrativo."
      : activeView === "participants"
        ? "Gerencie os e-mails com acesso liberado para entrar nas rodadas."
        : activeView === "settings"
          ? "Atualize a senha da conta administrativa usada nesta sessão."
        : quizzesMode === "list"
          ? "Veja o quiz em andamento e acompanhe as rodadas mais recentes."
          : quizzesMode === "create"
            ? "Cadastre os dados básicos da próxima rodada."
            : "Monte as perguntas e marque a alternativa correta de cada uma.";

  if (!isReady || !token) {
    return <div className="admin-app admin-app--loading" />;
  }

  return (
    <div className="admin-app">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-sidebar__brand">
            <span className="admin-brand__mark">
              <Icon className="h-5 w-5" name="shield" />
            </span>
            <div>
              <p className="admin-brand__eyebrow">Quiz Admin</p>
              <p className="admin-brand__name">Guidance</p>
            </div>
          </div>

          <nav aria-label="Admin navigation" className="admin-sidebar__nav">
            {sidebarNavigationItems.map((item) => {
              const isActive = item.view === activeView;
              return (
                <button
                  aria-pressed={isActive}
                  className={`admin-sidebar__item${isActive ? " is-active" : ""}`}
                  key={item.view}
                  onClick={() => {
                    handleNavigationSelection(item.view);
                  }}
                  type="button"
                >
                  <span className="admin-sidebar__icon">
                    <Icon className="h-4 w-4" name={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="admin-sidebar__footer">
            <button className="admin-logout admin-logout--sidebar" onClick={handleLogout} type="button">
              <Icon className="h-4 w-4" name="logout" />
              <span>Sair</span>
            </button>
          </div>
        </aside>

        <div className="admin-content-shell">
          <header className="admin-topbar">
            <div className="admin-topbar__spacer" />

            <div className="admin-topbar__actions">
              <div className="admin-user">
                <span className="admin-user__name">Admin</span>
                <span className="admin-user__avatar">A</span>
              </div>
            </div>
          </header>

          <main className="admin-main">
            <div className="admin-main__header">
              <div>
                <p className="admin-main__eyebrow">{pageEyebrow}</p>
                <h1 className="admin-main__title">{pageTitle}</h1>
                <p className="admin-main__subtitle">{pageSubtitle}</p>
              </div>

              {(activeView === "dashboard" || activeView === "results") && selectedQuiz ? (
                <span className={getStatusClassName(selectedQuiz.status)}>
                  {formatStatusLabel(selectedQuiz.status)}
                </span>
              ) : null}
            </div>

            <div className="admin-alert-stack">
              {message ? <p className="message-success">{message}</p> : null}
              {error ? <p className="message-error">{error}</p> : null}
            </div>

            {activeView === "dashboard" ? (
              <section aria-busy={isRefreshing} className="admin-dashboard-card">
                <div className="admin-overview">
                  <article className="admin-overview__item admin-overview__item--highlight">
                    <span className="admin-overview__icon">
                      <Icon className="h-5 w-5" name="layers" />
                    </span>
                    <div className="admin-overview__content">
                      <p className="admin-overview__label">Quiz Ativo</p>
                      <p className="admin-overview__value admin-overview__value--title">
                        {selectedQuiz?.title ?? "Nenhum quiz disponível"}
                      </p>
                      <p className="admin-overview__meta">
                        {selectedQuiz
                          ? formatStatusLabel(selectedQuiz.status)
                          : "Cadastre uma rodada para começar"}
                      </p>
                    </div>
                  </article>

                  <article className="admin-overview__item">
                    <span className="admin-overview__icon admin-overview__icon--neutral">
                      <Icon className="h-5 w-5" name="users" />
                    </span>
                    <div className="admin-overview__content">
                      <p className="admin-overview__label">Participantes</p>
                      <p className="admin-overview__value">{dashboard?.enteredParticipants ?? 0}</p>
                      <p className="admin-overview__meta">{participantSummaryLabel}</p>
                    </div>
                  </article>

                  <article className="admin-overview__item">
                    <span className="admin-overview__icon admin-overview__icon--neutral">
                      <Icon className="h-5 w-5" name="clock" />
                    </span>
                    <div className="admin-overview__content">
                      <p className="admin-overview__label">Tempo</p>
                      <p className="admin-overview__value">{timeSummary.value}</p>
                      <p className="admin-overview__meta">{timeSummary.label}</p>
                    </div>
                  </article>
                </div>

                <div className="admin-divider" />

                <section className="admin-section">
                  <div className="admin-section__title">
                    <Icon className="h-5 w-5" name="chart" />
                    <span>Estatísticas rápidas</span>
                  </div>

                  <div className="admin-stat-list">
                    <div className="admin-stat-row">
                      <span>Total participantes</span>
                      <strong>{dashboard?.totalParticipants ?? 0}</strong>
                    </div>
                    <div className="admin-stat-row">
                      <span>Já responderam</span>
                      <strong>{dashboard?.finishedParticipants ?? 0}</strong>
                    </div>
                    <div className="admin-stat-row">
                      <span>Média de acertos</span>
                      <strong>{averageScore}</strong>
                    </div>
                  </div>
                </section>

                <div className="admin-divider" />

                <section className="admin-section">
                  <div className="admin-section__title">
                    <Icon className="h-5 w-5" name="bolt" />
                    <span>Ações rápidas</span>
                  </div>

                  <div className="admin-actions">
                    <button
                      className="admin-button admin-button--primary"
                      disabled={!canStartSelectedQuiz || startingQuizId === selectedQuizId}
                      onClick={() => {
                        if (selectedQuizId) {
                          void handleStartQuiz(selectedQuizId);
                        }
                      }}
                      type="button"
                    >
                      {startingQuizId === selectedQuizId ? "Iniciando..." : "Iniciar Quiz"}
                    </button>

                    <button
                      className="admin-button admin-button--secondary"
                      onClick={openQuizList}
                      type="button"
                    >
                      Ver Quizzes
                    </button>

                    <button
                      className="admin-button admin-button--dark"
                      disabled={!canViewResults}
                      onClick={() => {
                        openResults(selectedQuizId);
                      }}
                      type="button"
                    >
                      Ver Ranking
                    </button>
                  </div>
                </section>
              </section>
            ) : activeView === "results" ? (
              <section aria-busy={isRefreshing} className="admin-dashboard-card">
                <div className="admin-results__toolbar">
                  <div className="admin-section__title">
                    <Icon className="h-5 w-5" name="trophy" />
                    <span>Resultado do Quiz</span>
                  </div>

                  <button
                    className="admin-button admin-button--dark"
                    disabled={!canExportResults}
                    onClick={handleExportResults}
                    type="button"
                  >
                    Exportar CSV
                  </button>
                </div>

                {selectedQuiz ? (
                  <section className="admin-results__hero">
                    <div className="admin-results__copy">
                      <p className="admin-results__eyebrow">Ranking completo</p>
                      <h2 className="admin-results__title">{selectedQuiz.title}</h2>
                      <p className="admin-results__description">
                        Resultado consolidado do quiz selecionado dentro da área administrativa.
                      </p>
                    </div>

                    <div className="admin-results__meta">
                      <span className="admin-results__pill">
                        Perguntas: {selectedQuizDetails?.questions.length ?? 0}
                      </span>
                      <span className="admin-results__pill">
                        Finalizados: {dashboard?.finishedParticipants ?? 0}
                      </span>
                      <span className="admin-results__pill">
                        Início: {formatQuizStart(selectedQuiz.startTime)}
                      </span>
                    </div>
                  </section>
                ) : null}

                {isRefreshing && !dashboard ? (
                  <div className="admin-empty-state">
                    <span className="admin-empty-state__icon">
                      <Icon className="h-5 w-5" name="chart" />
                    </span>
                    <div>
                      <p className="admin-empty-state__title">Carregando resultado do quiz.</p>
                      <p className="admin-empty-state__text">
                        O ranking completo será exibido assim que os dados forem atualizados.
                      </p>
                    </div>
                  </div>
                ) : dashboard?.ranking.length ? (
                  <div className="admin-results__list">
                    {dashboard.ranking.map((item) => (
                      <article className="admin-result-row" key={item.participantId}>
                        <div className="admin-result-row__position">#{item.position}</div>

                        <div className="admin-result-row__identity">
                          <p className="admin-result-row__name">{item.name}</p>
                          <p className="admin-result-row__caption">Participante ranqueado</p>
                        </div>

                        <div className="admin-result-row__stat">
                          <span>Pontuação</span>
                          <strong>{item.score}</strong>
                        </div>

                        <div className="admin-result-row__stat">
                          <span>Tempo total</span>
                          <strong>{formatElapsedTime(item)}</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : selectedQuiz ? (
                  <div className="admin-empty-state">
                    <span className="admin-empty-state__icon">
                      <Icon className="h-5 w-5" name="trophy" />
                    </span>
                    <div>
                      <p className="admin-empty-state__title">Ainda não há ranking para este quiz.</p>
                      <p className="admin-empty-state__text">
                        O resultado aparecerá aqui quando houver participantes finalizados.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="admin-empty-state">
                    <span className="admin-empty-state__icon">
                      <Icon className="h-5 w-5" name="layers" />
                    </span>
                    <div>
                      <p className="admin-empty-state__title">Nenhum quiz selecionado.</p>
                      <p className="admin-empty-state__text">
                        Abra um resultado a partir do dashboard, da lista de quizzes ou pelo menu lateral.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            ) : activeView === "participants" ? (
              <section aria-busy={isParticipantsLoading} className="admin-dashboard-card">
                <section className="admin-section">
                  <div className="admin-section__title">
                    <Icon className="h-5 w-5" name="users" />
                    <span>Participantes liberados</span>
                  </div>

                  <form className="admin-participants__form" onSubmit={handleAddParticipant}>
                    <label className="admin-participants__field">
                      <span className="admin-participants__label">E-mail</span>
                      <input
                        className="admin-login__input"
                        inputMode="email"
                        onChange={(event) => {
                          setParticipantEmail(event.target.value);
                        }}
                        placeholder="email@guidance.com"
                        type="email"
                        value={participantEmail}
                      />
                    </label>

                    <button
                      className="admin-button admin-button--primary admin-participants__submit"
                      disabled={isAddingParticipant}
                      type="submit"
                    >
                      <span>{isAddingParticipant ? "Salvando..." : "Adicionar"}</span>
                    </button>
                  </form>

                  <p className="admin-section__note">
                    Cadastre quem pode acessar o quiz usando o e-mail corporativo liberado.
                  </p>
                </section>

                <div className="admin-divider" />

                {allowedEmails.length > 0 ? (
                  <div className="admin-participants__list">
                    {allowedEmails.map((allowedEmail) => (
                      <article className="admin-participant-row" key={allowedEmail.id}>
                        <div className="admin-participant-row__content">
                          <span className="admin-participant-row__email">{allowedEmail.email}</span>
                        </div>

                        <button
                          className="admin-button admin-button--secondary admin-button--inline"
                          disabled={removingParticipantId === allowedEmail.id}
                          onClick={() => {
                            void handleRemoveParticipant(allowedEmail.id);
                          }}
                          type="button"
                        >
                          {removingParticipantId === allowedEmail.id ? "Removendo..." : "remover"}
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="admin-empty-state">
                    <span className="admin-empty-state__icon">
                      <Icon className="h-5 w-5" name="users" />
                    </span>
                    <div>
                      <p className="admin-empty-state__title">Nenhum participante liberado ainda.</p>
                      <p className="admin-empty-state__text">
                        Adicione um e-mail para controlar quem pode entrar nas rodadas.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            ) : activeView === "settings" ? (
              <section className="admin-dashboard-card">
                <section className="admin-section">
                  <div className="admin-section__title">
                    <Icon className="h-5 w-5" name="shield" />
                    <span>Alterar senha</span>
                  </div>

                  <form className="admin-form-layout" onSubmit={handleChangePassword}>
                    <label className="admin-form-field">
                      <span>Senha atual</span>
                      <input
                        autoComplete="current-password"
                        className="admin-login__input"
                        onChange={(event) => {
                          handlePasswordFormChange("currentPassword", event.target.value);
                        }}
                        placeholder="Digite a senha atual"
                        type="password"
                        value={passwordForm.currentPassword}
                      />
                    </label>

                    <label className="admin-form-field">
                      <span>Nova senha</span>
                      <div className="admin-input-with-action">
                        <input
                          autoComplete="new-password"
                          className="admin-login__input"
                          id="admin-new-password"
                          minLength={ADMIN_PASSWORD_MIN_LENGTH}
                          onChange={(event) => {
                            handlePasswordFormChange("newPassword", event.target.value);
                          }}
                          placeholder={`Mínimo de ${ADMIN_PASSWORD_MIN_LENGTH} caracteres`}
                          type={passwordVisibility.newPassword ? "text" : "password"}
                          value={passwordForm.newPassword}
                        />
                        <button
                          aria-label={
                            passwordVisibility.newPassword ? "Ocultar nova senha" : "Mostrar nova senha"
                          }
                          aria-pressed={passwordVisibility.newPassword}
                          className="admin-input-action"
                          onClick={() => {
                            togglePasswordVisibility("newPassword");
                          }}
                          type="button"
                        >
                          <Icon
                            className="h-5 w-5"
                            name={passwordVisibility.newPassword ? "eyeOff" : "eye"}
                          />
                        </button>
                      </div>
                    </label>

                    <label className="admin-form-field">
                      <span>Confirmar nova senha</span>
                      <div className="admin-input-with-action">
                        <input
                          autoComplete="new-password"
                          className="admin-login__input"
                          id="admin-confirm-password"
                          minLength={ADMIN_PASSWORD_MIN_LENGTH}
                          onChange={(event) => {
                            handlePasswordFormChange("confirmPassword", event.target.value);
                          }}
                          placeholder="Repita a nova senha"
                          type={passwordVisibility.confirmPassword ? "text" : "password"}
                          value={passwordForm.confirmPassword}
                        />
                        <button
                          aria-label={
                            passwordVisibility.confirmPassword
                              ? "Ocultar confirmação da nova senha"
                              : "Mostrar confirmação da nova senha"
                          }
                          aria-pressed={passwordVisibility.confirmPassword}
                          className="admin-input-action"
                          onClick={() => {
                            togglePasswordVisibility("confirmPassword");
                          }}
                          type="button"
                        >
                          <Icon
                            className="h-5 w-5"
                            name={passwordVisibility.confirmPassword ? "eyeOff" : "eye"}
                          />
                        </button>
                      </div>
                    </label>

                    <p className="admin-section__note">
                      Depois de salvar, a sessão atual será encerrada e o login precisará ser feito
                      novamente com a nova senha.
                    </p>

                    <div className="admin-actions">
                      <button
                        className="admin-button admin-button--secondary"
                        onClick={openDashboard}
                        type="button"
                      >
                        Voltar
                      </button>
                      <button
                        className="admin-button admin-button--primary"
                        disabled={
                          isChangingPassword ||
                          !passwordForm.currentPassword ||
                          !passwordForm.newPassword ||
                          !passwordForm.confirmPassword
                        }
                        type="submit"
                      >
                        {isChangingPassword ? "Salvando..." : "Alterar senha"}
                      </button>
                    </div>
                  </form>
                </section>
              </section>
            ) : quizzesMode === "list" ? (
              <section aria-busy={isRefreshing} className="admin-dashboard-card">
                <div className="admin-quizzes__toolbar">
                  <div className="admin-section__title">
                    <Icon className="h-5 w-5" name="layers" />
                    <span>Quizzes cadastrados</span>
                  </div>

                  <button
                    className="admin-button admin-button--primary"
                    onClick={openQuizCreator}
                    type="button"
                  >
                    <span>Criar Novo Quiz</span>
                  </button>
                </div>

                {orderedQuizzes.length > 0 ? (
                  <div className="admin-quiz-list">
                    {orderedQuizzes.map((quiz) => {
                      const isRunning = quiz.status === "RUNNING";
                      const canStartQuiz =
                        quiz.status !== "RUNNING" &&
                        quiz.status !== "FINISHED" &&
                        startingQuizId !== quiz.id;

                      return (
                        <article
                          className={`admin-quiz-card${isRunning ? " is-running" : ""}`}
                          key={quiz.id}
                        >
                          <div className="admin-quiz-card__header">
                            <div className="admin-quiz-card__copy">
                              {isRunning ? (
                                <span className="admin-quiz-card__tag">Em andamento agora</span>
                              ) : null}
                              <h2 className="admin-quiz-card__title">{quiz.title}</h2>
                              <div className="admin-quiz-card__meta">
                                <span>Início: {formatQuizStart(quiz.startTime)}</span>
                                <span>Duração: {formatDurationLabel(quiz.durationSeconds)}</span>
                                <span>Perguntas: {quiz.questions.length}</span>
                              </div>
                            </div>

                            <span className={getStatusClassName(quiz.status)}>
                              {formatStatusLabel(quiz.status)}
                            </span>
                          </div>

                          <div className="admin-actions">
                            {quiz.status !== "FINISHED" ? (
                              <button
                                className="admin-button admin-button--primary"
                                disabled={!canStartQuiz}
                                onClick={() => {
                                  void handleStartQuiz(quiz.id);
                                }}
                                type="button"
                              >
                                {startingQuizId === quiz.id ? "Iniciando..." : "Forçar Início"}
                              </button>
                            ) : null}

                            <button
                              className="admin-button admin-button--dark"
                              onClick={() => {
                                openResults(quiz.id);
                              }}
                              type="button"
                            >
                              Ver Resultado
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="admin-empty-state">
                    <span className="admin-empty-state__icon">
                      <Icon className="h-5 w-5" name="layers" />
                    </span>
                    <div>
                      <p className="admin-empty-state__title">Nenhum quiz cadastrado ainda.</p>
                      <p className="admin-empty-state__text">
                        Crie a primeira rodada para começar a operação do admin.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            ) : quizzesMode === "create" ? (
              <section className="admin-dashboard-card">
                <div className="admin-form-progress">
                  <div className="admin-form-step is-active">
                    <span className="admin-form-step__number">1</span>
                    <span>Criar Quiz</span>
                  </div>
                  <div className="admin-form-step">
                    <span className="admin-form-step__number">2</span>
                    <span>Adicionar Perguntas</span>
                  </div>
                </div>

                <form className="admin-form-layout" onSubmit={handleCreateQuiz}>
                  <label className="admin-form-field">
                    <span>Nome do Quiz</span>
                    <input
                      className="admin-login__input"
                      onChange={(event) => {
                        handleQuizFormChange("title", event.target.value);
                      }}
                      placeholder="Ex: Cultura Guidance"
                      type="text"
                      value={quizForm.title}
                    />
                  </label>

                  <label className="admin-form-field">
                    <span>Data/Hora início</span>
                    <input
                      className="admin-login__input"
                      onChange={(event) => {
                        handleQuizFormChange("startTime", event.target.value);
                      }}
                      type="datetime-local"
                      value={quizForm.startTime}
                    />
                  </label>

                  <label className="admin-form-field admin-form-field--compact">
                    <span>Duração (segundos)</span>
                    <input
                      className="admin-login__input"
                      min={60}
                      onChange={(event) => {
                        handleQuizFormChange("durationSeconds", event.target.value);
                      }}
                      placeholder="300"
                      step={1}
                      type="number"
                      value={quizForm.durationSeconds}
                    />
                  </label>

                  <div className="admin-actions">
                    <button
                      className="admin-button admin-button--secondary"
                      onClick={openQuizList}
                      type="button"
                    >
                      Voltar
                    </button>
                    <button
                      className="admin-button admin-button--primary"
                      disabled={isCreatingQuiz}
                      type="submit"
                    >
                      {isCreatingQuiz ? "Criando..." : "Continuar"}
                    </button>
                  </div>
                </form>
              </section>
            ) : (
              <section className="admin-dashboard-card">
                <div className="admin-form-progress">
                  <div className="admin-form-step is-complete">
                    <span className="admin-form-step__number">1</span>
                    <span>Criar Quiz</span>
                  </div>
                  <div className="admin-form-step is-active">
                    <span className="admin-form-step__number">2</span>
                    <span>Adicionar Perguntas</span>
                  </div>
                </div>

                <div className="admin-question-list">
                  {questionDrafts.map((question, questionIndex) => (
                    <article className="admin-question-card" key={question.id}>
                      <div className="admin-question-card__header">
                        <div className="admin-question-card__copy">
                          <p className="admin-question-card__eyebrow">Pergunta {questionIndex + 1}</p>
                          <h2 className="admin-question-card__title">Estruture a pergunta</h2>
                        </div>
                        <div className="admin-question-card__actions">
                          <span className="admin-question-card__badge">
                            {question.alternatives.length} alternativas
                          </span>
                          <button
                            className="admin-button admin-button--secondary admin-button--inline admin-button--danger"
                            disabled={questionDrafts.length <= MIN_QUESTIONS_PER_QUIZ}
                            onClick={() => {
                              removeQuestion(question.id);
                            }}
                            type="button"
                          >
                            <Icon className="h-4 w-4" name="trash" />
                            <span>Remover pergunta</span>
                          </button>
                        </div>
                      </div>

                      <label className="admin-form-field">
                        <span>Texto da pergunta</span>
                        <input
                          className="admin-login__input"
                          onChange={(event) => {
                            updateQuestionTitle(question.id, event.target.value);
                          }}
                          placeholder={`Digite a Pergunta ${questionIndex + 1}`}
                          type="text"
                          value={question.title}
                        />
                      </label>

                      <div className="admin-question-card__alternatives">
                        {question.alternatives.map((alternative, alternativeIndex) => (
                          <div className="admin-alternative-row" key={alternative.id}>
                            <label className="admin-form-field">
                              <span>Alternativa {alternativeIndex + 1}</span>
                              <input
                                className="admin-login__input"
                                onChange={(event) => {
                                  updateAlternativeText(
                                    question.id,
                                    alternative.id,
                                    event.target.value
                                  );
                                }}
                                placeholder={`Opção ${alternativeIndex + 1}`}
                                type="text"
                                value={alternative.text}
                              />
                            </label>

                            <label
                              className={`admin-correct-toggle${alternative.isCorrect ? " is-active" : ""}`}
                            >
                              <input
                                checked={alternative.isCorrect}
                                className="admin-correct-toggle__input"
                                name={`question-${question.id}-correct`}
                                onChange={() => {
                                  markAlternativeAsCorrect(question.id, alternative.id);
                                }}
                                type="radio"
                              />
                              <span className="admin-correct-toggle__mark">
                                {alternative.isCorrect ? <Icon className="h-4 w-4" name="check" /> : null}
                              </span>
                              <span>Correta</span>
                            </label>

                            <button
                              className="admin-button admin-button--secondary admin-button--inline admin-button--danger"
                              disabled={
                                question.alternatives.length <= MIN_ALTERNATIVES_PER_QUESTION
                              }
                              onClick={() => {
                                removeAlternative(question.id, alternative.id);
                              }}
                              type="button"
                            >
                              <Icon className="h-4 w-4" name="trash" />
                              <span>Remover</span>
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        className="admin-button admin-button--secondary admin-button--inline"
                        onClick={() => {
                          addAlternative(question.id);
                        }}
                        type="button"
                      >
                        <span>Adicionar alternativa</span>
                      </button>
                    </article>
                  ))}
                </div>

                <div className="admin-actions">
                  <button
                    className="admin-button admin-button--secondary"
                    onClick={addQuestion}
                    type="button"
                  >
                    <span>Nova pergunta</span>
                  </button>

                  <button
                    className="admin-button admin-button--dark"
                    disabled={isSubmittingQuestions}
                    onClick={() => {
                      void handleFinalizeQuiz();
                    }}
                    type="button"
                  >
                    {isSubmittingQuestions ? "Salvando..." : "Finalizar Quiz"}
                  </button>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      <nav aria-label="Admin mobile navigation" className="admin-mobile-nav">
        {mobileNavigationItems.map((item) => {
          const isActive = item.view === activeView;

          return (
            <button
              aria-pressed={isActive}
              className={`admin-mobile-nav__item${isActive ? " is-active" : ""}`}
              key={item.view}
              onClick={() => {
                handleNavigationSelection(item.view);
              }}
              type="button"
            >
              <span className="admin-mobile-nav__icon">
                <Icon className="h-5 w-5" name={item.icon} />
              </span>
              <span className="admin-mobile-nav__label">{item.mobileLabel}</span>
            </button>
          );
        })}

        <button
          className="admin-mobile-nav__item admin-mobile-nav__item--logout"
          onClick={handleLogout}
          type="button"
        >
          <span className="admin-mobile-nav__icon">
            <Icon className="h-5 w-5" name="logout" />
          </span>
          <span className="admin-mobile-nav__label">Sair</span>
        </button>
      </nav>
    </div>
  );
}
