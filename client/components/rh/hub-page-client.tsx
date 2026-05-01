"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { getAdminToken } from "../../lib/session"
import { AppShell } from "../layout/app-shell"

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
    <AppShell section="home">
      <div className="app-home-empty" aria-label="Home sem conteúdo central" />
    </AppShell>
  )
}
