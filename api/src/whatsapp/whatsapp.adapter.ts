import { Injectable } from "@nestjs/common"
import makeWASocket, {
  AuthenticationCreds,
  AuthenticationState,
  Browsers,
  BufferJSON,
  DisconnectReason,
  SignalDataSet,
  SignalDataTypeMap,
  WASocket,
  fetchLatestBaileysVersion,
  initAuthCreds,
  isJidBroadcast,
  proto
} from "baileys"
import P from "pino"

interface ConnectionEvents {
  onQr: (qr: string) => Promise<void> | void
  onReady: () => Promise<void> | void
  onLoggedOut: (reason: string) => Promise<void> | void
  onReconnecting: (reason: string, attempt: number) => Promise<void> | void
  onDisconnected: (reason: string) => Promise<void> | void
  onSession: (session: unknown | null) => Promise<void> | void
}

const MAX_RECONNECT_ATTEMPTS = 5
const MAX_QR_RETRIES = 5
const RECONNECT_DELAY_MS = 2000

const KEY_MAP: { [T in keyof SignalDataTypeMap]: string } = {
  "pre-key": "preKeys",
  session: "sessions",
  "sender-key": "senderKeys",
  "app-state-sync-key": "appStateSyncKeys",
  "app-state-sync-version": "appStateVersions",
  "sender-key-memory": "senderKeyMemory"
}

type WhatsappSession = WASocket & {
  id?: string
}

@Injectable()
export class WhatsappAdapter {
  private client: WhatsappSession | null = null
  private loading: Promise<WhatsappSession | null> | null = null
  private ready = false
  private connecting = false
  private manualDisconnect = false
  private reconnectAttempts = 0
  private qrRetries = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private events: ConnectionEvents | null = null
  private session: unknown | null = null
  private readonly logger = P({ level: "error" })

  async connect(session: unknown | null, events: ConnectionEvents) {
    this.events = events
    this.session = session
    this.manualDisconnect = false

    if (this.client) {
      return this.client
    }

    if (this.loading) {
      this.client = await this.loading
      return this.client
    }

    if (this.connecting) {
      return null
    }

    this.connecting = true
    this.loading = this.createClient()
    this.client = await this.loading
    this.loading = null
    this.connecting = false

    return this.client
  }

  async disconnect() {
    this.manualDisconnect = true
    this.clearReconnectTimer()

    const client = this.client
    this.client = null
    this.ready = false
    this.connecting = false
    this.loading = null
    this.reconnectAttempts = 0
    this.qrRetries = 0
    this.session = null

    if (client) {
      await client.logout().catch((err: unknown) => {
        console.warn(`[WhatsApp] Erro ao deslogar sessão: ${this.getErrorMessage(err)}`)
      })
      this.closeSocket(client)
    }
  }

  async sendMessage(jid: string, message: string) {
    if (!this.client || !this.ready) {
      throw new Error("Cliente WhatsApp indisponível.")
    }

    return this.client.sendMessage(jid, { text: message })
  }

