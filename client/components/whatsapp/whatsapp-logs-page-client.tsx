"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { redirectIfUnauthorized } from "../../lib/api"
import { whatsappFetch, type WhatsappDispatchLog, type WhatsappDispatchStatus } from "../../lib/whatsapp-api"

const STATUS_OPTIONS: Array<{ value: WhatsappDispatchStatus | ""; label: string }> = [
  { value: "", label: "Todos" },
  { value: "PENDING", label: "Pendente" },
  { value: "RETRYING", label: "Retentando" },
  { value: "SENT", label: "Enviado" },
  { value: "FAILED", label: "Falhou" },
  { value: "SKIPPED", label: "Ignorado" }
]

export function WhatsappLogsPageClient() {
  const router = useRouter()
  const [logs, setLogs] = useState<WhatsappDispatchLog[]>([])
  const [status, setStatus] = useState<WhatsappDispatchStatus | "">("")
  const [limit, setLimit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadLogs() {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      if (status) query.set("status", status)
      query.set("limit", String(limit))

      const data = await whatsappFetch<WhatsappDispatchLog[]>(`/whatsapp/logs?${query.toString()}`)
      setLogs(data)
    } catch (err) {
      if (redirectIfUnauthorized(err, () => router.replace("/login"))) return
      setError(err instanceof Error ? err.message : "Não foi possível carregar os logs.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLogs()
  }, [status, limit])

  return (
    <section className="whatsapp-page">
      <header className="whatsapp-page__hero">
        <div>
          <p className="whatsapp-page__eyebrow">Logs</p>
          <h2 className="whatsapp-page__title">Acompanhe o histórico de envios e falhas</h2>
          <p className="whatsapp-page__subtitle">
            O log mostra o grupo alvo, o horário da tentativa e o estado final da execução.
          </p>
        </div>
      </header>

      {error && <div className="whatsapp-alert whatsapp-alert--error">{error}</div>}

      <div className="whatsapp-card whatsapp-card--toolbar">
        <label>
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as WhatsappDispatchStatus | "")}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Limite</span>
          <select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
            {[10, 20, 50, 100].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <button className="whatsapp-button whatsapp-button--ghost" onClick={() => void loadLogs()}>
          Atualizar
        </button>
      </div>

      <section className="whatsapp-card">
        <div className="whatsapp-list whatsapp-list--tall">
          {loading ? (
            <p className="whatsapp-empty">Carregando logs...</p>
          ) : logs.length === 0 ? (
            <p className="whatsapp-empty">Nenhum log para os filtros selecionados.</p>
          ) : (
            logs.map((log) => (
              <article className="whatsapp-list-item" key={log.id}>
                <div>
                  <strong>{log.targetGroupJid}</strong>
                  <p>
                    {log.status} · {log.createdAt ? new Date(log.createdAt).toLocaleString("pt-BR") : "—"} · {log.triggeredBy}
                  </p>
                </div>

                <div className="whatsapp-list-item__actions">
                  <span className={`whatsapp-pill whatsapp-pill--${log.status.toLowerCase()}`}>{log.status}</span>
                  <span className="whatsapp-muted">Tentativas: {log.attempts}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  )
}
