import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Contact, GroupParticipant } from "baileys"
import { WhatsappAdapter, type WhatsappGroupParticipant } from "./whatsapp.adapter"

type WhatsappAdapterInternals = {
  client: {
    resyncAppState: (collections: readonly string[], isInitialSync: boolean) => Promise<void>
    groupFetchAllParticipating: () => Promise<Record<string, { subject?: string }>>
  } | null
  ready: boolean
  upsertContacts(contacts: Contact[]): void
  updateContacts(contacts: Partial<Contact>[]): void
  toGroupParticipant(participant: GroupParticipant): WhatsappGroupParticipant
  syncDirectory(): Promise<{ contactCount: number; groupCount: number }>
}

function getInternals(adapter: WhatsappAdapter) {
  return adapter as unknown as WhatsappAdapterInternals
}

describe("WhatsappAdapter", () => {
  it("forca ressincronizacao e retorna contagem atualizada", async () => {
    const adapter = new WhatsappAdapter()
    const internals = getInternals(adapter)
    internals.upsertContacts([
      {
        id: "5511999999999@s.whatsapp.net",
        jid: "5511999999999@s.whatsapp.net",
        name: "Maria"
      }
    ])

    let receivedCollections: readonly string[] = []
    let receivedInitialSync = true
    internals.client = {
      resyncAppState: async (collections: readonly string[], isInitialSync: boolean) => {
        receivedCollections = collections
        receivedInitialSync = isInitialSync
      },
      groupFetchAllParticipating: async () => ({
        "120363000000000000@g.us": { subject: "Grupo A" },
        "120363000000000001@g.us": { subject: "Grupo B" }
      })
    }
    internals.ready = true

    const result = await internals.syncDirectory()

    assert.deepEqual(receivedCollections, ["critical_block", "critical_unblock_low", "regular", "regular_high", "regular_low"])
    assert.equal(receivedInitialSync, false)
    assert.deepEqual(result, {
      contactCount: 1,
      groupCount: 2
    })
  })

  it("lista contatos sincronizados com nome salvo e JID valido", () => {
    const adapter = new WhatsappAdapter()
    const internals = getInternals(adapter)

    internals.upsertContacts([
      {
        id: "5511999999999@s.whatsapp.net",
        jid: "5511999999999@s.whatsapp.net",
        name: "Maria Salva"
      },
      {
        id: "120363000000000000@g.us",
        jid: "120363000000000000@g.us",
        name: "Grupo Ignorado"
      }
    ])

    assert.deepEqual(adapter.listContacts(), [
      {
        jid: "5511999999999@s.whatsapp.net",
        name: "Maria Salva",
        phoneNumber: "5511999999999"
      }
    ])
  })

  it("prioriza o nome salvo no cache de contatos ao mapear participante", () => {
    const adapter = new WhatsappAdapter()
    const internals = getInternals(adapter)

    internals.upsertContacts([
      {
        id: "5511999999999@s.whatsapp.net",
        jid: "5511999999999@s.whatsapp.net",
        name: "Maria Salva"
      }
    ])

    const participant = internals.toGroupParticipant({
      id: "5511999999999@s.whatsapp.net",
      jid: "5511999999999@s.whatsapp.net",
      notify: "Maria Publica"
    })

    assert.equal(participant.name, "Maria Salva")
    assert.equal(participant.phoneNumber, "5511999999999")
  })

  it("mantem fallback para notify e telefone quando nao ha nome salvo", () => {
    const adapter = new WhatsappAdapter()
    const internals = getInternals(adapter)

    assert.equal(
      internals.toGroupParticipant({
        id: "5511888888888@s.whatsapp.net",
        jid: "5511888888888@s.whatsapp.net",
        notify: "Nome Publico"
      }).name,
      "Nome Publico"
    )

    assert.equal(
      internals.toGroupParticipant({
        id: "5511777777777@s.whatsapp.net",
        jid: "5511777777777@s.whatsapp.net"
      }).name,
      "5511777777777"
    )
  })

  it("mescla atualizacao parcial com contato existente", () => {
    const adapter = new WhatsappAdapter()
    const internals = getInternals(adapter)

    internals.upsertContacts([
      {
        id: "5511666666666@s.whatsapp.net",
        jid: "5511666666666@s.whatsapp.net",
        notify: "Nome Publico"
      }
    ])
    internals.updateContacts([
      {
        id: "5511666666666@s.whatsapp.net",
        name: "Nome Salvo"
      }
    ])

    const participant = internals.toGroupParticipant({
      id: "5511666666666@s.whatsapp.net",
      jid: "5511666666666@s.whatsapp.net",
      notify: "Nome Publico"
    })

    assert.equal(participant.name, "Nome Salvo")
  })
})
