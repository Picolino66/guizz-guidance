"use client"

import { useRequireInternalSession } from "../../lib/internal-session"
import { AppShell } from "../layout/app-shell"

export function HubPageClient() {
  const session = useRequireInternalSession()

  if (session.isChecking || !session.token) return null

  return (
    <AppShell section="home">
      <div className="app-home-empty" aria-label="Home em construção">
        <p>Estamos em construção</p>
      </div>
    </AppShell>
  )
}
