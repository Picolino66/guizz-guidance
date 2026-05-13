import { Transform } from "class-transformer"
import { IsEmail, IsOptional, IsString } from "class-validator"

function normalizeOptionalString(value: unknown) {
  if (value === null || value === undefined) {
    return undefined
  }

  if (typeof value !== "string") {
    return value
  }

  const normalizedValue = value.trim()
  return normalizedValue === "" ? undefined : normalizedValue
}

export class CreateContactDto {
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  name?: string

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsEmail()
  email?: string

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  phoneNumber?: string
}
