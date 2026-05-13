import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsString } from "class-validator"
import { WhatsappAutomationTargetType } from "@prisma/client"

export class SendWhatsappMessageDto {
  @IsString()
  message!: string

  @IsOptional()
  @IsEnum(WhatsappAutomationTargetType)
  targetType?: WhatsappAutomationTargetType

  @IsOptional()
  @IsString()
  targetJid?: string

  @IsOptional()
  @IsString()
  imageBase64?: string

  @IsOptional()
  @IsString()
  imageMimeType?: string

  @IsOptional()
  @IsString()
  imageFileName?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  mentionNumbers?: string[]
}
