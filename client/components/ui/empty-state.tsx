import { type ReactNode } from "react"

interface EmptyStateProps {
  action?: ReactNode
  text?: string
  title: string
}

export function EmptyState({ action, text, title }: EmptyStateProps) {
  return (
    <div className="ui-empty">
      <p className="ui-empty__title">{title}</p>
      {text ? <p className="ui-empty__text">{text}</p> : null}
      {action ? <div className="ui-empty__action">{action}</div> : null}
    </div>
  )
}
