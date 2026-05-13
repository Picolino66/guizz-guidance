export function normalizeSearchTextPart(value?: string | null) {
  if (!value) {
    return ""
  }

  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
}

export function buildSearchText(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => normalizeSearchTextPart(part))
    .filter(Boolean)
    .join(" ")
    .trim()
}
