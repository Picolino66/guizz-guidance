"use client"

import type { FormEvent } from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { redirectIfUnauthorized } from "../../lib/api"
import { whatsappFetch, type WhatsappAutomation, type WhatsappConnection } from "../../lib/whatsapp-api"

const KIND_OPTIONS: Array<{ value: WhatsappAutomation["kind"]; label: string }> = [
  { value: "ONE_SHOT", label: "Aviso único" },
  { value: "REMINDER", label: "Lembrete" },
  { value: "DAILY", label: "Diário" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "MONTHLY", label: "Mensal" },
  { value: "BIRTHDAY", label: "Aniversário" }
]

export function WhatsappAutomationsPageClient() {
  const router = useRouter()
  const [automations, setAutomations] = useState<WhatsappAutomation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [connection, setConnection] = useState<WhatsappConnection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [title, setTitle] = useState("")
  const [kind, setKind] = useState<WhatsappAutomation["kind"]>("ONE_SHOT")
  const [scheduleDate, setScheduleDate] = useState("")
  const [timeOfDay, setTimeOfDay] = useState("09:00")
  const [targetGroupJid, setTargetGroupJid] = useState("")
  const [daysOfWeek, setDaysOfWeek] = useState("1,2,3,4,5")
  const [dayOfMonth, setDayOfMonth] = useState("1")
  const [monthDay, setMonthDay] = useState("01-01")

  async function loadAutomations() {
    setLoading(true)
    setError(null)
    try {
      const [data, status] = await Promise.all([
        whatsappFetch<WhatsappAutomation[]>("/whatsapp/automations"),
        whatsappFetch<WhatsappConnection>("/whatsapp/status")
      ])
      setAutomations(data)
      setConnection(status)
    } catch (err) {
      if (redirectIfUnauthorized(err, () => router.replace("/login"))) return
      setError(err instanceof Error ? err.message : "Não foi possível carregar as automações.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAutomations()
  }, [])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const payload: Record<string, unknown> = {
      title,
      message,
      kind,
      targetGroupJid: targetGroupJid || undefined
    }

    if (kind === "ONE_SHOT" || kind === "REMINDER") {
      payload.scheduledFor = scheduleDate ? new Date(scheduleDate).toISOString() : ""
    }

    if (kind === "DAILY" || kind === "WEEKLY" || kind === "MONTHLY" || kind === "BIRTHDAY") {
      payload.timeOfDay = timeOfDay
    }

    if (kind === "WEEKLY") {
      payload.daysOfWeek = daysOfWeek
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value))
    }

    if (kind === "MONTHLY") {
      payload.dayOfMonth = Number(dayOfMonth)
    }

    if (kind === "BIRTHDAY") {
      payload.monthDay = monthDay
    }

    try {
      await whatsappFetch("/whatsapp/automations", {
        method: "POST",
        body: JSON.stringify(payload)
      })

      setTitle("")
      setMessage("")
      await loadAutomations()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a automação.")
    } finally {
      setSaving(false)
    }
  }

  async function runNow(id: string) {
    setBusyAction(id)
    setError(null)

    try {
      await whatsappFetch(`/whatsapp/automations/${id}/run-now`, { method: "POST" })
      await loadAutomations()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível disparar a automação.")
    } finally {
      setBusyAction(null)
    }
  }

  async function toggleAutomation(id: string) {
    setBusyAction(id)
    setError(null)

    try {
      await whatsappFetch(`/whatsapp/automations/${id}/toggle`, { method: "PATCH" })
      await loadAutomations()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível alterar o status da automação.")
    } finally {
      setBusyAction(null)
    }
  }

  async function removeAutomation(id: string) {
    setBusyAction(id)
    setError(null)

    try {
      await whatsappFetch(`/whatsapp/automations/${id}`, { method: "DELETE" })
      await loadAutomations()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir a automação.")
    } finally {
      setBusyAction(null)
    }
  }

  const canDispatch = connection?.status === "READY"

  return (
    <section className="whatsapp-page">
      <header className="whatsapp-page__hero">
        <div>
          <p className="whatsapp-page__eyebrow">Automações</p>
          <h2 className="whatsapp-page__title">Crie regras para aniversários, lembretes e disparos recorrentes</h2>
          <p className="whatsapp-page__subtitle">
            Cada automação grava seu próximo agendamento, última execução e status operacional.
          </p>
          <p className="whatsapp-page__hint">
            Sessão atual: {connection?.status ?? "carregando"}. Disparos manuais exigem sessão READY.
          </p>
        </div>
      </header>

      {error && <div className="whatsapp-alert whatsapp-alert--error">{error}</div>}

      <div className="whatsapp-grid">
        <section className="whatsapp-card">
          <div className="whatsapp-card__header">
            <div>
              <p className="whatsapp-card__eyebrow">Nova automação</p>
              <h3 className="whatsapp-card__title">Cadastrar regra</h3>
            </div>
          </div>

          <form className="whatsapp-form" onSubmit={handleCreate}>
            <label>
              <span>Título</span>
              <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Aniversário da equipe" />
            </label>

            <label>
              <span>Mensagem</span>
              <textarea required value={message} onChange={(event) => setMessage(event.target.value)} rows={5} placeholder="Bom dia, hoje é..." />
            </label>

            <label>
              <span>Tipo</span>
              <select value={kind} onChange={(event) => setKind(event.target.value as WhatsappAutomation["kind"])}>
                {KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Grupo alvo</span>
              <input value={targetGroupJid} onChange={(event) => setTargetGroupJid(event.target.value)} placeholder="Opcional: 120363000000000000@g.us" />
            </label>

            {(kind === "ONE_SHOT" || kind === "REMINDER") && (
              <label>
                <span>Data e hora</span>
                <input required type="datetime-local" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} />
              </label>
            )}

            {(kind === "DAILY" || kind === "WEEKLY" || kind === "MONTHLY" || kind === "BIRTHDAY") && (
              <label>
                <span>Horário</span>
                <input required type="time" value={timeOfDay} onChange={(event) => setTimeOfDay(event.target.value)} />
              </label>
            )}

            {kind === "WEEKLY" && (
              <label>
                <span>Dias da semana (0 a 6)</span>
                <input required value={daysOfWeek} onChange={(event) => setDaysOfWeek(event.target.value)} placeholder="1,2,3,4,5" />
              </label>
            )}

            {kind === "MONTHLY" && (
              <label>
                <span>Dia do mês</span>
                <input required value={dayOfMonth} onChange={(event) => setDayOfMonth(event.target.value)} placeholder="1" />
              </label>
            )}

            {kind === "BIRTHDAY" && (
              <label>
                <span>Mês e dia</span>
                <input required value={monthDay} onChange={(event) => setMonthDay(event.target.value)} placeholder="MM-DD" />
              </label>
            )}

            <button className="whatsapp-button" disabled={saving}>
              {saving ? "Salvando..." : "Criar automação"}
            </button>
          </form>
        </section>

        <section className="whatsapp-card">
          <div className="whatsapp-card__header">
            <div>
              <p className="whatsapp-card__eyebrow">Lista</p>
              <h3 className="whatsapp-card__title">Automações cadastradas</h3>
            </div>
          </div>

          <div className="whatsapp-list whatsapp-list--tall">
            {loading ? (
              <p className="whatsapp-empty">Carregando automações...</p>
            ) : automations.length === 0 ? (
              <p className="whatsapp-empty">Nenhuma automação cadastrada ainda.</p>
            ) : (
              automations.map((automation) => (
                <article className="whatsapp-list-item" key={automation.id}>
                  <div>
                    <strong>{automation.title}</strong>
                    <p>
                      {automation.kind} · {automation.nextRunAt ? `Próxima execução em ${new Date(automation.nextRunAt).toLocaleString("pt-BR")}` : "Sem agendamento"}
                    </p>
                  </div>

                  <div className="whatsapp-list-item__actions">
                    <span className={`whatsapp-pill whatsapp-pill--${automation.status.toLowerCase()}`}>{automation.status}</span>
                    <button className="whatsapp-button whatsapp-button--ghost" onClick={() => void toggleAutomation(automation.id)} disabled={busyAction === automation.id}>
                      {automation.status === "ACTIVE" ? "Pausar" : "Ativar"}
                    </button>
                    <button
                      className="whatsapp-button"
                      onClick={() => void runNow(automation.id)}
                      disabled={!canDispatch || busyAction === automation.id}
                      title={canDispatch ? "Disparar agora" : "Conecte a sessão WhatsApp antes de disparar"}
                    >
                      {busyAction === automation.id ? "Processando..." : "Disparar"}
                    </button>
                    <button className="whatsapp-button whatsapp-button--danger" onClick={() => void removeAutomation(automation.id)} disabled={busyAction === automation.id}>
                      Excluir
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  )
}
