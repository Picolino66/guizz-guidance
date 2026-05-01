"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { redirectIfUnauthorized } from "../../lib/api"
import { whatsappFetch, type WhatsappAutomation, type WhatsappConnection, type WhatsappDispatchLog, type WhatsappOverview } from "../../lib/whatsapp-api"

const statusLabels: Record<WhatsappConnection["status"], string> = {
  DISCONNECTED: "Desconectado",
  CONNECTING: "Conectando",
  QR_REQUIRED: "QR necessário",
  READY: "Conectado",
  ERROR: "Erro"
}

const logLabels: Record<WhatsappDispatchLog["status"], string> = {
  PENDING: "Pendente",
  RETRYING: "Retentando",
  SENT: "Enviado",
  FAILED: "Falhou",
  SKIPPED: "Ignorado"
}

export function WhatsappDashboardPageClient() {
  const router = useRouter()
  const [overview, setOverview] = useState<WhatsappOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<"connect" | "disconnect" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadOverview() {
    setLoading(true)
    setError(null)

    try {
      const data = await whatsappFetch<WhatsappOverview>("/whatsapp/overview")
      setOverview(data)
    } catch (err) {
      if (redirectIfUnauthorized(err, () => router.replace("/login"))) return
      setError(err instanceof Error ? err.message : "Falha ao carregar o dashboard.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOverview()
  }, [])

  async function handleConnect() {
    setBusy("connect")
    setError(null)
    try {
      await whatsappFetch("/whatsapp/connect", { method: "POST" })
      await loadOverview()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível iniciar a conexão.")
    } finally {
      setBusy(null)
    }
  }

  async function handleDisconnect() {
    setBusy("disconnect")
    setError(null)
    try {
      await whatsappFetch("/whatsapp/disconnect", { method: "POST" })
      await loadOverview()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível desconectar a sessão.")
    } finally {
      setBusy(null)
    }
  }

  const connection = overview?.connection
  const stats = overview?.stats
  const recentLogs = overview?.recentLogs ?? []
  const dueAutomations = overview?.dueAutomations ?? []

  const connectionTone = useMemo(() => {
    switch (connection?.status) {
      case "READY":
        return "success"
      case "QR_REQUIRED":
      case "CONNECTING":
        return "warning"
      case "ERROR":
        return "danger"
      default:
        return "neutral"
    }
  }, [connection?.status])

  return (
    <section className="whatsapp-page">
      <header className="whatsapp-page__hero">
        <div>
          <p className="whatsapp-page__eyebrow">Painel operacional</p>
          <h2 className="whatsapp-page__title">Monitore automações e estado da conexão</h2>
          <p className="whatsapp-page__subtitle">
            A área centraliza a sessão WhatsApp, os disparos programados e os logs de execução.
          </p>
        </div>

        <div className={`whatsapp-status whatsapp-status--${connectionTone}`}>
          <span className="whatsapp-status__dot" />
          {connection ? statusLabels[connection.status] : "Carregando"}
        </div>
      </header>

      {error && <div className="whatsapp-alert whatsapp-alert--error">{error}</div>}

      <div className="whatsapp-stats">
        <article className="whatsapp-stat">
          <span>Automações ativas</span>
          <strong>{stats?.activeAutomations ?? "—"}</strong>
        </article>
        <article className="whatsapp-stat">
          <span>Pendências para agora</span>
          <strong>{stats?.pendingAutomations ?? "—"}</strong>
        </article>
        <article className="whatsapp-stat">
          <span>Envios com sucesso</span>
          <strong>{stats?.sentLogs ?? "—"}</strong>
        </article>
        <article className="whatsapp-stat">
          <span>Falhas registradas</span>
          <strong>{stats?.failedLogs ?? "—"}</strong>
        </article>
      </div>

      <div className="whatsapp-grid">
        <section className="whatsapp-card">
          <div className="whatsapp-card__header">
            <div>
              <p className="whatsapp-card__eyebrow">Conexão</p>
              <h3 className="whatsapp-card__title">{connection?.label ?? "Canal principal"}</h3>
            </div>
            <div className="whatsapp-card__actions">
              <button className="whatsapp-button" onClick={handleConnect} disabled={busy !== null || loading}>
                {busy === "connect" ? "Conectando..." : "Conectar"}
              </button>
              <button className="whatsapp-button whatsapp-button--ghost" onClick={handleDisconnect} disabled={busy !== null || loading}>
                {busy === "disconnect" ? "Desconectando..." : "Desconectar"}
              </button>
            </div>
          </div>

          <dl className="whatsapp-meta">
            <div>
              <dt>Grupo</dt>
              <dd>{connection?.groupName ?? "Não configurado"}</dd>
            </div>
            <div>
              <dt>JID</dt>
              <dd>{connection?.groupJid ?? "—"}</dd>
            </div>
            <div>
              <dt>Última conexão</dt>
              <dd>{connection?.lastConnectedAt ? new Date(connection.lastConnectedAt).toLocaleString("pt-BR") : "—"}</dd>
            </div>
            <div>
              <dt>Última falha</dt>
              <dd>{connection?.lastError ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="whatsapp-card">
          <div className="whatsapp-card__header">
            <div>
              <p className="whatsapp-card__eyebrow">Automações críticas</p>
              <h3 className="whatsapp-card__title">Itens com disparo pendente</h3>
            </div>
          </div>

          <div className="whatsapp-list">
            {dueAutomations.length === 0 ? (
              <p className="whatsapp-empty">Não há automações vencidas no momento.</p>
            ) : (
              dueAutomations.map((automation) => <AutomationRow key={automation.id} automation={automation} />)
            )}
          </div>
        </section>
      </div>

      <div className="whatsapp-grid whatsapp-grid--secondary">
        <section className="whatsapp-card">
          <div className="whatsapp-card__header">
            <div>
              <p className="whatsapp-card__eyebrow">Logs recentes</p>
              <h3 className="whatsapp-card__title">Últimos disparos</h3>
            </div>
          </div>

          <div className="whatsapp-list">
            {loading ? (
              <p className="whatsapp-empty">Carregando logs...</p>
            ) : recentLogs.length === 0 ? (
              <p className="whatsapp-empty">Nenhum log registrado ainda.</p>
            ) : (
              recentLogs.map((log) => <LogRow key={log.id} log={log} />)
            )}
          </div>
        </section>

        <section className="whatsapp-card">
          <div className="whatsapp-card__header">
            <div>
              <p className="whatsapp-card__eyebrow">Estado da sessão</p>
              <h3 className="whatsapp-card__title">Resumo operacional</h3>
            </div>
          </div>

          <div className="whatsapp-summary">
            <div>
              <span>Automações totais</span>
              <strong>{stats?.totalAutomations ?? "—"}</strong>
            </div>
            <div>
              <span>Logs totais</span>
              <strong>{stats?.totalLogs ?? "—"}</strong>
            </div>
            <div>
              <span>Sessão QR</span>
              <strong>{connection?.status === "QR_REQUIRED" ? "Aguardando leitura" : "OK"}</strong>
            </div>
            <div>
              <span>Erro atual</span>
              <strong>{connection?.lastError ?? "Nenhum"}</strong>
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}

function AutomationRow({ automation }: { automation: WhatsappAutomation }) {
  return (
    <article className="whatsapp-row">
      <div>
        <strong>{automation.title}</strong>
        <p>
          {automation.kind} · {automation.nextRunAt ? `Próximo: ${new Date(automation.nextRunAt).toLocaleString("pt-BR")}` : "Sem próxima execução"}
        </p>
      </div>
      <span className={`whatsapp-pill whatsapp-pill--${automation.status.toLowerCase()}`}>{automation.status}</span>
    </article>
  )
}

function LogRow({ log }: { log: WhatsappDispatchLog }) {
  return (
    <article className="whatsapp-row">
      <div>
        <strong>{log.targetGroupJid}</strong>
        <p>
          {logLabels[log.status]} · {log.createdAt ? new Date(log.createdAt).toLocaleString("pt-BR") : "—"}
        </p>
      </div>
      <span className={`whatsapp-pill whatsapp-pill--${log.status.toLowerCase()}`}>{log.status}</span>
    </article>
  )
}
