"use client"

import { type ReactNode } from "react"
import { useRequireInternalSession } from "../../lib/internal-session"
import { AppShell } from "../layout/app-shell"

interface Props {
  children: ReactNode
}

export function WhatsappLayout({ children }: Props) {
  const session = useRequireInternalSession()

  if (session.isChecking || !session.token) {
    return null
  }

  return (
    <AppShell section="whatsapp">
      <div className="whatsapp-content">{children}</div>
    </AppShell>
  )
}
