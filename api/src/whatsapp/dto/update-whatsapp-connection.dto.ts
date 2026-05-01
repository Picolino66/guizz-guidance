import { IsOptional, IsString } from "class-validator"

export class UpdateWhatsappConnectionDto {
  @IsOptional()
  @IsString()
  label?: string

  @IsOptional()
  @IsString()
  phoneNumber?: string

  @IsOptional()
  @IsString()
  groupName?: string

  @IsOptional()
  @IsString()
  groupJid?: string
}
