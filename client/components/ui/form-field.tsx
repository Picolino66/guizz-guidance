import { type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react"

interface FieldProps {
  label: string
  children: React.ReactNode
  className?: string
}

export function Field({ children, className = "", label }: FieldProps) {
  return (
    <label className={`ui-field ${className}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ui-input ${className}`.trim()} {...props} />
}

export function SelectInput({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`ui-input ${className}`.trim()} {...props} />
}

export function TextareaInput({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`ui-input ui-textarea ${className}`.trim()} {...props} />
}
