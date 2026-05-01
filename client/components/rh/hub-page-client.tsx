"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { getAdminToken } from "../../lib/session"
import { getRhDashboardPath, getRhUser } from "../../lib/rh-session"

export function HubPageClient() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    if (!getAdminToken()) {
      router.replace("/login")
    }
  }, [router])

  if (!mounted) return null

  return (
    <div className="hub-root">
      <div className="hub-bg-glow hub-bg-glow--left" aria-hidden />
      <div className="hub-bg-glow hub-bg-glow--right" aria-hidden />

      <main className="hub-main">
        <header className="hub-header">
          <div className="hub-logo">H</div>
          <div>
            <h1 className="hub-title">Guidance Hub</h1>
            <p className="hub-subtitle">Escolha o módulo administrativo que deseja acessar</p>
          </div>
        </header>

        <div className="hub-grid">
          <button className="hub-card hub-card--quiz" onClick={() => router.push("/admin-quiz")}>
            <div className="hub-card__icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="hub-card__body">
              <h2 className="hub-card__title">Quiz Admin</h2>
              <p className="hub-card__desc">Abra o dashboard e opere a rodada do quiz em andamento.</p>
            </div>
            <span className="hub-card__arrow">→</span>
          </button>

          <button
            className="hub-card hub-card--rh"
            onClick={() => router.push(getRhDashboardPath(getRhUser()))}
          >
            <div className="hub-card__icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
            </div>
            <div className="hub-card__body">
              <h2 className="hub-card__title">RH Recrutamento</h2>
              <p className="hub-card__desc">Gerencie entrevistas técnicas, candidatos e avaliações de forma centralizada.</p>
            </div>
            <span className="hub-card__arrow">→</span>
          </button>

          <button className="hub-card hub-card--whatsapp" onClick={() => router.push("/whatsapp")}>
            <div className="hub-card__icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 11.6C20 15.6 16.4 19 11.9 19c-1 0-2-.2-2.8-.5L4 20l1.4-4.2A7.7 7.7 0 014 11.6C4 7.6 7.6 4 12 4s8 3.6 8 7.6z" />
                <path d="M9.4 9.6c.2-.4.5-.5.8-.5h.7c.3 0 .5.2.7.6l.7 1.8c.1.3.1.5 0 .7l-.4.6c-.2.3-.2.5 0 .8.4.6 1.1 1.2 1.8 1.7.3.2.6.3.8.1l.7-.4c.2-.1.5-.1.7 0l1.2.5c.4.1.6.4.5.8-.1.7-.6 1.4-1.3 1.7-.7.2-1.6.1-2.8-.3-1.4-.5-2.9-1.6-4.2-2.9-1.3-1.3-2.4-2.8-2.9-4.2-.4-1.2-.5-2.1-.3-2.8.3-.7 1-.1 1.7-.3l1 .3c.3.1.6.3.7.6l.4 1c.1.2.1.4 0 .6l-.3.5c-.1.2-.1.4 0 .6.2.4.5.9 1 1.4.4.4.8.8 1.1 1 .2.1.4.1.6 0l.5-.3c.2-.1.4-.1.6 0l1 1c.3.2.4.5.2.8" />
              </svg>
            </div>
            <div className="hub-card__body">
              <h2 className="hub-card__title">WhatsApp</h2>
              <p className="hub-card__desc">Gerencie a automação de mensagens, a sessão conectada e os envios programados.</p>
            </div>
            <span className="hub-card__arrow">→</span>
          </button>
        </div>
      </main>
    </div>
  )
}
