"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ApiError, apiFetch, isUnauthorizedError } from "./api"
import { clearAdminToken, getAdminToken, setSystemUser, type SystemUser } from "./session"

type InternalSessionState = {
  isChecking: boolean
  token: string | null
  user: SystemUser | null
}

type LoginRouter = {
  replace: (href: string) => void
}

export function redirectToInternalLogin(router: LoginRouter) {
  clearAdminToken()
  router.replace("/login")
}

export async function validateInternalSession() {
  const token = getAdminToken()

  if (!token) {
    clearAdminToken()
    return null
  }

  try {
    const user = await apiFetch<SystemUser>("/auth/session", {}, token)
    setSystemUser(user)
    return { token, user }
  } catch (error) {
    if (isUnauthorizedError(error) || (error instanceof ApiError && error.status === 403)) {
      clearAdminToken()
      return null
    }

    throw error
  }
}

export function useRequireInternalSession(): InternalSessionState {
  const router = useRouter()
  const [session, setSession] = useState<InternalSessionState>({
    isChecking: true,
    token: null,
    user: null
  })

  useEffect(() => {
    let disposed = false

    async function validate() {
      try {
        const nextSession = await validateInternalSession()

        if (disposed) {
          return
        }

        if (!nextSession) {
          setSession({ isChecking: false, token: null, user: null })
          router.replace("/login")
          return
        }

        setSession({
          isChecking: false,
          token: nextSession.token,
          user: nextSession.user
        })
      } catch {
        if (disposed) {
          return
        }

        setSession({ isChecking: false, token: null, user: null })
        router.replace("/login")
      }
    }

    void validate()

    return () => {
      disposed = true
    }
  }, [router])

  return session
}
