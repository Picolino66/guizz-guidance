"use client"

import type { ChangeEvent, FormEvent } from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { redirectIfUnauthorized } from "../../lib/api"
import {
  whatsappFetch,
  type WhatsappAutomation,
  type WhatsappAutomationTargetType,
  type WhatsappConnection,
  type WhatsappContact,
  type WhatsappGroup,
  type WhatsappImageMimeType
} from "../../lib/whatsapp-api"
import { whatsappAutomationKindLabels, whatsappAutomationStatusLabels } from "./whatsapp-labels"

const KIND_OPTIONS: Array<{ value: WhatsappAutomation["kind"]; label: string }> = [
  { value: "ONE_SHOT", label: "Aviso único" },
  { value: "REMINDER", label: "Lembrete" },
  { value: "DAILY", label: "Diário" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "MONTHLY", label: "Mensal" },
  { value: "BIRTHDAY", label: "Aniversário" }
]

const TARGET_TYPE_OPTIONS: Array<{ value: WhatsappAutomationTargetType; label: string }> = [
  { value: "GROUP", label: "Grupo" },
  { value: "CONTACT", label: "Contato" }
]

const PERIODIC_AUTOMATION_KINDS: ReadonlySet<WhatsappAutomation["kind"]> = new Set([
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "BIRTHDAY"
])
const WHATSAPP_IMAGE_TYPES: WhatsappImageMimeType[] = ["image/jpeg", "image/png", "image/webp"]
const MAX_WHATSAPP_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_MENTION_SUGGESTIONS = 8
const TARGET_SEARCH_DEBOUNCE_MS = 250
const MENTION_SEARCH_DEBOUNCE_MS = 150
const TARGET_SEARCH_MIN_LENGTH = 3

type WhatsappTargetOption = {
  jid: string
  label: string
  secondaryLabel: string
}

type SelectedMention = WhatsappContact & {
  mentionToken: string
}

interface WhatsappDirectorySyncResult {
  contactCount: number
  groupCount: number
}

function shouldShowAutomation(automation: WhatsappAutomation) {
  if (automation.status === "ARCHIVED") {
    return false
  }

  return PERIODIC_AUTOMATION_KINDS.has(automation.kind) || Boolean(automation.nextRunAt)
}

function getAutomationEnhancementSummary(automation: WhatsappAutomation) {
  const items = []

  if (automation.imageBase64) {
    items.push(automation.imageFileName ? `Foto: ${automation.imageFileName}` : "Foto anexada")
  }

  if (automation.mentionJids.length > 0) {
    items.push(`${automation.mentionJids.length} menção${automation.mentionJids.length === 1 ? "" : "ões"}`)
  }

  return items.join(" · ")
}

function formatTargetTypeLabel(value: WhatsappAutomationTargetType) {
  return value === "GROUP" ? "Grupo" : "Contato"
}

function formatAutomationTargetSummary(automation: WhatsappAutomation) {
  if (automation.targetType === "CONTACT") {
    if (automation.targetJids.length === 0) {
      return automation.targetJid ?? "—"
    }

    if (automation.targetJids.length === 1) {
      return automation.targetJids[0]
    }

    return `${automation.targetJids.length} contatos`
  }

  return automation.targetJid ?? "—"
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."))
    reader.readAsDataURL(file)
  })
}

function toBackendMonthDay(dayMonth: string) {
  const [day, month] = dayMonth.split("-")
  return day && month ? `${month}-${day}` : dayMonth
}

