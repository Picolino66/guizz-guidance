import { apiFetch } from "./api"
import { getAdminToken } from "./session"

export interface Contact {
  id: string
  name: string | null
  email: string | null
  phoneNumber: string | null
  createdAt: string
  updatedAt: string
}

export interface ContactListResponse {
  items: Contact[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export async function contactsFetch<T>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(path, options, getAdminToken() ?? undefined)
}
