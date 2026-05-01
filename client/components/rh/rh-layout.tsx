"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  getRhToken,
  RH_LOGIN_PATH
} from "../../lib/rh-session"
import { AppShell } from "../layout/app-shell"

interface Props { children: React.ReactNode }

export function RhLayout({ children }: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!getRhToken()) { router.replace(RH_LOGIN_PATH); return }
    setMounted(true)
  }, [router])

  if (!mounted) return null

  return (
    <AppShell section="rh">
      <div className="rh-page">{children}</div>
    </AppShell>
  )
}
