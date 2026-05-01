import { IsOptional, IsString } from "class-validator"

export class SendWhatsappMessageDto {
  @IsString()
  message!: string

  @IsOptional()
  @IsString()
  targetGroupJid?: string
}
