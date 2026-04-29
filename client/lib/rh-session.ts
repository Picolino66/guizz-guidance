import { getAdminToken, getSystemUser, setSystemUser, clearAdminToken, SystemUser } from "./session"

export type RhUser = SystemUser

export const RH_LOGIN_PATH = "/login"

export function getRhDashboardPath(user?: SystemUser | null) {
  if (user?.role === "ADMIN" || user?.role === "USER") {
    return "/rh/dashboard"
  }

  return RH_LOGIN_PATH
}

export function getRhToken(): string | null {
  return getAdminToken()
}

export function setRhToken(_token: string) {
  // token unificado — não necessário separado
}

export function clearRhToken() {
  // gerenciado por clearAdminToken
}

export function getRhUser(): SystemUser | null {
  return getSystemUser()
}

export function setRhUser(user: SystemUser) {
  setSystemUser(user)
}

export function clearRhSession() {
  clearAdminToken()
}
