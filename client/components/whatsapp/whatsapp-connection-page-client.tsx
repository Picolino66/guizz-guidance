"use client"

import QRCode from "qrcode"
import type { FormEvent } from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { io, type Socket } from "socket.io-client"
import { API_BASE_URL, redirectIfUnauthorized } from "../../lib/api"
import { whatsappFetch, type WhatsappConnection, type WhatsappGroup } from "../../lib/whatsapp-api"

export function WhatsappConnectionPageClient() {
  const [connection, setConnection] = useState<WhatsappConnection | null>(null)
  const [label, setLabel] = useState("")
  const [groupName, setGroupName] = useState("")
  const [groupJid, setGroupJid] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<"connect" | "disconnect" | null>(null)
  const [groups, setGroups] = useState<WhatsappGroup[] | null>(null)
  const [loadingGroups, setLoadingGroups] = useState(false)
  const router = useRouter()

  async function loadConnection() {
    setLoading(true)
    try {
      const data = await whatsappFetch<WhatsappConnection>("/whatsapp/status")
      setConnection(data)
      setLabel(data.label)
      setGroupName(data.groupName ?? "")
      setGroupJid(data.groupJid ?? "")
      setPhoneNumber(data.phoneNumber ?? "")
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
      setMessage("Pareamento iniciado. Aguarde o QR code aparecer.")
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

  async function handleFetchGroups() {
    setLoadingGroups(true)
    setGroups(null)
    setMessage(null)

    try {
      const data = await whatsappFetch<WhatsappGroup[]>("/whatsapp/groups")
      setGroups(data)

      if (data.length === 0) {
        setMessage("Nenhum grupo encontrado no WhatsApp conectado.")
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível buscar os grupos.")
    } finally {
      setLoadingGroups(false)
    }
  }

  function handleSelectGroup(group: WhatsappGroup) {
    setGroupJid(group.jid)
    setGroupName(group.name)
    setGroups(null)
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const updated = await whatsappFetch<WhatsappConnection>("/whatsapp/connection", {
        method: "PATCH",
        body: JSON.stringify({
          label,
          groupName,
          groupJid,
          phoneNumber
        })
      })

      setConnection(updated)
      setMessage("Configuração salva com sucesso.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar a conexão.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="whatsapp-page">
      <header className="whatsapp-page__hero">
        <div>
          <p className="whatsapp-page__eyebrow">Conexão e ambiente</p>
          <h2 className="whatsapp-page__title">Configure o canal principal do WhatsApp</h2>
          <p className="whatsapp-page__subtitle">
            O QR code é exibido quando a sessão ainda depende de pareamento manual.
          </p>
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
              <dd>{connection?.status ?? "—"}</dd>
            </div>
            <div>
              <dt>Telefone</dt>
              <dd>{connection?.phoneNumber ?? "—"}</dd>
            </div>
            <div>
              <dt>Grupo</dt>
              <dd>{connection?.groupName ?? "—"}</dd>
            </div>
            <div>
              <dt>Último erro</dt>
              <dd>{connection?.lastError ?? "Nenhum"}</dd>
            </div>
          </dl>

          <div className="whatsapp-qr">
            <p className="whatsapp-qr__label">QR / token de pareamento</p>
            {loading ? (
              <p className="whatsapp-empty">Carregando conexão...</p>
            ) : qrImage ? (
              <div className="whatsapp-qr__image-wrap">
                <img className="whatsapp-qr__image" src={qrImage} alt="QR Code para parear o WhatsApp Web" />
                <details className="whatsapp-qr__details">
                  <summary>Ver token bruto</summary>
                  <code className="whatsapp-qr__code">{connection?.qrCode}</code>
                </details>
              </div>
            ) : connection?.qrCode ? (
              <code className="whatsapp-qr__code">{connection.qrCode}</code>
            ) : (
              <p className="whatsapp-empty">Nenhum QR disponível no momento.</p>
            )}
          </div>
        </section>

        <section className="whatsapp-card">
          <div className="whatsapp-card__header">
            <div>
              <p className="whatsapp-card__eyebrow">Configuração</p>
              <h3 className="whatsapp-card__title">Editar canal principal</h3>
            </div>
          </div>

          <form className="whatsapp-form" onSubmit={handleSave}>
            <label>
              <span>Nome do canal</span>
              <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Canal WhatsApp Guidance" />
            </label>

            <label>
              <span>Nome do grupo</span>
              <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Grupo Guidance" />
            </label>

            <label>
              <span>JID do grupo</span>
              <input value={groupJid} onChange={(event) => setGroupJid(event.target.value)} placeholder="120363000000000000@g.us" />
            </label>

            <div className="whatsapp-group-picker">
              <button
                type="button"
                className="whatsapp-button whatsapp-button--ghost"
                onClick={() => void handleFetchGroups()}
                disabled={loadingGroups || connection?.status !== "READY"}
                title={connection?.status !== "READY" ? "Conecte o WhatsApp antes de buscar grupos" : undefined}
              >
                {loadingGroups ? "Buscando grupos..." : "Buscar grupos do WhatsApp"}
              </button>

              {groups !== null && groups.length > 0 && (
                <ul className="whatsapp-group-list">
                  {groups.map((group) => (
                    <li key={group.jid}>
                      <button type="button" className="whatsapp-group-list__item" onClick={() => handleSelectGroup(group)}>
                        <span className="whatsapp-group-list__name">{group.name}</span>
                        <span className="whatsapp-group-list__jid">{group.jid}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label>
              <span>Número do canal</span>
              <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+55..." />
            </label>

            <button className="whatsapp-button" disabled={saving}>
              {saving ? "Salvando..." : "Salvar configuração"}
            </button>
          </form>
        </section>
      </div>
    </section>
  )
}
