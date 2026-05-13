"use client"

import { useRequireInternalSession } from "../../lib/internal-session"
import { AppShell } from "../layout/app-shell"

interface Props { children: React.ReactNode }

export function RhLayout({ children }: Props) {
  const session = useRequireInternalSession()

  if (session.isChecking || !session.token) return null

  return (
    <AppShell section="rh">
      <div className="rh-page">{children}</div>
    </AppShell>
  )
}