function findActiveMention(value: string, cursor: number) {
  const prefix = value.slice(0, cursor)
  const match = prefix.match(/(^|\s)@([^\s@]*)$/)

  if (!match) {
    return null
  }

  return {
    query: match[2],
    start: cursor - match[2].length - 1,
    end: cursor
  }
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function mapGroupToTarget(group: WhatsappGroup): WhatsappTargetOption {
  return {
    jid: group.jid,
    label: group.name,
    secondaryLabel: group.jid
  }
}

function mapContactToTarget(contact: WhatsappContact): WhatsappTargetOption {
  return {
    jid: contact.jid,
    label: contact.name,
    secondaryLabel: contact.phoneNumber
  }
}

function buildMentionToken(contact: WhatsappContact) {
  return `@${contact.phoneNumber}`
}

function getMentionOptionLabel(contact: WhatsappContact) {
  return contact.name.trim() || contact.phoneNumber
}

export function WhatsappAutomationsPageClient() {
  const router = useRouter()
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null)
  const targetSearchRequestIdRef = useRef(0)
  const mentionSearchRequestIdRef = useRef(0)
  const [automations, setAutomations] = useState<WhatsappAutomation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [connection, setConnection] = useState<WhatsappConnection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [title, setTitle] = useState("")
  const [kind, setKind] = useState<WhatsappAutomation["kind"]>("ONE_SHOT")
  const [targetType, setTargetType] = useState<WhatsappAutomationTargetType>("GROUP")
  const [targetQuery, setTargetQuery] = useState("")
  const [targetOptions, setTargetOptions] = useState<WhatsappTargetOption[]>([])
  const [targetOptionsLoading, setTargetOptionsLoading] = useState(false)
  const [targetOptionsVisible, setTargetOptionsVisible] = useState(false)
  const [syncingDirectory, setSyncingDirectory] = useState(false)
  const [targetOptionsError, setTargetOptionsError] = useState<string | null>(null)
  const [selectedTargets, setSelectedTargets] = useState<WhatsappTargetOption[]>([])
  const [scheduleDate, setScheduleDate] = useState("")
  const [timeOfDay, setTimeOfDay] = useState("09:00")
  const [daysOfWeek, setDaysOfWeek] = useState("1,2,3,4,5")
  const [dayOfMonth, setDayOfMonth] = useState("1")
  const [birthdayDayMonth, setBirthdayDayMonth] = useState("01-01")
  const [imageBase64, setImageBase64] = useState("")
  const [imageMimeType, setImageMimeType] = useState<WhatsappImageMimeType | "">("")
  const [imageFileName, setImageFileName] = useState("")
  const [mentionOptions, setMentionOptions] = useState<WhatsappContact[]>([])
  const [mentionOptionsLoading, setMentionOptionsLoading] = useState(false)
  const [mentionOptionsError, setMentionOptionsError] = useState<string | null>(null)
  const [selectedMentions, setSelectedMentions] = useState<SelectedMention[]>([])
  const [mentionSearch, setMentionSearch] = useState<{ query: string; start: number; end: number } | null>(null)

  async function loadAutomations() {
    setLoading(true)
    setError(null)
    try {
      const [data, status] = await Promise.all([
        whatsappFetch<WhatsappAutomation[]>("/whatsapp/automations"),
        whatsappFetch<WhatsappConnection>("/whatsapp/status")
      ])
      setAutomations(data)
      setConnection(status)
    } catch (err) {
      if (redirectIfUnauthorized(err, () => router.replace("/login"))) return
      setError(err instanceof Error ? err.message : "Não foi possível carregar as automações.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAutomations()
  }, [])

  useEffect(() => {
    setTargetQuery("")
    setTargetOptions([])
    setTargetOptionsVisible(false)
    setTargetOptionsError(null)
    setSelectedTargets([])
    setMentionOptions([])
    setMentionOptionsError(null)
    setSelectedMentions([])
    setMentionSearch(null)
  }, [targetType])

  async function syncDirectory() {
    if (connection?.status !== "READY") {
      setTargetOptionsError("Conecte o WhatsApp para sincronizar.")
      return
    }

    setSyncingDirectory(true)
    setTargetOptionsError(null)
    setError(null)
    setStatusMessage(null)

    try {
      const result = await whatsappFetch<WhatsappDirectorySyncResult>("/whatsapp/sync", {
        method: "POST"
      })

      await loadTargetOptions(targetQuery)
      setStatusMessage(`Sincronização concluída: ${result.contactCount} contatos e ${result.groupCount} grupos disponíveis.`)
    } catch (err) {
      if (redirectIfUnauthorized(err, () => router.replace("/login"))) return
      setTargetOptionsError(err instanceof Error ? err.message : "Não foi possível sincronizar com o WhatsApp.")
    } finally {
      setSyncingDirectory(false)
    }
  }

  async function loadTargetOptions(search: string) {
    const requestId = ++targetSearchRequestIdRef.current
    const query = search.trim()

    if (query.length < TARGET_SEARCH_MIN_LENGTH) {
      setTargetOptions([])
      setTargetOptionsLoading(false)
      setTargetOptionsError(null)
      return
    }

    setTargetOptionsLoading(true)
    setTargetOptionsError(null)

    const params = new URLSearchParams()
    if (query) {
      params.set("search", query)
    }
    const path = targetType === "GROUP" ? "/whatsapp/groups" : "/whatsapp/contacts"
    const url = params.size > 0 ? `${path}?${params.toString()}` : path

    try {
      if (targetSearchRequestIdRef.current !== requestId) {
        return
      }

      if (targetType === "GROUP") {
        const data = await whatsappFetch<WhatsappGroup[]>(url)
        if (targetSearchRequestIdRef.current !== requestId) {
          return
        }
        setTargetOptions(data.map(mapGroupToTarget))
      } else {
        const data = await whatsappFetch<WhatsappContact[]>(url)
        if (targetSearchRequestIdRef.current !== requestId) {
          return
        }
        setTargetOptions(data.map(mapContactToTarget))
      }
    } catch (err) {
      if (redirectIfUnauthorized(err, () => router.replace("/login"))) return
      if (targetSearchRequestIdRef.current === requestId) {
        setTargetOptionsError(err instanceof Error ? err.message : "Não foi possível buscar os destinos.")
      }
    } finally {
      if (targetSearchRequestIdRef.current === requestId) {
        setTargetOptionsLoading(false)
      }
    }
  }

  async function loadMentionOptions(search: string) {
    const requestId = ++mentionSearchRequestIdRef.current
    setMentionOptionsLoading(true)
    setMentionOptionsError(null)

    const query = search.trim()
    const params = new URLSearchParams()
    if (query) {
      params.set("search", query)
    }
    const url = params.size > 0 ? `/whatsapp/contacts?${params.toString()}` : "/whatsapp/contacts"

    try {
      const data = await whatsappFetch<WhatsappContact[]>(url)

      if (mentionSearchRequestIdRef.current !== requestId) {
        return
      }

      setMentionOptions(data)
    } catch (err) {
      if (redirectIfUnauthorized(err, () => router.replace("/login"))) return
      if (mentionSearchRequestIdRef.current === requestId) {
        setMentionOptionsError(err instanceof Error ? err.message : "Não foi possível buscar contatos para menção.")
      }
    } finally {
      if (mentionSearchRequestIdRef.current === requestId) {
        setMentionOptionsLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!targetOptionsVisible) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void loadTargetOptions(targetQuery)
    }, TARGET_SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [targetQuery, targetType, targetOptionsVisible])

  useEffect(() => {
    if (!mentionSearch) {
      setMentionOptions([])
      setMentionOptionsLoading(false)
      setMentionOptionsError(null)
      return
    }

    if (targetType !== "GROUP" || selectedTargets.length === 0) {
      setMentionOptions([])
      setMentionOptionsLoading(false)
      setMentionOptionsError("Selecione um grupo como destino para usar menções.")
      return
    }

    const timeoutId = window.setTimeout(() => {
      void loadMentionOptions(mentionSearch.query)
    }, MENTION_SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [mentionSearch, selectedTargets, targetType])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (targetType === "GROUP" && selectedTargets.length === 0) {
      setError("Selecione um grupo antes de criar a automação.")
      return
    }

    if (targetType === "CONTACT" && selectedTargets.length === 0) {
      setError("Selecione ao menos um contato antes de criar a automação.")
      return
    }

    setSaving(true)
    setError(null)
    setStatusMessage(null)

    const payload: Record<string, unknown> = {
      title,
      message,
      kind,
      targetType
    }

    if (targetType === "GROUP") {
      payload.targetJid = selectedTargets[0]?.jid
    } else {
      payload.targetJids = selectedTargets.map((target) => target.jid)
    }

    const activeMentions = selectedMentions.filter((contact) => message.includes(contact.mentionToken))

    if (activeMentions.length > 0) {
      payload.mentionNumbers = activeMentions.map((contact) => contact.phoneNumber)
    }

    if (imageBase64 && imageMimeType) {
      payload.imageBase64 = imageBase64
      payload.imageMimeType = imageMimeType
      payload.imageFileName = imageFileName || undefined
    }

    if (kind === "ONE_SHOT" || kind === "REMINDER") {
      payload.scheduledFor = scheduleDate ? new Date(scheduleDate).toISOString() : ""
    }

    if (kind === "DAILY" || kind === "WEEKLY" || kind === "MONTHLY" || kind === "BIRTHDAY") {
      payload.timeOfDay = timeOfDay
    }

    if (kind === "WEEKLY") {
      payload.daysOfWeek = daysOfWeek
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value))
    }

    if (kind === "MONTHLY") {
      payload.dayOfMonth = Number(dayOfMonth)
    }

    if (kind === "BIRTHDAY") {
      payload.monthDay = toBackendMonthDay(birthdayDayMonth)
    }

    try {
      await whatsappFetch("/whatsapp/automations", {
        method: "POST",
        body: JSON.stringify(payload)
      })

      setTitle("")
      setMessage("")
      setTargetQuery("")
      setSelectedTargets([])
      setSelectedMentions([])
      setMentionSearch(null)
      setMentionOptions([])
      setMentionOptionsError(null)
      setTargetOptionsVisible(false)
      clearImage()
      await loadAutomations()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a automação.")
    } finally {
      setSaving(false)
    }
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      clearImage()
      return
    }

    if (!WHATSAPP_IMAGE_TYPES.includes(file.type as WhatsappImageMimeType)) {
      clearImage()
      setError("Selecione uma imagem JPEG, PNG ou WebP.")
      return
    }

    if (file.size > MAX_WHATSAPP_IMAGE_BYTES) {
      clearImage()
      setError("A imagem deve ter no máximo 5 MB.")
      return
    }

    try {
      const dataUrl = await fileToDataUrl(file)
      setImageBase64(dataUrl)
      setImageMimeType(file.type as WhatsappImageMimeType)
      setImageFileName(file.name)
      setError(null)
    } catch (err) {
      clearImage()
      setError(err instanceof Error ? err.message : "Não foi possível carregar a imagem.")
    }
  }

  function clearImage() {
    setImageBase64("")
    setImageMimeType("")
    setImageFileName("")
    if (imageInputRef.current) {
      imageInputRef.current.value = ""
    }
  }

  function updateMentionSearch(value: string, cursor: number) {
    const activeMention = findActiveMention(value, cursor)
    setMentionSearch(activeMention)
    setMentionOptionsError(null)

    if (!activeMention) {
      return
    }

    if (targetType !== "GROUP" || selectedTargets.length === 0) {
      setMentionOptions([])
      setMentionOptionsError("Selecione um grupo como destino para usar menções.")
      return
    }
  }

  function handleMessageChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const nextMessage = event.target.value
    setMessage(nextMessage)
    updateMentionSearch(nextMessage, event.target.selectionStart)
  }

  function syncMentionSearchFromCursor() {
    const input = messageInputRef.current
    if (!input) {
      return
    }

    updateMentionSearch(message, input.selectionStart)
  }

  function selectMention(contact: WhatsappContact) {
    if (!mentionSearch) {
      return
    }

    const mentionToken = buildMentionToken(contact)
    const mentionText = `${mentionToken} `
    const nextMessage = `${message.slice(0, mentionSearch.start)}${mentionText}${message.slice(mentionSearch.end)}`
    const nextCursor = mentionSearch.start + mentionText.length

    setMessage(nextMessage)
    setSelectedMentions((current) => {
      if (current.some((item) => item.phoneNumber === contact.phoneNumber)) {
        return current
      }

      return [...current, { ...contact, mentionToken }]
    })
    setMentionSearch(null)
    setMentionOptions([])
    setMentionOptionsError(null)

    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus()
      messageInputRef.current?.setSelectionRange(nextCursor, nextCursor)
    })
  }

  function handleSelectTarget(option: WhatsappTargetOption) {
    if (targetType === "GROUP") {
      setSelectedTargets([option])
      setTargetQuery(option.label)
    } else {
      setSelectedTargets((current) => {
        if (current.some((item) => item.jid === option.jid)) {
          return current
        }

        return [...current, option]
      })
      setTargetQuery("")
    }

    setTargetOptionsError(null)
    setTargetOptionsVisible(false)
    setMentionOptions([])
    setMentionOptionsError(null)
    setSelectedMentions([])
    setMentionSearch(null)
  }

  function handleTargetQueryChange(value: string) {
    setTargetQuery(value)
    setTargetOptionsVisible(true)
    setTargetOptionsError(null)

    if (targetType === "GROUP") {
      setSelectedTargets([])
    }

    setMentionOptions([])
    setMentionOptionsError(null)
    setSelectedMentions([])
    setMentionSearch(null)
  }

  function removeSelectedTarget(jid: string) {
    setSelectedTargets((current) => current.filter((item) => item.jid !== jid))
  }

  async function runNow(id: string) {
    setBusyAction(id)
    setError(null)

    try {
      await whatsappFetch(`/whatsapp/automations/${id}/run-now`, { method: "POST" })
      await loadAutomations()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível disparar a automação.")
    } finally {
      setBusyAction(null)
    }
  }

  async function toggleAutomation(id: string) {
    setBusyAction(id)
    setError(null)

    try {
      await whatsappFetch(`/whatsapp/automations/${id}/toggle`, { method: "PATCH" })
      await loadAutomations()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível alterar o status da automação.")
    } finally {
      setBusyAction(null)
    }
  }

  async function removeAutomation(id: string) {
    setBusyAction(id)
    setError(null)

    try {
      await whatsappFetch(`/whatsapp/automations/${id}`, { method: "DELETE" })
      await loadAutomations()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir a automação.")
    } finally {
      setBusyAction(null)
    }
  }

  const canDispatch = connection?.status === "READY"
  const visibleAutomations = automations.filter(shouldShowAutomation)
  const mentionSuggestions = mentionOptions.slice(0, MAX_MENTION_SUGGESTIONS)
  const selectedGroup = targetType === "GROUP" ? selectedTargets[0] ?? null : null

  return (
    <section className="whatsapp-page">
      <header className="whatsapp-page__hero">
        <div>
          <p className="whatsapp-page__eyebrow">Automações</p>
          <h2 className="whatsapp-page__title">Crie regras de automação para o WhatsApp</h2>
        </div>
      </header>

      {error && <div className="whatsapp-alert whatsapp-alert--error">{error}</div>}
      {statusMessage && <div className="whatsapp-alert">{statusMessage}</div>}

      <div className="whatsapp-grid">
        <section className="whatsapp-card">
          <div className="whatsapp-card__header">
            <div>
              <p className="whatsapp-card__eyebrow">Nova automação</p>
              <h3 className="whatsapp-card__title">Cadastrar regra</h3>
            </div>
          </div>

          <form className="whatsapp-form" onSubmit={handleCreate}>
            <label>
              <span>Título</span>
              <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Aniversário da equipe" />
            </label>

            <label>
              <span>Tipo de destino</span>
              <select value={targetType} onChange={(event) => setTargetType(event.target.value as WhatsappAutomationTargetType)}>
                {TARGET_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="whatsapp-group-picker">
              <label>
                <span>{targetType === "GROUP" ? "Grupo" : "Contato"}</span>
                <input
                  value={targetQuery}
                  onChange={(event) => handleTargetQueryChange(event.target.value)}
                  onFocus={() => {
                    setTargetOptionsVisible(true)
                  }}
                  placeholder={targetType === "GROUP" ? "Nome do grupo ou JID" : "Nome do contato ou telefone"}
                />
              </label>

              {targetType === "GROUP" && (
                <div className="whatsapp-group-picker__actions">
                  <button
                    type="button"
                    className="whatsapp-button whatsapp-button--ghost"
                    onClick={() => void syncDirectory()}
                    disabled={syncingDirectory || targetOptionsLoading || connection?.status !== "READY"}
                    title={connection?.status !== "READY" ? "Conecte o WhatsApp antes de sincronizar" : undefined}
                  >
                    {syncingDirectory ? "Sincronizando..." : "Sincronizar com WhatsApp"}
                  </button>
                </div>
              )}

              {selectedGroup && (
                <p className="whatsapp-form-hint">
                  Destino selecionado: <strong>{selectedGroup.label}</strong> · {selectedGroup.secondaryLabel}
                </p>
              )}

              {targetType === "CONTACT" && selectedTargets.length > 0 && (
                <div className="whatsapp-form-hint">
                  Contatos selecionados: {selectedTargets.length}
                  {selectedTargets.map((target) => (
                    <button
                      key={target.jid}
                      type="button"
                      className="whatsapp-button whatsapp-button--ghost"
                      onClick={() => removeSelectedTarget(target.jid)}
                    >
                      {target.label} · remover
                    </button>
                  ))}
                </div>
              )}

              {targetOptionsError && <p className="whatsapp-form-hint whatsapp-form-hint--error">{targetOptionsError}</p>}

              {targetOptionsVisible && targetOptions.length > 0 && (
                <ul className="whatsapp-group-list">
                  {targetOptions.map((option) => (
                    <li key={option.jid}>
                      <button
                        type="button"
                        className="whatsapp-group-list__item"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelectTarget(option)}
                      >
                        <span className="whatsapp-group-list__name">{option.label}</span>
                        <span className="whatsapp-group-list__jid">{option.secondaryLabel}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {targetOptionsVisible && targetQuery.trim().length > 0 && targetQuery.trim().length < TARGET_SEARCH_MIN_LENGTH && !targetOptionsError && (
                <p className="whatsapp-form-hint">Digite ao menos 3 caracteres para buscar.</p>
              )}

              {targetOptionsVisible && !targetOptionsLoading && targetOptions.length === 0 && !targetOptionsError && (
                targetQuery.trim().length >= TARGET_SEARCH_MIN_LENGTH ? (
                  <p className="whatsapp-form-hint">Nenhum destino encontrado para a busca atual.</p>
                ) : null
              )}

              {targetType === "CONTACT" && (
                <p className="whatsapp-form-hint">
                  Selecione quantos contatos quiser. A automação enviará uma mensagem separada para cada pessoa.
                </p>
              )}
            </div>

            <label>
              <span>Mensagem</span>
              <textarea
                ref={messageInputRef}
                required
                value={message}
                onChange={handleMessageChange}
                onClick={syncMentionSearchFromCursor}
                onKeyUp={syncMentionSearchFromCursor}
                rows={5}
                placeholder="Bom dia, hoje é... @Maria"
              />
            </label>

            {targetType === "CONTACT" && (
              <p className="whatsapp-form-hint">
                Use <strong>[nome]</strong> para inserir automaticamente o nome salvo de cada contato selecionado.
              </p>
            )}

            {mentionSearch && (
              <div className="whatsapp-mention-menu">
                {mentionOptionsLoading ? (
                  <p>Buscando contatos da agenda...</p>
                ) : mentionOptionsError ? (
                  <p>{mentionOptionsError}</p>
                ) : mentionSuggestions.length === 0 ? (
                  <p>Nenhum contato encontrado.</p>
                ) : (
                  mentionSuggestions.map((contact) => (
                    <button key={contact.jid} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectMention(contact)}>
                      <strong>{getMentionOptionLabel(contact)}</strong>
                      <span>{contact.phoneNumber}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="whatsapp-file-field">
              <span>Foto opcional</span>
              <input
                ref={imageInputRef}
                id="whatsapp-automation-image"
                className="whatsapp-file-field__input"
                type="file"
                accept={WHATSAPP_IMAGE_TYPES.join(",")}
                onChange={(event) => void handleImageChange(event)}
              />
              <label className="whatsapp-file-field__button" htmlFor="whatsapp-automation-image">
                <span>{imageFileName || "Selecionar foto"}</span>
                <small>JPEG, PNG ou WebP até 5 MB</small>
              </label>
            </div>

            {imageBase64 && (
              <div className="whatsapp-image-preview">
                <img src={imageBase64} alt="Pré-visualização da foto selecionada" />
                <div>
                  <strong>{imageFileName}</strong>
                  <button type="button" className="whatsapp-button whatsapp-button--ghost" onClick={clearImage}>
                    Remover foto
                  </button>
                </div>
              </div>
            )}

            <label>
              <span>Tipo</span>
              <select value={kind} onChange={(event) => setKind(event.target.value as WhatsappAutomation["kind"])}>
                {KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {(kind === "ONE_SHOT" || kind === "REMINDER") && (
              <label>
                <span>Data e hora</span>
                <input required type="datetime-local" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} />
              </label>
            )}

            {(kind === "DAILY" || kind === "WEEKLY" || kind === "MONTHLY" || kind === "BIRTHDAY") && (
              <label>
                <span>Horário</span>
                <input required type="time" value={timeOfDay} onChange={(event) => setTimeOfDay(event.target.value)} />
              </label>
            )}

            {kind === "WEEKLY" && (
              <label>
                <span>Dias da semana (0 a 6)</span>
                <input required value={daysOfWeek} onChange={(event) => setDaysOfWeek(event.target.value)} placeholder="1,2,3,4,5" />
              </label>
            )}

            {kind === "MONTHLY" && (
              <label>
                <span>Dia do mês</span>
                <input required value={dayOfMonth} onChange={(event) => setDayOfMonth(event.target.value)} placeholder="1" />
              </label>
            )}

            {kind === "BIRTHDAY" && (
              <label>
                <span>Dia e mês</span>
                <input
                  required
                  value={birthdayDayMonth}
                  onChange={(event) => setBirthdayDayMonth(event.target.value)}
                  placeholder="DD-MM"
                  inputMode="numeric"
                  pattern="\d{2}-\d{2}"
                />
              </label>
            )}

            <button className="whatsapp-button" disabled={saving}>
              {saving ? "Salvando..." : "Criar automação"}
            </button>
          </form>
        </section>

        <section className="whatsapp-card">
          <div className="whatsapp-card__header">
            <div>
              <p className="whatsapp-card__eyebrow">Lista</p>
              <h3 className="whatsapp-card__title">Automações cadastradas</h3>
            </div>
          </div>

          <div className="whatsapp-list whatsapp-list--tall">
            {loading ? (
              <p className="whatsapp-empty">Carregando automações...</p>
            ) : visibleAutomations.length === 0 ? (
              <p className="whatsapp-empty">Nenhuma automação futura ou recorrente cadastrada.</p>
            ) : (
              visibleAutomations.map((automation) => (
                <article className="whatsapp-list-item" key={automation.id}>
                  <div>
                    <strong>{automation.title}</strong>
                    <p>
                      {whatsappAutomationKindLabels[automation.kind]} · {automation.nextRunAt ? `Próxima execução em ${new Date(automation.nextRunAt).toLocaleString("pt-BR")}` : "Sem agendamento"}
                    </p>
                    <p>
                      {automation.targetType ? formatTargetTypeLabel(automation.targetType) : "Sem destino"} · {formatAutomationTargetSummary(automation)}
                    </p>
                    {getAutomationEnhancementSummary(automation) && (
                      <p>{getAutomationEnhancementSummary(automation)}</p>
                    )}
                  </div>

                  <div className="whatsapp-list-item__actions">
                    <span className={`whatsapp-pill whatsapp-pill--${automation.status.toLowerCase()}`}>{whatsappAutomationStatusLabels[automation.status]}</span>
                    <button className="whatsapp-button whatsapp-button--ghost" onClick={() => void toggleAutomation(automation.id)} disabled={busyAction === automation.id}>
                      {automation.status === "ACTIVE" ? "Pausar" : "Ativar"}
                    </button>
                    <button
                      className="whatsapp-button"
                      onClick={() => void runNow(automation.id)}
                      disabled={!canDispatch || busyAction === automation.id}
                      title={canDispatch ? "Disparar agora" : "Conecte a sessão WhatsApp antes de disparar"}
                    >
                      {busyAction === automation.id ? "Processando..." : "Disparar"}
                    </button>
                    <button className="whatsapp-button whatsapp-button--danger" onClick={() => void removeAutomation(automation.id)} disabled={busyAction === automation.id}>
                      Excluir
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  )
}
