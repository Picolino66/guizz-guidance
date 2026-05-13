"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { redirectIfUnauthorized } from "../../lib/api"
import { whatsappFetch, type WhatsappDispatchLog, type WhatsappDispatchLogsPage, type WhatsappDispatchStatus } from "../../lib/whatsapp-api"
import { formatWhatsappTriggerLabel, whatsappDispatchStatusLabels } from "./whatsapp-labels"

const STATUS_OPTIONS: Array<{ value: WhatsappDispatchStatus | ""; label: string }> = [
  { value: "", label: "Todos" },
  { value: "PENDING", label: whatsappDispatchStatusLabels.PENDING },
  { value: "RETRYING", label: whatsappDispatchStatusLabels.RETRYING },
  { value: "SENT", label: whatsappDispatchStatusLabels.SENT },
  { value: "FAILED", label: whatsappDispatchStatusLabels.FAILED },
  { value: "SKIPPED", label: whatsappDispatchStatusLabels.SKIPPED }
]

export function WhatsappLogsPageClient() {
  const router = useRouter()
  const [logs, setLogs] = useState<WhatsappDispatchLog[]>([])
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<WhatsappDispatchStatus | "">("")
  const [limit, setLimit] = useState(20)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadLogs() {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      if (status) query.set("status", status)
      query.set("page", String(page))
      query.set("limit", String(limit))

      const data = await whatsappFetch<WhatsappDispatchLogsPage>(`/whatsapp/logs?${query.toString()}`)
      setLogs(data.items)
      setPagination(data.pagination)
    } catch (err) {
      if (redirectIfUnauthorized(err, () => router.replace("/login"))) return
      setError(err instanceof Error ? err.message : "Não foi possível carregar os logs.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLogs()
  }, [status, limit, page])

  return (
    <section className="whatsapp-page">
      <header className="whatsapp-page__hero">
        <div>
          <p className="whatsapp-page__eyebrow">Logs</p>
          <h2 className="whatsapp-page__title">Histórico de envios e falhas</h2>
        </div>
      </header>

      {error && <div className="whatsapp-alert whatsapp-alert--error">{error}</div>}

      <div className="whatsapp-card whatsapp-card--toolbar">
        <label>
          <span>Status</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as WhatsappDispatchStatus | "")
              setPage(1)
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Limite</span>
          <select
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value))
              setPage(1)
            }}
          >
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
                  <strong>{log.targetName}</strong>
                  <p>
                    {log.automationTitle ?? "Teste manual"} · {log.targetType === "GROUP" ? "Grupo" : "Contato"} · {whatsappDispatchStatusLabels[log.status]} · {log.createdAt ? new Date(log.createdAt).toLocaleString("pt-BR") : "—"} · {formatWhatsappTriggerLabel(log.triggeredBy)}
                  </p>
                </div>

                <div className="whatsapp-list-item__actions">
                  <span className={`whatsapp-pill whatsapp-pill--${log.status.toLowerCase()}`}>{whatsappDispatchStatusLabels[log.status]}</span>
                  <span className="whatsapp-muted">Tentativas: {log.attempts}</span>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="whatsapp-pagination">
          <p className="whatsapp-muted">
            {pagination.total === 0
              ? "Nenhum log encontrado."
              : `Página ${pagination.page} de ${pagination.totalPages} · ${pagination.total} registro${pagination.total === 1 ? "" : "s"}`}
          </p>

          <div className="whatsapp-list-item__actions">
            <button
              className="whatsapp-button whatsapp-button--ghost"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={loading || !pagination.hasPreviousPage}
            >
              Anterior
            </button>
            <button
              className="whatsapp-button whatsapp-button--ghost"
              onClick={() => setPage((current) => current + 1)}
              disabled={loading || !pagination.hasNextPage}
            >
              Próxima
            </button>
          </div>
        </div>
      </section>
    </section>
  )
}
