"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"
import { getAdminToken } from "../../lib/session"
import { AppShell } from "../layout/app-shell"

interface Props {
  children: ReactNode
}

export function WhatsappLayout({ children }: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace("/login")
      return
    }

    setMounted(true)
  }, [router])

  if (!mounted) {
    return null
  }

  return (
    <AppShell section="whatsapp">
      <div className="whatsapp-content">{children}</div>
    </AppShell>
  )
}
