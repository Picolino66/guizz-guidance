import { type HTMLAttributes } from "react"

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "article" | "section" | "div"
}

export function Card({ as: Component = "section", className = "", ...props }: CardProps) {
  return <Component className={`ui-card ${className}`.trim()} {...props} />
}
