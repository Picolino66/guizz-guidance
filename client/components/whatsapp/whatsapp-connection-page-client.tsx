"use client"

import QRCode from "qrcode"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { io, type Socket } from "socket.io-client"
import { API_BASE_URL, redirectIfUnauthorized } from "../../lib/api"
import { whatsappFetch, type WhatsappConnection } from "../../lib/whatsapp-api"
import { whatsappStatusLabels } from "./whatsapp-labels"

export function WhatsappConnectionPageClient() {
  const [connection, setConnection] = useState<WhatsappConnection | null>(null)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<"connect" | "disconnect" | null>(null)
  const router = useRouter()

  async function loadConnection() {
    setLoading(true)
    try {
      const data = await whatsappFetch<WhatsappConnection>("/whatsapp/status")
      setConnection(data)
    } catch (err) {
      if (redirectIfUnauthorized(err, () => router.replace("/login"))) return
      setMessage(err instanceof Error ? err.message : "Falha ao carregar a conexão.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadConnection()
  }, [])

  useEffect(() => {
    const socket: Socket = io(`${API_BASE_URL}/whatsapp`, {
      transports: ["websocket", "polling"]
    })

    socket.on("whatsapp_session_updated", (updated: WhatsappConnection) => {
      setConnection((current) => {
        if (current && current.id !== updated.id) {
          return current
        }

        return updated
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    if (connection?.status !== "CONNECTING" && connection?.status !== "QR_REQUIRED") {
      return
    }

    const interval = window.setInterval(() => {
      void loadConnection()
    }, 3000)

    return () => window.clearInterval(interval)
  }, [connection?.status])

  useEffect(() => {
    let active = true

    async function renderQrCode() {
      if (!connection?.qrCode) {
        setQrImage(null)
        return
      }

      try {
        const dataUrl = await QRCode.toDataURL(connection.qrCode, {
          errorCorrectionLevel: "M",
          margin: 2,
          scale: 6,
          color: {
            dark: "#07130d",
            light: "#f8fafc"
          }
        })

        if (active) {
          setQrImage(dataUrl)
        }
      } catch {
        if (active) {
          setQrImage(null)
        }
      }
    }

    void renderQrCode()

    return () => {
      active = false
    }
  }, [connection?.qrCode])

  async function handleConnect() {
    setBusy("connect")
    setMessage(null)

    try {
      const updated = await whatsappFetch<WhatsappConnection>("/whatsapp/connect", { method: "POST" })
      setConnection(updated)
      setMessage("Pareamento iniciado. Aguarde o código QR aparecer.")
      await loadConnection()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível iniciar o pareamento.")
    } finally {
      setBusy(null)
    }
  }

  async function handleDisconnect() {
    setBusy("disconnect")
    setMessage(null)

    try {
      const updated = await whatsappFetch<WhatsappConnection>("/whatsapp/disconnect", { method: "POST" })
      setConnection(updated)
      setMessage("Sessão desconectada.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível desconectar a sessão.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="whatsapp-page">
      <header className="whatsapp-page__hero">
        <div>
          <p className="whatsapp-page__eyebrow">Conexão</p>
          <h2 className="whatsapp-page__title">Conecte o seu WhatsApp</h2>
        </div>
      </header>

      {message && <div className="whatsapp-alert">{message}</div>}

      <div className="whatsapp-grid">
        <section className="whatsapp-card">
          <div className="whatsapp-card__header">
            <div>
              <p className="whatsapp-card__eyebrow">Sessão</p>
              <h3 className="whatsapp-card__title">{connection?.label ?? "Canal principal"}</h3>
            </div>
            <div className="whatsapp-card__actions">
              <button className="whatsapp-button" onClick={() => void handleConnect()} disabled={busy !== null || loading}>
                {busy === "connect" ? "Conectando..." : "Conectar"}
              </button>
              <button className="whatsapp-button whatsapp-button--ghost" onClick={() => void handleDisconnect()} disabled={busy !== null || loading}>
                {busy === "disconnect" ? "Desconectando..." : "Desconectar"}
              </button>
            </div>
          </div>

          <dl className="whatsapp-meta">
            <div>
              <dt>Status</dt>
              <dd>{connection ? whatsappStatusLabels[connection.status] : "—"}</dd>
            </div>
            <div>
              <dt>Telefone</dt>
              <dd>{connection?.phoneNumber ?? "—"}</dd>
            </div>
            <div>
              <dt>Última conexão</dt>
              <dd>{connection?.lastConnectedAt ? new Date(connection.lastConnectedAt).toLocaleString("pt-BR") : "—"}</dd>
            </div>
            <div>
              <dt>Último erro</dt>
              <dd>{connection?.lastError ?? "Nenhum"}</dd>
            </div>
          </dl>

          <div className="whatsapp-qr">
            <p className="whatsapp-qr__label">Código QR / token de pareamento</p>
            {loading ? (
              <p className="whatsapp-empty">Carregando conexão...</p>
            ) : qrImage ? (
              <div className="whatsapp-qr__image-wrap">
                <img className="whatsapp-qr__image" src={qrImage} alt="Código QR para parear o WhatsApp Web" />
                <details className="whatsapp-qr__details">
                  <summary>Ver token bruto</summary>
                  <code className="whatsapp-qr__code">{connection?.qrCode}</code>
                </details>
              </div>
            ) : connection?.qrCode ? (
              <code className="whatsapp-qr__code">{connection.qrCode}</code>
            ) : (
              <p className="whatsapp-empty">Nenhum código QR disponível no momento.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}
