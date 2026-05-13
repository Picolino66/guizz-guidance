import { IsOptional, IsString } from "class-validator"

export class ListWhatsappParticipantsDto {
  @IsOptional()
  @IsString()
  groupJid?: string
}
