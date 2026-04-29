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
        </div>
      </main>
    </div>
  )
}
