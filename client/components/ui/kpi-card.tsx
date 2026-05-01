import { Card } from "./card"

interface KpiCardProps {
  hint?: string
  label: string
  tone?: "neutral" | "accent" | "success" | "danger"
  value: React.ReactNode
}

export function KpiCard({ hint, label, tone = "neutral", value }: KpiCardProps) {
  return (
    <Card as="article" className={`ui-kpi ui-kpi--${tone}`}>
      <p className="ui-kpi__label">{label}</p>
      <strong className="ui-kpi__value">{value}</strong>
      {hint ? <p className="ui-kpi__hint">{hint}</p> : null}
    </Card>
  )
}
