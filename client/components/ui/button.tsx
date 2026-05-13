import { type ButtonHTMLAttributes } from "react"

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
type ButtonSize = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  isLoading?: boolean
  loadingLabel?: string
}

export function Button({
  children,
  className = "",
  disabled,
  fullWidth = false,
  isLoading = false,
  loadingLabel,
  size = "md",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  const classes = [
    "ui-button",
    `ui-button--${variant}`,
    `ui-button--${size}`,
    fullWidth ? "ui-button--full" : "",
    isLoading ? "is-loading" : "",
    className
  ].filter(Boolean).join(" ")

  return (
    <button
      aria-busy={isLoading || undefined}
      className={classes}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading ? <span aria-hidden="true" className="ui-button__spinner" /> : null}
      <span className="ui-button__content">{isLoading && loadingLabel ? loadingLabel : children}</span>
    </button>
  )
}