  async getGroups(): Promise<{ jid: string; name: string }[]> {
    if (!this.client || !this.ready) {
      throw new Error("Cliente WhatsApp indisponível.")
    }

    const groups = await this.client.groupFetchAllParticipating()
    return Object.entries(groups)
      .map(([jid, group]) => ({
        jid,
        name: typeof group.subject === "string" ? group.subject : jid
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
  }

  isReady() {
    return Boolean(this.client) && this.ready
  }

  private async createClient() {
    try {
      const events = this.requireEvents()
      const { state, saveState } = await this.createAuthState(this.session, events)
      const version = await this.resolveWhatsappVersion()

      const client = makeWASocket({
        logger: this.logger,
        printQRInTerminal: false,
        browser: Browsers.appropriate("Desktop"),
        auth: state,
        shouldIgnoreJid: (jid) => isJidBroadcast(jid),
        ...(version ? { version } : {})
      }) as WhatsappSession

      client.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
        if (qr) {
          await this.handleQrCode(qr)
          return
        }

        if (connection === "open") {
          this.ready = true
          this.reconnectAttempts = 0
          this.qrRetries = 0
          await events.onReady()
          return
        }

        if (connection === "close") {
          await this.handleClosedConnection(client, lastDisconnect)
        }
      })

      client.ev.on("creds.update", () => {
        void saveState()
      })

      return client
    } catch (error) {
      const reason = this.getErrorMessage(error)
      this.client = null
      this.loading = null
      this.ready = false
      this.connecting = false
      await this.events?.onDisconnected(`Erro ao iniciar: ${reason}`)
      return null
    }
  }

  private async createAuthState(
    session: unknown | null,
    events: ConnectionEvents
  ): Promise<{ state: AuthenticationState; saveState: () => Promise<void> }> {
    let creds: AuthenticationCreds
    let keys: Record<string, Record<string, unknown>> = {}

    if (session) {
      const restored = JSON.parse(JSON.stringify(session), BufferJSON.reviver) as {
        creds?: AuthenticationCreds
        keys?: Record<string, Record<string, unknown>>
      }
      creds = restored.creds ?? initAuthCreds()
      keys = restored.keys ?? {}
    } else {
      creds = initAuthCreds()
    }

    const saveState = async () => {
      const serialized = JSON.parse(JSON.stringify({ creds, keys }, BufferJSON.replacer))
      this.session = serialized
      await events.onSession(serialized)
    }

    return {
      state: {
        creds,
        keys: {
          get: async (type, ids) => {
            const key = KEY_MAP[type]
            return ids.reduce<{ [id: string]: SignalDataTypeMap[typeof type] }>((dict, id) => {
              let value = keys[key]?.[id]
              if (value && type === "app-state-sync-key") {
                value = proto.Message.AppStateSyncKeyData.fromObject(value)
              }

              if (value) {
                dict[id] = value as SignalDataTypeMap[typeof type]
              }

              return dict
            }, {})
          },
          set: async (data: SignalDataSet) => {
            for (const type of Object.keys(data) as Array<keyof SignalDataTypeMap>) {
              const key = KEY_MAP[type]
              keys[key] = keys[key] ?? {}
              Object.assign(keys[key], data[type])
            }

            await saveState()
          }
        }
      },
      saveState
    }
  }

  private async handleQrCode(qr: string) {
    this.qrRetries += 1

    if (this.qrRetries > MAX_QR_RETRIES) {
      const events = this.requireEvents()
      await events.onDisconnected("Limite de QR codes atingido. Inicie o pareamento novamente.")
      await this.destroyCurrentClient(false)
      return
    }

    await this.requireEvents().onQr(qr)
  }

  private async handleClosedConnection(client: WhatsappSession, lastDisconnect: unknown) {
    this.ready = false
    this.client = null
    this.closeSocket(client)

    if (this.manualDisconnect) {
      return
    }

    const statusCode = this.getDisconnectStatusCode(lastDisconnect)
    const reason = this.getDisconnectReason(lastDisconnect)

    if (statusCode === DisconnectReason.loggedOut || statusCode === 403) {
      this.session = null
      await this.requireEvents().onSession(null)
      await this.requireEvents().onLoggedOut(reason || "Sessão encerrada pelo WhatsApp.")
      return
    }

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      await this.requireEvents().onDisconnected(reason || "Falha ao reconectar a sessão WhatsApp.")
      return
    }

    this.reconnectAttempts += 1
    await this.requireEvents().onReconnecting(reason || "Reconectando sessão WhatsApp.", this.reconnectAttempts)
    this.scheduleReconnect()
  }

  private scheduleReconnect() {
    this.clearReconnectTimer()
    this.reconnectTimer = setTimeout(() => {
      this.client = null
      this.loading = null
      this.connecting = false

      if (this.events) {
        void this.connect(this.session, this.events)
      }
    }, RECONNECT_DELAY_MS)
  }

  private async destroyCurrentClient(logout: boolean) {
    const client = this.client
    this.client = null
    this.ready = false
    this.connecting = false
    this.loading = null
    this.clearReconnectTimer()

    if (!client) {
      return
    }

    if (logout) {
      await client.logout().catch(() => undefined)
    }

    this.closeSocket(client)
  }

  private closeSocket(client: WhatsappSession) {
    try {
      client.ws.close()
    } catch {
      // O socket pode já ter sido fechado pelo Baileys.
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private async resolveWhatsappVersion() {
    try {
      const { version, isLatest } = await fetchLatestBaileysVersion()
      console.log(`[WhatsApp] WA version ${version.join(".")} latest=${isLatest}`)
      return version
    } catch (error) {
      console.warn(`[WhatsApp] Não foi possível obter a versão mais recente do WA: ${this.getErrorMessage(error)}`)
      return null
    }
  }

  private getDisconnectStatusCode(lastDisconnect: unknown) {
    return (lastDisconnect as { error?: { output?: { statusCode?: number } } } | undefined)?.error?.output?.statusCode
  }

  private getDisconnectReason(lastDisconnect: unknown) {
    const error = (lastDisconnect as { error?: unknown } | undefined)?.error
    return this.getErrorMessage(error)
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message
    }

    return typeof error === "string" ? error : "Sessão WhatsApp desconectada."
  }

  private requireEvents() {
    if (!this.events) {
      throw new Error("Eventos da conexão WhatsApp não configurados.")
    }

    return this.events
  }
}
