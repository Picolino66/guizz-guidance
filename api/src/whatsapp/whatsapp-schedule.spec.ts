import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { WhatsappAutomationKind } from "@prisma/client"
import { resolveWhatsappNextRunAt } from "./whatsapp-schedule"

describe("resolveWhatsappNextRunAt", () => {
  const reference = new Date(2026, 3, 30, 12, 0, 0, 0)

  it("mantem o horario exato para disparo unico", () => {
    const nextRunAt = resolveWhatsappNextRunAt(
      WhatsappAutomationKind.ONE_SHOT,
      { scheduledFor: "2026-05-01T10:30:00.000Z" },
      reference
    )

    assert.equal(nextRunAt?.toISOString(), "2026-05-01T10:30:00.000Z")
  })

  it("agenda diario para o proximo horario disponivel", () => {
    const nextRunAt = resolveWhatsappNextRunAt(
      WhatsappAutomationKind.DAILY,
      { timeOfDay: "09:00" },
      reference
    )

    assertDateParts(nextRunAt, [2026, 4, 1, 9, 0])
  })

  it("agenda semanal no primeiro dia configurado apos a referencia", () => {
    const nextRunAt = resolveWhatsappNextRunAt(
      WhatsappAutomationKind.WEEKLY,
      { timeOfDay: "08:30", daysOfWeek: [1] },
      reference
    )

    assertDateParts(nextRunAt, [2026, 4, 4, 8, 30])
  })

  it("agenda mensal respeitando o ultimo dia do mes", () => {
    const nextRunAt = resolveWhatsappNextRunAt(
      WhatsappAutomationKind.MONTHLY,
      { timeOfDay: "10:00", dayOfMonth: 31 },
      reference
    )

    assertDateParts(nextRunAt, [2026, 4, 31, 10, 0])
  })

  it("agenda aniversario no proximo ano quando a data ja passou", () => {
    const nextRunAt = resolveWhatsappNextRunAt(
      WhatsappAutomationKind.BIRTHDAY,
      { timeOfDay: "07:15", monthDay: "04-01" },
      reference
    )

    assertDateParts(nextRunAt, [2027, 3, 1, 7, 15])
  })
})

function assertDateParts(value: Date | null | undefined, expected: [number, number, number, number, number]) {
  assert.ok(value)
  assert.deepEqual(
    [value.getFullYear(), value.getMonth(), value.getDate(), value.getHours(), value.getMinutes()],
    expected
  )
}
