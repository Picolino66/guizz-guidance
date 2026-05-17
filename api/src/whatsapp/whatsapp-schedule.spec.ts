import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { WhatsappAutomationKind } from "@prisma/client"
import { resolveWhatsappNextRunAt } from "./whatsapp-schedule"

// reference: 2026-04-30T15:00:00Z = April 30, 12:00 Brazil (UTC-3)
// All assertions use .toISOString() so results are timezone-independent.
const TZ = "America/Sao_Paulo"
const reference = new Date("2026-04-30T15:00:00.000Z")

describe("resolveWhatsappNextRunAt", () => {
  it("mantem o horario exato para disparo unico", () => {
    const nextRunAt = resolveWhatsappNextRunAt(
      WhatsappAutomationKind.ONE_SHOT,
      { scheduledFor: "2026-05-01T10:30:00.000Z" },
      reference,
      TZ
    )

    assert.equal(nextRunAt?.toISOString(), "2026-05-01T10:30:00.000Z")
  })

  it("agenda diario para o proximo horario disponivel", () => {
    // 09:00 Brazil = 12:00 UTC. Reference = 12:00 Brazil = 15:00 UTC.
    // 09:00 Brazil today already passed -> schedule May 1 at 09:00 Brazil = 12:00 UTC.
    const nextRunAt = resolveWhatsappNextRunAt(
      WhatsappAutomationKind.DAILY,
      { timeOfDay: "09:00" },
      reference,
      TZ
    )

    assert.equal(nextRunAt?.toISOString(), "2026-05-01T12:00:00.000Z")
  })

  it("agenda semanal no primeiro dia configurado apos a referencia", () => {
    // Reference = April 30 (Thursday) 12:00 Brazil. Next Monday = May 4.
    // 08:30 Brazil = 11:30 UTC.
    const nextRunAt = resolveWhatsappNextRunAt(
      WhatsappAutomationKind.WEEKLY,
      { timeOfDay: "08:30", daysOfWeek: [1] },
      reference,
      TZ
    )

    assert.equal(nextRunAt?.toISOString(), "2026-05-04T11:30:00.000Z")
  })

  it("agenda mensal respeitando o ultimo dia do mes", () => {
    // April has 30 days -> min(31, 30) = day 30.
    // April 30 at 10:00 Brazil = 13:00 UTC. Reference = 15:00 UTC -> already passed.
    // Advance to next month: May 31 at 10:00 Brazil = 13:00 UTC.
    const nextRunAt = resolveWhatsappNextRunAt(
      WhatsappAutomationKind.MONTHLY,
      { timeOfDay: "10:00", dayOfMonth: 31 },
      reference,
      TZ
    )

    assert.equal(nextRunAt?.toISOString(), "2026-05-31T13:00:00.000Z")
  })

  it("agenda aniversario no proximo ano quando a data ja passou", () => {
    // April 1 at 07:15 Brazil already passed in 2026 -> schedule 2027-04-01.
    // 07:15 Brazil = 10:15 UTC.
    const nextRunAt = resolveWhatsappNextRunAt(
      WhatsappAutomationKind.BIRTHDAY,
      { timeOfDay: "07:15", monthDay: "04-01" },
      reference,
      TZ
    )

    assert.equal(nextRunAt?.toISOString(), "2027-04-01T10:15:00.000Z")
  })
})
