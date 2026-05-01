import { type HTMLAttributes } from "react"

type StatusTone = "neutral" | "success" | "warning" | "danger" | "accent"

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone
}

export function StatusBadge({
  className = "",
  tone = "neutral",
  ...props
}: StatusBadgeProps) {
  return <span className={`ui-status ui-status--${tone} ${className}`.trim()} {...props} />
}
